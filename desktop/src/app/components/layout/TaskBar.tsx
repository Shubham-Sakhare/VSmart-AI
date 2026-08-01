import{useEffect,useState}from"react";
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
Sparkles,
Mic,
Wifi,
Volume2,
X,
Monitor
}from"lucide-react";
import type{Page}from"./MainLayout";
import type{VoiceControls}from"../../voice/useVoice";
import"./TaskBar.css";

interface TaskBarProps{
activePage:Page;
onNavigate:(page:Page)=>void;
voice:VoiceControls;
}

interface SystemApp{
name:string;
id:string;
icon:string;
}

const PINNED:{page:Page;icon:React.ReactNode;label:string}[]=[
{page:"dashboard",icon:<LayoutGrid size={18}/>,label:"Command Center"},
{page:"memory",icon:<Sparkles size={18}/>,label:"VSmart AI"},
{page:"agents",icon:<LineChart size={18}/>,label:"Analysis"},
{page:"tasks",icon:<ClipboardList size={18}/>,label:"Tasks"},
{page:"calendar",icon:<Calendar size={18}/>,label:"Calendar"}
];

const ALL_APPS:{page:Page;icon:React.ReactNode;label:string}[]=[
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

let appsLoaded=false;

export default function TaskBar({activePage,onNavigate,voice}:TaskBarProps){

const[startOpen,setStartOpen]=useState(false);
const[windowsOpen,setWindowsOpen]=useState(false);
const[systemApps,setSystemApps]=useState<SystemApp[]>([]);
const[now,setNow]=useState(new Date());

useEffect(()=>{
const t=setInterval(()=>setNow(new Date()),1000);
return()=>clearInterval(t);
},[]);

useEffect(()=>{
if(windowsOpen&&!appsLoaded){
window.vsmart.getInstalledApps()
.then(apps=>{
setSystemApps(apps);
appsLoaded=true;
})
.catch(()=>{
setSystemApps([]);
});
}
},[windowsOpen]);

const timeStr=now.toLocaleTimeString([],{
hour:"2-digit",
minute:"2-digit"
});

const dateStr=now.toLocaleDateString([],{
day:"2-digit",
month:"short"
});

const launch=(page:Page)=>{
onNavigate(page);
setStartOpen(false);
};

return(
<>
{startOpen&&(
<div className="taskbar-overlay" onClick={()=>setStartOpen(false)}>
<div className="start-menu" onClick={e=>e.stopPropagation()}>
<div className="start-menu-header">
<span>VSmart Apps</span>
<button className="start-close" onClick={()=>setStartOpen(false)}>
<X size={16}/>
</button>
</div>
<div className="start-grid">
{ALL_APPS.map(app=>(
<button
key={app.page}
className={activePage===app.page?"start-tile active":"start-tile"}
onClick={()=>launch(app.page)}
>
{app.icon}
<span>{app.label}</span>
</button>
))}
</div>
</div>
</div>
)}

{windowsOpen&&(
<div className="taskbar-overlay" onClick={()=>setWindowsOpen(false)}>
<div className="start-menu" onClick={e=>e.stopPropagation()}>
<div className="start-menu-header">
<span>Windows Apps</span>
<button className="start-close" onClick={()=>setWindowsOpen(false)}>
<X size={16}/>
</button>
</div>
<div className="start-grid">
{systemApps.map(app=>(
<button
key={app.id}
className="start-tile"
onClick={()=>window.vsmart.launchSystemApp(app.id)}
>
{app.icon?
<img src={app.icon} width="28" height="28"/>:
<img 
src={app.icon}
className="system-app-icon"
/>
}
<span>{app.name}</span>
</button>
))}
</div>
</div>
</div>
)}

<footer className="taskbar">
<button
className="taskbar-start"
onClick={()=>setStartOpen(prev=>!prev)}
title="VSmart Start"
>
<div className="start-logo">V</div>
</button>

<button
className="taskbar-start windows-button"
onClick={()=>setWindowsOpen(prev=>!prev)}
title="Windows Apps"
>
<Monitor size={25}/>
</button>

<div className="taskbar-pinned">
{PINNED.map(app=>(
<button
key={app.page}
className={activePage===app.page?"taskbar-icon active":"taskbar-icon"}
onClick={()=>onNavigate(app.page)}
title={app.label}
>
{app.icon}
{activePage===app.page&&<span className="running-dot"/>}
</button>
))}

<button
className={voice.listening?"taskbar-icon mic active listening":"taskbar-icon mic"}
onClick={voice.toggleListening}
title="Talk to VSmart"
>
<Mic size={18}/>
</button>
</div>

<div className="taskbar-tray">
<Wifi size={15}/>
<Volume2 size={15}/>
<div className="tray-clock">
<span>{timeStr}</span>
<span className="tray-date">{dateStr}</span>
</div>
</div>
</footer>
</>
);
}