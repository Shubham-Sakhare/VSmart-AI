import { ipcMain } from "electron";

import {
  saveMemory,
  getMemory,
  getAllMemory
} from "../database/memoryDB.js";

export function registerMemoryIPC() {

  ipcMain.handle("memory-save", (_, key, value) => {

    saveMemory(key, value);

    return {
      success: true,
      message: `Memory saved: ${key} = ${value}`,
    };

  });

  ipcMain.handle("memory-get", (_, key) => {
    return getMemory(key) ?? null;
  });

  ipcMain.handle("memory-all", () => {
    return getAllMemory();
  });

}