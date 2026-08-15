import "./CommandCenter.css";
import { useEffect, useState, useCallback, useRef } from "react";
import type { Message } from "../layout/MainLayout";
import type { VoiceControls } from "../../voice/useVoice";
import heartVideo from "../../../assets/vsmart-ai-videos/vsmart-heart.mp4";
import DetailDrawer from "./DetailDrawer";

import iconDocuments from "../../../assets/vsmart-ai-images/file-icons/Documents.png";
import iconDownloads from "../../../assets/vsmart-ai-images/file-icons/Downloads.png";
import iconMedia from "../../../assets/vsmart-ai-images/file-icons/Media.png";
import iconMusics from "../../../assets/vsmart-ai-images/file-icons/Musics.png";
import iconVideos from "../../../assets/vsmart-ai-images/file-icons/Videos.png";

import {
  Info,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Monitor,
  Home,
  Download,
  FileText,
  Image,
  Music,
  Video,
  HardDrive,
  Folder,
  AppWindow,
  File,
  FileCode,
  FileType,
  Lock,
  Film,
  Package,
  X,
  Pencil,
  ChevronLeft,
  ChevronRight
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

const CUSTOM_ICONS_KEY = "vsmart_hub_custom_icons";
export const HUB_SETTINGS_KEY = "vsmart_hub_settings";

export interface HubSettings {
  placesIconSize: number;
  desktopTextSize: number;
  desktopIconSize: number;
  appsGridCols: number;
  appsLayout: "grid" | "list";
  showPlaces: boolean;
  showDesktop: boolean;
}

export const DEFAULT_HUB_SETTINGS: HubSettings = {
  placesIconSize: 22,
  desktopTextSize: 10,
  desktopIconSize: 48,
  appsGridCols: 3,
  appsLayout: "grid",
  showPlaces: true,
  showDesktop: true
};

export function clampHubValue(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

// Kept as a local alias so the rest of this file doesn't need renaming.
const clamp = clampHubValue;

export function loadHubSettings(): HubSettings {
  try {
    const raw = localStorage.getItem(HUB_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_HUB_SETTINGS };
    const p = JSON.parse(raw);
    return {
      placesIconSize: clamp(Number(p.placesIconSize) || 22, 14, 36),
      desktopTextSize: clamp(Number(p.desktopTextSize) || 10, 8, 16),
      desktopIconSize: clamp(Number(p.desktopIconSize) || 48, 32, 72),
      appsGridCols: clamp(Number(p.appsGridCols) || 3, 2, 6),
      appsLayout: p.appsLayout === "list" ? "list" : "grid",
      showPlaces: p.showPlaces !== false,
      showDesktop: p.showDesktop !== false
    };
  } catch {
    return { ...DEFAULT_HUB_SETTINGS };
  }
}

function loadCustomIcons(): Record<string, string> {
  try {
    const raw = localStorage.getItem(CUSTOM_ICONS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCustomIcons(map: Record<string, string>) {
  try {
    localStorage.setItem(CUSTOM_ICONS_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

function DefaultIcon({ item, size = 22 }: { item: DesktopItem; size?: number }) {
  const name = (item.displayName || item.name || "").toLowerCase();
  const ext = (item.extension || "").toLowerCase().replace(".", "");

  if (item.type === "place") {
    const placeIconMap: Record<string, string> = {
      documents: iconDocuments,
      downloads: iconDownloads,
      pictures: iconMedia,
      music: iconMusics,
      videos: iconVideos
    };
    const src = item.placeId ? placeIconMap[item.placeId] : undefined;
    if (src) {
      return (
        <img
          src={src}
          alt=""
          style={{ width: size, height: size, objectFit: "contain" }}
          draggable={false}
        />
      );
    }
    switch (item.placeId) {
      case "home":
        return <Home size={size} />;
      case "desktop":
        return <HardDrive size={size} />;
      default:
        return <Folder size={size} />;
    }
  }

  if (item.type === "folder") {
    if (name.includes("document")) return <FileText size={size} />;
    if (name.includes("download")) return <Download size={size} />;
    if (name.includes("video")) return <Video size={size} />;
    if (name.includes("picture") || name.includes("image") || name.includes("photo"))
      return <Image size={size} />;
    if (name.includes("music") || name.includes("audio")) return <Music size={size} />;
    if (name.includes("app") || name.includes("program")) return <AppWindow size={size} />;
    if (name.includes("secure") || name.includes("lock") || name.includes("private"))
      return <Lock size={size} />;
    return <Folder size={size} />;
  }

  if (item.type === "app" || item.type === "shortcut") {
    if (
      name.includes("illustrator") ||
      name.includes("photoshop") ||
      name.includes("figma") ||
      name.includes("canva")
    )
      return <Image size={size} />;
    if (name.includes("word") || name.includes("writer") || name.includes("document"))
      return <FileText size={size} />;
    if (name.includes("excel") || name.includes("calc") || name.includes("sheet"))
      return <FileCode size={size} />;
    if (name.includes("powerpoint") || name.includes("slide") || name.includes("impress"))
      return <Package size={size} />;
    if (name.includes("pdf") || name.includes("acrobat") || name.includes("reader"))
      return <FileType size={size} />;
    if (name.includes("mail") || name.includes("outlook") || name.includes("thunderbird"))
      return <FileText size={size} />;
    if (
      name.includes("chrome") ||
      name.includes("firefox") ||
      name.includes("edge") ||
      name.includes("brave")
    )
      return <AppWindow size={size} />;
    if (
      name.includes("vlc") ||
      name.includes("player") ||
      name.includes("spotify") ||
      name.includes("music")
    )
      return <Music size={size} />;
    if (name.includes("video") || name.includes("movie") || name.includes("film"))
      return <Film size={size} />;
    if (
      name.includes("code") ||
      name.includes("studio") ||
      name.includes("cursor") ||
      name.includes("sublime") ||
      name.includes("atom") ||
      name.includes("notepad")
    )
      return <FileCode size={size} />;
    if (name.includes("launcher") || name.includes("start") || name.includes("manager"))
      return <Package size={size} />;
    if (
      name.includes("lock") ||
      name.includes("secure") ||
      name.includes("vpn") ||
      name.includes("antivirus")
    )
      return <Lock size={size} />;
    return <AppWindow size={size} />;
  }

  if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "ico"].includes(ext))
    return <Image size={size} />;
  if (["mp4", "mkv", "avi", "mov", "wmv", "webm"].includes(ext)) return <Film size={size} />;
  if (["mp3", "wav", "flac", "aac", "ogg"].includes(ext)) return <Music size={size} />;
  if (ext === "pdf") return <FileType size={size} />;
  if (["lock", "key", "pem", "crt", "cer", "p12"].includes(ext)) return <Lock size={size} />;
  if (
    ["js", "ts", "tsx", "jsx", "py", "java", "c", "cpp", "html", "css", "json", "xml"].includes(ext)
  )
    return <FileCode size={size} />;
  if (["txt", "md", "log", "csv", "doc", "docx"].includes(ext)) return <FileText size={size} />;
  if (
    ["msi", "msix", "appx", "dmg", "pkg", "deb", "rpm", "apk", "exe", "bat", "cmd"].includes(ext)
  )
    return <Package size={size} />;

  return <File size={size} />;
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

function desktopTileClass(item: DesktopItem): string {
  if (item.type === "place") return placeColor(item.placeId);
  const colors = [
    "tile-blue",
    "tile-cyan",
    "tile-green",
    "tile-pink",
    "tile-purple",
    "tile-orange",
    "tile-teal"
  ];
  const key = (item.path || item.displayName || item.name || "").toLowerCase();
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return colors[Math.abs(hash) % colors.length];
}

function typeClass(item: DesktopItem): string {
  return desktopTileClass(item);
}

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

function HubTile({
  item,
  customIcon,
  layout,
  placesIconSize,
  desktopTextSize,
  desktopIconSize,
  onOpen,
  onIconChange,
  onIconClear
}: {
  item: DesktopItem;
  customIcon?: string;
  layout: "place" | "desktop";
  placesIconSize: number;
  desktopTextSize: number;
  desktopIconSize: number;
  onOpen: () => void;
  onIconChange: (dataUrl: string) => void;
  onIconClear: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const iconSize =
    layout === "place" ? placesIconSize : Math.round(desktopIconSize * 0.55);

  const openEditPicker = () => fileRef.current?.click();

  const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onIconChange(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const iconNode = customIcon ? (
    <img src={customIcon} alt="" className="tile-custom-img" draggable={false} />
  ) : (
    <DefaultIcon item={item} size={iconSize} />
  );

  const hiddenInput = (
    <input
      ref={fileRef}
      type="file"
      accept="image/*"
      className="hub-file-input"
      onChange={onFilePicked}
    />
  );

  if (layout === "place") {
    return (
      <div className="hub-place-wrap">
        <button
          type="button"
          className={`place-row ${typeClass(item)}`}
          title={`${item.displayName}\nClick: open`}
          onClick={(e) => {
            e.preventDefault();
            onOpen();
          }}
        >
          <span
            className="place-icon"
            style={{
              width: placesIconSize + 10,
              height: placesIconSize + 10
            }}
          >
            {iconNode}
          </span>
          <span className="place-name">{item.displayName}</span>

          <span
            className="tile-edit-btn place-edit-abs"
            title="Change icon"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openEditPicker();
            }}
          >
            <Pencil size={11} />
          </span>

          {customIcon && (
            <span
              className="tile-reset-inline place-reset-abs"
              title="Reset default icon"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onIconClear();
              }}
            >
              <X size={11} />
            </span>
          )}
        </button>
        {hiddenInput}
      </div>
    );
  }

  return (
    <div className="hub-desktop-wrap">
      <button
        type="button"
        className={`icon-tile ${typeClass(item)}`}
        title={`${item.displayName}\nClick: open`}
        onClick={(e) => {
          e.preventDefault();
          onOpen();
        }}
      >
        <span
          className="tile-icon"
          style={{ width: desktopIconSize, height: desktopIconSize }}
        >
          {iconNode}
        </span>
        <span className="tile-name" style={{ fontSize: desktopTextSize }}>
          {item.displayName}
        </span>

        <span
          className="tile-edit-btn tile-edit-float"
          title="Change icon"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            openEditPicker();
          }}
        >
          <Pencil size={11} />
        </span>

        {customIcon && (
          <span
            className="tile-reset-float"
            title="Reset default icon"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onIconClear();
            }}
          >
            <X size={11} />
          </span>
        )}
      </button>
      {hiddenInput}
    </div>
  );
}

export default function CommandCenter({
  messages,
  voice: _voice
}: CommandCenterProps) {
  const { feed: marketFeed, loading: marketLoading, error: marketError, lastUpdated } =
    useMarketFeed();
  const {
    items: desktopItems,
    places,
    loading: desktopLoading,
    error: desktopError,
    refresh: refreshDesktop
  } = useDesktopItems();
  const lastReply = [...messages].reverse().find((m) => m.sender === "VSmart");

  const [customIcons, setCustomIcons] = useState<Record<string, string>>(() =>
    loadCustomIcons()
  );
  const [hubSettings, setHubSettings] = useState<HubSettings>(() => loadHubSettings());
  const [placesCollapsed, setPlacesCollapsed] = useState(false);

  const [drawer, setDrawer] = useState<{
    open: boolean;
    title: string;
    content: React.ReactNode;
  }>({ open: false, title: "", content: null });

  useEffect(() => {
    const onHubSettings = (e: Event) => {
      const detail = (e as CustomEvent<HubSettings>).detail;
      if (detail) setHubSettings(detail);
      else setHubSettings(loadHubSettings());
    };
    window.addEventListener("vsmart-hub-settings", onHubSettings);
    return () => window.removeEventListener("vsmart-hub-settings", onHubSettings);
  }, []);

  const openDrawer = (title: string, content: React.ReactNode) =>
    setDrawer({ open: true, title, content });
  const closeDrawer = () => setDrawer((p) => ({ ...p, open: false }));

  const openItem = async (item: DesktopItem) => {
    try {
      await window.vsmart.system.openDesktopItem(item.path);
    } catch {
      /* ignore */
    }
  };

  const setIconFor = (path: string, dataUrl: string) => {
    setCustomIcons((prev) => {
      const next = { ...prev, [path]: dataUrl };
      saveCustomIcons(next);
      return next;
    });
  };

  const clearIconFor = (path: string) => {
    setCustomIcons((prev) => {
      const next = { ...prev };
      delete next[path];
      saveCustomIcons(next);
      return next;
    });
  };

  const secondsAgo = lastUpdated
    ? Math.max(0, Math.round((Date.now() - lastUpdated.getTime()) / 1000))
    : null;

  const showPlaces = hubSettings.showPlaces;
  const showDesktop = hubSettings.showDesktop;

  const gridStyle =
    hubSettings.appsLayout === "list"
      ? { gridTemplateColumns: "1fr" as const }
      : { gridTemplateColumns: `repeat(${hubSettings.appsGridCols}, 1fr)` };

  const splitClass = [
    "overview-split",
    !showPlaces || placesCollapsed ? "no-places" : "",
    !showDesktop ? "no-desktop" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="command-center">
      <div className="cc-card ai-overview glass-panel cc-hub">
        <div className="card-header">
          <span className="icon-badge badge-cyan">
            <Monitor size={15} />
          </span>
          <h3>DESKTOP HUB</h3>
          <button
            type="button"
            className="desktop-refresh-btn"
            title="Refresh"
            onClick={() => refreshDesktop()}
            disabled={desktopLoading}
          >
            <RefreshCw size={13} className={desktopLoading ? "spin" : ""} />
          </button>
        </div>

        <div className={splitClass}>
          {showPlaces && (
            <div className={`places-panel ${placesCollapsed ? "collapsed" : ""}`}>
              {/* Arrow always on border center */}
              <div className="places-panel-header">
                <button
                  type="button"
                  className="places-collapse-btn"
                  title={placesCollapsed ? "Show Places" : "Hide Places"}
                  onClick={() => setPlacesCollapsed((v) => !v)}
                >
                  {placesCollapsed ? (
                    <ChevronRight size={14} />
                  ) : (
                    <ChevronLeft size={14} />
                  )}
                </button>
              </div>

              {!placesCollapsed && (
                <>
                  <div className="places-section-title">Places</div>
                  <div className="places-list">
                    {places.map((p) => (
                      <HubTile
                        key={p.placeId || p.path}
                        item={p}
                        layout="place"
                        placesIconSize={hubSettings.placesIconSize}
                        desktopTextSize={hubSettings.desktopTextSize}
                        desktopIconSize={hubSettings.desktopIconSize}
                        customIcon={customIcons[p.path]}
                        onOpen={() => openItem(p)}
                        onIconChange={(url) => setIconFor(p.path, url)}
                        onIconClear={() => clearIconFor(p.path)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {showDesktop && (
            <div className="apps-panel">
              <div className="places-label">Desktop</div>
              <div
                className={`apps-grid-3 ${hubSettings.appsLayout === "list" ? "apps-list" : ""}`}
                style={gridStyle}
              >
                {desktopLoading && desktopItems.length === 0 && (
                  <div className="tile-empty">Scanning…</div>
                )}
                {desktopError && desktopItems.length === 0 && (
                  <div className="tile-empty">Could not read Desktop</div>
                )}
                {!desktopLoading && !desktopError && desktopItems.length === 0 && (
                  <div className="tile-empty">Desktop is empty</div>
                )}

                {desktopItems.slice(0, 12).map((item) => (
                  <HubTile
                    key={item.path}
                    item={item}
                    layout="desktop"
                    placesIconSize={hubSettings.placesIconSize}
                    desktopTextSize={hubSettings.desktopTextSize}
                    desktopIconSize={hubSettings.desktopIconSize}
                    customIcon={customIcons[item.path]}
                    onOpen={() => openItem(item)}
                    onIconChange={(url) => setIconFor(item.path, url)}
                    onIconClear={() => clearIconFor(item.path)}
                  />
                ))}

                {desktopItems.length > 12 && (
                  <button
                    type="button"
                    className="icon-tile tile-more"
                    onClick={() =>
                      openDrawer(
                        "Desktop",
                        <div
                          className={`apps-grid-3 drawer-grid ${hubSettings.appsLayout === "list" ? "apps-list" : ""}`}
                          style={gridStyle}
                        >
                          {desktopItems.map((item) => (
                            <HubTile
                              key={item.path}
                              item={item}
                              layout="desktop"
                              placesIconSize={hubSettings.placesIconSize}
                              desktopTextSize={hubSettings.desktopTextSize}
                              desktopIconSize={hubSettings.desktopIconSize}
                              customIcon={customIcons[item.path]}
                              onOpen={() => openItem(item)}
                              onIconChange={(url) => setIconFor(item.path, url)}
                              onIconClear={() => clearIconFor(item.path)}
                            />
                          ))}
                        </div>
                      )
                    }
                  >
                    <span className="tile-icon more-count">
                      +{desktopItems.length - 12}
                    </span>
                    <span
                      className="tile-name"
                      style={{ fontSize: hubSettings.desktopTextSize }}
                    >
                      More
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="cc-center">
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
      </div>

      <div className="cc-right">
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
              <button type="button" onClick={() => window.location.reload()}>
                Retry
              </button>
            </div>
          )}

          {marketFeed.map((item) => (
            <div
              className="feed-item clickable"
              key={item.symbol}
              onClick={() =>
                openDrawer(
                  item.label,
                  <div>
                    <p>
                      <strong>Symbol:</strong> {item.symbol}
                    </p>
                    <p>
                      <strong>Price:</strong> {item.price}
                    </p>
                    <p>
                      <strong>Change:</strong> {item.up ? "+" : ""}
                      {item.changePercent}%
                    </p>
                  </div>
                )
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

        <div className="cc-card cc-not-decided">
          <div className="card-header">
            <h3>NOT DECIDED</h3>
          </div>
          <p className="feed-loading">Coming soon…</p>
        </div>
      </div>

      <DetailDrawer open={drawer.open} title={drawer.title} onClose={closeDrawer}>
        {drawer.content}
      </DetailDrawer>
    </div>
  );
}