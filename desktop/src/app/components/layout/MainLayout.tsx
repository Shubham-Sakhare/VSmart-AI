import { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import BottomBar from "./Bottombar";
import CommandCenter from "../dashboard/CommandCenter";
import ChatPanel from "../chat/ChatPanel";
import { askVSmart } from "../../../core/aiEngine";
import { useVoice, speak } from "../../voice/useVoice";
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

  const sendCommand = async (text: string) => {
    if (!text.trim()) return;

    setMessages(prev => [...prev, { sender: "You", text }]);

    const reply = await askVSmart(text);

    setMessages(prev => [...prev, { sender: "VSmart", text: reply }]);
    speak(reply);
  };

  // Single global mic instance — shared by the sidebar status card,
  // the bottom "Talk to VSmart" bar, and the Conversations page.
  const voice = useVoice({ onCommand: sendCommand });

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        return <CommandCenter messages={messages} voice={voice} />;
      case "conversations":
        return <ChatPanel messages={messages} onSend={sendCommand} voice={voice} />;
      case "aicore":
        return <ComingSoon label="AI Core" />;
      case "agents":
        return <ComingSoon label="Agents" />;
      case "tasks":
        return <ComingSoon label="Tasks" />;
      case "calendar":
        return <ComingSoon label="Calendar" />;
      case "memory":
        return <ComingSoon label="Memory" />;
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

        <Sidebar activePage={activePage} onNavigate={setActivePage} voice={voice} />

        <main className="main-content">
          <Topbar />
          <section className="page-content">
            {renderPage()}
          </section>
        </main>

      </div>

      <BottomBar voice={voice} />

    </div>
  );
}