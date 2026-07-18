console.log("VSMART PRELOAD LOADED");
import {
  contextBridge,
  ipcRenderer
} from "electron";

contextBridge.exposeInMainWorld("vsmart", {
  minimize: () =>
    ipcRenderer.send("window-minimize"),

  maximize: () =>
    ipcRenderer.send("window-maximize"),

  close: () =>
    ipcRenderer.send("window-close"),

  saveMemory: (key: string, value: string) =>
    ipcRenderer.invoke("memory-save", key, value),

  getMemory: (key: string) =>
    ipcRenderer.invoke("memory-get", key),

  getAllMemory: () =>
    ipcRenderer.invoke("memory-all"),

  system: {
    getInfo: () =>
      ipcRenderer.invoke("system:getInfo")
  },

  voice: {
    sendAudioChunk: (chunk: ArrayBuffer) =>
      ipcRenderer.send("voice:audio-chunk", chunk),

    reset: () =>
      ipcRenderer.send("voice:reset"),

    onPartialResult: (callback: (text: string) => void) => {
      ipcRenderer.on("voice:partial-result", (_e, text) => callback(text));
    },

    onFinalResult: (callback: (text: string) => void) => {
      ipcRenderer.on("voice:final-result", (_e, text) => callback(text));
    }
  }
});