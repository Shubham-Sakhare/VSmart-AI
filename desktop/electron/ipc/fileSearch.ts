import { ipcMain } from "electron";
import { searchFiles, openFile, openFileLocation } from "../services/fileSearchService.js";

export function registerFileSearchIPC() {

  ipcMain.handle("filesearch:search", async (_, query: string) => {
    try {
      return await searchFiles(query);
    } catch (error) {
      console.error("filesearch:search IPC error:", error);
      return [];
    }
  });

  ipcMain.handle("filesearch:openFile", async (_, path: string) => {
    try {
      openFile(path);
      return true;
    } catch (error) {
      console.error("filesearch:openFile IPC error:", error);
      return false;
    }
  });

  ipcMain.handle("filesearch:openLocation", async (_, path: string) => {
    try {
      openFileLocation(path);
      return true;
    } catch (error) {
      console.error("filesearch:openLocation IPC error:", error);
      return false;
    }
  });

}