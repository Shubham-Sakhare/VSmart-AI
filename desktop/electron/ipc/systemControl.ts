import { ipcMain } from "electron";
import {
  openSpecialFolder,
  setVolume,
  setBrightness,
  toggleWifi,
  toggleBluetooth,
  takeScreenshot,
  openRecycleBin,
  writeNotepad,
  restartPC,
  shutdownPC,
  cancelShutdown
} from "../services/systemControlService.js";

export interface ControlPayload {
  action: string;
  value?: string | number;
}

export function registerSystemControlIPC() {

  ipcMain.handle(
    "system:control",
    async (_, payload: ControlPayload) => {

      try {
        switch (payload.action) {
          case "openFolder":
            return await openSpecialFolder(String(payload.value ?? ""));

          case "setVolume":
            return await setVolume(Number(payload.value ?? 50));

          case "setBrightness":
            return await setBrightness(Number(payload.value ?? 50));

          case "wifiOn":
            return await toggleWifi("on");

          case "wifiOff":
            return await toggleWifi("off");

          case "bluetoothOn":
            return await toggleBluetooth("on");

          case "bluetoothOff":
            return await toggleBluetooth("off");

          case "screenshot":
            return await takeScreenshot();

          case "recycleBin":
            return await openRecycleBin();

          case "writeNotepad":
            return await writeNotepad(String(payload.value ?? ""));

          case "restart":
            return await restartPC();

          case "shutdown":
            return await shutdownPC();

          case "cancelShutdown":
            return await cancelShutdown();

          default:
            return `Unknown system control action: ${payload.action}`;
        }
      } catch (err) {
        return `Something went wrong: ${err}`;
      }

    }
  );

}