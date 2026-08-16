import { useEffect, useState } from "react";
import "./topbar.css";
import { useSystem } from "../../hooks/useSystem";
import ProfilePanel, { loadProfile, type UserProfile } from "./ProfilePanel";

import {
  Bell,
  Search,
  Settings,
  UserCircle2
} from "lucide-react";

interface TopbarProps {
  onOpenSettings: () => void;
}

function TopMiniMetric({ label, value }: { label: string; value: number }) {
  const safe = Math.min(100, Math.max(0, Math.round(value || 0)));
  let color = "#00e5ff";
  if (safe >= 85) color = "#ff5c7a";
  else if (safe >= 70) color = "#ff9f43";

  return (
    <div className="top-metric" title={`${label}: ${safe}%`}>
      <span className="top-metric-label">{label}</span>
      <div className="top-metric-track">
        <div
          className="top-metric-fill"
          style={{ width: `${safe}%`, background: color }}
        />
      </div>
      <span className="top-metric-val" style={{ color }}>{safe}%</span>
    </div>
  );
}

export default function Topbar({ onOpenSettings }: TopbarProps) {
  const [now, setNow] = useState(new Date());
  const system = useSystem();
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(() => loadProfile());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const onUpdate = (e: Event) => {
      const detail = (e as CustomEvent<UserProfile>).detail;
      if (detail) setProfile(detail);
      else setProfile(loadProfile());
    };
    window.addEventListener("vsmart-profile-updated", onUpdate);
    setProfile(loadProfile());
    return () => window.removeEventListener("vsmart-profile-updated", onUpdate);
  }, []);

  const dateStr = now.toLocaleDateString([], {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  });

  const timeStr = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });

  const displayName = profile.name?.trim() || "Operator";

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <div className="ai-state">
            <span className="pulse"></span>
            <span className="ai-state-brand">VSmart&nbsp;2.0</span>
          </div>
        </div>

        <div className="topbar-center">
          <div className="clock-block">
            <span className="clock-time">{timeStr}</span>
            <span className="clock-date">{dateStr}</span>
          </div>
        </div>

        <div className="topbar-right">
          <div className="search-box">
            <Search size={18} />
            <input type="text" placeholder="Search..." />
          </div>

          <div className="top-sys-metrics">
            <TopMiniMetric label="CPU" value={system?.cpu ?? 0} />
            <TopMiniMetric label="RAM" value={system?.ram ?? 0} />
            <TopMiniMetric label="DISK" value={system?.storage ?? 0} />
          </div>

          <button className="icon-btn" title="Notifications">
            <Bell size={18} />
          </button>

          <button className="icon-btn" onClick={onOpenSettings} title="Settings">
            <Settings size={18} />
          </button>

          <button
            type="button"
            className="profile-block profile-trigger"
            onClick={() => setProfileOpen((v) => !v)}
            title="Profile"
          >
            {profile.photo ? (
              <img src={profile.photo} alt="" className="profile-avatar" />
            ) : (
              <UserCircle2 size={34} className="profile" />
            )}
            <span className="profile-label">{displayName}</span>
          </button>
        </div>
      </header>

      <ProfilePanel open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
}