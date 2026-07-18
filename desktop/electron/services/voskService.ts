import vosk from "vosk-koffi";
import path from "path";
import { app } from "electron";

// The model folder must be placed at: desktop/vosk-model
// Download "vosk-model-small-en-in-0.4" (Indian English, ~45MB) from:
// https://alphacephei.com/vosk/models
// Extract it and rename the extracted folder to exactly "vosk-model",
// placed at the root of the desktop/ folder (same level as package.json).

let model: any = null;
let recognizer: any = null;

const MODEL_PATH = app.isPackaged
  ? path.join(process.resourcesPath, "vosk-model")
  : path.join(process.cwd(), "vosk-model");

export function initVosk(): boolean {
  try {
    vosk.setLogLevel(-1); // silence Vosk's own console spam

    model = new vosk.Model(MODEL_PATH);
    recognizer = new vosk.Recognizer({ model, sampleRate: 16000 });

    console.log("Vosk model loaded from:", MODEL_PATH);
    return true;
  } catch (error) {
    console.error(
      "Failed to load Vosk model. Make sure the 'vosk-model' folder exists at:",
      MODEL_PATH,
      error
    );
    return false;
  }
}

/**
 * Feed a chunk of 16-bit PCM audio (mono, 16kHz) to the recognizer.
 * Returns { partial } while speech is ongoing, or { final } once a pause is detected.
 */
export function processAudioChunk(buffer: Buffer): { partial?: string; final?: string } {
  if (!recognizer) return {};

  const isFinal = recognizer.acceptWaveform(buffer);

  if (isFinal) {
    const result = recognizer.result();
    return { final: result.text as string };
  } else {
    const result = recognizer.partialResult();
    return { partial: result.partial as string };
  }
}

export function resetRecognizer() {
  if (recognizer) {
    recognizer.free();
  }
  if (model) {
    recognizer = new vosk.Recognizer({ model, sampleRate: 16000 });
  }
}