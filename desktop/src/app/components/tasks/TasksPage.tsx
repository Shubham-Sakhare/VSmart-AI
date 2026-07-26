import { useEffect, useState, type ReactNode } from "react";
import { Plus, Trash2, ClipboardList, Circle, Clock, CheckCircle2 } from "lucide-react";
import "./TasksPage.css";

type TaskStatus = "pending" | "in-progress" | "complete";

interface Task {
  id: string;
  title: string;
  status: TaskStatus;
}

const STORAGE_KEY = "tasks_list";

const STATUS_META: Record<TaskStatus, { label: string; icon: ReactNode; className: string }> = {
  "pending": { label: "Pending", icon: <Circle size={13} />, className: "status-pending" },
  "in-progress": { label: "In Progress", icon: <Clock size={13} />, className: "status-inprogress" },
  "complete": { label: "Complete", icon: <CheckCircle2 size={13} />, className: "status-complete" }
};

const STATUS_ORDER: TaskStatus[] = ["pending", "in-progress", "complete"];

export default function TasksPage() {

  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const raw = await window.vsmart.getMemory(STORAGE_KEY);
        if (raw) setTasks(JSON.parse(raw));
      } catch {
        // no tasks saved yet
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    window.vsmart.saveMemory(STORAGE_KEY, JSON.stringify(tasks)).catch(() => {});
  }, [tasks, loaded]);

  const addTask = () => {
    if (!newTitle.trim()) return;
    setTasks(prev => [...prev, { id: `${Date.now()}`, title: newTitle.trim(), status: "pending" }]);
    setNewTitle("");
  };

  const cycleStatus = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const nextIndex = (STATUS_ORDER.indexOf(t.status) + 1) % STATUS_ORDER.length;
      return { ...t, status: STATUS_ORDER[nextIndex] };
    }));
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const updateTaskTitle = (id: string, title: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, title } : t));
  };

  const grouped = STATUS_ORDER.map(status => ({
    status,
    items: tasks.filter(t => t.status === status)
  }));

  return (
    <div className="tasks-page">

      <div className="tasks-card add-card">
        <div className="card-header">
          <span className="icon-badge badge-cyan"><ClipboardList size={15} /></span>
          <h3>ADD TASK</h3>
        </div>

        <div className="task-add-form">
          <input
            type="text"
            placeholder="What needs to be done?"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTask()}
          />
          <button className="task-add-btn" onClick={addTask}>
            <Plus size={16} /> Add
          </button>
        </div>
      </div>

      <div className="tasks-columns">
        {grouped.map(({ status, items }) => (
          <div className="tasks-card task-column" key={status}>

            <div className="task-column-header">
              <span className={`status-dot ${STATUS_META[status].className}`} />
              <h3>{STATUS_META[status].label}</h3>
              <span className="task-count">{items.length}</span>
            </div>

            <div className="task-list">
              {items.length === 0 && <p className="task-empty">No tasks here.</p>}

              {items.map(task => (
                <div className="task-item" key={task.id}>
                  <button
                    className={`task-status-btn ${STATUS_META[task.status].className}`}
                    onClick={() => cycleStatus(task.id)}
                    title="Click to change status"
                  >
                    {STATUS_META[task.status].icon}
                  </button>

                  {editingId === task.id ? (
                    <input
                      className="task-title-input"
                      value={editValue}
                      autoFocus
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => {
                        if (editValue.trim()) updateTaskTitle(task.id, editValue.trim());
                        setEditingId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          if (editValue.trim()) updateTaskTitle(task.id, editValue.trim());
                          setEditingId(null);
                        }
                        if (e.key === "Escape") setEditingId(null);
                      }}
                    />
                  ) : (
                    <span
                      className="task-title"
                      onClick={() => { setEditingId(task.id); setEditValue(task.title); }}
                      title="Click to edit"
                    >
                      {task.title}
                    </span>
                  )}

                  <button className="task-delete-btn" onClick={() => deleteTask(task.id)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}