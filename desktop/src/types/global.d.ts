export {};

declare global{
interface Window{
vsmart:{
minimize:()=>void;
maximize:()=>void;
close:()=>void;

onToggleStart:(callback:()=>void)=>()=>void;

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

vision:{
captureScreen:()=>Promise<string|null>;
};

launcher:{
getLibraryApps:()=>Promise<{
name:string;
id:string;
icon:string;
customIcon?:string;
pinned:boolean;
}[]>;

getPinnedApps:()=>Promise<{
name:string;
id:string;
icon:string;
customIcon?:string;
pinned:boolean;
}[]>;

addLibraryApps:(apps:{name:string;id:string;icon:string;path?:string}[])=>Promise<{
name:string;
id:string;
icon:string;
customIcon?:string;
pinned:boolean;
}[]>;

removeLibraryApp:(id:string)=>Promise<{
name:string;
id:string;
icon:string;
customIcon?:string;
pinned:boolean;
}[]>;

reorderLibraryApps:(orderedIds:string[])=>Promise<{
name:string;
id:string;
icon:string;
customIcon?:string;
pinned:boolean;
}[]>;

setPinned:(id:string,pinned:boolean)=>Promise<{
name:string;
id:string;
icon:string;
customIcon?:string;
pinned:boolean;
}[]>;

pickIcon:(id:string)=>Promise<{
name:string;
id:string;
icon:string;
customIcon?:string;
pinned:boolean;
}[]>;

pickImage:()=>Promise<string|null>;
};


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