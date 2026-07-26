import { useCallback, useEffect, useRef, useState } from "react";

const WAKE_WORD = "vsmart";
const SAMPLE_RATE = 16000; // Vosk model expects 16kHz mono PCM16
const SILENCE_TIMEOUT_MS = 6000; // auto-stop the mic if nothing is heard for this long
const FINAL_DEBOUNCE_MS = 900; // wait this long after a "final" before treating it as complete
const WAKE_RESTART_DELAY_MS = 500; // brief pause before auto-restarting in wake-word mode

/** "Good Morning", "Good Afternoon", "Good Evening", "Good Night" based on current hour. */
function timeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good Morning";
  if (hour >= 12 && hour < 17) return "Good Afternoon";
  if (hour >= 17 && hour < 21) return "Good Evening";
  return "Good Night";
}

interface UseVoiceOptions {
  /** Called with the transcript of an actual command (wake word already stripped). */
  onCommand: (transcript: string) => void;
  lang?: string;
  /** If true, the mic automatically restarts listening after each command
   *  (hands-free "Hey VSmart" style). Off by default — costs more CPU/mic
   *  usage since it's effectively always listening. */
  wakeWordEnabled?: boolean;
}

export type VoiceControls = ReturnType<typeof useVoice>;

/**
 * Voice hook backed by Vosk (via the main process — no internet needed).
 * By default the mic is OFF and only starts capturing when you call
 * startListening() / toggleListening(). If wakeWordEnabled is true, it
 * automatically restarts after each command for hands-free use.
 */
export function useVoice({ onCommand, lang = "en-IN", wakeWordEnabled = false }: UseVoiceOptions) {
  const [listening, setListening] = useState(false); // true while the mic is actively capturing
  const [interimText, setInterimText] = useState("");
  const [supported, setSupported] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const onCommandRef = useRef(onCommand);
  onCommandRef.current = onCommand;

  const wakeWordEnabledRef = useRef(wakeWordEnabled);
  wakeWordEnabledRef.current = wakeWordEnabled;

  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accumulatedRef = useRef("");

  const stopCapture = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    accumulatedRef.current = "";
    processorRef.current?.disconnect();
    processorRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setListening(false);
    setInterimText("");
  }, []);

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(stopCapture, SILENCE_TIMEOUT_MS);
  }, [stopCapture]);

  // Forward-declared so dispatchAccumulated can trigger a wake-word restart.
  const startListeningRef = useRef<() => void>(() => {});

  const dispatchAccumulated = useCallback(() => {
    const trimmed = accumulatedRef.current.trim();
    stopCapture(); // release the mic after dispatching

    if (trimmed) {
      const lower = trimmed.toLowerCase();
      const afterWake = lower.includes(WAKE_WORD)
        ? lower.split(WAKE_WORD).pop()?.trim() ?? ""
        : trimmed;

      if (lower.includes(WAKE_WORD) && !afterWake) {
        speak(`${timeBasedGreeting()} Boss, how can I help?`, lang);
      } else {
        onCommandRef.current(afterWake || trimmed);
      }
    }

    if (wakeWordEnabledRef.current) {
      setTimeout(() => startListeningRef.current(), WAKE_RESTART_DELAY_MS);
    }
  }, [lang, stopCapture]);

  const handleFinal = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      resetSilenceTimer();
      return;
    }

    // Vosk sometimes splits one sentence into several "final" pieces on a
    // brief pause. Accumulate them and wait for a real pause before treating
    // the command as complete, instead of cutting off mid-sentence.
    accumulatedRef.current = (accumulatedRef.current + " " + trimmed).trim();
    resetSilenceTimer();

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(dispatchAccumulated, FINAL_DEBOUNCE_MS);
  }, [dispatchAccumulated, resetSilenceTimer]);

  const handlePartial = useCallback((text: string) => {
    setInterimText(text);
    resetSilenceTimer();
  }, [resetSilenceTimer]);

  useEffect(() => {
    if (!window.vsmart?.voice) {
      setSupported(false);
      setErrorMsg("Voice bridge not available.");
      return;
    }

    window.vsmart.voice.onPartialResult(handlePartial);
    window.vsmart.voice.onFinalResult(handleFinal);

    return () => {
      stopCapture();
    };
  }, [handleFinal, handlePartial, stopCapture]);

  const startListening = useCallback(async () => {
    if (listening) return;

    // Never start listening while VSmart is talking — otherwise the mic
    // picks up its own voice from the speakers and creates a feedback loop.
    if (window.speechSynthesis?.speaking) {
      // In wake-word mode, just retry shortly instead of surfacing an error.
      if (wakeWordEnabledRef.current) {
        setTimeout(() => startListeningRef.current(), 800);
      } else {
        setErrorMsg("Wait, I'm still talking...");
      }
      return;
    }

    setErrorMsg(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: SAMPLE_RATE,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      streamRef.current = stream;

      const audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const float32 = e.inputBuffer.getChannelData(0);
        const int16 = new Int16Array(float32.length);

        for (let i = 0; i < float32.length; i++) {
          const s = Math.max(-1, Math.min(1, float32[i]));
          int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        window.vsmart.voice.sendAudioChunk(int16.buffer);
      };

      // ScriptProcessorNode needs to be connected to something to keep firing
      // onaudioprocess, but connecting it straight to speakers plays the raw
      // mic input live — causing an acoustic feedback loop (mic hears itself
      // via the speakers) that corrupts recognition. Route through a silent
      // (zero-gain) node instead so the graph stays active without any sound.
      const silentGain = audioCtx.createGain();
      silentGain.gain.value = 0;

      source.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(audioCtx.destination);

      window.vsmart.voice.reset();
      setListening(true);
      resetSilenceTimer();
    } catch (err) {
      setErrorMsg(
        err instanceof Error && err.name === "NotAllowedError"
          ? "Microphone access denied. Please allow microphone permission."
          : "Could not access the microphone."
      );
    }
  }, [listening, resetSilenceTimer]);

  startListeningRef.current = startListening;

  const stopListening = useCallback(() => {
    stopCapture();
  }, [stopCapture]);

  const toggleListening = useCallback(() => {
    if (listening) stopListening();
    else startListening();
  }, [listening, startListening, stopListening]);

  // Kick off the first listen automatically when wake-word mode is turned on.
  useEffect(() => {
    if (wakeWordEnabled && !listening) {
      startListeningRef.current();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wakeWordEnabled]);

  return {
    listening,
    wakeActive: listening,
    interimText,
    supported,
    errorMsg,
    startListening,
    stopListening,
    toggleListening
  };
}

