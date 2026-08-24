import "./CommandCenter.css";
import { useEffect, useMemo, useState } from "react";
import type { Message } from "../layout/MainLayout";
import type { VoiceControls } from "../../voice/useVoice";
import DetailDrawer from "./DetailDrawer";
import AIOrb from "../orb/AIOrb";

import {
  Info, TrendingUp, TrendingDown, RefreshCw, Monitor,
  ChevronLeft, ChevronRight, Search, ArrowDownAZ, Clock, X, ZoomIn
} from "lucide-react";

import type { DesktopItem } from "./desktopTypes";
import { type HubSettings, loadHubSettings } from "./hubSettings";
// TODO: hubSettings.ts doesn't currently export a save function — once you
// add/confirm one (e.g. `saveHubSettings`), import it above and swap the
// TODO block inside updateIconSize() below so slider changes persist to disk.
import { loadCustomIcons, saveCustomIcons } from "./customIcons";
import { useDesktopItems } from "./useDesktopItems";
import { useMarketFeed } from "./useMarketFeed";
import { HubTile } from "./HubTile";

interface CommandCenterProps {
  messages: Message[];
  voice: VoiceControls;
  isThinking?: boolean;
  isSpeaking?: boolean;
}

type SortMode = "name" | "recent";
type ItemCategory = "Folders" | "Apps" | "Files";

const APP_EXTENSIONS = new Set(["exe", "app", "msi", "lnk", "bat", "sh", "appimage"]);

// Best-effort classification: prefers an explicit item.isDirectory /
// item.type field if the DesktopItem shape provides one, otherwise falls
// back to guessing from the file extension in the path/name.
// NOTE: adjust the field names below if your DesktopItem type uses
// different property names for "is this a folder" / "is this an app".
function classifyItem(item: DesktopItem): ItemCategory {
  const anyItem = item as unknown as { isDirectory?: boolean; type?: string };

  if (anyItem.isDirectory === true) return "Folders";
  if (anyItem.type === "folder" || anyItem.type === "directory") return "Folders";
  if (anyItem.type === "app" || anyItem.type === "application") return "Apps";

  const name = item.name || item.path || "";
  const dotIndex = name.lastIndexOf(".");
  if (dotIndex === -1) return "Folders"; // no extension → treat as folder
  const ext = name.slice(dotIndex + 1).toLowerCase();
  if (APP_EXTENSIONS.has(ext)) return "Apps";
  return "Files";
}

function groupByCategory(items: DesktopItem[]): Array<[ItemCategory, DesktopItem[]]> {
  const order: ItemCategory[] = ["Folders", "Apps", "Files"];
  const buckets: Record<ItemCategory, DesktopItem[]> = { Folders: [], Apps: [], Files: [] };
  items.forEach((item) => buckets[classifyItem(item)].push(item));
  return order.filter((cat) => buckets[cat].length > 0).map((cat) => [cat, buckets[cat]]);
}

