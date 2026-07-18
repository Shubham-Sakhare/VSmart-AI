import { useCallback, useEffect, useRef, useState } from "react";

const WAKE_WORD = "vsmart";
const SAMPLE_RATE = 16000; // Vosk model expects 16kHz mono PCM16
const SILENCE_TIMEOUT_MS = 6000; // auto-stop the mic if nothing is heard for this long

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
}

export type VoiceControls = ReturnType<typeof useVoice>;

/**
 * On-demand voice hook backed by Vosk (via the main process — no internet needed).
 * The microphone is OFF by default and only starts capturing when you call
 * startListening() / toggleListening() (e.g. the mic button, or a hotkey).
 * It auto-stops after a final result or a few seconds of silence, so there's
 * no idle background CPU/mic usage.
 */
export function useVoice({ onCommand, lang = "en-IN" }: UseVoiceOptions) {
  const [listening, setListening] = useState(false); // true while the mic is actively capturing
  const [interimText, setInterimText] = useState("");
  const [supported, setSupported] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const onCommandRef = useRef(onCommand);
  onCommandRef.current = onCommand;

  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopCapture = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
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

  const handleFinal = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      resetSilenceTimer();
      return;
    }

    const lower = trimmed.toLowerCase();
    const afterWake = lower.includes(WAKE_WORD)
      ? lower.split(WAKE_WORD).pop()?.trim() ?? ""
      : trimmed;

    stopCapture(); // one command per trigger — release the mic immediately after

    if (lower.includes(WAKE_WORD) && !afterWake) {
      speak(`${timeBasedGreeting()} Boss, how can I help?`, lang);
    } else {
      onCommandRef.current(afterWake || trimmed);
    }
  }, [lang, resetSilenceTimer, stopCapture]);

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

      source.connect(processor);
      processor.connect(audioCtx.destination);

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

  const stopListening = useCallback(() => {
    stopCapture();
  }, [stopCapture]);

  const toggleListening = useCallback(() => {
    if (listening) stopListening();
    else startListening();
  }, [listening, startListening, stopListening]);

  return {
    listening,
    wakeActive: listening, // kept for compatibility with existing UI (mic is "active" only while triggered)
    interimText,
    supported,
    errorMsg,
    startListening,
    stopListening,
    toggleListening
  };
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

    const femaleNames = ["heera", "priya", "kalpana", "veena", "raveena", "indian female"];

    const indianFemale =
      voices.find(v => v.lang?.toLowerCase() === "en-in" && femaleNames.some(n => v.name.toLowerCase().includes(n))) ||
      voices.find(v => v.lang?.toLowerCase() === "en-in" && v.name.toLowerCase().includes("female")) ||
      voices.find(v => v.lang?.toLowerCase() === "en-in") ||
      voices.find(v => v.lang?.toLowerCase() === "hi-in");

    if (indianFemale) utterance.voice = indianFemale;
  };

  if (window.speechSynthesis.getVoices().length) {
    pickVoice();
  } else {
    window.speechSynthesis.onvoiceschanged = pickVoice;
  }

  window.speechSynthesis.speak(utterance);
}