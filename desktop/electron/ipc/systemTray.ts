import { ipcMain } from "electron";
import {
  getBatteryStatus,
  getWifiStatus,
  setWifiEnabled,
  scanWifiNetworks,
  connectToWifi,
  getBluetoothStatus,
  setBluetoothEnabled,
  getPairedBluetoothDevices,
  openBluetoothSettings,
  getVolumeStatus,
  setVolumeLevel,
  setVolumeMuted
} from "../services/systemTrayService.js";

export function registerSystemTrayIPC() {

  ipcMain.handle("systemtray:getBattery", async () => {
    try {
      return await getBatteryStatus();
    } catch (error) {
      console.error("systemtray:getBattery IPC error:", error);
      return { hasBattery: false, percent: null, charging: null };
    }
  });

  ipcMain.handle("systemtray:getWifi", async () => {
    try {
      return await getWifiStatus();
    } catch (error) {
      console.error("systemtray:getWifi IPC error:", error);
      return { available: false, enabled: false, connected: false, ssid: null };
    }
  });

  ipcMain.handle("systemtray:setWifi", async (_, enabled: boolean) => {
    try {
      return await setWifiEnabled(enabled);
    } catch (error) {
      console.error("systemtray:setWifi IPC error:", error);
      return false;
    }
  });

  ipcMain.handle("systemtray:scanWifi", async () => {
    try {
      return await scanWifiNetworks();
    } catch (error) {
      console.error("systemtray:scanWifi IPC error:", error);
      return [];
    }
  });

  ipcMain.handle("systemtray:connectWifi", async (_, ssid: string, password?: string) => {
    try {
      return await connectToWifi(ssid, password);
    } catch (error) {
      console.error("systemtray:connectWifi IPC error:", error);
      return { ok: false, error: "Failed to connect" };
    }
  });

  ipcMain.handle("systemtray:getBluetooth", async () => {
    try {
      return await getBluetoothStatus();
    } catch (error) {
      console.error("systemtray:getBluetooth IPC error:", error);
      return { available: false, enabled: false };
    }
  });

  ipcMain.handle("systemtray:setBluetooth", async (_, enabled: boolean) => {
    try {
      return await setBluetoothEnabled(enabled);
    } catch (error) {
      console.error("systemtray:setBluetooth IPC error:", error);
      return false;
    }
  });

  ipcMain.handle("systemtray:getBluetoothDevices", async () => {
    try {
      return await getPairedBluetoothDevices();
    } catch (error) {
      console.error("systemtray:getBluetoothDevices IPC error:", error);
      return [];
    }
  });

  ipcMain.handle("systemtray:openBluetoothSettings", async () => {
    try {
      openBluetoothSettings();
      return true;
    } catch (error) {
      console.error("systemtray:openBluetoothSettings IPC error:", error);
      return false;
    }
  });

  ipcMain.handle("systemtray:getVolume", async () => {
    try {
      return await getVolumeStatus();
    } catch (error) {
      console.error("systemtray:getVolume IPC error:", error);
      return { available: false, level: 0, muted: false };
    }
  });

  ipcMain.handle("systemtray:setVolume", async (_, level: number) => {
    try {
      return await setVolumeLevel(level);
    } catch (error) {
      console.error("systemtray:setVolume IPC error:", error);
      return false;
    }
  });

  ipcMain.handle("systemtray:setMuted", async (_, muted: boolean) => {
    try {
      return await setVolumeMuted(muted);
    } catch (error) {
      console.error("systemtray:setMuted IPC error:", error);
      return false;
    }
  });

}