export default function CommandCenter({
  messages,
  voice,
  isThinking = false,
  isSpeaking = false
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
  const [showZoomSlider, setShowZoomSlider] = useState(false);

  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("name");
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

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

  const handleRefresh = async () => {
    await refreshDesktop();
    setRefreshedAt(new Date());
  };

  // Live icon-size slider — updates hub settings immediately (tiles resize
  // as you drag) and broadcasts the change via the existing
  // "vsmart-hub-settings" event so any other place reading hubSettings
  // stays in sync. NOTE: this does NOT persist to disk yet — hubSettings.ts
  // has no exported save function currently. Once one exists, call it here
  // (see TODO near the import above) so the size survives a reload.
  const updateIconSize = (size: number) => {
    setHubSettings((prev) => {
      const next = { ...prev, desktopIconSize: size };
      window.dispatchEvent(new CustomEvent("vsmart-hub-settings", { detail: next }));
      return next;
    });
  };

  const visibleDesktopItems = useMemo(() => {
    let list = desktopItems;

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((item) => item.name.toLowerCase().includes(q));
    }

    if (sortMode === "name") {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [desktopItems, query, sortMode]);

  const groupedItems = useMemo(
    () => (hubSettings.appsLayout === "list" ? groupByCategory(visibleDesktopItems) : null),
    [visibleDesktopItems, hubSettings.appsLayout]
  );

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

  const orbState = voice.listening
    ? "listening"
    : isThinking
    ? "thinking"
    : isSpeaking
    ? "speaking"
    : "idle";

  const renderTile = (item: DesktopItem) => (
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
  );

  // Skeleton placeholders shown while the desktop is being scanned —
  // count roughly matches a typical first grid so nothing visibly
  // "jumps" once real tiles replace them.
  const skeletonCount = hubSettings.appsLayout === "list" ? 5 : 9;

  return (
    <div className="command-center">
      <div className="cc-card ai-overview glass-panel cc-hub">
        <div className="card-header">
          <span className="icon-badge badge-cyan">
            <Monitor size={15} />
          </span>
          <h3>DESKTOP HUB</h3>

          {showDesktop && desktopItems.length > 0 && (
            <span className="hub-item-count">{visibleDesktopItems.length}</span>
          )}

          {showDesktop && (
            <div className="hub-zoom-wrap">
              <button
                type="button"
                className={`hub-sort-btn ${showZoomSlider ? "active" : ""}`}
                title="Icon size"
                onClick={() => setShowZoomSlider((v) => !v)}
              >
                <ZoomIn size={13} />
              </button>
              {showZoomSlider && (
                <div className="hub-zoom-popover">
                  <input
                    type="range"
                    min={24}
                    max={64}
                    step={2}
                    value={hubSettings.desktopIconSize}
                    onChange={(e) => updateIconSize(Number(e.target.value))}
                  />
                  <span className="hub-zoom-value">{hubSettings.desktopIconSize}px</span>
                </div>
              )}
            </div>
          )}

          {showDesktop && (
            <button
              type="button"
              className={`hub-sort-btn ${sortMode === "name" ? "active" : ""}`}
              title={sortMode === "name" ? "Sorted A–Z — click for recent" : "Sorted by recent — click for A–Z"}
              onClick={() => setSortMode((m) => (m === "name" ? "recent" : "name"))}
            >
              {sortMode === "name" ? <ArrowDownAZ size={13} /> : <Clock size={13} />}
            </button>
          )}

          <button
            type="button"
            className="desktop-refresh-btn"
            title="Refresh"
            onClick={handleRefresh}
            disabled={desktopLoading}
          >
            <RefreshCw size={13} className={desktopLoading ? "spin" : ""} />
          </button>
        </div>

        {showDesktop && desktopItems.length > 0 && (
          <div className="hub-search-row">
            <Search size={13} className="hub-search-icon" />
            <input
              type="text"
              className="hub-search-input"
              placeholder="Search desktop..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                type="button"
                className="hub-search-clear"
                title="Clear search"
                onClick={() => setQuery("")}
              >
                <X size={12} />
              </button>
            )}
          </div>
        )}

        <div className={splitClass}>
          {showPlaces && (
            <div className={`places-panel ${placesCollapsed ? "collapsed" : ""}`}>
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
              <div className="places-label">
                Desktop
                {refreshedAt && (
                  <span className="hub-refreshed-at">
                    · refreshed {refreshedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>

              {desktopLoading && desktopItems.length === 0 ? (
                <div
                  className={`apps-grid-3 ${hubSettings.appsLayout === "list" ? "apps-list" : ""}`}
                  style={gridStyle}
                >
                  {Array.from({ length: skeletonCount }).map((_, i) => (
                    <div key={i} className="skeleton-tile">
                      <div className="skeleton-icon" />
                      <div className="skeleton-line" />
                    </div>
                  ))}
                </div>
              ) : desktopError && desktopItems.length === 0 ? (
                <div className="apps-grid-3" style={gridStyle}>
                  <div className="tile-empty tile-empty-error">
                    <span>Could not read Desktop</span>
                    <button type="button" onClick={handleRefresh}>Retry</button>
                  </div>
                </div>
              ) : !desktopLoading && !desktopError && desktopItems.length === 0 ? (
                <div className="apps-grid-3" style={gridStyle}>
                  <div className="tile-empty">Desktop is empty</div>
                </div>
              ) : visibleDesktopItems.length === 0 ? (
                <div className="apps-grid-3" style={gridStyle}>
                  <div className="tile-empty">No items match "{query}"</div>
                </div>
              ) : groupedItems ? (
                // ---- List view: grouped by Folders / Apps / Files ----
                <div className="apps-grouped-scroll">
                  {groupedItems.map(([category, items]) => (
                    <div key={category} className="hub-category-group">
                      <div className="hub-category-title">
                        {category} <span className="hub-category-count">{items.length}</span>
                      </div>
                      <div className="apps-grid-3 apps-list" style={gridStyle}>
                        {items.map(renderTile)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // ---- Grid view: flat, with "+N More" ----
                <div className="apps-grid-3" style={gridStyle}>
                  {visibleDesktopItems.slice(0, 12).map(renderTile)}

                  {visibleDesktopItems.length > 12 && (
                    <button
                      type="button"
                      className="icon-tile tile-more"
                      onClick={() =>
                        openDrawer(
                          "Desktop",
                          <div className="apps-grid-3 drawer-grid" style={gridStyle}>
                            {visibleDesktopItems.map(renderTile)}
                          </div>
                        )
                      }
                    >
                      <span className="tile-icon more-count">
                        +{visibleDesktopItems.length - 12}
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
              )}
            </div>
          )}
        </div>
      </div>

      <div className="cc-center">
        <div className="cc-card orb-card">
          <div className="globe-wrap">
            <AIOrb
              state={orbState}
              caption={voice.listening ? voice.interimText : undefined}
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
            <div className="feed-skeleton-list">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="feed-skeleton-item">
                  <div className="skeleton-icon feed-skeleton-icon" />
                  <div className="feed-skeleton-lines">
                    <div className="skeleton-line feed-skeleton-line-wide" />
                    <div className="skeleton-line feed-skeleton-line-narrow" />
                  </div>
                </div>
              ))}
            </div>
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