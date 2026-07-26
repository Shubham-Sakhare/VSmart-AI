export {};

declare global {

  interface Window {

    vsmart: {

      minimize: () => void;
      maximize: () => void;
      close: () => void;

      openSystem: (
        appName: string
      ) => Promise<string>;

      saveMemory: (
        key: string,
        value: string
      ) => Promise<any>;

      getMemory: (
        key: string
      ) => Promise<any>;

      getAllMemory: () => Promise<any>;

      writeCode: (
        code: string,
        language?: string
      ) => Promise<string>;

      systemControl: (
        action: string,
        value?: string | number
      ) => Promise<string>;

      getMarketFeed: () => Promise<{
        symbol: string;
        label: string;
        price: string;
        changePercent: number;
        up: boolean;
      }[]>;

      getAnalysisFeed: () => Promise<{
        symbol: string;
        label: string;
        price: string;
        changePercent: number;
        up: boolean;
      }[]>;

      getChartAnalysis: (symbol: string, label: string, timeframe?: string) => Promise<{
        symbol: string;
        label: string;
        candles: { time: number; open: number; high: number; low: number; close: number }[];
        currentPrice: number;
        support: number;
        resistance: number;
        sma20: number | null;
        sma50: number | null;
        rsi14: number | null;
        signal: "Bullish" | "Bearish" | "Neutral";
        tradeSignals: {
          index: number;
          type: "buy" | "sell";
          price: number;
          stopLoss: number;
          target: number;
        }[];
      } | null>;

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