export {};

declare global {
  interface Window {
    vsmart: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      openSystem: (appName: string) => Promise<string>;
      saveMemory: (key: string, value: string) => Promise<any>;
      getMemory: (key: string) => Promise<any>;
      getAllMemory: () => Promise<any>;
      writeCode: (code: string, language?: string) => Promise<string>;
      system: {
        getInfo: () => Promise<{
          cpu: number;
          ram: number;
          storage: number;
        }>;
      };
      voice: {
        sendAudioChunk: (chunk: ArrayBuffer) => void;
        reset: () => void;
        onPartialResult: (callback: (text: string) => void) => void;
        onFinalResult: (callback: (text: string) => void) => void;
      };
    };
  }
}
