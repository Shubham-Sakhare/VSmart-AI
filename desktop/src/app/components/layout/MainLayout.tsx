import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import BottomBar from "./BottomBar";
import TaskBar from "./TaskBar";
import SettingsPanel from "./SettingsPanel";
import CommandCenter from "../dashboard/CommandCenter";
import CalendarPage from "../calendar/CalendarPage";
import TasksPage from "../tasks/TasksPage";
import AnalysisPage from "../analysis/AnalysisPage";
import VSmartAIPage from "../vsmartai/VSmartAIPage";
import ToolsPage from "../tools/ToolsPage";
import ChatWidget from "../chat/ChatWidget";
import { askVSmart } from "../../../core/aiEngine";
import { useVoice, speak } from "../../voice/useVoice";
import type { ReplyLang, ChatHistoryMessage } from "../../../llm/openrouter";
import "./layout.css";

export type Page =
  | "dashboard"
  | "agents"
  | "tasks"
  | "calendar"
  | "memory"
  | "conversations"
  | "tools";

export interface Message {
  sender: "You" | "VSmart";
  text: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

interface SidebarItem {
  page: Page;
  label: string;
  enabled: boolean;
}

const CONVERSATIONS_KEY = "chat_conversations";
const SIDEBAR_KEY = "sidebar_settings";
// How many prior messages (both sides) to send as context with each new
// chat request — keeps the request small while still giving the model
// enough short-term memory to resolve "iska", "wahi wala", follow-ups, etc.
const MAX_HISTORY_MESSAGES = 10;

const DEFAULT_SIDEBAR_ITEMS: SidebarItem[] = [
  { page: "dashboard", label: "Command Center", enabled: true },
  { page: "agents", label: "Analysis", enabled: true },
  { page: "tasks", label: "Tasks", enabled: true },
  { page: "calendar", label: "Calendar", enabled: true },
  { page: "memory", label: "VSmart AI", enabled: true },
  { page: "conversations", label: "Conversations", enabled: true },
  { page: "tools", label: "Tools & Skills", enabled: true }
];

function makeTitle(messages: Message[]): string {
  const firstUserMsg = messages.find((m) => m.sender === "You");
  if (!firstUserMsg) return "New Chat";
  return firstUserMsg.text.length > 32
    ? firstUserMsg.text.slice(0, 32) + "…"
    : firstUserMsg.text;
}

export default function MainLayout() {
  const [activePage, setActivePage] = useState<Page>("dashboard");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMinimized, setChatMinimized] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [conversationsLoaded, setConversationsLoaded] = useState(false);
  const [replyLang, setReplyLang] = useState<ReplyLang>("en");
  const [wakeWordEnabled, setWakeWordEnabled] = useState(false);
  const [historyTrigger, setHistoryTrigger] = useState(0);

  const [sidebarEnabled, setSidebarEnabled] = useState(true);
  const [sidebarItems, setSidebarItems] = useState<SidebarItem[]>(DEFAULT_SIDEBAR_ITEMS);

  useEffect(() => {
    (async () => {
      try {
        const raw = await window.vsmart.getMemory(SIDEBAR_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          setSidebarEnabled(saved.enabled);
          setSidebarItems(saved.items);
        }
      } catch {}
    })();
  }, []);

  const updateSidebarSettings = async (enabled: boolean, items: SidebarItem[]) => {
    setSidebarEnabled(enabled);
    setSidebarItems(items);
    await window.vsmart.saveMemory(
      SIDEBAR_KEY,
      JSON.stringify({ enabled, items })
    );
  };

  useEffect(() => {
    (async () => {
      try {
        const raw = await window.vsmart.getMemory(CONVERSATIONS_KEY);
        if (raw) {
          const saved: Conversation[] = JSON.parse(raw);
          setConversations(saved);
          if (saved.length > 0) {
            setActiveConversationId(saved[0].id);
          }
        }
      } catch {
      } finally {
        setConversationsLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!conversationsLoaded) return;
    window.vsmart
      .saveMemory(CONVERSATIONS_KEY, JSON.stringify(conversations))
      .catch(() => {});
  }, [conversations, conversationsLoaded]);

  useEffect(() => {
    const open = () => {
      setChatOpen(true);
      setChatMinimized(false);
    };
    window.addEventListener("vsmart-open-chat", open);
    return () => window.removeEventListener("vsmart-open-chat", open);
  }, []);

  const activeConversation =
    conversations.find((c) => c.id === activeConversationId) ?? null;
  const messages = activeConversation?.messages ?? [];

  const newChat = () => {
    const conv: Conversation = {
      id: `${Date.now()}`,
      title: "New Chat",
      messages: [],
      updatedAt: Date.now()
    };
    setConversations((prev) => [conv, ...prev]);
    setActiveConversationId(conv.id);
    setChatOpen(true);
    setChatMinimized(false);
  };

  const selectConversation = (id: string) => {
    setActiveConversationId(id);
    setChatOpen(true);
    setChatMinimized(false);
  };

  const deleteConversation = (id: string) => {
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (activeConversationId === id) {
        setActiveConversationId(next[0]?.id ?? null);
      }
      return next;
    });
  };

