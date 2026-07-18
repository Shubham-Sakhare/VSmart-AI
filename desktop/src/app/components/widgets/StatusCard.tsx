import "./StatusCard.css";
import type { LucideIcon } from "lucide-react";

interface StatusCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  color?: string;
}

export default function StatusCard({
  title,
  value,
  icon: Icon,
  color = "#00eaff",
}: StatusCardProps) {
  return (
    <div className="status-card">
      <div
        className="status-icon"
        style={{ background: `${color}22`, color }}
      >
        <Icon size={22} />
      </div>

      <div className="status-info">
        <span>{title}</span>
        <h2>{value}</h2>
      </div>
    </div>
  );
}