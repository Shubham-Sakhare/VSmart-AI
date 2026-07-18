import "./CommandCenter.css";
import { useSystem } from "../../hooks/useSystem";
import type { Message } from "../layout/MainLayout";
import type { VoiceControls } from "../../voice/useVoice";

import {
  Cpu,
  Database,
  Mic,
  Bot,
  Server,
  CheckCircle2,
  Code2,
  Search,
  Globe,
  ListChecks,
  Info,
  AlertTriangle,
  GitPullRequest,
  Timer
} from "lucide-react";

interface CommandCenterProps {
  messages: Message[];
  voice: VoiceControls;
}

const ACTIVE_AGENTS = [
  { name: "Coding Agent", icon: <Code2 size={16} />, status: "Active" },
  { name: "Research Agent", icon: <Search size={16} />, status: "Active" },
  { name: "Memory Agent", icon: <Database size={16} />, status: "Standby" },
  { name: "Browser Agent", icon: <Globe size={16} />, status: "Standby" },
  { name: "Task Agent", icon: <ListChecks size={16} />, status: "Standby" },
  { name: "System Agent", icon: <Server size={16} />, status: "Standby" }
];

const INTEL_FEED = [
  { icon: <Info size={14} />, tag: "INFO", text: "Design review with the product team", sub: "Meeting" },
  { icon: <AlertTriangle size={14} />, tag: "WARN", text: "2 tasks are overdue — Polish voice UI", sub: "Overdue" },
  { icon: <GitPullRequest size={14} />, tag: "TIP", text: "3 pull requests awaiting your review", sub: "GitHub" },
  { icon: <Timer size={14} />, tag: "TIP", text: "Deep-work block 2–4 PM. Notifications muted.", sub: "Focus" }
];

const TIMELINE = [
  { time: "09:30 am", title: "Daily Standup", status: "Done" },
  { time: "12:00 pm", title: "Finalize HUD panel spacing", status: "In 42m" },
  { time: "02:00 pm", title: "Deep-work block: Voice pipeline", status: "In 2h 42m" },
  { time: "04:30 pm", title: "Design Review — Command Center v1", status: "In 5h 12m" }
];

function Gauge({ label, value }: { label: string; value: number }) {
  const circumference = 2 * Math.PI * 34;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="gauge">
      <svg viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="34" className="gauge-track" />
        <circle
          cx="40" cy="40" r="34"
          className="gauge-fill"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="gauge-center">
        <strong>{value}%</strong>
      </div>
      <span className="gauge-label">{label}</span>
    </div>
  );
}

export default function CommandCenter({ messages, voice }: CommandCenterProps) {

  const system = useSystem();
  const lastReply = [...messages].reverse().find(m => m.sender === "VSmart");

  return (
    <div className="command-center">

      {/* Row 1 */}
      <div className="cc-row cc-row-top">

        <div className="cc-card ai-overview">
          <h3>AI CORE OVERVIEW</h3>

          <div className="overview-item">
            <Cpu size={16} /> <span>AI Core</span> <em className="ok">Active</em>
          </div>
          <div className="overview-item">
            <Database size={16} /> <span>Memory</span> <em>Stored</em>
          </div>
          <div className="overview-item">
            <Mic size={16} /> <span>Voice</span>
            <em className={voice.wakeActive ? "ok" : ""}>{voice.wakeActive ? "Online" : "Off"}</em>
          </div>
          <div className="overview-item">
            <Bot size={16} /> <span>Agents</span> <em>2 Running</em>
          </div>
          <div className="overview-item">
            <Server size={16} /> <span>System</span> <em className="ok">Optimal</em>
          </div>
        </div>

        <div className="cc-card orb-card">
          <div className="globe-wrap">
            <div className="globe-ring r1"></div>
            <div className="globe-ring r2"></div>
            <div className="globe-ring r3"></div>
            <div className="globe-core"></div>
          </div>
          <h1>VSMART</h1>
          <p>AI CORE &nbsp;<span className="core-version">v1.0.0</span></p>
          {lastReply && <p className="last-reply">"{lastReply.text}"</p>}
        </div>

        <div className="cc-card intel-feed">
          <div className="card-header">
            <h3>LIVE INTELLIGENCE FEED</h3>
            <span className="live-dot">LIVE</span>
          </div>

          {INTEL_FEED.map((item, i) => (
            <div className="feed-item" key={i}>
              {item.icon}
              <div>
                <p>{item.text}</p>
                <span className={`feed-tag tag-${item.tag.toLowerCase()}`}>{item.sub}</span>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Row 2 */}
      <div className="cc-row cc-row-mid">

        <div className="cc-card active-agents">
          <div className="card-header">
            <h3>ACTIVE AGENTS</h3>
          </div>
          <div className="agents-grid">
            {ACTIVE_AGENTS.map(agent => (
              <div className="agent-tile" key={agent.name}>
                {agent.icon}
                <span>{agent.name}</span>
                <em className={agent.status === "Active" ? "dot-online" : "dot-idle"}></em>
              </div>
            ))}
          </div>
        </div>

        <div className="cc-card timeline">
          <div className="card-header">
            <h3>MISSION TIMELINE</h3>
          </div>
          {TIMELINE.map((t, i) => (
            <div className="timeline-item" key={i}>
              <span className="tl-time">{t.time}</span>
              <span className="tl-dot"></span>
              <span className="tl-title">{t.title}</span>
              <span className="tl-status">{t.status}</span>
            </div>
          ))}
        </div>

        <div className="cc-card quick-cmds">
          <div className="card-header">
            <h3>QUICK COMMANDS</h3>
          </div>
          <button><CheckCircle2 size={16} /> Start New Task</button>
          <button onClick={voice.toggleListening}>
            <Mic size={16} /> {voice.listening ? "Stop Listening" : "Start Voice Chat"}
          </button>
          <button><Bot size={16} /> Run Workflow</button>
        </div>

      </div>

      {/* Row 3 */}
      <div className="cc-row cc-row-bottom">

        <div className="cc-card system-monitor">
          <h3>SYSTEM MONITOR</h3>
          <div className="gauges">
            <Gauge label="CPU" value={system?.cpu ?? 0} />
            <Gauge label="RAM" value={system?.ram ?? 0} />
            <Gauge label="Disk" value={system?.storage ?? 0} />
          </div>
        </div>

        <div className="cc-card memory-insights">
          <h3>MEMORY INSIGHTS</h3>
          <div className="memory-stats">
            <div><strong>—</strong><span>Memories</span></div>
            <div><strong>{messages.length}</strong><span>Session Turns</span></div>
            <div><strong>—</strong><span>Tool Calls</span></div>
          </div>
        </div>

        <div className="cc-card llm-status">
          <div className="card-header">
            <h3>LLM STATUS</h3>
          </div>
          <div className="llm-grid">
            <div className="llm-item linked">Gemini <em>Connected</em></div>
            <div className="llm-item">Ollama <em>No Models</em></div>
            <div className="llm-item">OpenAI <em>Not Linked</em></div>
            <div className="llm-item">Claude <em>Not Linked</em></div>
          </div>
        </div>

      </div>

    </div>
  );
}