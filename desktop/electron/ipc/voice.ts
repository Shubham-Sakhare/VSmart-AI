import { ipcMain, BrowserWindow } from "electron";
import { processAudioChunk, resetRecognizer } from "../services/voskService.js";

export function registerVoiceIPC() {

  ipcMain.on("voice:audio-chunk", (event, chunk: ArrayBuffer) => {

    const buffer = Buffer.from(chunk);
    const result = processAudioChunk(buffer);

    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;

    if (result.final && result.final.trim()) {
      win.webContents.send("voice:final-result", result.final.trim());
    } else if (result.partial && result.partial.trim()) {
      win.webContents.send("voice:partial-result", result.partial.trim());
    }
  });

  ipcMain.on("voice:reset", () => {
    resetRecognizer();
  });

}