import { useEffect, useState } from "react";
import { Sparkles, Minus, X, MessageSquare, History, Plus, ListChecks, Trash2 } from "lucide-react";
import ChatPanel from "./ChatPanel";
import type { Conversation, Message } from "../layout/MainLayout";
import type { VoiceControls } from "../../voice/useVoice";
import type { ReplyLang } from "../../../llm/openrouter";
import "./ChatWidget.css";

interface ChatWidgetProps {
  open: boolean;
  minimized: boolean;
  messages: Message[];
  onSend: (text: string) => void | Promise<void>;
  voice: VoiceControls;
  replyLang: ReplyLang;
  onLangChange: (lang: ReplyLang) => void;
  onMinimizeToggle: () => void;
  onClose: () => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onDeleteConversations: (ids: string[]) => void;
  historyTrigger?: number;
}

export default function ChatWidget({
  open,
  minimized,
  messages,
  onSend,
  voice,
  replyLang,
  onLangChange,
  onMinimizeToggle,
  onClose,
  conversations,
  activeConversationId,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  onDeleteConversations,
  historyTrigger
}: ChatWidgetProps) {

  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Navigating to "Conversations" (V-logo panel / sidebar) should land
  // straight on the history list, where "Clear all conversations" lives -
  // not require an extra click on the History icon first.
  useEffect(() => {
    if (historyTrigger) setHistoryOpen(true);
  }, [historyTrigger]);

  if (!open) return null;

  const toggleSelectMode = () => {
    setSelectMode(prev => !prev);
    setSelectedIds(new Set());
  };

  const toggleSelected = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleItemClick = (id: string) => {
    if (selectMode) {
      toggleSelected(id);
    } else {
      onSelectConversation(id);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    onDeleteConversations(Array.from(selectedIds));
    setSelectedIds(new Set());
    setSelectMode(false);
  };

  // "Clear" = wipe the entire conversation history in one go.
  const handleClearAll = () => {
    if (conversations.length === 0) return;
    onDeleteConversations(conversations.map(c => c.id));
    setSelectedIds(new Set());
    setSelectMode(false);
  };

  return (
    <div className={
      minimized
        ? "chat-widget minimized"
        : historyOpen
        ? "chat-widget with-history"
        : "chat-widget"
    }>

      <div className="chat-widget-header">
        <div className="chat-widget-title">
          <Sparkles size={15} />
          <span>VSmart</span>
        </div>

        <div className="chat-widget-controls">

          <div className="lang-toggle" title="Reply language">
            <button
              className={replyLang === "en" ? "lang-btn active" : "lang-btn"}
              onClick={() => onLangChange("en")}
            >
              EN
            </button>
            <button
              className={replyLang === "hi" ? "lang-btn active" : "lang-btn"}
              onClick={() => onLangChange("hi")}
            >
              HI
            </button>
          </div>

          <button
            className={historyOpen ? "widget-btn active" : "widget-btn"}
            onClick={() => setHistoryOpen(prev => !prev)}
            title="Conversation history"
          >
            <History size={15} />
          </button>

          <button className="widget-btn" onClick={onMinimizeToggle} title={minimized ? "Expand" : "Minimize"}>
            {minimized ? <MessageSquare size={15} /> : <Minus size={15} />}
          </button>
          <button className="widget-btn close" onClick={onClose} title="Close">
            <X size={15} />
          </button>
        </div>
      </div>

      {!minimized && (
        <div className="chat-widget-content">

          {historyOpen && (
            <div className="chat-history-panel">

              <div className="chat-history-toolbar">
                <button className="new-chat-btn" onClick={onNewChat}>
                  <Plus size={14} /> New Chat
                </button>
                <button
                  className={selectMode ? "select-mode-btn active" : "select-mode-btn"}
                  onClick={toggleSelectMode}
                  title="Select multiple"
                >
                  <ListChecks size={15} />
                </button>
              </div>

              {conversations.length > 0 && (
                selectMode ? (
                  <button
                    className="delete-selected-btn"
                    disabled={selectedIds.size === 0}
                    onClick={handleDeleteSelected}
                  >
                    <Trash2 size={12} /> Delete selected ({selectedIds.size})
                  </button>
                ) : (
                  <button className="delete-selected-btn" onClick={handleClearAll}>
                    <Trash2 size={12} /> Clear all conversations
                  </button>
                )
              )}

              <div className="chat-history-list">
                {conversations.length === 0 && (
                  <div className="chat-history-empty">No conversations yet.</div>
                )}

                {conversations.map(conv => (
                  <div
                    key={conv.id}
                    className={
                      !selectMode && conv.id === activeConversationId
                        ? "chat-history-item active"
                        : "chat-history-item"
                    }
                    onClick={() => handleItemClick(conv.id)}
                  >
                    {selectMode && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(conv.id)}
                        onChange={() => toggleSelected(conv.id)}
                        onClick={e => e.stopPropagation()}
                      />
                    )}
                    <span className="chat-history-title">{conv.title}</span>
                    {!selectMode && (
                      <button
                        className="chat-history-delete"
                        onClick={e => {
                          e.stopPropagation();
                          onDeleteConversation(conv.id);
                        }}
                        title="Delete this conversation"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

            </div>
          )}

          <div className="chat-widget-body">
            <ChatPanel messages={messages} onSend={onSend} voice={voice} />
          </div>

        </div>
      )}

    </div>
  );
}
