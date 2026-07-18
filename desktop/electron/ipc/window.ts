import { ipcMain, BrowserWindow } from "electron";

export function registerWindowIPC(
  getWindow: () => BrowserWindow | null
) {

  ipcMain.on("window-minimize", () => {
    getWindow()?.minimize();
  });

  ipcMain.on("window-maximize", () => {

    const window = getWindow();

    if (!window) return;

    if (window.isMaximized()) {
      window.unmaximize();
    } else {
      window.maximize();
    }

  });

  ipcMain.on("window-close", () => {
    getWindow()?.close();
  });

}