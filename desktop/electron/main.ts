import { app, BrowserWindow, ipcMain, session } from "electron";
import { createMainWindow } from "./windows/mainWindow.js";
import { registerWindowIPC } from "./ipc/window.js";
import { registerMemoryIPC } from "./ipc/memory.js";
import { openApplication } from "./services/systemService.js";
import { registerSystemIPC } from "./ipc/system.js";
import { registerVoiceIPC } from "./ipc/voice.js";
import { initVosk } from "./services/voskService.js";


let mainWindow: BrowserWindow | null = null;



app.whenReady().then(() => {

  // Allow microphone access for voice commands (Electron blocks by default).
  session.defaultSession.setPermissionRequestHandler(
    (_webContents, permission, callback) => {
      if (permission === "media") {
        callback(true);
      } else {
        callback(false);
      }
    }
  );

  // Offline speech recognition (Vosk) — no internet/API key needed.
  initVosk();
  registerVoiceIPC();

  mainWindow = createMainWindow();
  registerWindowIPC(() => mainWindow);
  registerMemoryIPC();
  registerSystemIPC();
  
  // SYSTEM COMMAND IPC
  ipcMain.handle(
    "open-system",
    async (_, appName:string)=>{

      return await openApplication(appName);

    }
  );



  app.on("activate", () => {


    if(BrowserWindow.getAllWindows().length === 0){

      mainWindow = createMainWindow();

    }


  });


});



app.on("window-all-closed",()=>{


 if(process.platform !== "darwin"){

   app.quit();

 }


});