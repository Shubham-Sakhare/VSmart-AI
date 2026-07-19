import { Sparkles, Minus, X, MessageSquare } from "lucide-react";
import ChatPanel from "./ChatPanel";
import type { Message } from "../layout/MainLayout";
import type { VoiceControls } from "../../voice/useVoice";
import "./ChatWidget.css";

interface ChatWidgetProps {
  open: boolean;
  minimized: boolean;
  messages: Message[];
  onSend: (text: string) => void;
  voice: VoiceControls;
  onMinimizeToggle: () => void;
  onClose: () => void;
}

export default function ChatWidget({
  open,
  minimized,
  messages,
  onSend,
  voice,
  onMinimizeToggle,
  onClose
}: ChatWidgetProps) {

  if (!open) return null;

  return (
    <div className={minimized ? "chat-widget minimized" : "chat-widget"}>

      <div className="chat-widget-header">
        <div className="chat-widget-title">
          <Sparkles size={15} />
          <span>VSmart</span>
        </div>

        <div className="chat-widget-controls">
          <button className="widget-btn" onClick={onMinimizeToggle} title={minimized ? "Expand" : "Minimize"}>
            {minimized ? <MessageSquare size={15} /> : <Minus size={15} />}
          </button>
          <button className="widget-btn close" onClick={onClose} title="Close">
            <X size={15} />
          </button>
        </div>
      </div>

      {!minimized && (
        <div className="chat-widget-body">
          <ChatPanel messages={messages} onSend={onSend} voice={voice} />
        </div>
      )}

    </div>
  );
}