import { ipcMain } from "electron";
import { getSystemInfo } from "../services/systemMonitor.js";
import { searchOnYoutube, getChromeProfiles, openChromeProfile } from "../services/systemService.js";


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

  ipcMain.handle("system:searchYoutube", async (_, query: string) => {
    try {
      return await searchOnYoutube(query);
    } catch (error) {
      console.error("system:searchYoutube IPC error:", error);
      return "";
    }
  });

  ipcMain.handle("system:getChromeProfiles", async () => {
    try {
      return getChromeProfiles();
    } catch (error) {
      console.error("system:getChromeProfiles IPC error:", error);
      return [];
    }
  });

  ipcMain.handle("system:openChromeProfile", async (_, directory: string) => {
    try {
      openChromeProfile(directory);
      return true;
    } catch (error) {
      console.error("system:openChromeProfile IPC error:", error);
      return false;
    }
  });


}