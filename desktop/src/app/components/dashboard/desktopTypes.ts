export interface DesktopItem {
  name: string;
  displayName: string;
  path: string;
  type: "folder" | "file" | "shortcut" | "app" | "place";
  extension: string | null;
  size: number | null;
  modified: string | null;
  placeId?: string;
}