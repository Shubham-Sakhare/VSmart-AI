import { useEffect, useRef, useState } from "react";
import { Send, Mic, Sparkles, User } from "lucide-react";
import type { Message } from "../layout/MainLayout";
import type { VoiceControls } from "../../voice/useVoice";
import "./ChatPanel.css";

interface ChatPanelProps {
  messages: Message[];
  onSend: (text: string) => void;
  voice: VoiceControls;
}

function timeNow() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatPanel({ messages, onSend, voice }: ChatPanelProps) {

  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input);
    setInput("");
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, voice.interimText]);

  return (
    <div className="chat-panel">

      <div className="chat-header">
        <div className="chat-header-title">
          <Sparkles size={16} />
          <span>Conversation with VSmart</span>
        </div>
        {voice.listening && <span className="chat-header-status">listening…</span>}
      </div>

      <div className="messages">

        {messages.length === 0 && !voice.interimText && (
          <div className="empty-state">
            <Sparkles size={22} />
            <p>Say something or type a message to get started.</p>
          </div>
        )}

        {messages.map((msg, index) => {
          const isUser = msg.sender === "You";
          return (
            <div key={index} className={isUser ? "msg-row user" : "msg-row ai"}>
              {!isUser && (
                <div className="avatar ai-avatar">
                  <Sparkles size={14} />
                </div>
              )}

              <div className="bubble">
                <p>{msg.text}</p>
                <span className="bubble-time">{timeNow()}</span>
              </div>

              {isUser && (
                <div className="avatar user-avatar">
                  <User size={14} />
                </div>
              )}
            </div>
          );
        })}

        {voice.interimText && (
          <div className="msg-row user">
            <div className="bubble bubble-interim">
              <p>{voice.interimText}...</p>
            </div>
            <div className="avatar user-avatar">
              <User size={14} />
            </div>
          </div>
        )}

        {voice.errorMsg && (
          <div className="voice-error">⚠️ {voice.errorMsg}</div>
        )}

        <div ref={bottomRef} />

      </div>

      <div className="chat-input">

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message VSmart..."
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
        />

        {voice.supported && (
          <button
            onClick={voice.toggleListening}
            className={voice.listening ? "icon-btn mic-btn listening" : "icon-btn mic-btn"}
            title={voice.listening ? "Listening... click to stop" : "Click to speak"}
          >
            <Mic size={17} />
          </button>
        )}

        <button className="icon-btn send-btn" onClick={handleSend} title="Send">
          <Send size={17} />
        </button>

      </div>

    </div>
  );
}