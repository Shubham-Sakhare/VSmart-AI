export {};

declare global{
interface Window{
vsmart:{
minimize:()=>void;
maximize:()=>void;
close:()=>void;

openSystem:(appName:string)=>Promise<string>;

saveMemory:(key:string,value:string)=>Promise<any>;
getMemory:(key:string)=>Promise<any>;
getAllMemory:()=>Promise<any>;

writeCode:(code:string,language?:string)=>Promise<string>;

systemControl:(action:string,value?:string|number)=>Promise<string>;

getMarketFeed:()=>Promise<{
symbol:string;
label:string;
price:string;
changePercent:number;
up:boolean;
}[]>;

getAnalysisFeed:()=>Promise<{
symbol:string;
label:string;
price:string;
changePercent:number;
up:boolean;
}[]>;

getChartAnalysis:(symbol:string,label:string,timeframe?:string)=>Promise<any>;

getInstalledApps:()=>Promise<{
name:string;
id:string;
icon:string;
}[]>;

launchSystemApp:(appId:string)=>Promise<boolean>;

system:{
getInfo:()=>Promise<{
cpu:number;
ram:number;
storage:number;
}>;
};

voice:{
sendAudioChunk:(chunk:ArrayBuffer)=>void;
reset:()=>void;
onPartialResult:(callback:(text:string)=>void)=>void;
onFinalResult:(callback:(text:string)=>void)=>void;
};

};
}
}