
// src/services/voskService.ts
import { join } from 'path';
import { existsSync, mkdirSync, createWriteStream } from 'fs';
import { app } from 'electron';
import { get } from 'https';

const MODEL_URL = 'https://alphacephei.com/vosk/models/vosk-model-small-en-in-0.4.zip';
const MODEL_DIR = join(app.getPath('userData'), 'vosk-model');

export class VoskService {
  private model: any = null;
  private recognizer: any = null;
  private isReady = false;

  async initialize(): Promise<boolean> {
    try {
      // Dynamic import since vosk is a native module
      const vosk = require('vosk');
      
      const modelPath = join(MODEL_DIR, 'vosk-model-small-en-in-0.4');
      
      if (!existsSync(modelPath)) {
        console.log('[Vosk] Model not found, downloading Indian English model...');
        await this.downloadModel();
      }

      vosk.setLogLevel(-1); // Suppress verbose logs
      this.model = new vosk.Model(modelPath);
      this.recognizer = new vosk.Recognizer({
        model: this.model,
        sampleRate: 16000
      });
      
      this.isReady = true;
      console.log('[Vosk] Indian English model loaded successfully');
      return true;
    } catch (error) {
      console.error('[Vosk] Failed to initialize:', error);
      return false;
    }
  }

  processAudio(audioBuffer: Buffer): string | null {
    if (!this.isReady || !this.recognizer) return null;
    
    if (this.recognizer.acceptWaveform(audioBuffer)) {
      const result = JSON.parse(this.recognizer.result());
      return result.text || null;
    }
    return null;
  }

  getPartialResult(): string {
    if (!this.recognizer) return '';
    const partial = JSON.parse(this.recognizer.partialResult());
    return partial.partial || '';
  }

  reset(): void {
    if (this.recognizer) {
      this.recognizer.reset();
    }
  }

  private async downloadModel(): Promise<void> {
    // Download and extract model
    if (!existsSync(MODEL_DIR)) {
      mkdirSync(MODEL_DIR, { recursive: true });
    }
    
    return new Promise((resolve, reject) => {
      const zipPath = join(MODEL_DIR, 'model.zip');
      const file = createWriteStream(zipPath);
      
      get(MODEL_URL, (response) => {
        response.pipe(file);
        file.on('finish', async () => {
          file.close();
          // Extract zip
          const extract = require('extract-zip');
          await extract(zipPath, { dir: MODEL_DIR });
          resolve();
        });
      }).on('error', reject);
    });
  }

  destroy(): void {
    if (this.recognizer) {
      this.recognizer.free();
      this.recognizer = null;
    }
    if (this.model) {
      this.model.free();
      this.model = null;
    }
    this.isReady = false;
  }
}
