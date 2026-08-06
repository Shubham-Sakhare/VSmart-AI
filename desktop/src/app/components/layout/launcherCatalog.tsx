import{
LayoutGrid,
Cpu,
LineChart,
ClipboardList,
Calendar,
MessageSquare,
Library,
Wrench,
Workflow,
Sparkles
}from"lucide-react";
import type{Page}from"./MainLayout";

export interface LauncherCatalogEntry{
page:Page;
icon:React.ReactNode;
label:string;
}

// Every internal page that CAN show in the V-logo "VSmart Apps" panel.
export const LAUNCHER_CATALOG:LauncherCatalogEntry[]=[
{page:"dashboard",icon:<LayoutGrid size={22}/>,label:"Command Center"},
{page:"aicore",icon:<Cpu size={22}/>,label:"AI Core"},
{page:"agents",icon:<LineChart size={22}/>,label:"Analysis"},
{page:"tasks",icon:<ClipboardList size={22}/>,label:"Tasks"},
{page:"calendar",icon:<Calendar size={22}/>,label:"Calendar"},
{page:"memory",icon:<Sparkles size={22}/>,label:"VSmart AI"},
{page:"conversations",icon:<MessageSquare size={22}/>,label:"Conversations"},
{page:"knowledge",icon:<Library size={22}/>,label:"Knowledge Base"},
{page:"tools",icon:<Wrench size={22}/>,label:"Tools & Skills"},
{page:"workflows",icon:<Workflow size={22}/>,label:"Workflows"}
];

// Command Center is the home page - it always shows in the taskbar and can't
// be removed/unpinned, so the user never loses their way back in.
export const HOME_PAGE:Page="dashboard";

export const LAUNCHER_APPS_KEY="launcher_apps_state";

export interface LauncherAppsState{
added:string[];
pinned:string[];
customIcons:Record<string,string>;
}

export const DEFAULT_LAUNCHER_STATE:LauncherAppsState={
added:LAUNCHER_CATALOG.map(a=>a.page),
pinned:[HOME_PAGE],
customIcons:{}
};

export function parseLauncherState(raw:string|null|undefined):LauncherAppsState{

if(!raw)return DEFAULT_LAUNCHER_STATE;

try{

const parsed=JSON.parse(raw);

return{
added:Array.isArray(parsed.added)?parsed.added:DEFAULT_LAUNCHER_STATE.added,
pinned:Array.isArray(parsed.pinned)?parsed.pinned:DEFAULT_LAUNCHER_STATE.pinned,
customIcons:parsed.customIcons&&typeof parsed.customIcons==="object"?parsed.customIcons:{}
};

}catch{
return DEFAULT_LAUNCHER_STATE;
}

}
