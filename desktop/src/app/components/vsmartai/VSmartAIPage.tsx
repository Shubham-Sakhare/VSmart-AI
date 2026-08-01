import { useEffect, useRef, useState } from "react";
import {
  Sparkles, Send, Paperclip, ImageIcon, Lightbulb, ListChecks,
  Plus, Trash2, MessageSquare, X
} from "lucide-react";
import { askAI } from "../../../llm/provider";
import type { ReplyLang } from "../../../llm/openrouter";
import "./VSmartAIPage.css";

interface ChatMessage {
  id: string;
  sender: "You" | "VSmart";
  text: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
}

const STORAGE_KEY = "vsai_sessions";

const QUICK_ACTIONS = [
  { label: "Create Image", icon: <ImageIcon size={14} />, prompt: "Describe how I could create an image of " },
  { label: "Brainstorm", icon: <Lightbulb size={14} />, prompt: "Help me brainstorm ideas for " },
  { label: "Make a plan", icon: <ListChecks size={14} />, prompt: "Help me make a plan for " }
];

export default function VSmartAIPage({ replyLang = "en" }: { replyLang?: ReplyLang }) {

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ name: string; content: string } | null>(null);
  const [loaded, setLoaded] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved sessions once.
  useEffect(() => {
    (async () => {
      try {
        const raw = await window.vsmart.getMemory(STORAGE_KEY);
        if (raw) setSessions(JSON.parse(raw));
      } catch {
        // no history yet
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // Persist sessions whenever they change.
  useEffect(() => {
    if (!loaded) return;
    window.vsmart.saveMemory(STORAGE_KEY, JSON.stringify(sessions)).catch(() => {});
  }, [sessions, loaded]);

  const activeSession = sessions.find(s => s.id === activeId) ?? null;
  const messages = activeSession?.messages ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [messages, loading]);

  const startNewChat = () => {
    setActiveId(null);
    setInput("");
    setAttachedFile(null);
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const handleFilePick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setAttachedFile({ name: file.name, content: text.slice(0, 8000) }); // cap to keep prompt reasonable
    } catch {
      setAttachedFile({ name: file.name, content: "" });
    }

    e.target.value = "";
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if ((!trimmed && !attachedFile) || loading) return;

    const promptForAI = attachedFile
      ? `${trimmed}\n\n[Attached file: ${attachedFile.name}]\n${attachedFile.content}`
      : trimmed;

    const displayText = attachedFile
      ? `${trimmed}${trimmed ? "\n" : ""}📎 ${attachedFile.name}`
      : trimmed;

    const userMsg: ChatMessage = { id: `${Date.now()}-u`, sender: "You", text: displayText };

    let sessionId = activeId;

    if (!sessionId) {
      sessionId = `${Date.now()}`;
      const title = trimmed.slice(0, 40) || attachedFile?.name || "New chat";
      setSessions(prev => [
        { id: sessionId!, title, messages: [userMsg], updatedAt: Date.now() },
        ...prev
      ]);
      setActiveId(sessionId);
    } else {
      setSessions(prev => prev.map(s =>
        s.id === sessionId ? { ...s, messages: [...s.messages, userMsg], updatedAt: Date.now() } : s
      ));
    }

    setInput("");
    setAttachedFile(null);
    setLoading(true);

    try {
      const reply = await askAI(promptForAI, replyLang);
      const aiMsg: ChatMessage = { id: `${Date.now()}-a`, sender: "VSmart", text: reply };
      setSessions(prev => prev.map(s =>
        s.id === sessionId ? { ...s, messages: [...s.messages, aiMsg], updatedAt: Date.now() } : s
      ));
    } catch {
      const aiMsg: ChatMessage = { id: `${Date.now()}-a`, sender: "VSmart", text: "Something went wrong reaching the AI. Please check the API key/connection and try again." };
      setSessions(prev => prev.map(s =>
        s.id === sessionId ? { ...s, messages: [...s.messages, aiMsg], updatedAt: Date.now() } : s
      ));
    } finally {
      setLoading(false);
    }
  };

  const isEmpty = messages.length === 0;
  const sortedSessions = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="vsai-page">

      {/* Chat history sidebar */}
      <div className="vsai-history">
        <button className="vsai-new-chat" onClick={startNewChat}>
          <Plus size={15} /> New Chat
        </button>

        <div className="vsai-history-list">
          {sortedSessions.length === 0 && (
            <p className="vsai-history-empty">No conversations yet.</p>
          )}

          {sortedSessions.map(s => (
            <div
              key={s.id}
              className={s.id === activeId ? "vsai-history-item active" : "vsai-history-item"}
              onClick={() => setActiveId(s.id)}
            >
              <MessageSquare size={13} />
              <span className="vsai-history-title">{s.title}</span>
              <button className="vsai-history-delete" onClick={(e) => deleteSession(s.id, e)}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main chat column */}
      <div className="vsai-main">

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

          {attachedFile && (
            <div className="vsai-attachment-chip">
              <Paperclip size={12} />
              <span>{attachedFile.name}</span>
              <button onClick={() => setAttachedFile(null)}><X size={12} /></button>
            </div>
          )}

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
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleFileChange}
              accept=".txt,.md,.csv,.json,.js,.ts,.tsx,.py,.log,.html,.css"
            />
            <span className="vsai-attach-btn" onClick={handleFilePick}>
              <Paperclip size={13} /> Attach
            </span>
            <span className="vsai-footer-note">VSmart AI — informational only, always double-check important answers.</span>
          </div>
        </div>

      </div>

    </div>
  );
}