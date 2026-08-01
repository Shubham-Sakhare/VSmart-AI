import { useState, type ReactNode } from "react";
import {
  Wrench, Search, Globe, Volume2, Sun, Wifi, Bluetooth, Camera,
  Folder, FileText, Code2, Trash2, Power, BrainCircuit, ChevronDown
} from "lucide-react";
import "./ToolsPage.css";

interface Skill {
  icon: ReactNode;
  title: string;
  examples: string[];
}

interface SkillCategory {
  name: string;
  skills: Skill[];
}

const CATEGORIES: SkillCategory[] = [
  {
    name: "Apps & Websites",
    skills: [
      { icon: <Globe size={16} />, title: "Open any app or website", examples: ["Open Chrome", "Open Notepad", "Open Facebook", "Open Downloads folder"] },
      { icon: <Search size={16} />, title: "Search on a site", examples: ["YouTube pe lofi music lagao", "Google pe cricket score search karo"] },
      { icon: <Folder size={16} />, title: "Session continuation", examples: ["(after opening YouTube) ab isme koi gaana chalao — stays in the same tab"] }
    ]
  },
  {
    name: "System Control",
    skills: [
      { icon: <Volume2 size={16} />, title: "Volume", examples: ["Volume 30% kar do"] },
      { icon: <Sun size={16} />, title: "Brightness", examples: ["Brightness 70% kar do"] },
      { icon: <Wifi size={16} />, title: "Wi-Fi (needs admin)", examples: ["Wifi on karo", "Wifi off karo"] },
      { icon: <Bluetooth size={16} />, title: "Bluetooth (needs admin)", examples: ["Bluetooth on karo"] },
      { icon: <Camera size={16} />, title: "Screenshot", examples: ["Screenshot le lo"] },
      { icon: <Trash2 size={16} />, title: "Recycle Bin", examples: ["Recycle bin kholo"] },
      { icon: <Power size={16} />, title: "Restart / Shutdown", examples: ["PC restart karo", "Shutdown karo"], }
    ]
  },
  {
    name: "Files & Code",
    skills: [
      { icon: <FileText size={16} />, title: "Notepad + write text", examples: ["Notepad kholo aur hello world likho"] },
      { icon: <Code2 size={16} />, title: "Write code (opens in VS Code)", examples: ["Ek Python function likho jo do number add kare"] }
    ]
  },
  {
    name: "Memory & Chat",
    skills: [
      { icon: <BrainCircuit size={16} />, title: "Remember something", examples: ["Remember mera naam Rahul hai"] },
      { icon: <BrainCircuit size={16} />, title: "Recall something", examples: ["Recall mera naam"] },
      { icon: <Globe size={16} />, title: "General questions", examples: ["Any normal question — routed to VSmart AI for a full answer"] }
    ]
  }
];

export default function ToolsPage() {

  const [openCategory, setOpenCategory] = useState<string | null>(CATEGORIES[0].name);

  const toggle = (name: string) => {
    setOpenCategory(prev => prev === name ? null : name);
  };

  return (
    <div className="tools-page-wrap">

      <div className="tools-header">
        <span className="icon-badge badge-cyan"><Wrench size={15} /></span>
        <div>
          <h3>Tools & Skills</h3>
          <p>Everything VSmart can do, with example voice commands.</p>
        </div>
      </div>

      <div className="tools-categories">
        {CATEGORIES.map(cat => (
          <div className="tools-category" key={cat.name}>

            <button className="tools-category-header" onClick={() => toggle(cat.name)}>
              <span>{cat.name}</span>
              <ChevronDown size={16} className={openCategory === cat.name ? "chev open" : "chev"} />
            </button>

            {openCategory === cat.name && (
              <div className="tools-skill-list">
                {cat.skills.map((skill, i) => (
                  <div className="tools-skill-item" key={i}>
                    <div className="tools-skill-title">
                      {skill.icon}
                      <span>{skill.title}</span>
                    </div>
                    <div className="tools-skill-examples">
                      {skill.examples.map((ex, j) => (
                        <span className="tools-example-pill" key={j}>"{ex}"</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        ))}
      </div>

    </div>
  );
}