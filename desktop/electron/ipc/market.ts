import { ipcMain } from "electron";
import { getMarketFeed, getAnalysisFeed, getChartAnalysis, type Timeframe } from "../services/marketDataService.js";

export function registerMarketIPC() {

  ipcMain.handle("market:getFeed", async () => {
    try {
      return await getMarketFeed();
    } catch (err) {
      console.error("Market feed error:", err);
      return [];
    }
  });

  ipcMain.handle("market:getAnalysisFeed", async () => {
    try {
      return await getAnalysisFeed();
    } catch (err) {
      console.error("Analysis feed error:", err);
      return [];
    }
  });

  ipcMain.handle("market:getChartAnalysis", async (_, symbol: string, label: string, timeframe?: Timeframe) => {
    try {
      return await getChartAnalysis(symbol, label, timeframe);
    } catch (err) {
      console.error("Chart analysis error:", err);
      return null;
    }
  });

}