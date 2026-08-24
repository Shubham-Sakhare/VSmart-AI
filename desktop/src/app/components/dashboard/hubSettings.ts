export const HUB_SETTINGS_KEY = "vsmart_hub_settings";

export interface HubSettings {
  placesIconSize: number;
  desktopTextSize: number;
  desktopIconSize: number;
  appsGridCols: number;
  appsLayout: "grid" | "list";
  showPlaces: boolean;
  showDesktop: boolean;
}

export const DEFAULT_HUB_SETTINGS: HubSettings = {
  placesIconSize: 22,
  desktopTextSize: 10,
  desktopIconSize: 48,
  appsGridCols: 3,
  appsLayout: "grid",
  showPlaces: true,
  showDesktop: true
};

export function clampHubValue(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

const clamp = clampHubValue;

export function loadHubSettings(): HubSettings {
  try {
    const raw = localStorage.getItem(HUB_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_HUB_SETTINGS };
    const p = JSON.parse(raw);
    return {
      placesIconSize: clamp(Number(p.placesIconSize) || 22, 14, 36),
      desktopTextSize: clamp(Number(p.desktopTextSize) || 10, 8, 16),
      desktopIconSize: clamp(Number(p.desktopIconSize) || 48, 32, 72),
      appsGridCols: clamp(Number(p.appsGridCols) || 3, 2, 6),
      appsLayout: p.appsLayout === "list" ? "list" : "grid",
      showPlaces: p.showPlaces !== false,
      showDesktop: p.showDesktop !== false
    };
  } catch {
    return { ...DEFAULT_HUB_SETTINGS };
  }
}