import { exec } from "child_process";

/* ================= shared exec helper ================= */

function runPS(script: string, timeoutMs = 8000): Promise<string | null> {
  return new Promise((resolve) => {
    const encoded = Buffer.from(script, "utf16le").toString("base64");
    exec(
      `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand ${encoded}`,
      { maxBuffer: 1024 * 1024 * 5, timeout: timeoutMs },
      (error, stdout) => {
        if (error || !stdout) {
          resolve(null);
          return;
        }
        resolve(stdout.trim());
      }
    );
  });
}

function safeJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/* ================= battery ================= */

export interface BatteryStatus {
  hasBattery: boolean;
  percent: number | null;
  charging: boolean | null;
}

export async function getBatteryStatus(): Promise<BatteryStatus> {
  const raw = await runPS(`
try {
  $b = Get-CimInstance -ClassName Win32_Battery -ErrorAction Stop | Select-Object -First 1
  if ($b) {
    $charging = @(6,7,8,9) -contains $b.BatteryStatus
    [PSCustomObject]@{ hasBattery = $true; percent = $b.EstimatedChargeRemaining; charging = $charging } | ConvertTo-Json -Compress
  } else {
    [PSCustomObject]@{ hasBattery = $false; percent = $null; charging = $null } | ConvertTo-Json -Compress
  }
} catch {
  [PSCustomObject]@{ hasBattery = $false; percent = $null; charging = $null } | ConvertTo-Json -Compress
}
`, 6000);

  const parsed = safeJson<BatteryStatus>(raw);
  return parsed ?? { hasBattery: false, percent: null, charging: null };
}

/* ================= wifi (Windows.Devices.Radios WinRT API - no admin needed) ================= */

export interface WifiStatus {
  available: boolean;
  enabled: boolean;
  connected: boolean;
  ssid: string | null;
}

const RADIO_HELPER = `
[Windows.Devices.Radios.Radio,Windows.System.Devices,ContentType=WindowsRuntime] | Out-Null
`;

export async function getWifiStatus(): Promise<WifiStatus> {
  const raw = await runPS(`
${RADIO_HELPER}
try {
  $radios = [Windows.Devices.Radios.Radio]::GetRadiosAsync().GetAwaiter().GetResult()
  $wifi = $radios | Where-Object { $_.Kind -eq 'WiFi' } | Select-Object -First 1
  $available = [bool]$wifi
  $enabled = $false
  if ($wifi) { $enabled = ($wifi.State -eq 'On') }

  $connected = $false
  $ssid = $null
  try {
    $iface = netsh wlan show interfaces
    $stateLine = $iface | Select-String "^\\s*State\\s*:\\s*(.+)$"
    $ssidLine = $iface | Select-String "^\\s*SSID\\s*:\\s*(.+)$"
    if ($stateLine -and $stateLine.Matches[0].Groups[1].Value.Trim() -eq "connected") {
      $connected = $true
      if ($ssidLine) { $ssid = $ssidLine.Matches[0].Groups[1].Value.Trim() }
    }
  } catch {}

  [PSCustomObject]@{ available = $available; enabled = $enabled; connected = $connected; ssid = $ssid } | ConvertTo-Json -Compress
} catch {
  [PSCustomObject]@{ available = $false; enabled = $false; connected = $false; ssid = $null } | ConvertTo-Json -Compress
}
`, 8000);

  const parsed = safeJson<WifiStatus>(raw);
  return parsed ?? { available: false, enabled: false, connected: false, ssid: null };
}

export async function setWifiEnabled(enabled: boolean): Promise<boolean> {
  const raw = await runPS(`
${RADIO_HELPER}
try {
  $radios = [Windows.Devices.Radios.Radio]::GetRadiosAsync().GetAwaiter().GetResult()
  $wifi = $radios | Where-Object { $_.Kind -eq 'WiFi' } | Select-Object -First 1
  if ($wifi) {
    $target = [Windows.Devices.Radios.RadioState]::${enabled ? "On" : "Off"}
    $result = $wifi.SetStateAsync($target).GetAwaiter().GetResult()
    [PSCustomObject]@{ ok = ($result -eq [Windows.Devices.Radios.RadioAccessStatus]::Allowed) } | ConvertTo-Json -Compress
  } else {
    [PSCustomObject]@{ ok = $false } | ConvertTo-Json -Compress
  }
} catch {
  [PSCustomObject]@{ ok = $false } | ConvertTo-Json -Compress
}
`, 8000);

  const parsed = safeJson<{ ok: boolean }>(raw);
  return parsed?.ok ?? false;
}

