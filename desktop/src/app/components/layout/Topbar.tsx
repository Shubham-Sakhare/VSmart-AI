import { useEffect, useState } from "react";
import "./topbar.css";

import {
  Bell,
  Search,
  Settings,
  UserCircle2
} from "lucide-react";

export default function Topbar() {

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
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

        <button className="icon-btn">
          <Bell size={18} />
        </button>

        <button className="icon-btn">
          <Settings size={18} />
        </button>

        <div className="profile-block">
          <UserCircle2 size={34} className="profile" />
          <span className="profile-label">Operator</span>
        </div>

      </div>

    </header>
  );
}