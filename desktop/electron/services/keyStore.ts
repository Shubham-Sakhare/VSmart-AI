import { app, safeStorage } from "electron";
import fs from "fs";
import path from "path";

// The key is encrypted with the OS-level credential store (DPAPI on Windows,
// Keychain on Mac) via Electron's safeStorage, then written to a small file
// in the user's own AppData folder. It never touches the .exe, never ships
// with the app, and is unique per installation.
const KEY_FILE = path.join(app.getPath("userData"), "vsmart-api-key.enc");

export function saveApiKey(rawKey: string): boolean {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      console.error("safeStorage encryption not available on this OS.");
      return false;
    }
    const encrypted = safeStorage.encryptString(rawKey);
    fs.writeFileSync(KEY_FILE, encrypted);
    return true;
  } catch (error) {
    console.error("Failed to save API key:", error);
    return false;
  }
}

export function getApiKey(): string | null {
  try {
    if (!fs.existsSync(KEY_FILE)) return null;
    const encrypted = fs.readFileSync(KEY_FILE);
    return safeStorage.decryptString(encrypted);
  } catch (error) {
    console.error("Failed to read API key:", error);
    return null;
  }
}

export function hasApiKey(): boolean {
  return fs.existsSync(KEY_FILE);
}

export function clearApiKey(): boolean {
  try {
    if (fs.existsSync(KEY_FILE)) fs.unlinkSync(KEY_FILE);
    return true;
  } catch (error) {
    console.error("Failed to clear API key:", error);
    return false;
  }
}