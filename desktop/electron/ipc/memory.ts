import { ipcMain } from "electron";

import {
  saveMemory,
  getMemory,
  getAllMemory,
  saveFact,
  getFact,
  getAllFacts,
  deleteFact,
  searchFacts
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

  /* ---------- long-term fact memory (vector/TF-IDF search) ---------- */

  ipcMain.handle("longmemory:saveFact", (_, key: string, value: string) => {
    try {
      saveFact(key, value);
      return true;
    } catch (error) {
      console.error("longmemory:saveFact IPC error:", error);
      return false;
    }
  });

  ipcMain.handle("longmemory:getFact", (_, key: string) => {
    try {
      return getFact(key);
    } catch (error) {
      console.error("longmemory:getFact IPC error:", error);
      return null;
    }
  });

  ipcMain.handle("longmemory:searchFacts", (_, query: string, topK?: number) => {
    try {
      return searchFacts(query, topK ?? 5);
    } catch (error) {
      console.error("longmemory:searchFacts IPC error:", error);
      return [];
    }
  });

  ipcMain.handle("longmemory:getAllFacts", () => {
    try {
      return getAllFacts();
    } catch (error) {
      console.error("longmemory:getAllFacts IPC error:", error);
      return [];
    }
  });

  ipcMain.handle("longmemory:deleteFact", (_, key: string) => {
    try {
      return deleteFact(key);
    } catch (error) {
      console.error("longmemory:deleteFact IPC error:", error);
      return false;
    }
  });

}