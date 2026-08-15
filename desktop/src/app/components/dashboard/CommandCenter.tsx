import "./CommandCenter.css";
import { useEffect, useState, useCallback } from "react";
import type { Message } from "../layout/MainLayout";
import type { VoiceControls } from "../../voice/useVoice";
import heartVideo from "../../../assets/vsmart-ai-videos/vsmart-heart.mp4";
import DetailDrawer from "./DetailDrawer";

import {
  Info,
  TrendingUp,
  TrendingDown,
  Folder,
  File,
  AppWindow,
  RefreshCw,
  Monitor,
  Home,
  Download,
  FileText,
  Image,
  Music,
  Video,
  HardDrive
} from "lucide-react";

interface CommandCenterProps {
  messages: Message[];
  voice: VoiceControls;
}

interface DesktopItem {
  name: string;
  displayName: string;
  path: string;
  type: "folder" | "file" | "shortcut" | "app" | "place";
  extension: string | null;
  size: number | null;
  modified: string | null;
  placeId?: string;
}

/** Start-menu style tile icon — no purple link glyph. */
function tileIcon(item: DesktopItem) {
  if (item.type === "place") {
    switch (item.placeId) {
      case "home":
        return <Home size={22} />;
      case "documents":
        return <FileText size={22} />;
      case "downloads":
        return <Download size={22} />;
      case "pictures":
        return <Image size={22} />;
      case "music":
        return <Music size={22} />;
      case "videos":
        return <Video size={22} />;
      case "desktop":
        return <HardDrive size={22} />;
      default:
        return <Folder size={22} />;
    }
  }
  switch (item.type) {
    case "folder":
      return <Folder size={22} />;
    case "app":
    case "shortcut":
      return <AppWindow size={22} />;
    default:
      return <File size={22} />;
  }
}

function placeColor(placeId?: string): string {
  switch (placeId) {
    case "home":
      return "tile-blue";
    case "documents":
      return "tile-cyan";
    case "downloads":
      return "tile-green";
    case "pictures":
      return "tile-pink";
    case "music":
      return "tile-purple";
    case "videos":
      return "tile-orange";
    case "desktop":
      return "tile-teal";
    default:
      return "tile-default";
  }
}

/** Loads Desktop items + system places only while Command Center is mounted. */
function useDesktopItems() {
  const [items, setItems] = useState<DesktopItem[]>([]);
  const [places, setPlaces] = useState<DesktopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async (force = false) => {
    try {
      setLoading(true);
      const [desk, sysPlaces] = await Promise.all([
        window.vsmart.system.getDesktopItems(force),
        window.vsmart.system.getSystemPlaces()
      ]);
      setItems(Array.isArray(desk) ? desk : []);
      setPlaces(Array.isArray(sysPlaces) ? sysPlaces : []);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [desk, sysPlaces] = await Promise.all([
          window.vsmart.system.getDesktopItems(false),
          window.vsmart.system.getSystemPlaces()
        ]);
        if (!cancelled) {
          setItems(Array.isArray(desk) ? desk : []);
          setPlaces(Array.isArray(sysPlaces) ? sysPlaces : []);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const interval = setInterval(() => {
      if (!cancelled) load(false);
    }, 60_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [load]);

  return { items, places, loading, error, refresh: () => load(true) };
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

export default function CommandCenter({ messages, voice: _voice }: CommandCenterProps) {
  const { feed: marketFeed, loading: marketLoading, error: marketError, lastUpdated } = useMarketFeed();
  const {
    items: desktopItems,
    places,
    loading: desktopLoading,
    error: desktopError,
    refresh: refreshDesktop
  } = useDesktopItems();
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

  const openDesktopItem = async (item: DesktopItem) => {
    try {
      await window.vsmart.system.openDesktopItem(item.path);
    } catch {
      /* ignore */
    }
  };

  const secondsAgo = lastUpdated
    ? Math.max(0, Math.round((Date.now() - lastUpdated.getTime()) / 1000))
    : null;

  return (
    <div className="command-center">
      {/* Row 1 */}
      <div className="cc-row cc-row-top">
        {/* AI Core Overview — left places list + right apps (3 per row) */}
        <div className="cc-card ai-overview">
          <div className="card-header">
            <span className="icon-badge badge-cyan">
              <Monitor size={15} />
            </span>
            <h3>AI CORE OVERVIEW</h3>
            <button
              className="desktop-refresh-btn"
              title="Refresh"
              onClick={() => refreshDesktop()}
              disabled={desktopLoading}
            >
              <RefreshCw size={13} className={desktopLoading ? "spin" : ""} />
            </button>
          </div>

          <div className="overview-split">
            {/* LEFT — Places list (icon + name) */}
            <div className="places-panel">
              <div className="places-label">Places</div>
              <div className="places-list">
                {places.map((p) => (
                  <button
                    key={p.placeId || p.path}
                    className={`place-row ${placeColor(p.placeId)}`}
                    title={p.path}
                    onClick={() => openDesktopItem(p)}
                  >
                    <span className="place-icon">{tileIcon(p)}</span>
                    <span className="place-name">{p.displayName}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* RIGHT — Desktop apps, 3 per row, icon above name */}
            <div className="apps-panel">
              <div className="places-label">Desktop</div>
              <div className="apps-grid-3">
                {desktopLoading && desktopItems.length === 0 && (
                  <div className="tile-empty">Scanning…</div>
                )}
                {desktopError && desktopItems.length === 0 && (
                  <div className="tile-empty">Could not read Desktop</div>
                )}
                {!desktopLoading && !desktopError && desktopItems.length === 0 && (
                  <div className="tile-empty">Desktop is empty</div>
                )}

                {desktopItems.slice(0, 15).map((item) => (
                  <button
                    key={item.path}
                    className={`icon-tile ${
                      item.type === "folder"
                        ? "tile-folder"
                        : item.type === "app" || item.type === "shortcut"
                          ? "tile-app"
                          : "tile-file"
                    }`}
                    title={item.name}
                    onClick={() => openDesktopItem(item)}
                  >
                    <span className="tile-icon">{tileIcon(item)}</span>
                    <span className="tile-name">{item.displayName}</span>
                  </button>
                ))}

                {desktopItems.length > 15 && (
                  <button
                    className="icon-tile tile-more"
                    onClick={() =>
                      openDrawer("Desktop", (
                        <div className="apps-grid-3 drawer-grid">
                          {desktopItems.map((item) => (
                            <button
                              key={item.path}
                              className={`icon-tile ${
                                item.type === "folder"
                                  ? "tile-folder"
                                  : item.type === "app" || item.type === "shortcut"
                                    ? "tile-app"
                                    : "tile-file"
                              }`}
                              title={item.name}
                              onClick={() => openDesktopItem(item)}
                            >
                              <span className="tile-icon">{tileIcon(item)}</span>
                              <span className="tile-name">{item.displayName}</span>
                            </button>
                          ))}
                        </div>
                      ))
                    }
                  >
                    <span className="tile-icon more-count">+{desktopItems.length - 15}</span>
                    <span className="tile-name">More</span>
                  </button>
                )}
              </div>
            </div>
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

      {/* Detail Drawer */}
      <DetailDrawer open={drawer.open} title={drawer.title} onClose={closeDrawer}>
        {drawer.content}
      </DetailDrawer>
    </div>
  );
}