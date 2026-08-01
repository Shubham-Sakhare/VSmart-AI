import { useEffect, useState } from "react";
import { X, Settings as SettingsIcon, ChevronDown } from "lucide-react";
import { setPreferredVoice, getPreferredVoice } from "../../voice/useVoice";
import type { ReplyLang } from "../../../llm/openrouter";
import type { Page } from "./MainLayout";
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

  useEffect(() => {
    if (!open || !("speechSynthesis" in window)) return;
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, [open]);

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

        </div>
      </div>
    </div>
  );
}