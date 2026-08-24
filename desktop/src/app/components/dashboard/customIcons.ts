const CUSTOM_ICONS_KEY = "vsmart_hub_custom_icons";

export function loadCustomIcons(): Record<string, string> {
  try {
    const raw = localStorage.getItem(CUSTOM_ICONS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveCustomIcons(map: Record<string, string>) {
  try {
    localStorage.setItem(CUSTOM_ICONS_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}