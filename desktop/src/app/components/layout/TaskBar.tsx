import{useEffect,useMemo,useState,useCallback,useRef}from"react";
import{
Mic,
X,
Monitor,
Pin,
PinOff,
Pencil,
Trash2,
Search,
AppWindow
}from"lucide-react";
import type{Page}from"./MainLayout";
import type{VoiceControls}from"../../voice/useVoice";
import{
LAUNCHER_CATALOG,
HOME_PAGE,
LAUNCHER_APPS_KEY,
DEFAULT_LAUNCHER_STATE,
parseLauncherState,
type LauncherAppsState,
type LauncherCatalogEntry
}from"./launcherCatalog";
import"./TaskBar.css";

interface TaskBarProps{
activePage:Page;
onNavigate:(page:Page)=>void;
voice:VoiceControls;
}

interface LibraryApp{
name:string;
id:string;
icon:string;
customIcon?:string;
pinned:boolean;
}

function AppIcon({src,size=28}:{src?:string;size?:number}){
if(!src){
return(
<div className="app-icon-fallback" style={{width:size,height:size}}>
<AppWindow size={Math.round(size*0.6)}/>
</div>
);
}
return(
<img
src={src}
width={size}
height={size}
loading="lazy"
className="system-app-icon"
draggable={false}
/>
);
}