// ---------- Speech output (TTS) ----------

let preferredVoiceName: string | null = null;

/** Sets a specific voice by name (from Settings) — overrides the automatic Indian-voice picker. */
export function setPreferredVoice(name: string | null) {
  preferredVoiceName = name;
}

export function getPreferredVoice(): string | null {
  return preferredVoiceName;
}

/** Speaks text out loud using the OS's built-in (offline) speech synthesis, preferring an Indian female voice. */
export function speak(text: string, lang = "en-IN") {
  if (!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 1;

  const pickVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return;

    // A voice explicitly chosen in Settings always wins.
    if (preferredVoiceName) {
      const chosen = voices.find(v => v.name === preferredVoiceName);
      if (chosen) {
        utterance.voice = chosen;
        utterance.lang = chosen.lang;
        return;
      }
    }

    // Newer Windows 11 "Natural"/Neural voices sound far clearer than the
    // legacy SAPI voices (Heera) — prefer them if installed.
    const naturalNames = ["neerja", "swara"];
    const legacyFemaleNames = ["heera", "priya", "kalpana", "veena", "raveena", "indian female"];

    const naturalVoice =
      voices.find(v => naturalNames.some(n => v.name.toLowerCase().includes(n)) &&
        (v.lang?.toLowerCase() === "en-in" || v.lang?.toLowerCase() === "hi-in"));

    const legacyVoice =
      voices.find(v => v.lang?.toLowerCase() === "en-in" && legacyFemaleNames.some(n => v.name.toLowerCase().includes(n))) ||
      voices.find(v => v.lang?.toLowerCase() === "en-in" && v.name.toLowerCase().includes("female")) ||
      voices.find(v => v.lang?.toLowerCase() === "en-in") ||
      voices.find(v => v.lang?.toLowerCase() === "hi-in");

    const chosen = naturalVoice ?? legacyVoice;
    if (chosen) {
      utterance.voice = chosen;
      utterance.lang = chosen.lang;
    }
  };

  if (window.speechSynthesis.getVoices().length) {
    pickVoice();
  } else {
    window.speechSynthesis.onvoiceschanged = pickVoice;
  }

  window.speechSynthesis.speak(utterance);
}