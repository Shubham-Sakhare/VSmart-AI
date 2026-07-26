import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, Paperclip, ImageIcon, Lightbulb, ListChecks } from "lucide-react";
import { askQwenCoder } from "../../../llm/openrouter";
import "./VSmartAIPage.css";

interface ChatMessage {
  id: string;
  sender: "You" | "VSmart";
  text: string;
}

const QUICK_ACTIONS = [
  { label: "Create Image", icon: <ImageIcon size={14} />, prompt: "Describe how I could create an image of " },
  { label: "Brainstorm", icon: <Lightbulb size={14} />, prompt: "Help me brainstorm ideas for " },
  { label: "Make a plan", icon: <ListChecks size={14} />, prompt: "Help me make a plan for " }
];

export default function VSmartAIPage() {

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setMessages(prev => [...prev, { id: `${Date.now()}-u`, sender: "You", text: trimmed }]);
    setInput("");
    setLoading(true);

    try {
      const reply = await askQwenCoder(trimmed);
      setMessages(prev => [...prev, { id: `${Date.now()}-a`, sender: "VSmart", text: reply }]);
    } catch {
      setMessages(prev => [...prev, { id: `${Date.now()}-a`, sender: "VSmart", text: "Something went wrong reaching the AI. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="vsai-page">

      {isEmpty ? (

        <div className="vsai-welcome">
          <div className="vsai-orb" />
          <h2>Ready to Create Something New?</h2>

          <div className="vsai-quick-actions">
            {QUICK_ACTIONS.map(qa => (
              <button key={qa.label} className="vsai-pill" onClick={() => setInput(qa.prompt)}>
                {qa.icon} {qa.label}
              </button>
            ))}
          </div>
        </div>

      ) : (

        <div className="vsai-messages">
          {messages.map(m => (
            <div key={m.id} className={m.sender === "You" ? "vsai-msg-row user" : "vsai-msg-row ai"}>
              {m.sender === "VSmart" && (
                <div className="vsai-avatar"><Sparkles size={14} /></div>
              )}
              <div className="vsai-bubble">
                <p>{m.text}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="vsai-msg-row ai">
              <div className="vsai-avatar"><Sparkles size={14} /></div>
              <div className="vsai-bubble vsai-typing">
                <span /><span /><span />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

      )}

      <div className="vsai-input-wrap">
        <div className="vsai-input-box">

          <Sparkles size={16} className="vsai-input-icon" />

          <textarea
            placeholder="Ask Anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
          />

          <button className="vsai-send-btn" onClick={() => send(input)} disabled={loading}>
            <Send size={16} />
          </button>
        </div>

        <div className="vsai-input-footer">
          <span><Paperclip size={13} /> Attach</span>
          <span className="vsai-footer-note">Powered by Qwen3-Coder — informational only, always double-check important answers.</span>
        </div>
      </div>

    </div>
  );
}