export default function TaskBar({activePage,onNavigate,voice}:TaskBarProps){

const[startOpen,setStartOpen]=useState(false);
const[libraryOpen,setLibraryOpen]=useState(false);
const[libraryApps,setLibraryApps]=useState<LibraryApp[]>([]);
const[libraryLoading,setLibraryLoading]=useState(false);
const[search,setSearch]=useState("");

const[launcherState,setLauncherState]=useState<LauncherAppsState>(DEFAULT_LAUNCHER_STATE);

const[menuFor,setMenuFor]=useState<string|null>(null);
const[launcherMenuFor,setLauncherMenuFor]=useState<Page|null>(null);
const[now,setNow]=useState(new Date());
const menuRef=useRef<HTMLDivElement|null>(null);
const launcherMenuRef=useRef<HTMLDivElement|null>(null);

const[draggedLauncherPage,setDraggedLauncherPage]=useState<Page|null>(null);
const[draggedSystemAppId,setDraggedSystemAppId]=useState<string|null>(null);

useEffect(()=>{
const t=setInterval(()=>setNow(new Date()),1000);
return()=>clearInterval(t);
},[]);

// Alt+Space (registered globally in the main process) toggles the V-logo
// launcher panel - works even when the app isn't focused, like PowerToys Run.
useEffect(()=>{
const unsubscribe=window.vsmart.onToggleStart(()=>{
setStartOpen(prev=>!prev);
});
return unsubscribe;
},[]);

// Escape closes whatever panel/popup is currently open, wherever focus is.
useEffect(()=>{
const onKeyDown=(e:KeyboardEvent)=>{
if(e.key!=="Escape")return;
setStartOpen(false);
setLibraryOpen(false);
setMenuFor(null);
setLauncherMenuFor(null);
};
document.addEventListener("keydown",onKeyDown);
return()=>document.removeEventListener("keydown",onKeyDown);
},[]);

const loadLauncherState=useCallback(()=>{
window.vsmart.getMemory(LAUNCHER_APPS_KEY)
.then(raw=>setLauncherState(parseLauncherState(raw)))
.catch(()=>setLauncherState(DEFAULT_LAUNCHER_STATE));
},[]);

const persistLauncherState=useCallback((next:LauncherAppsState)=>{
setLauncherState(next);
window.vsmart.saveMemory(LAUNCHER_APPS_KEY,JSON.stringify(next)).catch(()=>{});
},[]);

// Load once up front (needed for the taskbar quick row) and refresh
// whenever the V-logo panel opens (so Settings additions show up live).
useEffect(()=>{
loadLauncherState();
},[loadLauncherState]);

useEffect(()=>{
if(startOpen)loadLauncherState();
},[startOpen,loadLauncherState]);

// Pinned taskbar row just needs the library list (it's a tiny local JSON
// file, not the heavy system scan), so load it once up front.
useEffect(()=>{
window.vsmart.launcher.getLibraryApps()
.then(setLibraryApps)
.catch(()=>setLibraryApps([]));
},[]);

// Refresh every time the System icon panel opens, so apps added from
// Settings show up immediately without needing a restart.
useEffect(()=>{
if(!libraryOpen)return;

setLibraryLoading(true);

window.vsmart.launcher.getLibraryApps()
.then(setLibraryApps)
.catch(()=>{})
.finally(()=>setLibraryLoading(false));
},[libraryOpen]);

useEffect(()=>{
if(!menuFor&&!launcherMenuFor)return;

const close=(e:MouseEvent)=>{
if(menuRef.current&&!menuRef.current.contains(e.target as Node)){
setMenuFor(null);
}
if(launcherMenuRef.current&&!launcherMenuRef.current.contains(e.target as Node)){
setLauncherMenuFor(null);
}
};

document.addEventListener("mousedown",close);
return()=>document.removeEventListener("mousedown",close);
},[menuFor,launcherMenuFor]);

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

const addedLauncherApps=useMemo(
()=>LAUNCHER_CATALOG.filter(a=>launcherState.added.includes(a.page)),
[launcherState.added]
);

// Command Center always shows in the taskbar by default; everything else
// only shows once explicitly pinned.
const pinnedLauncherApps=useMemo(
()=>launcherState.pinned
.filter(page=>page!==HOME_PAGE)
.map(page=>addedLauncherApps.find(a=>a.page===page))
.filter((a):a is LauncherCatalogEntry=>Boolean(a)),
[addedLauncherApps,launcherState.pinned]
);

const homeEntry=LAUNCHER_CATALOG.find(a=>a.page===HOME_PAGE)!;

const pinnedTaskbarApps=useMemo(
()=>libraryApps.filter(a=>a.pinned),
[libraryApps]
);

const filteredLibraryApps=useMemo(()=>{
const q=search.trim().toLowerCase();
if(!q)return libraryApps;
return libraryApps.filter(a=>a.name.toLowerCase().includes(q));
},[libraryApps,search]);

const togglePin=useCallback((app:LibraryApp)=>{
window.vsmart.launcher.setPinned(app.id,!app.pinned)
.then(setLibraryApps)
.catch(()=>{});
setMenuFor(null);
},[]);

const reorderSystemPinned=useCallback((draggedId:string,targetId:string)=>{
if(draggedId===targetId)return;

setLibraryApps(prev=>{
const pinnedIds=prev.filter(a=>a.pinned).map(a=>a.id);
const fromIndex=pinnedIds.indexOf(draggedId);
const toIndex=pinnedIds.indexOf(targetId);
if(fromIndex===-1||toIndex===-1)return prev;

const reorderedPinned=[...pinnedIds];
reorderedPinned.splice(fromIndex,1);
reorderedPinned.splice(toIndex,0,draggedId);

const fullOrder=[...reorderedPinned,...prev.filter(a=>!a.pinned).map(a=>a.id)];
window.vsmart.launcher.reorderLibraryApps(fullOrder).then(setLibraryApps).catch(()=>{});

// optimistic local reorder while the write completes
const byId=new Map(prev.map(a=>[a.id,a]));
return fullOrder.map(id=>byId.get(id)!).filter(Boolean);
});
},[]);

const handleRemove=useCallback((id:string)=>{
window.vsmart.launcher.removeLibraryApp(id)
.then(setLibraryApps)
.catch(()=>{});
setMenuFor(null);
},[]);

const handleEditIcon=useCallback((id:string)=>{
window.vsmart.launcher.pickIcon(id)
.then(setLibraryApps)
.catch(()=>{});
setMenuFor(null);
},[]);

const toggleLauncherPin=useCallback((page:Page)=>{
const isPinned=launcherState.pinned.includes(page);
const nextPinned=isPinned
?launcherState.pinned.filter(p=>p!==page)
:[...launcherState.pinned,page];
persistLauncherState({...launcherState,pinned:nextPinned});
setLauncherMenuFor(null);
},[launcherState,persistLauncherState]);

const reorderLauncherPinned=useCallback((draggedPage:Page,targetPage:Page)=>{
if(draggedPage===targetPage)return;

const fromIndex=launcherState.pinned.indexOf(draggedPage);
const toIndex=launcherState.pinned.indexOf(targetPage);
if(fromIndex===-1||toIndex===-1)return;

const reordered=[...launcherState.pinned];
reordered.splice(fromIndex,1);
reordered.splice(toIndex,0,draggedPage);

persistLauncherState({...launcherState,pinned:reordered});
},[launcherState,persistLauncherState]);

const removeLauncherApp=useCallback((page:Page)=>{
persistLauncherState({
...launcherState,
added:launcherState.added.filter(p=>p!==page),
pinned:launcherState.pinned.filter(p=>p!==page)
});
setLauncherMenuFor(null);
},[launcherState,persistLauncherState]);

const editLauncherIcon=useCallback((page:Page)=>{
window.vsmart.launcher.pickImage().then(dataUrl=>{
if(!dataUrl)return;
persistLauncherState({
...launcherState,
customIcons:{...launcherState.customIcons,[page]:dataUrl}
});
}).catch(()=>{});
setLauncherMenuFor(null);
},[launcherState,persistLauncherState]);

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
{addedLauncherApps.map(app=>{
const custom=launcherState.customIcons[app.page];
const isHome=app.page===HOME_PAGE;
const isPinned=launcherState.pinned.includes(app.page);
return(
<div className="pinned-app-wrap library-tile-wrap" key={app.page}>
<button
className={activePage===app.page?"start-tile active system-tile":"start-tile system-tile"}
onClick={()=>launch(app.page)}
onContextMenu={e=>{
if(isHome)return;
e.preventDefault();
setLauncherMenuFor(prev=>prev===app.page?null:app.page);
}}
>
{custom?<AppIcon src={custom}/>:app.icon}
<span>{app.label}</span>
{isPinned&&!isHome&&<span className="pinned-badge" title="Pinned to taskbar"><Pin size={10}/></span>}
</button>

{launcherMenuFor===app.page&&(
<div className="pinned-app-menu library-menu" ref={launcherMenuRef}>
<button onClick={()=>toggleLauncherPin(app.page)}>
{isPinned?<PinOff size={13}/>:<Pin size={13}/>}
{isPinned?"Unpin from taskbar":"Pin to taskbar"}
</button>
<button onClick={()=>editLauncherIcon(app.page)}>
<Pencil size={13}/> Edit icon
</button>
<button className="danger" onClick={()=>removeLauncherApp(app.page)}>
<Trash2 size={13}/> Remove
</button>
</div>
)}
</div>
);
})}
</div>
</div>
</div>
)}

