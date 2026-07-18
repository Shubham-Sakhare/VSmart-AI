import { ipcMain } from "electron";
import { getSystemInfo } from "../services/systemMonitor.js";


export function registerSystemIPC(){


  ipcMain.handle(
    "system:getInfo",
    async ()=>{

      try{

        const data =
          await getSystemInfo();


        return data;


      }catch(error){


        console.error(
          "System info IPC error:",
          error
        );
        

        return null;

      }

    }
  );


} 