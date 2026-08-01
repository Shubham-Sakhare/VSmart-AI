console.log("VSMART PRELOAD LOADED");

import{contextBridge,ipcRenderer}from"electron";

contextBridge.exposeInMainWorld("vsmart",{

minimize:()=>ipcRenderer.send("window-minimize"),

maximize:()=>ipcRenderer.send("window-maximize"),

close:()=>ipcRenderer.send("window-close"),

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