import{app,BrowserWindow,ipcMain,session,globalShortcut}from"electron";
import{createMainWindow}from"./windows/mainWindow.js";
import{registerWindowIPC}from"./ipc/window.js";
import{registerMemoryIPC}from"./ipc/memory.js";
import{openApplication}from"./services/systemService.js";
import{writeAndOpenCode}from"./services/codeWriterService.js";
import{registerSystemIPC}from"./ipc/system.js";
import{registerVoiceIPC}from"./ipc/voice.js";
import{registerSystemControlIPC}from"./ipc/systemControl.js";
import{registerMarketIPC}from"./ipc/market.js";
import{registerLauncherIPC}from"./ipc/launcher.js";
import{registerVisionIPC}from"./ipc/vision.js";
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
registerLauncherIPC();
registerVisionIPC();

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

app.on("activate",()=>{
if(BrowserWindow.getAllWindows().length===0){
mainWindow=createMainWindow();
}
});

// Alt+Space toggles the V-logo "VSmart Apps" launcher panel from anywhere,
// even when the app isn't focused - works the same way PowerToys Run /
// most third-party launchers bind their hotkey.
globalShortcut.register("Alt+Space",()=>{
if(mainWindow){
if(!mainWindow.isVisible())mainWindow.show();
if(mainWindow.isMinimized())mainWindow.restore();
mainWindow.focus();
mainWindow.webContents.send("shortcut:toggle-start");
}
});

app.on("will-quit",()=>{
globalShortcut.unregisterAll();
});

});

app.on("window-all-closed",()=>{
if(process.platform!=="darwin"){
app.quit();
}
});