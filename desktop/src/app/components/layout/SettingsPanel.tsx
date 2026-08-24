import { useEffect, useState } from "react";
import { X, Settings as SettingsIcon, ChevronDown, Check, LayoutGrid, List as ListIcon } from "lucide-react";
import { setPreferredVoice, getPreferredVoice } from "../../voice/useVoice";
import type { ReplyLang } from "../../../llm/openrouter";
import type { Page } from "./MainLayout";
import { invalidateApiKeyCache } from "../../../llm/openrouter";
import { useTheme } from "../../hooks/useTheme";
import {
  HUB_SETTINGS_KEY,
  DEFAULT_HUB_SETTINGS,
  loadHubSettings,
  clampHubValue,
  type HubSettings
} from "../dashboard/hubSettings";
import "./SettingsPanel.css";

interface SidebarItem {
  page: Page;
  label: string;
  enabled: boolean;
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

  // Theme
  const { theme, setTheme, themes } = useTheme();
  const [themeOpen, setThemeOpen] = useState(false);
  const [themeViewMode, setThemeViewMode] = useState<"grid" | "list">("grid");

  // Desktop Hub settings
  const [hubOpen, setHubOpen] = useState(false);
  const [hubSettings, setHubSettingsState] = useState<HubSettings>(DEFAULT_HUB_SETTINGS);

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

  // Load Desktop Hub settings when panel opens
  useEffect(() => {
    if (!open) return;
    setHubSettingsState(loadHubSettings());
  }, [open]);

  if (!open) return null;

  const updateHubSettings = (patch: Partial<HubSettings>) => {
    setHubSettingsState((prev: HubSettings) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(HUB_SETTINGS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      window.dispatchEvent(
        new CustomEvent("vsmart-hub-settings", { detail: next })
      );
      return next;
    });
  };

  const stepHubValue = (
    key: "placesIconSize" | "desktopTextSize" | "desktopIconSize" | "appsGridCols",
    delta: number,
    min: number,
    max: number
  ) => {
    const current = hubSettings[key] as number;
    updateHubSettings({ [key]: clampHubValue(current + delta, min, max) } as Partial<HubSettings>);
  };

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
                <div className="theme-view-switch">
                  <button
                    type="button"
                    className={themeViewMode === "grid" ? "theme-view-btn active" : "theme-view-btn"}
                    onClick={() => setThemeViewMode("grid")}
                    title="Grid view"
                  >
                    <LayoutGrid size={14} />
                  </button>
                  <button
                    type="button"
                    className={themeViewMode === "list" ? "theme-view-btn active" : "theme-view-btn"}
                    onClick={() => setThemeViewMode("list")}
                    title="List view"
                  >
                    <ListIcon size={14} />
                  </button>
                </div>

                <div className={themeViewMode === "list" ? "theme-list" : "theme-grid"}>
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
                      {themeViewMode === "list" && theme === t.id && (
                        <span className="theme-list-active-tag">Active</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ===== Desktop Hub Settings ===== */}
          <div className="sidebar-settings-box">
            <button className="sidebar-dropdown" onClick={() => setHubOpen(!hubOpen)}>
              <span>Desktop Hub</span>
              <ChevronDown size={16} className={hubOpen ? "rotate" : ""} />
            </button>

            {hubOpen && (
              <div className="sidebar-dropdown-content">
                {/* Show Places */}
                <div className="settings-row">
                  <div className="settings-label">
                    <strong>Show Places</strong>
                    <span>Toggle the Places list in the Desktop Hub.</span>
                  </div>
                  <button
                    className={hubSettings.showPlaces ? "switch on" : "switch"}
                    onClick={() => updateHubSettings({ showPlaces: !hubSettings.showPlaces })}
                  >
                    <span className="switch-knob" />
                  </button>
                </div>

                {/* Show Desktop */}
                <div className="settings-row">
                  <div className="settings-label">
                    <strong>Show Desktop</strong>
                    <span>Toggle the Desktop apps/files grid in the Hub.</span>
                  </div>
                  <button
                    className={hubSettings.showDesktop ? "switch on" : "switch"}
                    onClick={() => updateHubSettings({ showDesktop: !hubSettings.showDesktop })}
                  >
                    <span className="switch-knob" />
                  </button>
                </div>

                {/* Layout */}
                <div className="settings-row">
                  <div className="settings-label">
                    <strong>Desktop Layout</strong>
                    <span>Grid or list layout for desktop items.</span>
                  </div>
                  <div className="settings-control lang-toggle-settings">
                    {(["grid", "list"] as const).map((layout) => (
                      <button
                        key={layout}
                        className={hubSettings.appsLayout === layout ? "lang-btn active" : "lang-btn"}
                        onClick={() => updateHubSettings({ appsLayout: layout })}
                      >
                        {layout.charAt(0).toUpperCase() + layout.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grid columns (only relevant in Grid layout) */}
                {hubSettings.appsLayout === "grid" && (
                  <div className="settings-row">
                    <div className="settings-label">
                      <strong>Apps per Row</strong>
                      <span>How many apps show side by side in Grid layout.</span>
                    </div>
                    <div className="size-stepper">
                      <button onClick={() => stepHubValue("appsGridCols", -1, 2, 6)}>–</button>
                      <span>{hubSettings.appsGridCols}</span>
                      <button onClick={() => stepHubValue("appsGridCols", 1, 2, 6)}>+</button>
                    </div>
                  </div>
                )}

                {/* Desktop text size */}
                <div className="settings-row">
                  <div className="settings-label">
                    <strong>Text Size</strong>
                    <span>Font size for desktop item labels.</span>
                  </div>
                  <div className="size-stepper">
                    <button onClick={() => stepHubValue("desktopTextSize", -1, 8, 16)}>–</button>
                    <span>{hubSettings.desktopTextSize}px</span>
                    <button onClick={() => stepHubValue("desktopTextSize", 1, 8, 16)}>+</button>
                  </div>
                </div>

                {/* Desktop icon size */}
                <div className="settings-row">
                  <div className="settings-label">
                    <strong>Desktop Icon Size</strong>
                    <span>Icon size for desktop apps and files.</span>
                  </div>
                  <div className="size-stepper">
                    <button onClick={() => stepHubValue("desktopIconSize", -4, 32, 72)}>–</button>
                    <span>{hubSettings.desktopIconSize}px</span>
                    <button onClick={() => stepHubValue("desktopIconSize", 4, 32, 72)}>+</button>
                  </div>
                </div>

                {/* Places icon size */}
                <div className="settings-row">
                  <div className="settings-label">
                    <strong>Places Icon Size</strong>
                    <span>Icon size for the Places list.</span>
                  </div>
                  <div className="size-stepper">
                    <button onClick={() => stepHubValue("placesIconSize", -2, 14, 36)}>–</button>
                    <span>{hubSettings.placesIconSize}px</span>
                    <button onClick={() => stepHubValue("placesIconSize", 2, 14, 36)}>+</button>
                  </div>
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