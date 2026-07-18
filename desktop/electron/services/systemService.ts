import { exec } from "child_process";


const appMap: Record<string,string> = {

  chrome:"chrome",
  browser:"chrome",

  vscode:"code",
  code:"code",

  calculator:"calc",
  calc:"calc",

  notepad:"notepad",

  explorer:"explorer",
  file:"explorer"

};



export function openApplication(
  appName:string
):Promise<string>{


 return new Promise((resolve,reject)=>{


 const key = appName
 .toLowerCase()
 .trim();


 const command = appMap[key] ?? appName;



 exec(
   `start "" "${command}"`,
   (error)=>{


    if(error){

      reject(error.message);
      return;

    }


    resolve(
      `${appName} opened successfully`
    );


   }
 );


 });


}