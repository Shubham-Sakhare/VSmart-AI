import type { DesktopItem } from "./desktopTypes";

import iconDocuments from "../../../assets/vsmart-ai-images/file-icons/documents.png";
import iconDownloads from "../../../assets/vsmart-ai-images/file-icons/downloads.png";
import iconMedia from "../../../assets/vsmart-ai-images/file-icons/Media.png";
import iconMusics from "../../../assets/vsmart-ai-images/file-icons/Musics.png";
import iconVideos from "../../../assets/vsmart-ai-images/file-icons/VIdeos.png";

import {
  Home,
  Download,
  FileText,
  Image,
  Music,
  Video,
  HardDrive,
  Folder,
  AppWindow,
  File,
  FileCode,
  FileType,
  Lock,
  Film,
  Package
} from "lucide-react";

export function DefaultIcon({ item, size = 22 }: { item: DesktopItem; size?: number }) {
  const name = (item.displayName || item.name || "").toLowerCase();
  const ext = (item.extension || "").toLowerCase().replace(".", "");

  if (item.type === "place") {
    const placeIconMap: Record<string, string> = {
      documents: iconDocuments,
      downloads: iconDownloads,
      pictures: iconMedia,
      music: iconMusics,
      videos: iconVideos
    };
    const src = item.placeId ? placeIconMap[item.placeId] : undefined;
    if (src) {
      return (
        <img
          src={src}
          alt=""
          style={{ width: size, height: size, objectFit: "contain" }}
          draggable={false}
        />
      );
    }
    switch (item.placeId) {
      case "home":
        return <Home size={size} />;
      case "desktop":
        return <HardDrive size={size} />;
      default:
        return <Folder size={size} />;
    }
  }

  if (item.type === "folder") {
    if (name.includes("document")) return <FileText size={size} />;
    if (name.includes("download")) return <Download size={size} />;
    if (name.includes("video")) return <Video size={size} />;
    if (name.includes("picture") || name.includes("image") || name.includes("photo"))
      return <Image size={size} />;
    if (name.includes("music") || name.includes("audio")) return <Music size={size} />;
    if (name.includes("app") || name.includes("program")) return <AppWindow size={size} />;
    if (name.includes("secure") || name.includes("lock") || name.includes("private"))
      return <Lock size={size} />;
    return <Folder size={size} />;
  }

  if (item.type === "app" || item.type === "shortcut") {
    if (
      name.includes("illustrator") ||
      name.includes("photoshop") ||
      name.includes("figma") ||
      name.includes("canva")
    )
      return <Image size={size} />;
    if (name.includes("word") || name.includes("writer") || name.includes("document"))
      return <FileText size={size} />;
    if (name.includes("excel") || name.includes("calc") || name.includes("sheet"))
      return <FileCode size={size} />;
    if (name.includes("powerpoint") || name.includes("slide") || name.includes("impress"))
      return <Package size={size} />;
    if (name.includes("pdf") || name.includes("acrobat") || name.includes("reader"))
      return <FileType size={size} />;
    if (name.includes("mail") || name.includes("outlook") || name.includes("thunderbird"))
      return <FileText size={size} />;
    if (
      name.includes("chrome") ||
      name.includes("firefox") ||
      name.includes("edge") ||
      name.includes("brave")
    )
      return <AppWindow size={size} />;
    if (
      name.includes("vlc") ||
      name.includes("player") ||
      name.includes("spotify") ||
      name.includes("music")
    )
      return <Music size={size} />;
    if (name.includes("video") || name.includes("movie") || name.includes("film"))
      return <Film size={size} />;
    if (
      name.includes("code") ||
      name.includes("studio") ||
      name.includes("cursor") ||
      name.includes("sublime") ||
      name.includes("atom") ||
      name.includes("notepad")
    )
      return <FileCode size={size} />;
    if (name.includes("launcher") || name.includes("start") || name.includes("manager"))
      return <Package size={size} />;
    if (
      name.includes("lock") ||
      name.includes("secure") ||
      name.includes("vpn") ||
      name.includes("antivirus")
    )
      return <Lock size={size} />;
    return <AppWindow size={size} />;
  }

  if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "ico"].includes(ext))
    return <Image size={size} />;
  if (["mp4", "mkv", "avi", "mov", "wmv", "webm"].includes(ext)) return <Film size={size} />;
  if (["mp3", "wav", "flac", "aac", "ogg"].includes(ext)) return <Music size={size} />;
  if (ext === "pdf") return <FileType size={size} />;
  if (["lock", "key", "pem", "crt", "cer", "p12"].includes(ext)) return <Lock size={size} />;
  if (
    ["js", "ts", "tsx", "jsx", "py", "java", "c", "cpp", "html", "css", "json", "xml"].includes(ext)
  )
    return <FileCode size={size} />;
  if (["txt", "md", "log", "csv", "doc", "docx"].includes(ext)) return <FileText size={size} />;
  if (
    ["msi", "msix", "appx", "dmg", "pkg", "deb", "rpm", "apk", "exe", "bat", "cmd"].includes(ext)
  )
    return <Package size={size} />;

  return <File size={size} />;
}