console.log("VSMART PRELOAD LOADED");

import{contextBridge,ipcRenderer}from"electron";

contextBridge.exposeInMainWorld("vsmart",{

minimize:()=>ipcRenderer.send("window-minimize"),

maximize:()=>ipcRenderer.send("window-maximize"),

close:()=>ipcRenderer.send("window-close"),

onToggleStart:(callback:()=>void)=>{
const handler=()=>callback();
ipcRenderer.on("shortcut:toggle-start",handler);
return()=>ipcRenderer.removeListener("shortcut:toggle-start",handler);
},

saveMemory:(key:string,value:string)=>
ipcRenderer.invoke("memory-save",key,value),

getMemory:(key:string)=>
ipcRenderer.invoke("memory-get",key),

getAllMemory:()=>
ipcRenderer.invoke("memory-all"),

openSystem:(appName:string)=>
ipcRenderer.invoke("open-system",appName),

writeCode:(code:string,language?:string)=>
ipcRenderer.invoke("write-code",code,language),


systemControl:(action:string,value?:string|number)=>
ipcRenderer.invoke("system:control",{action,value}),


getMarketFeed:()=>
ipcRenderer.invoke("market:getFeed"),

getAnalysisFeed:()=>
ipcRenderer.invoke("market:getAnalysisFeed"),

getChartAnalysis:(symbol:string,label:string,timeframe?:string)=>
ipcRenderer.invoke("market:getChartAnalysis",symbol,label,timeframe),



/* WINDOWS APPS */

getInstalledApps:()=>
ipcRenderer.invoke("get-installed-apps"),


launchSystemApp:(appId:string)=>
ipcRenderer.invoke("launch-system-app",appId),


vision:{

captureScreen:()=>
ipcRenderer.invoke("vision:captureScreen")

},


launcher:{

getLibraryApps:()=>
ipcRenderer.invoke("launcher:getLibraryApps"),

getPinnedApps:()=>
ipcRenderer.invoke("launcher:getPinnedApps"),

addLibraryApps:(apps:{name:string;id:string;icon:string;path?:string}[])=>
ipcRenderer.invoke("launcher:addLibraryApps",apps),

removeLibraryApp:(id:string)=>
ipcRenderer.invoke("launcher:removeLibraryApp",id),

reorderLibraryApps:(orderedIds:string[])=>
ipcRenderer.invoke("launcher:reorderLibraryApps",orderedIds),

setPinned:(id:string,pinned:boolean)=>
ipcRenderer.invoke("launcher:setPinned",id,pinned),

pickIcon:(id:string)=>
ipcRenderer.invoke("launcher:pickIcon",id),

pickImage:()=>
ipcRenderer.invoke("launcher:pickImage")

},




system:{
getInfo:()=>
ipcRenderer.invoke("system:getInfo")
},



voice:{

sendAudioChunk:(chunk:ArrayBuffer)=>
ipcRenderer.send("voice:audio-chunk",chunk),


reset:()=>
ipcRenderer.send("voice:reset"),


onPartialResult:(callback:(text:string)=>void)=>{

ipcRenderer.removeAllListeners("voice:partial-result");

ipcRenderer.on(
"voice:partial-result",
(_e,text)=>callback(text)
);

},


onFinalResult:(callback:(text:string)=>void)=>{

ipcRenderer.removeAllListeners("voice:final-result");

ipcRenderer.on(
"voice:final-result",
(_e,text)=>callback(text)
);

}

}

});