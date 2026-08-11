import "./CommandCenter.css";
import { useEffect, useState } from "react";
import { useSystem } from "../../hooks/useSystem";
import type { Message } from "../layout/MainLayout";
import type { VoiceControls } from "../../voice/useVoice";
import heartVideo from "../../../assets/vsmart-ai-videos/vsmart-heart.mp4";
import DetailDrawer from "./DetailDrawer";

import {
  Cpu,
  Database,
  Mic,
  Bot,
  Server,
  Info,
  TrendingUp,
  TrendingDown
} from "lucide-react";

interface CommandCenterProps {
  messages: Message[];
  voice: VoiceControls;
}

interface MarketItem {
  symbol: string;
  label: string;
  price: string;
  changePercent: number;
  up: boolean;
}

function useMarketFeed() {
  const [feed, setFeed] = useState<MarketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await window.vsmart.getMarketFeed();
        if (!cancelled) {
          setFeed(data);
          setLastUpdated(new Date());
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 60000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { feed, loading, error, lastUpdated };
}

function Gauge({ label, value }: { label: string; value: number }) {
  const safeValue = Math.min(100, Math.max(0, Math.round(value || 0)));
  const circumference = 2 * Math.PI * 34;
  const offset = circumference - (safeValue / 100) * circumference;

  let strokeColor = "#00e5ff";
  if (safeValue >= 85) strokeColor = "#ff5c7a";
  else if (safeValue >= 70) strokeColor = "#ff9f43";

  return (
    <div className="gauge" title={`${label}: ${safeValue}%`}>
      <svg viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="34" className="gauge-track" />
        <circle
          cx="40"
          cy="40"
          r="34"
          className="gauge-fill"
          style={{ stroke: strokeColor }}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="gauge-center">
        <strong>{safeValue}%</strong>
      </div>
      <span className="gauge-label">{label}</span>
    </div>
  );
}

export default function CommandCenter({ messages, voice }: CommandCenterProps) {
  const system = useSystem();
  const { feed: marketFeed, loading: marketLoading, error: marketError, lastUpdated } = useMarketFeed();
  const lastReply = [...messages].reverse().find((m) => m.sender === "VSmart");

  const [drawer, setDrawer] = useState<{
    open: boolean;
    title: string;
    content: React.ReactNode;
  }>({
    open: false,
    title: "",
    content: null,
  });

  const openDrawer = (title: string, content: React.ReactNode) => {
    setDrawer({ open: true, title, content });
  };

  const closeDrawer = () => {
    setDrawer((prev) => ({ ...prev, open: false }));
  };

  const secondsAgo = lastUpdated
    ? Math.max(0, Math.round((Date.now() - lastUpdated.getTime()) / 1000))
    : null;

  return (
    <div className="command-center">
      {/* Row 1 */}
      <div className="cc-row cc-row-top">
        {/* AI Core Overview */}
        <div className="cc-card ai-overview">
          <div className="card-header">
            <span className="icon-badge badge-cyan">
              <Cpu size={15} />
            </span>
            <h3>AI CORE OVERVIEW</h3>
          </div>

          <div
            className="overview-item clickable"
            onClick={() =>
              openDrawer("AI Core", (
                <div>
                  <p><strong>Status:</strong> Active</p>
                  <p><strong>Version:</strong> v1.0.0</p>
                  <p><strong>Mode:</strong> Optimal</p>
                  <p>Core is healthy and processing all requests normally.</p>
                </div>
              ))
            }
          >
            <Cpu size={16} /> <span>AI Core</span> <em className="ok">Active</em>
          </div>

          <div
            className="overview-item clickable"
            onClick={() =>
              openDrawer("Memory", (
                <div>
                  <p><strong>Status:</strong> Stored</p>
                  <p>Long-term and short-term memory systems are operational.</p>
                  <p>Conversation context is being maintained.</p>
                </div>
              ))
            }
          >
            <Database size={16} /> <span>Memory</span> <em>Stored</em>
          </div>

          <div
            className="overview-item clickable"
            onClick={() =>
              openDrawer("Voice System", (
                <div>
                  <p><strong>Status:</strong> {voice.wakeActive ? "Online" : "Off"}</p>
                  <p><strong>Listening:</strong> {voice.listening ? "Yes" : "No"}</p>
                  <p>Wake word detection and speech recognition status.</p>
                </div>
              ))
            }
          >
            <Mic size={16} /> <span>Voice</span>
            <em className={voice.wakeActive ? "ok" : ""}>
              {voice.wakeActive ? "Online" : "Off"}
            </em>
          </div>

          <div
            className="overview-item clickable"
            onClick={() =>
              openDrawer("Agents", (
                <div>
                  <p><strong>Running:</strong> 2</p>
                  <p>Background agents are active and ready for tasks.</p>
                </div>
              ))
            }
          >
            <Bot size={16} /> <span>Agents</span> <em>2 Running</em>
          </div>

          <div
            className="overview-item clickable"
            onClick={() =>
              openDrawer("System", (
                <div>
                  <p><strong>Status:</strong> Optimal</p>
                  <p>All core systems are running within normal parameters.</p>
                </div>
              ))
            }
          >
            <Server size={16} /> <span>System</span> <em className="ok">Optimal</em>
          </div>
        </div>

        {/* Orb */}
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
          <p>
            AI CORE &nbsp;<span className="core-version">v1.0.0</span>
          </p>
          {lastReply && <p className="last-reply">"{lastReply.text}"</p>}
        </div>

        {/* Live Intelligence Feed */}
        <div className="cc-card intel-feed">
          <div className="card-header">
            <span className="icon-badge badge-purple">
              <Info size={15} />
            </span>
            <h3>LIVE INTELLIGENCE FEED</h3>
            <span className="live-dot">LIVE</span>
          </div>

          {secondsAgo !== null && (
            <p className="feed-updated">Updated {secondsAgo}s ago</p>
          )}

          {marketLoading && marketFeed.length === 0 && (
            <p className="feed-loading">Loading market data...</p>
          )}

          {marketError && marketFeed.length === 0 && (
            <div className="feed-error">
              <p>Failed to load market data</p>
              <button onClick={() => window.location.reload()}>Retry</button>
            </div>
          )}

          {marketFeed.map((item) => (
            <div
              className="feed-item clickable"
              key={item.symbol}
              onClick={() =>
                openDrawer(item.label, (
                  <div>
                    <p><strong>Symbol:</strong> {item.symbol}</p>
                    <p><strong>Price:</strong> {item.price}</p>
                    <p>
                      <strong>Change:</strong>{" "}
                      {item.up ? "+" : ""}
                      {item.changePercent}%
                    </p>
                    <p style={{ marginTop: 12, opacity: 0.7 }}>
                      Detailed chart and historical data will appear here.
                    </p>
                  </div>
                ))
              }
            >
              {item.up ? (
                <TrendingUp size={14} className="trend-up" />
              ) : (
                <TrendingDown size={14} className="trend-down" />
              )}
              <div>
                <p>
                  {item.label} <strong>{item.price}</strong>
                </p>
                <span className={item.up ? "feed-tag tag-up" : "feed-tag tag-down"}>
                  {item.up ? "+" : ""}
                  {item.changePercent}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Row 2 */}
      <div className="cc-row cc-row-bottom">
        <div className="cc-card system-monitor">
          <div className="card-header">
            <span className="icon-badge badge-cyan">
              <Server size={15} />
            </span>
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
            <span className="icon-badge badge-purple">
              <Bot size={15} />
            </span>
            <h3>LLM STATUS</h3>
          </div>
          <div className="llm-grid">
            <div
              className="llm-item linked clickable"
              onClick={() =>
                openDrawer("Hunyuan (Hy3)", (
                  <div>
                    <p><strong>Status:</strong> Connected</p>
                    <p><strong>Type:</strong> Reasoning Model</p>
                    <p>Ready for complex multi-step reasoning and analysis.</p>
                  </div>
                ))
              }
            >
              Hunyuan (Hy3) <em>Connected</em>
            </div>

            <div
              className="llm-item linked clickable"
              onClick={() =>
                openDrawer("Qwen3-Coder", (
                  <div>
                    <p><strong>Status:</strong> Connected</p>
                    <p><strong>Type:</strong> Coding Model</p>
                    <p>Specialized for code generation and technical tasks.</p>
                  </div>
                ))
              }
            >
              Qwen3-Coder <em>Connected</em>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Drawer */}
      <DetailDrawer open={drawer.open} title={drawer.title} onClose={closeDrawer}>
        {drawer.content}
      </DetailDrawer>
    </div>
  );
}