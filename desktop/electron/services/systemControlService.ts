import { exec } from "child_process";
import path from "path";
import os from "os";
import fs from "fs";

function runPS(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(
      `powershell -NoProfile -Command "${script.replace(/"/g, '\\"')}"`,
      (error, stdout, stderr) => {
        if (error) reject(stderr || error.message);
        else resolve(stdout.trim());
      }
    );
  });
}

function runCmd(command: string): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(command, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

// ---------- Special folders ----------
const SPECIAL_FOLDERS: Record<string, string> = {
  download: "Downloads",
  downloads: "Downloads",
  document: "Documents",
  documents: "Documents",
  desktop: "Desktop",
  picture: "Pictures",
  pictures: "Pictures",
  music: "Music",
  song: "Music",
  video: "Videos",
  videos: "Videos"
};

export async function openSpecialFolder(name: string): Promise<string> {
  const key = Object.keys(SPECIAL_FOLDERS).find(k => name.toLowerCase().includes(k));
  if (!key) return `I don't know a folder called ${name}.`;

  const folderPath = path.join(os.homedir(), SPECIAL_FOLDERS[key]);
  await runCmd(`explorer "${folderPath}"`);
  return `${SPECIAL_FOLDERS[key]} folder opened.`;
}

// ---------- Volume ----------
export async function setVolume(percent: number): Promise<string> {
  const clamped = Math.max(0, Math.min(100, percent));

  // Uses the Windows Core Audio API via a small inline C# COM wrapper — no extra installs needed.
  const script = `
    Add-Type -TypeDefinition @'
    using System.Runtime.InteropServices;
    [Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IAudioEndpointVolume {
      int f(); int g(); int h(); int i();
      int SetMasterVolumeLevelScalar(float fLevel, System.Guid pguidEventContext);
      int j();
      int GetMasterVolumeLevelScalar(out float pfLevel);
    }
    [Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IMMDevice { int Activate(ref System.Guid id, int clsCtx, System.IntPtr activationParams, out IAudioEndpointVolume aev); }
    [Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IMMDeviceEnumerator { int f(); int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice endpoint); }
    [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDeviceEnumeratorComObject { }
    public class AudioVolume {
      public static void SetVolume(float level) {
        var enumerator = new MMDeviceEnumeratorComObject() as IMMDeviceEnumerator;
        IMMDevice dev; enumerator.GetDefaultAudioEndpoint(0, 1, out dev);
        var iid = typeof(IAudioEndpointVolume).GUID;
        IAudioEndpointVolume aev; dev.Activate(ref iid, 23, System.IntPtr.Zero, out aev);
        aev.SetMasterVolumeLevelScalar(level, System.Guid.Empty);
      }
    }
'@ -ReferencedAssemblies System.Runtime.InteropServices -PassThru | Out-Null
    [AudioVolume]::SetVolume(${clamped / 100})
  `;

  try {
    await runPS(script);
    return `Volume set to ${clamped}%.`;
  } catch {
    return `I couldn't change the volume.`;
  }
}

// ---------- Brightness ----------
export async function setBrightness(percent: number): Promise<string> {
  const clamped = Math.max(0, Math.min(100, percent));

  try {
    await runPS(
      `(Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods).WmiSetBrightness(1,${clamped})`
    );
    return `Brightness set to ${clamped}%.`;
  } catch {
    return `I couldn't change brightness — your display might not support software brightness control.`;
  }
}

// ---------- Wi-Fi ----------
export async function toggleWifi(state: "on" | "off"): Promise<string> {
  try {
    await runPS(
      state === "on"
        ? `Enable-NetAdapter -Name "Wi-Fi" -Confirm:$false`
        : `Disable-NetAdapter -Name "Wi-Fi" -Confirm:$false`
    );
    return `Wi-Fi turned ${state}.`;
  } catch {
    return `I couldn't turn Wi-Fi ${state} — this usually needs admin permission. Try running VSmart as administrator.`;
  }
}

// ---------- Bluetooth ----------
export async function toggleBluetooth(state: "on" | "off"): Promise<string> {
  try {
    await runPS(
      state === "on"
        ? `Get-PnpDevice | Where-Object {$_.FriendlyName -like "*Bluetooth*" -and $_.Class -eq "Bluetooth"} | Enable-PnpDevice -Confirm:$false`
        : `Get-PnpDevice | Where-Object {$_.FriendlyName -like "*Bluetooth*" -and $_.Class -eq "Bluetooth"} | Disable-PnpDevice -Confirm:$false`
    );
    return `Bluetooth turned ${state}.`;
  } catch {
    return `I couldn't turn Bluetooth ${state} — this usually needs admin permission. Try running VSmart as administrator.`;
  }
}

// ---------- Screenshot ----------
export async function takeScreenshot(): Promise<string> {
  const folder = path.join(os.homedir(), "Pictures", "VSmart-Screenshots");
  if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });

  const filePath = path.join(folder, `screenshot-${Date.now()}.png`).replace(/\\/g, "\\\\");

  const script = `
    Add-Type -AssemblyName System.Windows.Forms,System.Drawing
    $b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
    $bmp = New-Object System.Drawing.Bitmap $b.Width, $b.Height
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.CopyFromScreen($b.Location, [System.Drawing.Point]::Empty, $b.Size)
    $bmp.Save('${filePath}')
  `;

  try {
    await runPS(script);
    await runCmd(`explorer "${folder}"`);
    return `Screenshot saved and opened.`;
  } catch {
    return `I couldn't take a screenshot.`;
  }
}

// ---------- Recycle Bin ----------
export async function openRecycleBin(): Promise<string> {
  await runCmd(`explorer shell:RecycleBinFolder`);
  return `Recycle Bin opened.`;
}

// ---------- Notepad + write text ----------
export async function writeNotepad(text: string): Promise<string> {
  const folder = path.join(os.homedir(), "Documents", "VSmart-Notes");
  if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });

  const filePath = path.join(folder, `note-${Date.now()}.txt`);
  fs.writeFileSync(filePath, text, "utf-8");

  await runCmd(`notepad "${filePath}"`);
  return `Written in Notepad.`;
}

// ---------- Restart / Shutdown (caller must confirm first) ----------
export async function restartPC(): Promise<string> {
  await runCmd(`shutdown /r /t 5`);
  return `Restarting the PC in 5 seconds.`;
}

export async function shutdownPC(): Promise<string> {
  await runCmd(`shutdown /s /t 5`);
  return `Shutting down the PC in 5 seconds.`;
}

export async function cancelShutdown(): Promise<string> {
  await runCmd(`shutdown /a`);
  return `Cancelled.`;
}