{libraryOpen&&(
<div className="taskbar-overlay" onClick={()=>setLibraryOpen(false)}>
<div className="start-menu" onClick={e=>e.stopPropagation()}>
<div className="start-menu-header">
<span>System Apps</span>
<button className="start-close" onClick={()=>setLibraryOpen(false)}>
<X size={16}/>
</button>
</div>

{libraryApps.length>4&&(
<div className="app-search">
<Search size={14}/>
<input
type="text"
placeholder="Search your apps..."
value={search}
onChange={e=>setSearch(e.target.value)}
/>
</div>
)}

{libraryLoading&&libraryApps.length===0?(
<div className="apps-loading">Loading...</div>
):libraryApps.length===0?(
<div className="apps-empty">
No apps added yet.<br/>Go to Settings → Add System App to add some.
</div>
):(
<div className="start-grid">
{filteredLibraryApps.map(app=>(
<div className="pinned-app-wrap library-tile-wrap" key={app.id}>
<button
className="start-tile system-tile"
onClick={()=>window.vsmart.launchSystemApp(app.id)}
onContextMenu={e=>{
e.preventDefault();
setMenuFor(prev=>prev===app.id?null:app.id);
}}
title={app.name}
>
<AppIcon src={app.customIcon||app.icon}/>
<span>{app.name}</span>
{app.pinned&&<span className="pinned-badge" title="Pinned to taskbar"><Pin size={10}/></span>}
</button>

{menuFor===app.id&&(
<div className="pinned-app-menu library-menu" ref={menuRef}>
<button onClick={()=>togglePin(app)}>
{app.pinned?<PinOff size={13}/>:<Pin size={13}/>}
{app.pinned?"Unpin from taskbar":"Pin to taskbar"}
</button>
<button onClick={()=>handleEditIcon(app.id)}>
<Pencil size={13}/> Edit icon
</button>
<button className="danger" onClick={()=>handleRemove(app.id)}>
<Trash2 size={13}/> Remove
</button>
</div>
)}
</div>
))}
</div>
)}
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
onClick={()=>setLibraryOpen(prev=>!prev)}
title="System Apps"
>
<Monitor size={25}/>
</button>

<div className="taskbar-pinned">
<button
className={activePage===HOME_PAGE?"taskbar-icon active":"taskbar-icon"}
onClick={()=>onNavigate(HOME_PAGE)}
title={homeEntry.label}
>
{launcherState.customIcons[HOME_PAGE]
?<AppIcon src={launcherState.customIcons[HOME_PAGE]} size={18}/>
:homeEntry.icon}
{activePage===HOME_PAGE&&<span className="running-dot"/>}
</button>

{pinnedLauncherApps.map(app=>(
<button
key={app.page}
draggable
onDragStart={()=>setDraggedLauncherPage(app.page)}
onDragOver={e=>e.preventDefault()}
onDrop={e=>{
e.preventDefault();
if(draggedLauncherPage)reorderLauncherPinned(draggedLauncherPage,app.page);
setDraggedLauncherPage(null);
}}
onDragEnd={()=>setDraggedLauncherPage(null)}
className={
(activePage===app.page?"taskbar-icon active":"taskbar-icon")+
(draggedLauncherPage===app.page?" dragging":"")
}
onClick={()=>onNavigate(app.page)}
onContextMenu={e=>{
e.preventDefault();
toggleLauncherPin(app.page);
}}
title={app.label}
>
{launcherState.customIcons[app.page]
?<AppIcon src={launcherState.customIcons[app.page]} size={18}/>
:app.icon}
{activePage===app.page&&<span className="running-dot"/>}
</button>
))}

{pinnedTaskbarApps.length>0&&<div className="taskbar-divider"/>}

{pinnedTaskbarApps.map(app=>(
<button
key={app.id}
draggable
onDragStart={()=>setDraggedSystemAppId(app.id)}
onDragOver={e=>e.preventDefault()}
onDrop={e=>{
e.preventDefault();
if(draggedSystemAppId)reorderSystemPinned(draggedSystemAppId,app.id);
setDraggedSystemAppId(null);
}}
onDragEnd={()=>setDraggedSystemAppId(null)}
className={"taskbar-icon pinned-app"+(draggedSystemAppId===app.id?" dragging":"")}
title={app.name}
onClick={()=>window.vsmart.launchSystemApp(app.id)}
onContextMenu={e=>{
e.preventDefault();
togglePin(app);
}}
>
<AppIcon src={app.customIcon||app.icon} size={22}/>
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
<div className="tray-clock">
<span>{timeStr}</span>
<span className="tray-date">{dateStr}</span>
</div>
</div>
</footer>
</>
);
}