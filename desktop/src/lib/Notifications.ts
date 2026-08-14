export const NOTIFICATIONS_KEY = "vsmart_notifications";
export const NOTIFICATION_EVENT = "vsmart-notification";

export type NotificationType = "info" | "success" | "warning";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  time: number;
  read: boolean;
}

async function readAll(): Promise<AppNotification[]> {
  try {
    const raw = await window.vsmart.getMemory(NOTIFICATIONS_KEY);
    if (typeof raw !== "string" || !raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(list: AppNotification[]): Promise<void> {
  try {
    // Keep only the newest 50
    const trimmed = list.slice(0, 50);
    await window.vsmart.saveMemory(NOTIFICATIONS_KEY, JSON.stringify(trimmed));
    window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT));
  } catch {
    /* ignore */
  }
}

export async function pushNotification(
  title: string,
  message: string,
  type: NotificationType = "info"
): Promise<void> {
  const list = await readAll();
  const next: AppNotification = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    message,
    type,
    time: Date.now(),
    read: false,
  };
  await writeAll([next, ...list]);
}

export async function getNotifications(): Promise<AppNotification[]> {
  return readAll();
}

export async function markAllRead(): Promise<void> {
  const list = await readAll();
  if (list.every((n) => n.read)) return; // already all read → skip write
  await writeAll(list.map((n) => ({ ...n, read: true })));
}

export async function clearAll(): Promise<void> {
  await writeAll([]);
}