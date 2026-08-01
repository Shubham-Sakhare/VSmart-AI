import {exec} from "child_process";
import {openInSession} from "./browserSessionService.js";

interface WindowsApp{
name:string;
id:string;
icon:string;
}

let installedAppsCache:WindowsApp[]|null=null;

export function getInstalledApps():Promise<WindowsApp[]>{

if(installedAppsCache){
return Promise.resolve(installedAppsCache);
}

return new Promise((resolve)=>{

exec(
`powershell -Command "Get-StartApps | ConvertTo-Json -Compress"`,
(error,stdout)=>{

if(error){
resolve([]);
return;
}

try{

const data=JSON.parse(stdout);

const apps=Array.isArray(data)
?data
:[data];

const list=apps
.filter((app:any)=>app.Name&&app.AppID)
.map((app:any)=>({

name:app.Name,
id:app.AppID,
icon:""

}))
.filter(
(app,index,self)=>
index===self.findIndex(
a=>a.id===app.id
)
);


installedAppsCache=list;

resolve(list);


}catch{

resolve([]);

}

}

);

});

}


export function clearAppsCache(){
installedAppsCache=null;
}


export function launchSystemApp(appId:string):Promise<boolean>{

return new Promise((resolve)=>{

exec(
`powershell -Command "Start-Process 'shell:AppsFolder\\${appId}'"`,
(error)=>{

if(error){
resolve(false);
}else{
resolve(true);
}

}

);

});

}


/* VOICE APP MAP */

const appMap:Record<string,string>={
chrome:"chrome",
browser:"chrome",
vscode:"code",
code:"code",
calculator:"calc",
calc:"calc",
notepad:"notepad",
explorer:"explorer",
file:"explorer",
wordpad:"wordpad",
paint:"mspaint",
"task manager":"taskmgr",
settings:"ms-settings:"
};


const siteMap:Record<string,string>={
youtube:"https://youtube.com",
google:"https://google.com",
gmail:"https://mail.google.com",
facebook:"https://facebook.com",
fb:"https://facebook.com",
instagram:"https://instagram.com",
whatsapp:"https://web.whatsapp.com",
github:"https://github.com",
chatgpt:"https://chat.openai.com"
};


const searchableSites:Record<string,string>={
youtube:"https://www.youtube.com/results?search_query=",
google:"https://www.google.com/search?q="
};


let lastSite:string|null=null;


function runCommand(command:string):Promise<void>{

return new Promise((resolve,reject)=>{

exec(
`start "" "${command}"`,
(error)=>{

if(error)
reject(error);
else
resolve();

}

);

});

}


function matchesWord(text:string,word:string){

return new RegExp(
`\\b${word}\\b`,
"i"
).test(text);

}


function findKey(
text:string,
map:Record<string,string>
){

return Object.keys(map)
.sort((a,b)=>b.length-a.length)
.find(k=>matchesWord(text,k));

}


export async function openApplication(
rawInput:string
):Promise<string>{

const key=rawInput.toLowerCase().trim();


if(!key)
return "";


const appKey=findKey(
key,
appMap
);


if(appKey){

try{

await runCommand(
appMap[appKey]
);

lastSite=null;

return "";

}catch{

return "";

}

}


const siteKey=findKey(
key,
siteMap
);


if(siteKey){

try{

await openInSession(
siteKey,
siteMap[siteKey]
);

lastSite=siteKey;

return "";

}catch{

return "";

}

}


try{

await runCommand(key);

return "";

}catch{

try{

await openInSession(
"google",
`https://www.google.com/search?q=${encodeURIComponent(rawInput)}`
);

return "";

}catch{

return "";

}

}

}