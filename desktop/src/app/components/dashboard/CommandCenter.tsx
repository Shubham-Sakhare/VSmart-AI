import "./CommandCenter.css";
import { useSystem } from "../../hooks/useSystem";
import type { Message } from "../layout/MainLayout";
import type { VoiceControls } from "../../voice/useVoice";
import heartVideo from "../../../assets/vsmart-ai-videos/vsmart-heart.mp4";

import {
  Cpu,
  Database,
  Mic,
  Bot,
  Server,
  Info,
  AlertTriangle,
  GitPullRequest,
  Timer
} from "lucide-react";

interface CommandCenterProps {
  messages: Message[];
  voice: VoiceControls;
}

const INTEL_FEED = [
  { icon: <Info size={14} />, tag: "INFO", text: "Design review with the product team", sub: "Meeting" },
  { icon: <AlertTriangle size={14} />, tag: "WARN", text: "2 tasks are overdue — Polish voice UI", sub: "Overdue" },
  { icon: <GitPullRequest size={14} />, tag: "TIP", text: "3 pull requests awaiting your review", sub: "GitHub" },
  { icon: <Timer size={14} />, tag: "TIP", text: "Deep-work block 2–4 PM. Notifications muted.", sub: "Focus" }
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
          <div className="card-header">
            <span className="icon-badge badge-cyan"><Cpu size={15} /></span>
            <h3>AI CORE OVERVIEW</h3>
          </div>

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
          <div className="globe-wrap video-mode">
            <video
              className="orb-video"
              src={heartVideo}
              autoPlay
              loop
              muted
              playsInline
            />
          </div>
          <h1>VSMART</h1>
          <p>AI CORE &nbsp;<span className="core-version">2.0</span></p>
          {lastReply && <p className="last-reply">"{lastReply.text}"</p>}
        </div>

        <div className="cc-card intel-feed">
          <div className="card-header">
            <span className="icon-badge badge-purple"><Info size={15} /></span>
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
      <div className="cc-row cc-row-bottom">

        <div className="cc-card system-monitor">
          <div className="card-header">
            <span className="icon-badge badge-cyan"><Server size={15} /></span>
            <h3>SYSTEM MONITOR</h3>
          </div>
          <div className="gauges">
            <Gauge label="CPU" value={system?.cpu ?? 0} />
            <Gauge label="RAM" value={system?.ram ?? 0} />
            <Gauge label="Disk" value={system?.storage ?? 0} />
          </div>
        </div>

        <div className="cc-card llm-status">
          <div className="card-header">
            <span className="icon-badge badge-purple"><Bot size={15} /></span>
            <h3>LLM STATUS</h3>
          </div>
          <div className="llm-grid">
            <div className="llm-item linked">Hunyuan (Hy3) <em>Connected</em></div>
            <div className="llm-item linked">Qwen3-Coder <em>Connected</em></div>
          </div>
        </div>

      </div>

    </div>
  );
}