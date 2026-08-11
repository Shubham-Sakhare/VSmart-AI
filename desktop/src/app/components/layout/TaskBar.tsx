import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  Mic,
  X,
  Monitor,
  Pin,
  PinOff,
  Pencil,
  Trash2,
  Search,
  AppWindow,
  Eye,
  EyeOff,
  FolderOpen
} from "lucide-react";
import type { Page } from "./MainLayout";
import type { VoiceControls } from "../../voice/useVoice";
import {
  LAUNCHER_CATALOG,
  HOME_PAGE,
  LAUNCHER_APPS_KEY,
  DEFAULT_LAUNCHER_STATE,
  parseLauncherState,
  type LauncherAppsState,
  type LauncherCatalogEntry
} from "./launcherCatalog";
import "./TaskBar.css";

interface TaskBarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
  voice: VoiceControls;
}

interface LibraryApp {
  name: string;
  id: string;
  icon: string;
  customIcon?: string;
  pinned: boolean;
}


const SYSTEM_BTN_ICON_KEY = "vsmart_system_btn_icon";
const LAUNCHER_PINS_HIDDEN_KEY = "vsmart_launcher_pins_hidden";
const SYSTEM_PINS_HIDDEN_KEY = "vsmart_system_pins_hidden";
const TASKBAR_AUTOHIDE_KEY = "vsmart_taskbar_autohide";
const TASKBAR_POSITION_KEY = "vsmart_taskbar_position";

type TaskbarPosition = "bottom" | "top" | "left" | "right";

function AppIcon({ src, size = 28 }: { src?: string; size?: number }) {
  if (!src) {
    return (
      <div className="app-icon-fallback" style={{ width: size, height: size }}>
        <AppWindow size={Math.round(size * 0.6)} />
      </div>
    );
  }
  return (
    <img
      src={src}
      width={size}
      height={size}
      loading="lazy"
      className="system-app-icon"
      draggable={false}
    />
  );
}

