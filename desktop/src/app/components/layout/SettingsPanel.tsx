import { useEffect, useState } from "react";
import { X, Settings as SettingsIcon, ChevronDown, Search, Check } from "lucide-react";
import { setPreferredVoice, getPreferredVoice } from "../../voice/useVoice";
import type { ReplyLang } from "../../../llm/openrouter";
import type { Page } from "./MainLayout";
import { invalidateApiKeyCache } from "../../../llm/openrouter";
import { useTheme } from "../../hooks/useTheme";
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

type TaskbarPosition = "bottom" | "top" | "left" | "right";

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

  // Add Launcher App
  const [addPagesOpen, setAddPagesOpen] = useState(false);
  const [launcherState, setLauncherState] = useState<LauncherAppsState>(DEFAULT_LAUNCHER_STATE);
  const [selectedPages, setSelectedPages] = useState<Set<Page>>(new Set());
  const [addingPages, setAddingPages] = useState(false);
  const [pagesJustAdded, setPagesJustAdded] = useState(false);

  // Theme
  const { theme, setTheme, themes } = useTheme();
  const [themeOpen, setThemeOpen] = useState(false);

  // Taskbar settings
  const [taskbarOpen, setTaskbarOpen] = useState(false);
  const [taskbarPos, setTaskbarPos] = useState<TaskbarPosition>("bottom");
  const [taskbarAutoHide, setTaskbarAutoHide] = useState(false);

  // API Key settings
  const [apiKeyOpen, setApiKeyOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [keySaved, setKeySaved] = useState(false);
  const [savingKey, setSavingKey] = useState(false);

  useEffect(() => {
    if (!open || !("speechSynthesis" in window)) return;
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, [open]);

  useEffect(() => {
    if (!addAppsOpen || allApps.length > 0) return;
    setAppsLoading(true);
    window.vsmart
      .getInstalledApps()
      .then(setAllApps)
      .catch(() => setAllApps([]))
      .finally(() => setAppsLoading(false));
  }, [addAppsOpen, allApps.length]);

  useEffect(() => {
    if (!addPagesOpen) return;
    window.vsmart
      .getMemory(LAUNCHER_APPS_KEY)
      .then((raw) => setLauncherState(parseLauncherState(raw)))
      .catch(() => setLauncherState(DEFAULT_LAUNCHER_STATE));
  }, [addPagesOpen]);

  // Load taskbar settings when panel opens
  useEffect(() => {
    if (!open) return;

    window.vsmart
      .getMemory("vsmart_taskbar_position")
      .then((raw) => {
        if (raw === "top" || raw === "left" || raw === "right" || raw === "bottom") {
          setTaskbarPos(raw);
        }
      })
      .catch(() => {});

    window.vsmart
      .getMemory("vsmart_taskbar_autohide")
      .then((raw) => setTaskbarAutoHide(raw === "1" || raw === "true"))
      .catch(() => {});
  }, [open]);

  // Load API key status when panel opens
  useEffect(() => {
    if (!open) return;
    window.vsmart.apiKey
      .has()
      .then(setHasKey)
      .catch(() => setHasKey(false));
  }, [open]);

  if (!open) return null;

  const handleVoiceChange = (name: string) => {
    setSelectedVoice(name);
    setPreferredVoice(name || null);
  };

  const toggleSidebarItem = (page: Page) => {
    const updated = sidebarItems.map((item) =>
      item.page === page ? { ...item, enabled: !item.enabled } : item
    );
    onSidebarChange(sidebarEnabled, updated);
  };

  const filteredApps = allApps.filter((a) =>
    a.name.toLowerCase().includes(appSearch.trim().toLowerCase())
  );

  const toggleAppSelected = (id: string) => {
    setSelectedIds((prev) => {
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
      const toAdd = allApps.filter((a) => selectedIds.has(a.id));
      await window.vsmart.launcher.addLibraryApps(toAdd);
      setSelectedIds(new Set());
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2000);
    } finally {
      setAdding(false);
    }
  };

  const availablePages = LAUNCHER_CATALOG.filter(
    (entry) => !launcherState.added.includes(entry.page)
  );

  const togglePageSelected = (page: Page) => {
    setSelectedPages((prev) => {
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

  const handlePositionChange = (pos: TaskbarPosition) => {
  setTaskbarPos(pos);
  window.vsmart.saveMemory("vsmart_taskbar_position", pos).catch(() => {});
  // TaskBar ko turant batao
  window.dispatchEvent(
    new CustomEvent("vsmart-taskbar-settings", {
      detail: { position: pos }
    })
  );
};

const handleAutoHideChange = (enabled: boolean) => {
  setTaskbarAutoHide(enabled);
  window.vsmart.saveMemory("vsmart_taskbar_autohide", enabled ? "1" : "0").catch(() => {});
  window.dispatchEvent(
    new CustomEvent("vsmart-taskbar-settings", {
      detail: { autoHide: enabled }
    })
  );
};

const handleSaveApiKey = async () => {
  if (!apiKeyInput.trim()) return;
  setSavingKey(true);
  try {
    await window.vsmart.apiKey.save(apiKeyInput.trim());
    invalidateApiKeyCache();
    setHasKey(true);
    setApiKeyInput("");
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2000);
  } finally {
    setSavingKey(false);
  }
};

const handleClearApiKey = async () => {
  await window.vsmart.apiKey.clear();
  invalidateApiKeyCache();
  setHasKey(false);
};
  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <div className="settings-title">
            <SettingsIcon size={16} />
            <span>Settings</span>
          </div>

          <button className="settings-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="settings-body">
          {/* Reply Language */}
          <div className="settings-row">
            <div className="settings-label">
              <strong>Reply Language</strong>
              <span>Text and voice replies will always be in this language.</span>
            </div>

            <div className="settings-control lang-toggle-settings">
              <button
                className={replyLang === "en" ? "lang-btn active" : "lang-btn"}
                onClick={() => onLangChange("en")}
              >
                EN
              </button>
              <button
                className={replyLang === "hi" ? "lang-btn active" : "lang-btn"}
                onClick={() => onLangChange("hi")}
              >
                HI
              </button>
            </div>
          </div>

          {/* AI Voice */}
          <div className="settings-row">
            <div className="settings-label">
              <strong>AI Voice</strong>
              <span>Which voice VSmart speaks with.</span>
            </div>

            <div className="settings-control">
              <select
                className="voice-select"
                value={selectedVoice}
                onChange={(e) => handleVoiceChange(e.target.value)}
              >
                <option value="">Auto (recommended)</option>
                {voices.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Wake Word */}
          <div className="settings-row">
            <div className="settings-label">
              <strong>Wake Word</strong>
              <span>Hands-free — say "VSmart" anytime.</span>
            </div>

            <button
              className={wakeWordEnabled ? "switch on" : "switch"}
              onClick={() => onWakeWordChange(!wakeWordEnabled)}
            >
              <span className="switch-knob" />
            </button>
          </div>

          {/* Sidebar Settings */}
          <div className="sidebar-settings-box">
            <button
              className="sidebar-dropdown"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <span>Sidebar Settings</span>
              <ChevronDown size={16} className={sidebarOpen ? "rotate" : ""} />
            </button>

            {sidebarOpen && (
              <div className="sidebar-dropdown-content">
                <div className="settings-row">
                  <div className="settings-label">
                    <strong>Enable Sidebar</strong>
                    <span>Show or hide complete sidebar.</span>
                  </div>

                  <button
                    className={sidebarEnabled ? "switch on" : "switch"}
                    onClick={() => onSidebarChange(!sidebarEnabled, sidebarItems)}
                  >
                    <span className="switch-knob" />
                  </button>
                </div>

                {sidebarEnabled &&
                  sidebarItems.map((item) => (
                    <div className="settings-row" key={item.page}>
                      <div className="settings-label">
                        <strong>{item.label}</strong>
                      </div>

                      <button
                        className={item.enabled ? "switch on" : "switch"}
                        onClick={() => toggleSidebarItem(item.page)}
                      >
                        <span className="switch-knob" />
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Add System App */}
          <div className="sidebar-settings-box">
            <button
              className="sidebar-dropdown"
              onClick={() => setAddAppsOpen(!addAppsOpen)}
            >
              <span>Add System App</span>
              <ChevronDown size={16} className={addAppsOpen ? "rotate" : ""} />
            </button>

            {addAppsOpen && (
              <div className="sidebar-dropdown-content">
                <div className="app-picker-search">
                  <Search size={14} />
                  <input
                    type="text"
                    placeholder="Search installed apps..."
                    value={appSearch}
                    onChange={(e) => setAppSearch(e.target.value)}
                  />
                </div>

                {appsLoading && allApps.length === 0 ? (
                  <div className="app-picker-status">Loading apps...</div>
                ) : filteredApps.length === 0 ? (
                  <div className="app-picker-status">No apps found</div>
                ) : (
                  <div className="app-picker-list">
                    {filteredApps.map((app) => {
                      const checked = selectedIds.has(app.id);
                      return (
                        <label className="app-picker-row" key={app.id}>
                          <span className={checked ? "app-checkbox checked" : "app-checkbox"}>
                            {checked && <Check size={12} />}
                          </span>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleAppSelected(app.id)}
                          />
                          {app.icon ? (
                            <img src={app.icon} width={20} height={20} loading="lazy" />
                          ) : (
                            <span className="app-picker-icon-fallback" />
                          )}
                          <span className="app-picker-name">{app.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                <button
                  className="app-picker-add-btn"
                  disabled={selectedIds.size === 0 || adding}
                  onClick={handleAddApps}
                >
                  {adding
                    ? "Adding..."
                    : justAdded
                      ? "Added ✓"
                      : selectedIds.size > 0
                        ? `Add ${selectedIds.size} app${selectedIds.size > 1 ? "s" : ""}`
                        : "Add"}
                </button>
              </div>
            )}
          </div>

          {/* Add Launcher App */}
          <div className="sidebar-settings-box">
            <button
              className="sidebar-dropdown"
              onClick={() => setAddPagesOpen(!addPagesOpen)}
            >
              <span>Add Launcher App</span>
              <ChevronDown size={16} className={addPagesOpen ? "rotate" : ""} />
            </button>

            {addPagesOpen && (
              <div className="sidebar-dropdown-content">
                {availablePages.length === 0 ? (
                  <div className="app-picker-status">
                    All launcher apps are already added.
                  </div>
                ) : (
                  <div className="app-picker-list">
                    {availablePages.map((entry) => {
                      const checked = selectedPages.has(entry.page);
                      return (
                        <label className="app-picker-row" key={entry.page}>
                          <span className={checked ? "app-checkbox checked" : "app-checkbox"}>
                            {checked && <Check size={12} />}
                          </span>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePageSelected(entry.page)}
                          />
                          <span className="app-picker-name">{entry.label}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {availablePages.length > 0 && (
                  <button
                    className="app-picker-add-btn"
                    disabled={selectedPages.size === 0 || addingPages}
                    onClick={handleAddPages}
                  >
                    {addingPages
                      ? "Adding..."
                      : pagesJustAdded
                        ? "Added ✓"
                        : selectedPages.size > 0
                          ? `Add ${selectedPages.size} app${selectedPages.size > 1 ? "s" : ""}`
                          : "Add"}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ===== Theme ===== */}
          <div className="sidebar-settings-box">
            <button
              className="sidebar-dropdown"
              onClick={() => setThemeOpen(!themeOpen)}
            >
              <span>Theme</span>
              <ChevronDown size={16} className={themeOpen ? "rotate" : ""} />
            </button>

            {themeOpen && (
              <div className="sidebar-dropdown-content">
                <div className="theme-grid">
                  {themes.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={theme === t.id ? "theme-swatch active" : "theme-swatch"}
                      onClick={() => setTheme(t.id)}
                      title={t.label}
                    >
                      <span
                        className="theme-swatch-preview"
                        style={{
                          background: `linear-gradient(135deg, ${t.swatch[0]}, ${t.swatch[1]}, ${t.swatch[2]})`
                        }}
                      >
                        {theme === t.id && <Check size={13} />}
                      </span>
                      <span className="theme-swatch-name">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ===== Taskbar Settings ===== */}
          <div className="sidebar-settings-box">
            <button
              className="sidebar-dropdown"
              onClick={() => setTaskbarOpen(!taskbarOpen)}
            >
              <span>Taskbar Settings</span>
              <ChevronDown size={16} className={taskbarOpen ? "rotate" : ""} />
            </button>

            {taskbarOpen && (
              <div className="sidebar-dropdown-content">
                {/* Position */}
                <div className="settings-row">
                  <div className="settings-label">
                    <strong>Position</strong>
                    <span>Where the taskbar sits on screen.</span>
                  </div>

                  <div className="settings-control lang-toggle-settings">
                    {(["bottom", "top", "left", "right"] as TaskbarPosition[]).map(
                      (pos) => (
                        <button
                          key={pos}
                          className={taskbarPos === pos ? "lang-btn active" : "lang-btn"}
                          onClick={() => handlePositionChange(pos)}
                        >
                          {pos.charAt(0).toUpperCase() + pos.slice(1)}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Auto-hide */}
                <div className="settings-row">
                  <div className="settings-label">
                    <strong>Auto-hide</strong>
                    <span>Hide taskbar until mouse reaches the edge.</span>
                  </div>

                  <button
                    className={taskbarAutoHide ? "switch on" : "switch"}
                    onClick={() => handleAutoHideChange(!taskbarAutoHide)}
                  >
                    <span className="switch-knob" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ===== API Key Settings ===== */}
          <div className="sidebar-settings-box">
            <button
              className="sidebar-dropdown"
              onClick={() => setApiKeyOpen(!apiKeyOpen)}
            >
              <span>AI Provider (API Key)</span>
              <ChevronDown size={16} className={apiKeyOpen ? "rotate" : ""} />
            </button>

            {apiKeyOpen && (
              <div className="sidebar-dropdown-content">
                <div className="settings-row">
                  <div className="settings-label">
                    <strong>OpenRouter API Key</strong>
                    <span>
                      {hasKey
                        ? "A key is saved on this device."
                        : "Get a free key at openrouter.ai/settings/keys"}
                    </span>
                  </div>
                </div>

                <div className="app-picker-search">
                  <input
                    type="password"
                    placeholder={hasKey ? "Enter a new key to replace it" : "sk-or-v1-..."}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                  />
                </div>

                <button
                  className="app-picker-add-btn"
                  disabled={!apiKeyInput.trim() || savingKey}
                  onClick={handleSaveApiKey}
                >
                  {savingKey ? "Saving..." : keySaved ? "Saved ✓" : "Save Key"}
                </button>

                {hasKey && (
                  <button
                    className="app-picker-add-btn"
                    style={{ marginTop: 8, opacity: 0.7 }}
                    onClick={handleClearApiKey}
                  >
                    Remove Saved Key
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