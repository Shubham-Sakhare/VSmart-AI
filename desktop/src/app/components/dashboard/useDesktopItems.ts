import { useCallback, useEffect, useState } from "react";
import type { DesktopItem } from "./desktopTypes";

export function useDesktopItems() {
  const [items, setItems] = useState<DesktopItem[]>([]);
  const [places, setPlaces] = useState<DesktopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async (force = false) => {
    try {
      setLoading(true);
      const [desk, sysPlaces] = await Promise.all([
        window.vsmart.system.getDesktopItems(force),
        window.vsmart.system.getSystemPlaces()
      ]);
      setItems(Array.isArray(desk) ? desk : []);
      setPlaces(Array.isArray(sysPlaces) ? sysPlaces : []);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [desk, sysPlaces] = await Promise.all([
          window.vsmart.system.getDesktopItems(false),
          window.vsmart.system.getSystemPlaces()
        ]);
        if (!cancelled) {
          setItems(Array.isArray(desk) ? desk : []);
          setPlaces(Array.isArray(sysPlaces) ? sysPlaces : []);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const interval = setInterval(() => {
      if (!cancelled) load(false);
    }, 60_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [load]);

  return { items, places, loading, error, refresh: () => load(true) };
}