export default function TaskBar({ activePage, onNavigate, voice }: TaskBarProps) {
  const [startOpen, setStartOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryApps, setLibraryApps] = useState<LibraryApp[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [vlogoSearch, setVlogoSearch] = useState("");

  const [launcherState, setLauncherState] = useState<LauncherAppsState>(DEFAULT_LAUNCHER_STATE);

  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [launcherMenuFor, setLauncherMenuFor] = useState<Page | null>(null);
  const [now, setNow] = useState(new Date());
  const menuRef = useRef<HTMLDivElement | null>(null);
  const launcherMenuRef = useRef<HTMLDivElement | null>(null);

  const [draggedLauncherPage, setDraggedLauncherPage] = useState<Page | null>(null);
  const [draggedSystemAppId, setDraggedSystemAppId] = useState<string | null>(null);

  const [systemBtnIcon, setSystemBtnIcon] = useState<string | null>(null);
  const [vlogoBtnMenuOpen, setVlogoBtnMenuOpen] = useState(false);
  const [systemBtnMenuOpen, setSystemBtnMenuOpen] = useState(false);
  const vlogoBtnMenuRef = useRef<HTMLDivElement | null>(null);
  const systemBtnMenuRef = useRef<HTMLDivElement | null>(null);

  const [launcherPinsHidden, setLauncherPinsHidden] = useState(false);
  const [systemPinsHidden, setSystemPinsHidden] = useState(false);

  const [autoHide, setAutoHide] = useState(false);
  const [taskbarHidden, setTaskbarHidden] = useState(false);
  const [position, setPosition] = useState<TaskbarPosition>("bottom");
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const taskbarRef = useRef<HTMLElement | null>(null);

  // Body pe position set – Talk to VSmart / floating UI ke liye
  useEffect(() => {
    document.body.setAttribute("data-taskbar-pos", position);
    return () => {
      document.body.removeAttribute("data-taskbar-pos");
    };
  }, [position]);

  // Taskbar ka actual size (width jab left/right, height jab top/bottom) measure karke
  // body pe --taskbar-size set karna – layout isi se apni jagah adjust karta hai.
  useEffect(() => {
    const el = taskbarRef.current;
    if (!el) return;

    const applySize = () => {
      // Auto-hide + currently hidden → taskbar screen se bahar hai, layout ko jagah
      // reserve karne ki zarurat nahi.
      if (autoHide && taskbarHidden) {
        document.body.style.setProperty("--taskbar-size", "0px");
        return;
      }
      const size = position === "left" || position === "right"
        ? el.offsetWidth
        : el.offsetHeight;
      document.body.style.setProperty("--taskbar-size", `${size}px`);
    };

    applySize();

    const ro = new ResizeObserver(applySize);
    ro.observe(el);

    return () => {
      ro.disconnect();
    };
  }, [position, autoHide, taskbarHidden]);

  useEffect(() => {
    return () => {
      document.body.style.removeProperty("--taskbar-size");
    };
  }, []);

  // Settings se live update
  useEffect(() => {
    const onSettings = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      if (
        detail.position === "top" ||
        detail.position === "left" ||
        detail.position === "right" ||
        detail.position === "bottom"
      ) {
        setPosition(detail.position);
      }
      if (typeof detail.autoHide === "boolean") {
        setAutoHide(detail.autoHide);
      }
    };
    window.addEventListener("vsmart-taskbar-settings", onSettings);
    return () => window.removeEventListener("vsmart-taskbar-settings", onSettings);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const unsubscribe = window.vsmart.onToggleStart(() => {
      setStartOpen((prev) => !prev);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setStartOpen(false);
      setLibraryOpen(false);
      setMenuFor(null);
      setLauncherMenuFor(null);
      setVlogoBtnMenuOpen(false);
      setSystemBtnMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const loadLauncherState = useCallback(() => {
    window.vsmart
      .getMemory(LAUNCHER_APPS_KEY)
      .then((raw) => setLauncherState(parseLauncherState(raw)))
      .catch(() => setLauncherState(DEFAULT_LAUNCHER_STATE));
  }, []);

  const persistLauncherState = useCallback((next: LauncherAppsState) => {
    setLauncherState(next);
    window.vsmart.saveMemory(LAUNCHER_APPS_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  useEffect(() => {
    loadLauncherState();
  }, [loadLauncherState]);

  useEffect(() => {
    if (startOpen) loadLauncherState();
  }, [startOpen, loadLauncherState]);

  useEffect(() => {
    window.vsmart
      .getMemory(SYSTEM_BTN_ICON_KEY)
      .then((raw) => setSystemBtnIcon(raw || null))
      .catch(() => setSystemBtnIcon(null));

    window.vsmart
      .getMemory(LAUNCHER_PINS_HIDDEN_KEY)
      .then((raw) => setLauncherPinsHidden(raw === "1" || raw === "true"))
      .catch(() => setLauncherPinsHidden(false));

    window.vsmart
      .getMemory(SYSTEM_PINS_HIDDEN_KEY)
      .then((raw) => setSystemPinsHidden(raw === "1" || raw === "true"))
      .catch(() => setSystemPinsHidden(false));

    window.vsmart
      .getMemory(TASKBAR_AUTOHIDE_KEY)
      .then((raw) => setAutoHide(raw === "1" || raw === "true"))
      .catch(() => setAutoHide(false));

    window.vsmart
      .getMemory(TASKBAR_POSITION_KEY)
      .then((raw) => {
        if (raw === "top" || raw === "left" || raw === "right" || raw === "bottom") {
          setPosition(raw);
        }
      })
      .catch(() => setPosition("bottom"));
  }, []);

  useEffect(() => {
    window.vsmart.launcher
      .getLibraryApps()
      .then(setLibraryApps)
      .catch(() => setLibraryApps([]));
  }, []);

  useEffect(() => {
    if (!libraryOpen) return;
    setLibraryLoading(true);
    window.vsmart.launcher
      .getLibraryApps()
      .then(setLibraryApps)
      .catch(() => {})
      .finally(() => setLibraryLoading(false));
  }, [libraryOpen]);

  useEffect(() => {
    if (!menuFor && !launcherMenuFor && !vlogoBtnMenuOpen && !systemBtnMenuOpen) return;

    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuFor(null);
      if (launcherMenuRef.current && !launcherMenuRef.current.contains(e.target as Node))
        setLauncherMenuFor(null);
      if (vlogoBtnMenuRef.current && !vlogoBtnMenuRef.current.contains(e.target as Node))
        setVlogoBtnMenuOpen(false);
      if (systemBtnMenuRef.current && !systemBtnMenuRef.current.contains(e.target as Node))
        setSystemBtnMenuOpen(false);
    };

    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuFor, launcherMenuFor, vlogoBtnMenuOpen, systemBtnMenuOpen]);

  const showTaskbar = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setTaskbarHidden(false);
  }, []);

  const scheduleHide = useCallback(() => {
    if (!autoHide) return;
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (
        startOpen ||
        libraryOpen ||
        menuFor ||
        launcherMenuFor ||
        vlogoBtnMenuOpen ||
        systemBtnMenuOpen
      ) {
        return;
      }
      setTaskbarHidden(true);
    }, 1200);
  }, [
    autoHide,
    startOpen,
    libraryOpen,
    menuFor,
    launcherMenuFor,
    vlogoBtnMenuOpen,
    systemBtnMenuOpen
  ]);

  useEffect(() => {
    if (!autoHide) {
      setTaskbarHidden(false);
      return;
    }
    scheduleHide();
  }, [autoHide, scheduleHide]);

  useEffect(() => {
    const onFocus = () => {
      window.vsmart
        .getMemory(TASKBAR_AUTOHIDE_KEY)
        .then((raw) => setAutoHide(raw === "1" || raw === "true"))
        .catch(() => {});
      window.vsmart
        .getMemory(TASKBAR_POSITION_KEY)
        .then((raw) => {
          if (raw === "top" || raw === "left" || raw === "right" || raw === "bottom") {
            setPosition(raw);
          }
        })
        .catch(() => {});
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString([], { day: "2-digit", month: "short" });

  const launch = (page: Page) => {
    onNavigate(page);
    setStartOpen(false);
  };

  const addedLauncherApps = useMemo(
    () => LAUNCHER_CATALOG.filter((a) => launcherState.added.includes(a.page)),
    [launcherState.added]
  );

  const filteredVlogoApps = useMemo(() => {
    const q = vlogoSearch.trim().toLowerCase();
    if (!q) return addedLauncherApps;
    return addedLauncherApps.filter(
      (a) => a.label.toLowerCase().includes(q) || a.page.toLowerCase().includes(q)
    );
  }, [addedLauncherApps, vlogoSearch]);

  const pinnedLauncherApps = useMemo(
    () =>
      launcherState.pinned
        .filter((page) => page !== HOME_PAGE)
        .map((page) => addedLauncherApps.find((a) => a.page === page))
        .filter((a): a is LauncherCatalogEntry => Boolean(a)),
    [addedLauncherApps, launcherState.pinned]
  );

  const homeEntry = LAUNCHER_CATALOG.find((a) => a.page === HOME_PAGE)!;

  const pinnedTaskbarApps = useMemo(
    () => libraryApps.filter((a) => a.pinned),
    [libraryApps]
  );

  const filteredLibraryApps = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return libraryApps;
    return libraryApps.filter((a) => a.name.toLowerCase().includes(q));
  }, [libraryApps, search]);

  const togglePin = useCallback((app: LibraryApp) => {
    window.vsmart.launcher
      .setPinned(app.id, !app.pinned)
      .then(setLibraryApps)
      .catch(() => {});
    setMenuFor(null);
  }, []);

  const reorderSystemPinned = useCallback((draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    setLibraryApps((prev) => {
      const pinnedIds = prev.filter((a) => a.pinned).map((a) => a.id);
      const fromIndex = pinnedIds.indexOf(draggedId);
      const toIndex = pinnedIds.indexOf(targetId);
      if (fromIndex === -1 || toIndex === -1) return prev;

      const reorderedPinned = [...pinnedIds];
      reorderedPinned.splice(fromIndex, 1);
      reorderedPinned.splice(toIndex, 0, draggedId);

      const fullOrder = [
        ...reorderedPinned,
        ...prev.filter((a) => !a.pinned).map((a) => a.id)
      ];
      window.vsmart.launcher.reorderLibraryApps(fullOrder).then(setLibraryApps).catch(() => {});

      const byId = new Map(prev.map((a) => [a.id, a]));
      return fullOrder.map((id) => byId.get(id)!).filter(Boolean);
    });
  }, []);



  const handleEditIcon = useCallback((id: string) => {
    window.vsmart.launcher
      .pickIcon(id)
      .then(setLibraryApps)
      .catch(() => {});
    setMenuFor(null);
  }, []);

  const handleOpenFileLocation = useCallback((id: string) => {
    try {
      (window.vsmart.launcher as any).openFileLocation?.(id);
    } catch {
      /* no-op */
    }
    setMenuFor(null);
  }, []);

  const handleUnpinAndRemove = useCallback((id: string) => {
    window.vsmart.launcher
      .setPinned(id, false)
      .then(() => window.vsmart.launcher.removeLibraryApp(id))
      .then(setLibraryApps)
      .catch(() => {});
    setMenuFor(null);
  }, []);

  const toggleLauncherPin = useCallback(
    (page: Page) => {
      const isPinned = launcherState.pinned.includes(page);
      const nextPinned = isPinned
        ? launcherState.pinned.filter((p) => p !== page)
        : [...launcherState.pinned, page];
      persistLauncherState({ ...launcherState, pinned: nextPinned });
      setLauncherMenuFor(null);
    },
    [launcherState, persistLauncherState]
  );

  const reorderLauncherPinned = useCallback(
    (draggedPage: Page, targetPage: Page) => {
      if (draggedPage === targetPage) return;
      const fromIndex = launcherState.pinned.indexOf(draggedPage);
      const toIndex = launcherState.pinned.indexOf(targetPage);
      if (fromIndex === -1 || toIndex === -1) return;
      const reordered = [...launcherState.pinned];
      reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, draggedPage);
      persistLauncherState({ ...launcherState, pinned: reordered });
    },
    [launcherState, persistLauncherState]
  );

  const removeLauncherApp = useCallback(
    (page: Page) => {
      persistLauncherState({
        ...launcherState,
        added: launcherState.added.filter((p) => p !== page),
        pinned: launcherState.pinned.filter((p) => p !== page)
      });
      setLauncherMenuFor(null);
    },
    [launcherState, persistLauncherState]
  );

  const editLauncherIcon = useCallback(
    (page: Page) => {
      window.vsmart.launcher
        .pickImage()
        .then((dataUrl) => {
          if (!dataUrl) return;
          persistLauncherState({
            ...launcherState,
            customIcons: { ...launcherState.customIcons, [page]: dataUrl }
          });
        })
        .catch(() => {});
      setLauncherMenuFor(null);
    },
    [launcherState, persistLauncherState]
  );

  const editSystemBtnIcon = useCallback(() => {
    window.vsmart.launcher
      .pickImage()
      .then((dataUrl) => {
        if (!dataUrl) return;
        setSystemBtnIcon(dataUrl);
        window.vsmart.saveMemory(SYSTEM_BTN_ICON_KEY, dataUrl).catch(() => {});
      })
      .catch(() => {});
    setSystemBtnMenuOpen(false);
  }, []);

  const toggleLauncherPinsVisibility = useCallback(() => {
    setLauncherPinsHidden((prev) => {
      const next = !prev;
      window.vsmart.saveMemory(LAUNCHER_PINS_HIDDEN_KEY, next ? "1" : "0").catch(() => {});
      return next;
    });
    setVlogoBtnMenuOpen(false);
  }, []);

  const toggleSystemPinsVisibility = useCallback(() => {
    setSystemPinsHidden((prev) => {
      const next = !prev;
      window.vsmart.saveMemory(SYSTEM_PINS_HIDDEN_KEY, next ? "1" : "0").catch(() => {});
      return next;
    });
    setSystemBtnMenuOpen(false);
  }, []);

  return (
    <>
      {startOpen && (
        <div className="taskbar-overlay" onClick={() => setStartOpen(false)}>
          <div className="start-menu" onClick={(e) => e.stopPropagation()}>
            <div className="start-menu-header">
              <span>VSmart Apps</span>
              <button className="start-close" onClick={() => setStartOpen(false)}>
                <X size={16} />
              </button>
            </div>

            {addedLauncherApps.length > 4 && (
              <div className="app-search">
                <Search size={14} />
                <input
                  type="text"
                  placeholder="Search VSmart apps..."
                  value={vlogoSearch}
                  onChange={(e) => setVlogoSearch(e.target.value)}
                  autoFocus
                />
              </div>
            )}

            <div className="start-grid">
              {filteredVlogoApps.map((app) => {
                const custom = launcherState.customIcons[app.page];
                const isHome = app.page === HOME_PAGE;
                const isPinned = launcherState.pinned.includes(app.page);
                return (
                  <div className="pinned-app-wrap library-tile-wrap" key={app.page}>
                    <button
                      className={
                        activePage === app.page
                          ? "start-tile active system-tile"
                          : "start-tile system-tile"
                      }
                      onClick={() => launch(app.page)}
                      onContextMenu={(e) => {
                        if (isHome) return;
                        e.preventDefault();
                        setLauncherMenuFor((prev) => (prev === app.page ? null : app.page));
                      }}
                    >
                      {custom ? <AppIcon src={custom} /> : app.icon}
                      <span>{app.label}</span>
                      {isPinned && !isHome && (
                        <span className="pinned-badge" title="Pinned to taskbar" />
                      )}
                    </button>

                    {launcherMenuFor === app.page && (
                      <div className="pinned-app-menu library-menu" ref={launcherMenuRef}>
                        <button onClick={() => toggleLauncherPin(app.page)}>
                          {isPinned ? <PinOff size={13} /> : <Pin size={13} />}
                          {isPinned ? "Unpin from taskbar" : "Pin to taskbar"}
                        </button>
                        <button onClick={() => editLauncherIcon(app.page)}>
                          <Pencil size={13} /> Edit icon
                        </button>
                        <button className="danger" onClick={() => removeLauncherApp(app.page)}>
                          <Trash2 size={13} /> Remove
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {libraryOpen && (
        <div className="taskbar-overlay" onClick={() => setLibraryOpen(false)}>
          <div className="start-menu" onClick={(e) => e.stopPropagation()}>
            <div className="start-menu-header">
              <span>System Apps</span>
              <button className="start-close" onClick={() => setLibraryOpen(false)}>
                <X size={16} />
              </button>
            </div>

            {libraryApps.length > 4 && (
              <div className="app-search">
                <Search size={14} />
                <input
                  type="text"
                  placeholder="Search your apps..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            )}

            {libraryLoading && libraryApps.length === 0 ? (
              <div className="apps-loading">Loading...</div>
            ) : libraryApps.length === 0 ? (
              <div className="apps-empty">
                No apps added yet.
                <br />
                Go to Settings → Add System App to add some.
              </div>
            ) : (
              <div className="start-grid">
                {filteredLibraryApps.map((app) => (
                  <div className="pinned-app-wrap library-tile-wrap" key={app.id}>
                    <button
                      className="start-tile system-tile"
                      onClick={() => window.vsmart.launchSystemApp(app.id)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setMenuFor((prev) => (prev === app.id ? null : app.id));
                      }}
                      title={app.name}
                    >
                      <AppIcon src={app.customIcon || app.icon} />
                      <span>{app.name}</span>
                      {app.pinned && <span className="pinned-badge" title="Pinned to taskbar" />}
                    </button>

                    {menuFor === app.id && (
                      <div className="pinned-app-menu library-menu" ref={menuRef}>
                        <button onClick={() => togglePin(app)}>
                          {app.pinned ? <PinOff size={13} /> : <Pin size={13} />}
                          {app.pinned ? "Unpin from taskbar" : "Pin to taskbar"}
                        </button>
                        <button onClick={() => handleEditIcon(app.id)}>
                          <Pencil size={13} /> Edit icon
                        </button>
                        <button onClick={() => handleOpenFileLocation(app.id)}>
                          <FolderOpen size={13} /> Open file location
                        </button>
                        <button className="danger" onClick={() => handleUnpinAndRemove(app.id)}>
                          <Trash2 size={13} /> Unpin & Remove
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {autoHide && taskbarHidden && (
        <div
          className={`taskbar-hotedge pos-${position}`}
          onMouseEnter={showTaskbar}
        />
      )}

      <footer
        ref={taskbarRef as any}
        className={[
          "taskbar",
          `pos-${position}`,
          autoHide && taskbarHidden ? "hidden" : "",
          voice.listening ? "mic-listening" : ""
        ]
          .filter(Boolean)
          .join(" ")}
        onMouseEnter={showTaskbar}
        onMouseLeave={scheduleHide}
      >
        <div className="taskbar-left">
          <div className="pinned-app-wrap">
            <button
              className="taskbar-start"
              onClick={() => setStartOpen((prev) => !prev)}
              onContextMenu={(e) => {
                e.preventDefault();
                setVlogoBtnMenuOpen((prev) => !prev);
              }}
              title="VSmart Start"
            >
              <div className="start-logo">V</div>
            </button>

            {vlogoBtnMenuOpen && (
              <div className="pinned-app-menu align-left" ref={vlogoBtnMenuRef}>
                <div
                  className="menu-toggle-row"
                  onClick={toggleLauncherPinsVisibility}
                  title={launcherPinsHidden ? "Pins are hidden" : "Pins are visible"}
                >
                  <span className="menu-toggle-label">
                    {launcherPinsHidden ? <EyeOff size={13} /> : <Eye size={13} />}
                    {launcherPinsHidden ? "Pins hidden" : "Pins visible"}
                  </span>
                  <div className={`toggle-switch ${launcherPinsHidden ? "on" : ""}`} />
                </div>
              </div>
            )}
          </div>

          <div className="taskbar-pinned">
            <button
              className={
                activePage === HOME_PAGE ? "taskbar-icon active pulse" : "taskbar-icon"
              }
              onClick={() => onNavigate(HOME_PAGE)}
              title={homeEntry.label}
            >
              {launcherState.customIcons[HOME_PAGE] ? (
                <AppIcon src={launcherState.customIcons[HOME_PAGE]} size={18} />
              ) : (
                homeEntry.icon
              )}
              {activePage === HOME_PAGE && <span className="running-dot" />}
            </button>

            {!launcherPinsHidden &&
              pinnedLauncherApps.map((app) => (
                <div className="pinned-app-wrap" key={app.page}>
                  <button
                    draggable
                    onDragStart={() => setDraggedLauncherPage(app.page)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedLauncherPage)
                        reorderLauncherPinned(draggedLauncherPage, app.page);
                      setDraggedLauncherPage(null);
                    }}
                    onDragEnd={() => setDraggedLauncherPage(null)}
                    className={
                      (activePage === app.page ? "taskbar-icon active pulse" : "taskbar-icon") +
                      (draggedLauncherPage === app.page ? " dragging" : "")
                    }
                    onClick={() => onNavigate(app.page)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setLauncherMenuFor((prev) => (prev === app.page ? null : app.page));
                    }}
                    title={app.label}
                  >
                    {launcherState.customIcons[app.page] ? (
                      <AppIcon src={launcherState.customIcons[app.page]} size={18} />
                    ) : (
                      app.icon
                    )}
                    {activePage === app.page && <span className="running-dot" />}
                  </button>

                  {launcherMenuFor === app.page && (
                    <div className="pinned-app-menu" ref={launcherMenuRef}>
                      <button onClick={() => toggleLauncherPin(app.page)}>
                        <PinOff size={13} /> Unpin from taskbar
                      </button>
                      <button onClick={() => editLauncherIcon(app.page)}>
                        <Pencil size={13} /> Edit icon
                      </button>
                      <button className="danger" onClick={() => removeLauncherApp(app.page)}>
                        <Trash2 size={13} /> Remove
                      </button>
                    </div>
                  )}
                </div>
              ))}

            <button
              className={
                voice.listening ? "taskbar-icon mic active listening" : "taskbar-icon mic"
              }
              onClick={voice.toggleListening}
              title="Talk to VSmart"
            >
              <Mic size={18} />
            </button>
          </div>
        </div>

        <div className="taskbar-right">
          {!systemPinsHidden && pinnedTaskbarApps.length > 0 && (
            <div className="taskbar-pinned">
              {pinnedTaskbarApps.map((app) => (
                <div className="pinned-app-wrap" key={app.id}>
                  <button
                    draggable
                    onDragStart={() => setDraggedSystemAppId(app.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedSystemAppId)
                        reorderSystemPinned(draggedSystemAppId, app.id);
                      setDraggedSystemAppId(null);
                    }}
                    onDragEnd={() => setDraggedSystemAppId(null)}
                    className={
                      "taskbar-icon pinned-app" +
                      (draggedSystemAppId === app.id ? " dragging" : "")
                    }
                    title={app.name}
                    onClick={() => window.vsmart.launchSystemApp(app.id)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setMenuFor((prev) => (prev === app.id ? null : app.id));
                    }}
                  >
                    <AppIcon src={app.customIcon || app.icon} size={22} />
                    <span className="running-dot" />
                  </button>

                  {menuFor === app.id && (
                    <div className="pinned-app-menu" ref={menuRef}>
                      <button onClick={() => togglePin(app)}>
                        <PinOff size={13} /> Unpin from taskbar
                      </button>
                      <button onClick={() => handleEditIcon(app.id)}>
                        <Pencil size={13} /> Edit icon
                      </button>
                      <button onClick={() => handleOpenFileLocation(app.id)}>
                        <FolderOpen size={13} /> Open file location
                      </button>
                      <button className="danger" onClick={() => handleUnpinAndRemove(app.id)}>
                        <Trash2 size={13} /> Unpin & Remove
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="pinned-app-wrap">
            <button
              className="taskbar-start windows-button"
              onClick={() => setLibraryOpen((prev) => !prev)}
              onContextMenu={(e) => {
                e.preventDefault();
                setSystemBtnMenuOpen((prev) => !prev);
              }}
              title="System Apps"
            >
              {systemBtnIcon ? (
                <AppIcon src={systemBtnIcon} size={25} />
              ) : (
                <Monitor size={25} />
              )}
            </button>

            {systemBtnMenuOpen && (
              <div className="pinned-app-menu align-right" ref={systemBtnMenuRef}>
                <button onClick={editSystemBtnIcon}>
                  <Pencil size={13} /> Edit icon
                </button>
                <div
                  className="menu-toggle-row"
                  onClick={toggleSystemPinsVisibility}
                  title={systemPinsHidden ? "Pins are hidden" : "Pins are visible"}
                >
                  <span className="menu-toggle-label">
                    {systemPinsHidden ? <EyeOff size={13} /> : <Eye size={13} />}
                    {systemPinsHidden ? "Pins hidden" : "Pins visible"}
                  </span>
                  <div className={`toggle-switch ${systemPinsHidden ? "on" : ""}`} />
                </div>
              </div>
            )}
          </div>

          <div className="taskbar-tray">
            <div className="tray-clock">
              <span>{timeStr}</span>
              <span className="tray-date">{dateStr}</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}