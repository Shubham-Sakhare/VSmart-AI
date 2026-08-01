import { useEffect, useState } from "react";
import "./sidebar.css";
import {
  LayoutGrid,
  Cpu,
  LineChart,
  ClipboardList,
  Calendar,
  Sparkles,
  MessageSquare,
  Library,
  Wrench,
  Workflow,
  Mic,
  Zap
} from "lucide-react";
import type { Page } from "./MainLayout";
import type { VoiceControls } from "../../voice/useVoice";

interface SidebarItem {
  page: Page;
  label: string;
  enabled: boolean;
}

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
  voice: VoiceControls;
  sidebarEnabled: boolean;
  sidebarItems: SidebarItem[];
}

const NAV_ITEMS: { page: Page; icon: React.ReactNode; label: string }[] = [
  { page: "dashboard", icon: <LayoutGrid size={19} />, label: "Command Center" },
  { page: "aicore", icon: <Cpu size={19} />, label: "AI Core" },
  { page: "agents", icon: <LineChart size={19} />, label: "Analysis" },
  { page: "tasks", icon: <ClipboardList size={19} />, label: "Tasks" },
  { page: "calendar", icon: <Calendar size={19} />, label: "Calendar" },
  { page: "memory", icon: <Sparkles size={19} />, label: "VSmart AI" },
  { page: "conversations", icon: <MessageSquare size={19} />, label: "Conversations" },
  { page: "knowledge", icon: <Library size={19} />, label: "Knowledge Base" },
  { page: "tools", icon: <Wrench size={19} />, label: "Tools & Skills" },
  { page: "workflows", icon: <Workflow size={19} />, label: "Workflows" }
];

export default function Sidebar({
  activePage,
  onNavigate,
  voice,
  sidebarEnabled,
  sidebarItems
}: SidebarProps) {
  const [focusMode, setFocusMode] = useState(false);
  const [openTaskCount, setOpenTaskCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadCount = async () => {
      try {
        const raw = await window.vsmart.getMemory("tasks_list");
        if (cancelled) return;

        if (raw) {
          const tasks: { status: string }[] = JSON.parse(raw);
          setOpenTaskCount(tasks.filter(t => t.status !== "complete").length);
        } else {
          setOpenTaskCount(0);
        }
      } catch {
        setOpenTaskCount(0);
      }
    };

    loadCount();

    const interval = setInterval(loadCount, 4000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activePage]);

  if (!sidebarEnabled) {
    return null;
  }

  const visibleItems = NAV_ITEMS.filter(item =>
    sidebarItems.some(
      setting =>
        setting.page === item.page &&
        setting.enabled
    )
  );

  const micLabel = voice.listening
    ? "Listening..."
    : voice.wakeActive
      ? "Say \"VSmart\"..."
      : "Tap to Speak";

  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-circle">V</div>
        <div>
          <h2>VSMART</h2>
          <span>Command Center</span>
        </div>
      </div>

      <nav className="menu">
        {visibleItems.map(item => (
          <button
            key={item.page}
            className={activePage === item.page ? "menu-item active" : "menu-item"}
            onClick={() => onNavigate(item.page)}
          >
            {item.icon}
            <span className="menu-label">{item.label}</span>
            {item.page === "tasks" && !!openTaskCount && (
              <span className="menu-badge">{openTaskCount}</span>
            )}
          </button>
        ))}
      </nav>

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