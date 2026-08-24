import type { DesktopItem } from "./desktopTypes";

export function placeColor(placeId?: string): string {
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

export function desktopTileClass(item: DesktopItem): string {
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

export function typeClass(item: DesktopItem): string {
  return desktopTileClass(item);
}