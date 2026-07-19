import "./bottombar.css";
import { MapPin, CloudSun, Wifi, PlayCircle } from "lucide-react";
import type { VoiceControls } from "../../voice/useVoice";

interface BottomBarProps {
  voice: VoiceControls;
}

export default function BottomBar({ voice }: BottomBarProps) {

  const statusLabel = voice.listening
    ? "I am listening..."
    : voice.wakeActive
      ? "Say \"VSmart\" or tap to talk"
      : "Voice paused";

  return (
    <footer className="bottombar">

      <div className="bottombar-pill">
        <MapPin size={14} />
        <span>Location</span>
        <strong>Local</strong>
      </div>

      <div className="bottombar-pill">
        <CloudSun size={14} />
        <span>Weather</span>
        <strong>-</strong>
      </div>

      <div className="bottombar-pill">
        <Wifi size={14} />
        <span>Network</span>
        <strong>Online</strong>
      </div>

      <button
        className={voice.listening ? "talk-btn active" : "talk-btn"}
        onClick={voice.toggleListening}
      >
        <span className="talk-bars" aria-hidden="true">
          <i></i><i></i><i></i><i></i><i></i>
        </span>

        <span className="talk-text">
          <strong>TALK TO VSMART</strong>
          <small>{statusLabel}</small>
        </span>

        <span className="talk-bars" aria-hidden="true">
          <i></i><i></i><i></i><i></i><i></i>
        </span>
      </button>

      <button className="briefing-btn">
        <PlayCircle size={16} />
        Executive Briefing
      </button>

    </footer>
  );
}
