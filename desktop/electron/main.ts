import{app,BrowserWindow,ipcMain,session}from"electron";
import{createMainWindow}from"./windows/mainWindow.js";
import{registerWindowIPC}from"./ipc/window.js";
import{registerMemoryIPC}from"./ipc/memory.js";
import{openApplication,getInstalledApps,launchSystemApp}from"./services/systemService.js";
import{writeAndOpenCode}from"./services/codeWriterService.js";
import{registerSystemIPC}from"./ipc/system.js";
import{registerVoiceIPC}from"./ipc/voice.js";
import{registerSystemControlIPC}from"./ipc/systemControl.js";
import{registerMarketIPC}from"./ipc/market.js";
import{initVosk}from"./services/voskService.js";

let mainWindow:BrowserWindow|null=null;

app.whenReady().then(()=>{

session.defaultSession.setPermissionRequestHandler(
(_webContents,permission,callback)=>{
if(permission==="media"){
callback(true);
}else{
callback(false);
}
}
);

initVosk();
registerVoiceIPC();

mainWindow=createMainWindow();

registerWindowIPC(()=>mainWindow);
registerMemoryIPC();
registerSystemIPC();
registerSystemControlIPC();
registerMarketIPC();

ipcMain.handle(
"open-system",
async(_,appName:string)=>{
return await openApplication(appName);
}
);

ipcMain.handle(
"write-code",
async(_,code:string,language?:string)=>{
return await writeAndOpenCode(code,language);
}
);

ipcMain.handle(
"get-installed-apps",
async()=>{
return await getInstalledApps();
}
);

ipcMain.handle(
"launch-system-app",
async(_,appId:string)=>{
return await launchSystemApp(appId);
}
);

app.on("activate",()=>{
if(BrowserWindow.getAllWindows().length===0){
mainWindow=createMainWindow();
}
});

});

app.on("window-all-closed",()=>{
if(process.platform!=="darwin"){
app.quit();
}
});