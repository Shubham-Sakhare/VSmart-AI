import { ipcMain } from "electron";
import {
  getInstalledApps,
  launchSystemApp,
  getLibraryApps,
  getPinnedApps,
  addLibraryApps,
  removeLibraryApp,
  reorderLibraryApps,
  setLibraryAppPinned,
  pickAndSetLibraryIcon,
  pickImageAsDataUrl
} from "../services/systemService.js";

export function registerLauncherIPC() {

  // Full system scan (used only by the Settings "Add System App" picker).
  ipcMain.handle("get-installed-apps", async () => {
    try {
      return await getInstalledApps();
    } catch (error) {
      console.error("get-installed-apps IPC error:", error);
      return [];
    }
  });

  ipcMain.handle("launch-system-app", async (_, appId: string) => {
    try {
      return await launchSystemApp(appId);
    } catch (error) {
      console.error("launch-system-app IPC error:", error);
      return false;
    }
  });

  // Full "added by user" library - backs the System icon panel.
  ipcMain.handle("launcher:getLibraryApps", async () => {
    try {
      return getLibraryApps();
    } catch (error) {
      console.error("launcher:getLibraryApps IPC error:", error);
      return [];
    }
  });

  // Pinned subset only - backs the taskbar quick row.
  ipcMain.handle("launcher:getPinnedApps", async () => {
    try {
      return getPinnedApps();
    } catch (error) {
      console.error("launcher:getPinnedApps IPC error:", error);
      return [];
    }
  });

  ipcMain.handle("launcher:addLibraryApps", async (_, apps) => {
    try {
      return addLibraryApps(apps);
    } catch (error) {
      console.error("launcher:addLibraryApps IPC error:", error);
      return [];
    }
  });

  ipcMain.handle("launcher:removeLibraryApp", async (_, id: string) => {
    try {
      return removeLibraryApp(id);
    } catch (error) {
      console.error("launcher:removeLibraryApp IPC error:", error);
      return [];
    }
  });

  ipcMain.handle("launcher:reorderLibraryApps", async (_, orderedIds: string[]) => {
    try {
      return reorderLibraryApps(orderedIds);
    } catch (error) {
      console.error("launcher:reorderLibraryApps IPC error:", error);
      return [];
    }
  });

  ipcMain.handle("launcher:setPinned", async (_, id: string, pinned: boolean) => {
    try {
      return setLibraryAppPinned(id, pinned);
    } catch (error) {
      console.error("launcher:setPinned IPC error:", error);
      return [];
    }
  });

  ipcMain.handle("launcher:pickIcon", async (_, id: string) => {
    try {
      return await pickAndSetLibraryIcon(id);
    } catch (error) {
      console.error("launcher:pickIcon IPC error:", error);
      return [];
    }
  });

  // Generic icon picker - used for internal launcher-app custom icons
  // (persisted by the renderer via the existing memory KV store).
  ipcMain.handle("launcher:pickImage", async () => {
    try {
      return await pickImageAsDataUrl();
    } catch (error) {
      console.error("launcher:pickImage IPC error:", error);
      return null;
    }
  });

}