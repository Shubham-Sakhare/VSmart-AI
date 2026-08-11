import { X } from "lucide-react";
import "./DetailDrawer.css";

interface DetailDrawerProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export default function DetailDrawer({ open, title, onClose, children }: DetailDrawerProps) {
  if (!open) return null;

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="detail-drawer open">
        <div className="drawer-header">
          <h3>{title}</h3>
          <button className="drawer-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="drawer-body">{children}</div>
      </div>
    </>
  );
}