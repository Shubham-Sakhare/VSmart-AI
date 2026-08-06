import { useEffect, useState } from "react";
import { X, Settings as SettingsIcon, ChevronDown, Search, Check } from "lucide-react";
import { setPreferredVoice, getPreferredVoice } from "../../voice/useVoice";
import type { ReplyLang } from "../../../llm/openrouter";
import type { Page } from "./MainLayout";
import {
  LAUNCHER_CATALOG,
  LAUNCHER_APPS_KEY,
  DEFAULT_LAUNCHER_STATE,
  parseLauncherState,
  type LauncherAppsState
} from "./launcherCatalog";
import "./SettingsPanel.css";

interface SidebarItem {
  page: Page;
  label: string;
  enabled: boolean;
}

interface SystemApp {
  name: string;
  id: string;
  icon: string;
}

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  replyLang: ReplyLang;
  onLangChange: (lang: ReplyLang) => void;
  wakeWordEnabled: boolean;
  onWakeWordChange: (enabled: boolean) => void;
  sidebarEnabled: boolean;
  sidebarItems: SidebarItem[];
  onSidebarChange: (enabled: boolean, items: SidebarItem[]) => void;
}

export default function SettingsPanel({
  open,
  onClose,
  replyLang,
  onLangChange,
  wakeWordEnabled,
  onWakeWordChange,
  sidebarEnabled,
  sidebarItems,
  onSidebarChange
}: SettingsPanelProps) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState(getPreferredVoice() ?? "");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Add System App
  const [addAppsOpen, setAddAppsOpen] = useState(false);
  const [allApps, setAllApps] = useState<SystemApp[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [appSearch, setAppSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  // Add Launcher App (internal pages: Dashboard, Analysis, Tasks, etc.)
  const [addPagesOpen, setAddPagesOpen] = useState(false);
  const [launcherState, setLauncherState] = useState<LauncherAppsState>(DEFAULT_LAUNCHER_STATE);
  const [selectedPages, setSelectedPages] = useState<Set<Page>>(new Set());
  const [addingPages, setAddingPages] = useState(false);
  const [pagesJustAdded, setPagesJustAdded] = useState(false);

  useEffect(() => {
    if (!open || !("speechSynthesis" in window)) return;
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, [open]);

  useEffect(() => {
    if (!addAppsOpen || allApps.length > 0) return;
    setAppsLoading(true);
    window.vsmart.getInstalledApps()
      .then(setAllApps)
      .catch(() => setAllApps([]))
      .finally(() => setAppsLoading(false));
  }, [addAppsOpen, allApps.length]);

  // Refresh every time this section opens, so removals made from the V-logo
  // panel are reflected here right away.
  useEffect(() => {
    if (!addPagesOpen) return;
    window.vsmart.getMemory(LAUNCHER_APPS_KEY)
      .then(raw => setLauncherState(parseLauncherState(raw)))
      .catch(() => setLauncherState(DEFAULT_LAUNCHER_STATE));
  }, [addPagesOpen]);

  if (!open) return null;

  const handleVoiceChange = (name: string) => {
    setSelectedVoice(name);
    setPreferredVoice(name || null);
  };

  const toggleSidebarItem = (page: Page) => {
    const updated = sidebarItems.map(item =>
      item.page === page
        ? { ...item, enabled: !item.enabled }
        : item
    );
    onSidebarChange(sidebarEnabled, updated);
  };

  const filteredApps = allApps.filter(a =>
    a.name.toLowerCase().includes(appSearch.trim().toLowerCase())
  );

  const toggleAppSelected = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddApps = async () => {
    if (selectedIds.size === 0) return;
    setAdding(true);
    try {
      const toAdd = allApps.filter(a => selectedIds.has(a.id));
      await window.vsmart.launcher.addLibraryApps(toAdd);
      setSelectedIds(new Set());
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2000);
    } finally {
      setAdding(false);
    }
  };

  // Only offer catalog pages that aren't already showing in the V-logo panel.
  const availablePages = LAUNCHER_CATALOG.filter(
    entry => !launcherState.added.includes(entry.page)
  );

  const togglePageSelected = (page: Page) => {
    setSelectedPages(prev => {
      const next = new Set(prev);
      if (next.has(page)) next.delete(page);
      else next.add(page);
      return next;
    });
  };

  const handleAddPages = async () => {
    if (selectedPages.size === 0) return;
    setAddingPages(true);
    try {
      const next: LauncherAppsState = {
        ...launcherState,
        added: [...launcherState.added, ...Array.from(selectedPages)]
      };
      await window.vsmart.saveMemory(LAUNCHER_APPS_KEY, JSON.stringify(next));
      setLauncherState(next);
      setSelectedPages(new Set());
      setPagesJustAdded(true);
      setTimeout(() => setPagesJustAdded(false), 2000);
    } finally {
      setAddingPages(false);
    }
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={e => e.stopPropagation()}>

        <div className="settings-header">
          <div className="settings-title">
            <SettingsIcon size={16}/>
            <span>Settings</span>
          </div>

          <button className="settings-close" onClick={onClose}>
            <X size={16}/>
          </button>
        </div>

        <div className="settings-body">

          <div className="settings-row">
            <div className="settings-label">
              <strong>Reply Language</strong>
              <span>Text and voice replies will always be in this language.</span>
            </div>

            <div className="settings-control lang-toggle-settings">
              <button className={replyLang==="en"?"lang-btn active":"lang-btn"} onClick={()=>onLangChange("en")}>EN</button>
              <button className={replyLang==="hi"?"lang-btn active":"lang-btn"} onClick={()=>onLangChange("hi")}>HI</button>
            </div>
          </div>

          <div className="settings-row">
            <div className="settings-label">
              <strong>AI Voice</strong>
              <span>Which voice VSmart speaks with.</span>
            </div>

            <div className="settings-control">
              <select className="voice-select" value={selectedVoice} onChange={e=>handleVoiceChange(e.target.value)}>
                <option value="">Auto (recommended)</option>
                {voices.map(v=>(
                  <option key={v.name} value={v.name}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="settings-row">
            <div className="settings-label">
              <strong>Wake Word</strong>
              <span>Hands-free — say "VSmart" anytime.</span>
            </div>

            <button className={wakeWordEnabled?"switch on":"switch"} onClick={()=>onWakeWordChange(!wakeWordEnabled)}>
              <span className="switch-knob"/>
            </button>
          </div>

          <div className="sidebar-settings-box">

            <button
              className="sidebar-dropdown"
              onClick={()=>setSidebarOpen(!sidebarOpen)}
            >
              <span>Sidebar Settings</span>
              <ChevronDown size={16} className={sidebarOpen?"rotate":""}/>
            </button>

            {sidebarOpen && (
              <div className="sidebar-dropdown-content">

                <div className="settings-row">
                  <div className="settings-label">
                    <strong>Enable Sidebar</strong>
                    <span>Show or hide complete sidebar.</span>
                  </div>

                  <button
                    className={sidebarEnabled?"switch on":"switch"}
                    onClick={()=>onSidebarChange(!sidebarEnabled,sidebarItems)}
                  >
                    <span className="switch-knob"/>
                  </button>
                </div>

                {sidebarEnabled && sidebarItems.map(item=>(
                  <div className="settings-row" key={item.page}>

                    <div className="settings-label">
                      <strong>{item.label}</strong>
                    </div>

                    <button
                      className={item.enabled?"switch on":"switch"}
                      onClick={()=>toggleSidebarItem(item.page)}
                    >
                      <span className="switch-knob"/>
                    </button>

                  </div>
                ))}

              </div>
            )}

          </div>

          <div className="sidebar-settings-box">

            <button
              className="sidebar-dropdown"
              onClick={()=>setAddAppsOpen(!addAppsOpen)}
            >
              <span>Add System App</span>
              <ChevronDown size={16} className={addAppsOpen?"rotate":""}/>
            </button>

            {addAppsOpen && (
              <div className="sidebar-dropdown-content">

                <div className="app-picker-search">
                  <Search size={14}/>
                  <input
                    type="text"
                    placeholder="Search installed apps..."
                    value={appSearch}
                    onChange={e=>setAppSearch(e.target.value)}
                  />
                </div>

                {appsLoading && allApps.length===0 ? (
                  <div className="app-picker-status">Loading apps...</div>
                ) : filteredApps.length===0 ? (
                  <div className="app-picker-status">No apps found</div>
                ) : (
                  <div className="app-picker-list">
                    {filteredApps.map(app=>{
                      const checked = selectedIds.has(app.id);
                      return (
                        <label className="app-picker-row" key={app.id}>
                          <span className={checked?"app-checkbox checked":"app-checkbox"}>
                            {checked && <Check size={12}/>}
                          </span>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={()=>toggleAppSelected(app.id)}
                          />
                          {app.icon ? (
                            <img src={app.icon} width={20} height={20} loading="lazy"/>
                          ) : (
                            <span className="app-picker-icon-fallback"/>
                          )}
                          <span className="app-picker-name">{app.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                <button
                  className="app-picker-add-btn"
                  disabled={selectedIds.size===0 || adding}
                  onClick={handleAddApps}
                >
                  {adding
                    ? "Adding..."
                    : justAdded
                    ? "Added ✓"
                    : selectedIds.size>0
                    ? `Add ${selectedIds.size} app${selectedIds.size>1?"s":""}`
                    : "Add"}
                </button>

              </div>
            )}

          </div>

          <div className="sidebar-settings-box">

            <button
              className="sidebar-dropdown"
              onClick={()=>setAddPagesOpen(!addPagesOpen)}
            >
              <span>Add Launcher App</span>
              <ChevronDown size={16} className={addPagesOpen?"rotate":""}/>
            </button>

            {addPagesOpen && (
              <div className="sidebar-dropdown-content">

                {availablePages.length===0 ? (
                  <div className="app-picker-status">All launcher apps are already added.</div>
                ) : (
                  <div className="app-picker-list">
                    {availablePages.map(entry=>{
                      const checked = selectedPages.has(entry.page);
                      return (
                        <label className="app-picker-row" key={entry.page}>
                          <span className={checked?"app-checkbox checked":"app-checkbox"}>
                            {checked && <Check size={12}/>}
                          </span>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={()=>togglePageSelected(entry.page)}
                          />
                          <span className="app-picker-name">{entry.label}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {availablePages.length>0 && (
                  <button
                    className="app-picker-add-btn"
                    disabled={selectedPages.size===0 || addingPages}
                    onClick={handleAddPages}
                  >
                    {addingPages
                      ? "Adding..."
                      : pagesJustAdded
                      ? "Added ✓"
                      : selectedPages.size>0
                      ? `Add ${selectedPages.size} app${selectedPages.size>1?"s":""}`
                      : "Add"}
                  </button>
                )}

              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}
