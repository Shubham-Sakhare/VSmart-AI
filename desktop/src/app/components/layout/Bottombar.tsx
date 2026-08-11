import "./bottombar.css";
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
    </footer>
  );
}