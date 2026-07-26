import { useState } from "react";
import { MessageSquare } from "lucide-react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import BottomBar from "./BottomBar";
import SettingsPanel from "./SettingsPanel";
import CommandCenter from "../dashboard/CommandCenter";
import CalendarPage from "../calendar/CalendarPage";
import TasksPage from "../tasks/TasksPage";
import AnalysisPage from "../analysis/AnalysisPage";
import VSmartAIPage from "../vsmartai/VSmartAIPage";
import ChatWidget from "../chat/ChatWidget";
import { askVSmart } from "../../../core/aiEngine";
import { useVoice, speak } from "../../voice/useVoice";
import type { ReplyLang } from "../../../llm/openrouter";
import "./layout.css";

export type Page =
  | "dashboard"
  | "aicore"
  | "agents"
  | "tasks"
  | "calendar"
  | "memory"
  | "conversations"
  | "knowledge"
  | "tools"
  | "workflows";

export interface Message {
  sender: "You" | "VSmart";
  text: string;
}

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="coming-soon">
      {label} — coming soon.
    </div>
  );
}

export default function MainLayout() {

  const [activePage, setActivePage] = useState<Page>("dashboard");
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMinimized, setChatMinimized] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Controls the language VSmart replies in (text + voice) — set via the
  // EN/HI toggle in the chat header or Settings. Independent of what
  // language you speak in.
  const [replyLang, setReplyLang] = useState<ReplyLang>("en");

  // Hands-free "always listening for VSmart" mode — off by default (Settings).
  const [wakeWordEnabled, setWakeWordEnabled] = useState(false);

  const sendCommand = async (text: string) => {
    if (!text.trim()) return;

    // Surface the chat popup whenever a command runs (voice or text),
    // so the user can see the exchange without hunting for it.
    setChatOpen(true);
    setChatMinimized(false);

    setMessages(prev => [...prev, { sender: "You", text }]);

    const result = await askVSmart(text, replyLang);
    const reply = result.message ?? "Done.";

    setMessages(prev => [...prev, { sender: "VSmart", text: reply }]);

    // Only speak short command-type confirmations (open app, write code, memory,
    // system control). Long informational chat replies stay text-only in the
    // chat panel — reading a whole paragraph aloud is slow and unnecessary.
    const isCommandAction = result.action !== "chat";

    if (isCommandAction) {
      speak(reply, replyLang === "hi" ? "hi-IN" : "en-IN");
    }
  };

  // Single global mic instance — shared by the sidebar status card,
  // the bottom "Talk to VSmart" bar, and the chat popup.
  const voice = useVoice({ onCommand: sendCommand, wakeWordEnabled });

  const handleNavigate = (page: Page) => {
    if (page === "conversations") {
      setChatOpen(true);
      setChatMinimized(false);
      return;
    }
    setActivePage(page);
  };

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        return <CommandCenter messages={messages} voice={voice} />;
      case "aicore":
        return <ComingSoon label="AI Core" />;
      case "agents":
        return <AnalysisPage />;
      case "tasks":
        return <TasksPage />;
      case "calendar":
        return <CalendarPage />;
      case "memory":
        return <VSmartAIPage />;
      case "knowledge":
        return <ComingSoon label="Knowledge Base" />;
      case "tools":
        return <ComingSoon label="Tools & Skills" />;
      case "workflows":
        return <ComingSoon label="Workflows" />;
      default:
        return <CommandCenter messages={messages} voice={voice} />;
    }
  };

  return (
    <div className="app-shell">

      <div className="layout-row">

        <Sidebar activePage={activePage} onNavigate={handleNavigate} voice={voice} />

        <main className="main-content">
          <Topbar onOpenSettings={() => setSettingsOpen(true)} />
          <section className="page-content">
            {renderPage()}
          </section>
        </main>

      </div>

      <BottomBar voice={voice} />

      <ChatWidget
        open={chatOpen}
        minimized={chatMinimized}
        messages={messages}
        onSend={sendCommand}
        voice={voice}
        replyLang={replyLang}
        onLangChange={setReplyLang}
        onMinimizeToggle={() => setChatMinimized(prev => !prev)}
        onClose={() => setChatOpen(false)}
      />

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        replyLang={replyLang}
        onLangChange={setReplyLang}
        wakeWordEnabled={wakeWordEnabled}
        onWakeWordChange={setWakeWordEnabled}
      />

      {!chatOpen && (
        <button className="chat-launcher" onClick={() => setChatOpen(true)} title="Open chat">
          <MessageSquare size={22} />
        </button>
      )}

    </div>
  );
}