/* ---------- scan nearby networks + connect (what "normal Windows" does) ---------- */

export interface WifiNetwork {
  ssid: string;
  signal: number; // 0-100
  secured: boolean;
  connected: boolean;
}

export async function scanWifiNetworks(): Promise<WifiNetwork[]> {
  const raw = await runPS(`
try {
  $lines = netsh wlan show networks mode=bssid
  $networks = @()
  $current = $null

  foreach ($line in $lines) {
    if ($line -match "^\\s*SSID\\s+\\d+\\s*:\\s*(.*)$") {
      if ($current -and $current.ssid) { $networks += $current }
      $current = [PSCustomObject]@{ ssid = $matches[1].Trim(); signal = 0; secured = $true; connected = $false }
    }
    elseif ($current -and $line -match "^\\s*Authentication\\s*:\\s*(.+)$") {
      if (-not $current.PSObject.Properties['authSet']) {
        $current.secured = ($matches[1].Trim() -ne "Open")
        $current | Add-Member -NotePropertyName authSet -NotePropertyValue $true -Force
      }
    }
    elseif ($current -and $line -match "^\\s*Signal\\s*:\\s*(\\d+)%") {
      $sig = [int]$matches[1]
      if ($sig -gt $current.signal) { $current.signal = $sig }
    }
  }
  if ($current -and $current.ssid) { $networks += $current }

  $connectedSsid = $null
  try {
    $iface = netsh wlan show interfaces
    $ssidLine = $iface | Select-String "^\\s*SSID\\s*:\\s*(.+)$" | Select-Object -First 1
    if ($ssidLine) { $connectedSsid = $ssidLine.Matches[0].Groups[1].Value.Trim() }
  } catch {}

  $result = $networks | Where-Object { $_.ssid -ne "" } | ForEach-Object {
    [PSCustomObject]@{
      ssid = $_.ssid
      signal = $_.signal
      secured = $_.secured
      connected = ($_.ssid -eq $connectedSsid)
    }
  }
  $result | ConvertTo-Json -Compress
} catch {
  "[]"
}
`, 15000);

  const parsed = safeJson<WifiNetwork[] | WifiNetwork>(raw);
  if (!parsed) return [];
  return Array.isArray(parsed) ? parsed : [parsed];
}

