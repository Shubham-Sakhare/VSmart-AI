import { useCallback, useEffect, useState } from "react";
import "./topbar.css";
import {
  Bell,
  Search,
  Settings,
  UserCircle2,
} from "lucide-react";
import ProfilePanel from "./ProfilePanel";
import NotificationPanel from "./NotificationPanel";
import { getNotifications, NOTIFICATION_EVENT,} from "../../../lib/Notifications";

const PROFILE_KEY = "vsmart_profile";

interface TopbarProps {
  onOpenSettings: () => void;
}

export default function Topbar({ onOpenSettings }: TopbarProps) {
  const [now, setNow] = useState(new Date());
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [username, setUsername] = useState("Operator");
  const [unreadCount, setUnreadCount] = useState(0);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadProfile = useCallback(() => {
    window.vsmart
      .getMemory(PROFILE_KEY)
      .then((raw) => {
        if (typeof raw !== "string" || !raw) return;
        try {
          const parsed = JSON.parse(raw);
          setPhoto(parsed.photo || null);
          setUsername(parsed.username || "Operator");
        } catch {
          /* ignore */
        }
      })
      .catch(() => {});
  }, []);

  const loadUnreadCount = useCallback(() => {
    getNotifications().then((list) => {
      setUnreadCount(list.filter((n) => !n.read).length);
    });
  }, []);

  // Initial load
  useEffect(() => {
    loadProfile();
    loadUnreadCount();
  }, [loadProfile, loadUnreadCount]);

  // Listen for new notifications
  useEffect(() => {
    window.addEventListener(NOTIFICATION_EVENT, loadUnreadCount);
    return () => window.removeEventListener(NOTIFICATION_EVENT, loadUnreadCount);
  }, [loadUnreadCount]);

  // Refresh profile when panel closes
  useEffect(() => {
    if (!profileOpen) loadProfile();
  }, [profileOpen, loadProfile]);

  const dateStr = now.toLocaleDateString([], {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const timeStr = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  return (
    <header className="topbar">
      {/* Left */}
      <div className="topbar-left">
        <div className="ai-state">
          <span className="pulse"></span>
          SYSTEM STATUS &nbsp;OPTIMAL
        </div>
      </div>

      {/* Center */}
      <div className="topbar-center">
        <div className="clock-block">
          <span className="clock-date">{dateStr}</span>
          <span className="clock-time">{timeStr}</span>
        </div>
      </div>

      {/* Right */}
      <div className="topbar-right">
        <div className="search-box">
          <Search size={18} />
          <input type="text" placeholder="Search..." />
        </div>

        {/* Notifications */}
        <div className="pinned-app-wrap" style={{ position: "relative" }}>
          <button
            className="icon-btn"
            onClick={() => setNotifOpen((prev) => !prev)}
            style={{ position: "relative" }}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="notif-badge">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          <NotificationPanel
            open={notifOpen}
            onClose={() => setNotifOpen(false)}
          />
        </div>

        {/* Settings */}
        <button
          className="icon-btn"
          onClick={onOpenSettings}
          title="Settings"
        >
          <Settings size={18} />
        </button>

        {/* Profile */}
        <div className="pinned-app-wrap" style={{ position: "relative" }}>
          <div
            className="profile-block"
            onClick={() => setProfileOpen((prev) => !prev)}
            style={{ cursor: "pointer" }}
          >
            {photo ? (
              <img src={photo} className="profile-block-photo" alt="Profile" />
            ) : (
              <UserCircle2 size={34} className="profile" />
            )}
            <span className="profile-label">{username}</span>
          </div>

          <ProfilePanel
            open={profileOpen}
            onClose={() => setProfileOpen(false)}
          />
        </div>
      </div>
    </header>
  );
}