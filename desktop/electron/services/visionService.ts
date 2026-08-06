import { desktopCapturer, screen } from "electron";

// Captures the primary display and returns it as a compact base64 JPEG data
// URL, ready to send straight to a vision-capable LLM. Uses Electron's
// built-in desktopCapturer (no PowerShell/process spawn), so it's fast and
// doesn't add any background load.
export async function captureScreen(): Promise<string | null> {

  try {

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.size;
    const scaleFactor = primaryDisplay.scaleFactor || 1;

    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: {
        width: Math.round(width * scaleFactor),
        height: Math.round(height * scaleFactor)
      }
    });

    if (sources.length === 0) return null;

    const source =
      sources.find(s => s.display_id === String(primaryDisplay.id)) ??
      sources[0];

    const image = source.thumbnail;
    if (image.isEmpty()) return null;

    // Downscale + JPEG-compress before sending over the network - keeps the
    // request small and fast without losing anything a vision model needs.
    const resized = image.getSize().width > 1280
      ? image.resize({ width: 1280 })
      : image;

    const jpegBuffer = resized.toJPEG(72);

    return `data:image/jpeg;base64,${jpegBuffer.toString("base64")}`;

  } catch (error) {
    console.error("captureScreen error:", error);
    return null;
  }

}