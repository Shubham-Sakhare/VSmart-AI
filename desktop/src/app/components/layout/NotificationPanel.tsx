import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  CheckCheck,
  Trash2,
  Info,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  type AppNotification,
  getNotifications,
  markAllRead,
  clearAll,
  NOTIFICATION_EVENT,
} from "../../../lib/Notifications";

import "./NotificationPanel.css";

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

function TypeIcon({ type }: { type: AppNotification["type"] }) {
  if (type === "success")
    return <CheckCircle2 size={15} className="notif-icon success" />;
  if (type === "warning")
    return <AlertTriangle size={15} className="notif-icon warning" />;
  return <Info size={15} className="notif-icon info" />;
}

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function NotificationPanel({ open, onClose }: NotificationPanelProps) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(() => {
    getNotifications().then(setItems);
  }, []);

  // Load when panel opens
  useEffect(() => {
    if (open) load();
  }, [open, load]);

  // Listen for new notifications
  useEffect(() => {
    window.addEventListener(NOTIFICATION_EVENT, load);
    return () => window.removeEventListener(NOTIFICATION_EVENT, load);
  }, [load]);

  // Outside click to close
  useEffect(() => {
    if (!open) return;

    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // small delay so the opening click doesn't immediately close the panel
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="notif-panel" ref={panelRef}>
      <div className="notif-header">
        <div className="notif-title">
          <Bell size={14} />
          <span>Notifications</span>
        </div>

        {items.length > 0 && (
          <div className="notif-actions">
            <button
              className="notif-action-btn"
              title="Mark all as read"
              onClick={() => markAllRead().then(load)}
            >
              <CheckCheck size={13} />
            </button>
            <button
              className="notif-action-btn"
              title="Clear all"
              onClick={() => clearAll().then(load)}
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>

      <div className="notif-list">
        {items.length === 0 ? (
          <div className="notif-empty">No notifications yet.</div>
        ) : (
          items.map((n) => (
            <div
              key={n.id}
              className={n.read ? "notif-item" : "notif-item unread"}
            >
              <TypeIcon type={n.type} />
              <div className="notif-body">
                <div className="notif-item-title">{n.title}</div>
                <div className="notif-item-message">{n.message}</div>
                <div className="notif-item-time">{timeAgo(n.time)}</div>
              </div>
              {!n.read && <span className="notif-dot" />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}