function escapeForPs(value: string): string {
  return value.replace(/[`"$]/g, "");
}

// Connects to a network the way normal Windows does: if it's a brand-new
// secured network, a temporary WLAN profile is created with the given
// password first (same as Windows does behind the scenes), then it
// connects. Already-known networks (or open ones) connect directly.
export async function connectToWifi(ssid: string, password?: string): Promise<{ ok: boolean; error?: string }> {

  const safeSsid = escapeForPs(ssid);
  const safeKey = password ? escapeForPs(password) : "";

  const authBlock = password
    ? `<authEncryption><authentication>WPA2PSK</authentication><encryption>AES</encryption><useOneX>false</useOneX></authEncryption><sharedKey><keyType>passPhrase</keyType><protected>false</protected><keyMaterial>${safeKey}</keyMaterial></sharedKey>`
    : `<authEncryption><authentication>open</authentication><encryption>none</encryption><useOneX>false</useOneX></authEncryption>`;

  const profileXml = `<?xml version="1.0"?><WLANProfile xmlns="http://www.microsoft.com/networking/WLAN/profile/v1"><name>${safeSsid}</name><SSIDConfig><SSID><name>${safeSsid}</name></SSID></SSIDConfig><connectionType>ESS</connectionType><connectionMode>auto</connectionMode><MSM><security>${authBlock}</security></MSM></WLANProfile>`;

  const raw = await runPS(`
try {
  $xml = @'
${profileXml}
'@
  $path = Join-Path $env:TEMP "vsmart-wifi-profile.xml"
  Set-Content -Path $path -Value $xml -Encoding UTF8
  netsh wlan add profile filename="$path" user=current | Out-Null
  Remove-Item $path -ErrorAction SilentlyContinue

  Start-Sleep -Milliseconds 300
  $result = netsh wlan connect name="${safeSsid}" ssid="${safeSsid}"
  $joined = ($result -join " ")
  [PSCustomObject]@{ ok = ($joined -match "completed successfully"); message = $joined } | ConvertTo-Json -Compress
} catch {
  [PSCustomObject]@{ ok = $false; message = "error" } | ConvertTo-Json -Compress
}
`, 18000);

  const parsed = safeJson<{ ok: boolean; message?: string }>(raw);
  if (!parsed) return { ok: false, error: "No response from system" };
  return { ok: parsed.ok, error: parsed.ok ? undefined : parsed.message };
}

/* ================= bluetooth (same WinRT radio API) ================= */

export interface BluetoothStatus {
  available: boolean;
  enabled: boolean;
}

export async function getBluetoothStatus(): Promise<BluetoothStatus> {
  const raw = await runPS(`
${RADIO_HELPER}
try {
  $radios = [Windows.Devices.Radios.Radio]::GetRadiosAsync().GetAwaiter().GetResult()
  $bt = $radios | Where-Object { $_.Kind -eq 'Bluetooth' } | Select-Object -First 1
  if ($bt) {
    [PSCustomObject]@{ available = $true; enabled = ($bt.State -eq 'On') } | ConvertTo-Json -Compress
  } else {
    [PSCustomObject]@{ available = $false; enabled = $false } | ConvertTo-Json -Compress
  }
} catch {
  [PSCustomObject]@{ available = $false; enabled = $false } | ConvertTo-Json -Compress
}
`, 8000);

  const parsed = safeJson<BluetoothStatus>(raw);
  return parsed ?? { available: false, enabled: false };
}

export async function setBluetoothEnabled(enabled: boolean): Promise<boolean> {
  const raw = await runPS(`
${RADIO_HELPER}
try {
  $radios = [Windows.Devices.Radios.Radio]::GetRadiosAsync().GetAwaiter().GetResult()
  $bt = $radios | Where-Object { $_.Kind -eq 'Bluetooth' } | Select-Object -First 1
  if ($bt) {
    $target = [Windows.Devices.Radios.RadioState]::${enabled ? "On" : "Off"}
    $result = $bt.SetStateAsync($target).GetAwaiter().GetResult()
    [PSCustomObject]@{ ok = ($result -eq [Windows.Devices.Radios.RadioAccessStatus]::Allowed) } | ConvertTo-Json -Compress
  } else {
    [PSCustomObject]@{ ok = $false } | ConvertTo-Json -Compress
  }
} catch {
  [PSCustomObject]@{ ok = $false } | ConvertTo-Json -Compress
}
`, 8000);

  const parsed = safeJson<{ ok: boolean }>(raw);
  return parsed?.ok ?? false;
}

/* ---------- paired devices (actually pairing a brand-new device needs a
   real GUI confirmation dialog, so for that we fall back to opening
   Windows' own Bluetooth settings - same as clicking "Add device" there) ---------- */

export interface BluetoothDeviceInfo {
  name: string;
  id: string;
  connected: boolean;
}

export async function getPairedBluetoothDevices(): Promise<BluetoothDeviceInfo[]> {
  const raw = await runPS(`
try {
  Get-PnpDevice -Class Bluetooth -PresentOnly |
    Where-Object {
      $_.FriendlyName -and
      $_.FriendlyName -notmatch "Bluetooth Device \\(RFCOMM|Bluetooth Device \\(Personal|Generic Bluetooth|Microsoft Bluetooth|Bluetooth LE|Enumerator"
    } |
    Select-Object @{n='name';e={$_.FriendlyName}}, @{n='id';e={$_.InstanceId}}, @{n='connected';e={$_.Status -eq 'OK'}} |
    ConvertTo-Json -Compress
} catch {
  "[]"
}
`, 10000);

  const parsed = safeJson<BluetoothDeviceInfo[] | BluetoothDeviceInfo>(raw);
  if (!parsed) return [];
  return Array.isArray(parsed) ? parsed : [parsed];
}

export function openBluetoothSettings(): void {
  exec("start ms-settings:bluetooth");
}

/* ================= volume (IAudioEndpointVolume COM interface) ================= */

export interface VolumeStatus {
  available: boolean;
  level: number; // 0-100
  muted: boolean;
}

// One shared type definition, reused by get/set/mute calls.
const AUDIO_TYPE = `
Add-Type -TypeDefinition @"
using System.Runtime.InteropServices;

[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
    int NotImpl1();
    int NotImpl2();
    int GetChannelCount(out uint pnChannelCount);
    int SetMasterVolumeLevel(float fLevelDB, System.Guid pguidEventContext);
    int SetMasterVolumeLevelScalar(float fLevel, System.Guid pguidEventContext);
    int GetMasterVolumeLevel(out float pfLevelDB);
    int GetMasterVolumeLevelScalar(out float pfLevel);
    int SetChannelVolumeLevel(uint nChannel, float fLevelDB, System.Guid pguidEventContext);
    int SetChannelVolumeLevelScalar(uint nChannel, float fLevel, System.Guid pguidEventContext);
    int GetChannelVolumeLevel(uint nChannel, out float pfLevelDB);
    int GetChannelVolumeLevelScalar(uint nChannel, out float pfLevel);
    int SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, System.Guid pguidEventContext);
    int GetMute(out bool pbMute);
    int GetVolumeStepInfo(out uint pnStep, out uint pnStepCount);
    int VolumeStepUp(System.Guid pguidEventContext);
    int VolumeStepDown(System.Guid pguidEventContext);
    int QueryHardwareSupport(out uint pdwHardwareSupportMask);
    int GetVolumeRange(out float pflVolumeMindB, out float pflVolumeMaxdB, out float pflVolumeIncrementdB);
}

[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice {
    int Activate(ref System.Guid iid, uint dwClsCtx, System.IntPtr pActivationParams, out IAudioEndpointVolume ppInterface);
}

[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator {
    int NotImpl1();
    int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppDevice);
}

[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
class MMDeviceEnumeratorComObject { }

public class VSmartAudio {
    static IAudioEndpointVolume Vol() {
        var enumerator = new MMDeviceEnumeratorComObject() as IMMDeviceEnumerator;
        IMMDevice dev;
        enumerator.GetDefaultAudioEndpoint(0, 1, out dev);
        var epGuid = typeof(IAudioEndpointVolume).GUID;
        IAudioEndpointVolume epVol;
        dev.Activate(ref epGuid, 23, System.IntPtr.Zero, out epVol);
        return epVol;
    }
    public static float GetVolume() {
        float v; Vol().GetMasterVolumeLevelScalar(out v); return v;
    }
    public static void SetVolume(float v) {
        Vol().SetMasterVolumeLevelScalar(v, System.Guid.Empty);
    }
    public static bool GetMute() {
        bool m; Vol().GetMute(out m); return m;
    }
    public static void SetMute(bool m) {
        Vol().SetMute(m, System.Guid.Empty);
    }
}
"@ -ErrorAction Stop
`;

export async function getVolumeStatus(): Promise<VolumeStatus> {
  const raw = await runPS(`
try {
${AUDIO_TYPE}
  $level = [math]::Round([VSmartAudio]::GetVolume() * 100)
  $muted = [VSmartAudio]::GetMute()
  [PSCustomObject]@{ available = $true; level = $level; muted = $muted } | ConvertTo-Json -Compress
} catch {
  [PSCustomObject]@{ available = $false; level = 0; muted = $false } | ConvertTo-Json -Compress
}
`, 8000);

  const parsed = safeJson<VolumeStatus>(raw);
  return parsed ?? { available: false, level: 0, muted: false };
}

export async function setVolumeLevel(level: number): Promise<boolean> {
  const clamped = Math.max(0, Math.min(100, Math.round(level)));
  const raw = await runPS(`
try {
${AUDIO_TYPE}
  [VSmartAudio]::SetVolume(${(clamped / 100).toFixed(2)})
  [PSCustomObject]@{ ok = $true } | ConvertTo-Json -Compress
} catch {
  [PSCustomObject]@{ ok = $false } | ConvertTo-Json -Compress
}
`, 8000);

  const parsed = safeJson<{ ok: boolean }>(raw);
  return parsed?.ok ?? false;
}

export async function setVolumeMuted(muted: boolean): Promise<boolean> {
  const raw = await runPS(`
try {
${AUDIO_TYPE}
  [VSmartAudio]::SetMute($${muted ? "true" : "false"})
  [PSCustomObject]@{ ok = $true } | ConvertTo-Json -Compress
} catch {
  [PSCustomObject]@{ ok = $false } | ConvertTo-Json -Compress
}
`, 8000);

  const parsed = safeJson<{ ok: boolean }>(raw);
  return parsed?.ok ?? false;
}