  const deleteConversations = (ids: string[]) => {
    setConversations((prev) => {
      const next = prev.filter((c) => !ids.includes(c.id));
      if (activeConversationId && ids.includes(activeConversationId)) {
        setActiveConversationId(next[0]?.id ?? null);
      }
      return next;
    });
  };

  const sendCommand = async (text: string) => {
    if (!text.trim()) return;
    setChatOpen(true);
    setChatMinimized(false);

    let convId = activeConversationId;

    if (!convId) {
      const conv: Conversation = {
        id: `${Date.now()}`,
        title: "New Chat",
        messages: [],
        updatedAt: Date.now()
      };
      setConversations((prev) => [conv, ...prev]);
      convId = conv.id;
      setActiveConversationId(convId);
    }

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== convId) return c;
        const updatedMsgs = [...c.messages, { sender: "You" as const, text }];
        return {
          ...c,
          messages: updatedMsgs,
          title: c.title === "New Chat" ? makeTitle(updatedMsgs) : c.title,
          updatedAt: Date.now()
        };
      })
    );

    // Build history from the conversation as it was *before* this new
    // message — the current activeConversation's messages, since the state
    // update above is async and won't be visible yet.
    const priorMessages = activeConversation?.messages ?? [];
    const history: ChatHistoryMessage[] = priorMessages
      .slice(-MAX_HISTORY_MESSAGES)
      .map((m) => ({
        role: m.sender === "You" ? ("user" as const) : ("assistant" as const),
        content: m.text
      }));

    let result: Awaited<ReturnType<typeof askVSmart>>;
    try {
      result = await askVSmart(text, replyLang, history);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // This request was superseded by a newer message (or timed out) —
        // stay silent, the newer request's reply is what the user cares about.
        return;
      }
      const message =
        err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? {
                ...c,
                messages: [...c.messages, { sender: "VSmart" as const, text: message }],
                updatedAt: Date.now()
              }
            : c
        )
      );
      return;
    }

    const reply = result.message ?? "Done.";

    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? {
              ...c,
              messages: [...c.messages, { sender: "VSmart" as const, text: reply }],
              updatedAt: Date.now()
            }
          : c
      )
    );

    if (result.action !== "chat") {
      speak(reply, replyLang === "hi" ? "hi-IN" : "en-IN");
    }
  };

  const voice = useVoice({
    onCommand: sendCommand,
    wakeWordEnabled
  });

  const handleNavigate = (page: Page) => {
    if (page === "conversations") {
      setChatOpen(true);
      setChatMinimized(false);
      setHistoryTrigger((t) => t + 1);
      return;
    }
    setActivePage(page);
  };

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        return (
          <CommandCenter
            messages={messages}
            voice={voice}
          />
        );
      case "agents":
        return <AnalysisPage />;
      case "tasks":
        return <TasksPage />;
      case "calendar":
        return <CalendarPage />;
      case "memory":
        return <VSmartAIPage replyLang={replyLang} />;
      case "tools":
        return <ToolsPage />;
      default:
        return (
          <CommandCenter
            messages={messages}
            voice={voice}
          />
        );
    }
  };

  return (
    <div className="app-shell">
      <div className="layout-row">
        <Sidebar
          activePage={activePage}
          onNavigate={handleNavigate}
          voice={voice}
          sidebarEnabled={sidebarEnabled}
          sidebarItems={sidebarItems}
        />

        <main className="main-content">
          <Topbar onOpenSettings={() => setSettingsOpen(true)} />
          <section className="page-content">{renderPage()}</section>
        </main>
      </div>

      <BottomBar voice={voice} />

      <TaskBar activePage={activePage} onNavigate={handleNavigate} voice={voice} />

      <ChatWidget
        open={chatOpen}
        minimized={chatMinimized}
        messages={messages}
        onSend={sendCommand}
        voice={voice}
        replyLang={replyLang}
        onLangChange={setReplyLang}
        onMinimizeToggle={() => setChatMinimized((prev) => !prev)}
        onClose={() => setChatOpen(false)}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onNewChat={newChat}
        onSelectConversation={selectConversation}
        onDeleteConversation={deleteConversation}
        onDeleteConversations={deleteConversations}
        historyTrigger={historyTrigger}
      />

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        replyLang={replyLang}
        onLangChange={setReplyLang}
        wakeWordEnabled={wakeWordEnabled}
        onWakeWordChange={setWakeWordEnabled}
        sidebarEnabled={sidebarEnabled}
        sidebarItems={sidebarItems}
        onSidebarChange={updateSidebarSettings}
      />

      {!chatOpen && (
        <button
          className="chat-launcher"
          onClick={() => setChatOpen(true)}
          title="Open chat"
        >
          <MessageSquare size={22} />
        </button>
      )}
    </div>
  );
}