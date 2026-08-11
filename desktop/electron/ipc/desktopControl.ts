import { ipcMain } from "electron";
import {
  moveMouseTo,
  clickAt,
  getCursorPosition,
  typeText,
  pressKeyCombo,
} from "../services/desktopControlService.js";

export function registerDesktopControlIPC() {

  ipcMain.handle("desktopcontrol:move", async (_, x: number, y: number) => {
    try {
      return await moveMouseTo(x, y);
    } catch (error) {
      console.error("desktopcontrol:move IPC error:", error);
      return false;
    }
  });

  ipcMain.handle(
    "desktopcontrol:click",
    async (_, x: number, y: number, button: "left" | "right", doubleClick: boolean) => {
      try {
        return await clickAt(x, y, button, doubleClick);
      } catch (error) {
        console.error("desktopcontrol:click IPC error:", error);
        return false;
      }
    }
  );

  ipcMain.handle("desktopcontrol:getCursor", async () => {
    try {
      return await getCursorPosition();
    } catch (error) {
      console.error("desktopcontrol:getCursor IPC error:", error);
      return null;
    }
  });

  ipcMain.handle("desktopcontrol:type", async (_, text: string) => {
    try {
      return await typeText(text);
    } catch (error) {
      console.error("desktopcontrol:type IPC error:", error);
      return false;
    }
  });

  ipcMain.handle("desktopcontrol:pressKey", async (_, combo: string) => {
    try {
      return await pressKeyCombo(combo);
    } catch (error) {
      console.error("desktopcontrol:pressKey IPC error:", error);
      return false;
    }
  });

}