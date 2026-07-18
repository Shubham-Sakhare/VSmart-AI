import { useState } from "react";
import "./sidebar.css";

import {
  LayoutGrid,
  Cpu,
  Bot,
  ClipboardList,
  Calendar,
  BrainCircuit,
  MessageSquare,
  Library,
  Wrench,
  Workflow,
  Mic,
  Zap
} from "lucide-react";

import type { Page } from "./MainLayout";
import type { VoiceControls } from "../../voice/useVoice";

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
  voice: VoiceControls;
}

const NAV_ITEMS: { page: Page; icon: React.ReactNode; label: string; badge?: number }[] = [
  { page: "dashboard", icon: <LayoutGrid size={19} />, label: "Command Center" },
  { page: "aicore", icon: <Cpu size={19} />, label: "AI Core" },
  { page: "agents", icon: <Bot size={19} />, label: "Agents" },
  { page: "tasks", icon: <ClipboardList size={19} />, label: "Tasks", badge: 3 },
  { page: "calendar", icon: <Calendar size={19} />, label: "Calendar" },
  { page: "memory", icon: <BrainCircuit size={19} />, label: "Memory" },
  { page: "conversations", icon: <MessageSquare size={19} />, label: "Conversations", badge: 12 },
  { page: "knowledge", icon: <Library size={19} />, label: "Knowledge Base" },
  { page: "tools", icon: <Wrench size={19} />, label: "Tools & Skills", badge: 18 },
  { page: "workflows", icon: <Workflow size={19} />, label: "Workflows" }
];

export default function Sidebar({ activePage, onNavigate, voice }: SidebarProps) {

  const [focusMode, setFocusMode] = useState(false);

  const micLabel = voice.listening
    ? "Listening..."
    : voice.wakeActive
      ? "Say \"VSmart\"..."
      : "Tap to Speak";

  return (
    <aside className="sidebar">

      {/* Logo */}
      <div className="logo">
        <div className="logo-circle">V</div>
        <div>
          <h2>VSMART</h2>
          <span>Command Center</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="menu">
        {NAV_ITEMS.map(item => (
          <button
            key={item.page}
            className={activePage === item.page ? "menu-item active" : "menu-item"}
            onClick={() => onNavigate(item.page)}
          >
            {item.icon}
            <span className="menu-label">{item.label}</span>
            {item.badge !== undefined && (
              <span className="menu-badge">{item.badge}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Voice Status */}
      <div className="status-card">
        <h3>VOICE STATUS</h3>

        <button
          className={voice.listening ? "mic-orb listening" : "mic-orb"}
          onClick={voice.toggleListening}
          title="Click to speak a command"
        >
          <Mic size={26} />
        </button>

        <p className="mic-caption">{micLabel}</p>

        {voice.errorMsg && (
          <p className="mic-error">{voice.errorMsg}</p>
        )}
      </div>

      <button
        className={focusMode ? "focus-btn active" : "focus-btn"}
        onClick={() => setFocusMode(prev => !prev)}
      >
        <Zap size={16} />
        Focus Mode
      </button>

    </aside>
  );
}