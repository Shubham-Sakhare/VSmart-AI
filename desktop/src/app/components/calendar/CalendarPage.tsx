import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, CalendarDays } from "lucide-react";
import "./CalendarPage.css";

interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  time?: string;
}

const STORAGE_KEY = "calendar_events";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function CalendarPage() {

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()));
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("");
  const [loaded, setLoaded] = useState(false);

  // Load events once on mount.
  useEffect(() => {
    (async () => {
      try {
        const raw = await window.vsmart.getMemory(STORAGE_KEY);
        if (raw) setEvents(JSON.parse(raw));
      } catch {
        // no events saved yet
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // Persist whenever events change (after initial load).
  useEffect(() => {
    if (!loaded) return;
    window.vsmart.saveMemory(STORAGE_KEY, JSON.stringify(events)).catch(() => {});
  }, [events, loaded]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const monthLabel = viewDate.toLocaleDateString([], { month: "long", year: "numeric" });

  const daysInMonth = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const cells: { date: string; day: number }[] = [];

    for (let i = 0; i < startWeekday; i++) cells.push({ date: "", day: 0 });

    for (let d = 1; d <= totalDays; d++) {
      const dateObj = new Date(year, month, d);
      cells.push({ date: toDateKey(dateObj), day: d });
    }

    return cells;
  }, [year, month]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      if (!map.has(ev.date)) map.set(ev.date, []);
      map.get(ev.date)!.push(ev);
    }
    return map;
  }, [events]);

  const selectedEvents = (eventsByDate.get(selectedDate) ?? [])
    .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));

  const addEvent = () => {
    if (!newTitle.trim()) return;

    setEvents(prev => [
      ...prev,
      { id: `${Date.now()}`, date: selectedDate, title: newTitle.trim(), time: newTime || undefined }
    ]);
    setNewTitle("");
    setNewTime("");
  };

  const deleteEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const changeMonth = (delta: number) => {
    setViewDate(new Date(year, month + delta, 1));
  };

  const todayKey = toDateKey(new Date());

  return (
    <div className="calendar-page">

      <div className="calendar-card calendar-grid-card">

        <div className="calendar-header">
          <button className="cal-nav-btn" onClick={() => changeMonth(-1)}>
            <ChevronLeft size={18} />
          </button>
          <div className="calendar-header-title">
            <span className="icon-badge badge-purple"><CalendarDays size={14} /></span>
            <h3>{monthLabel}</h3>
          </div>
          <button className="cal-nav-btn" onClick={() => changeMonth(1)}>
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="cal-weekdays">
          {WEEKDAYS.map(w => <span key={w}>{w}</span>)}
        </div>

        <div className="cal-days">
          {daysInMonth.map((cell, i) => (
            cell.day === 0 ? (
              <div key={i} className="cal-day empty" />
            ) : (
              <button
                key={i}
                className={
                  "cal-day" +
                  (cell.date === selectedDate ? " selected" : "") +
                  (cell.date === todayKey ? " today" : "")
                }
                onClick={() => setSelectedDate(cell.date)}
              >
                <span>{cell.day}</span>
                {eventsByDate.has(cell.date) && <em className="cal-dot" />}
              </button>
            )
          ))}
        </div>

      </div>

      <div className="calendar-card calendar-events-card">

        <div className="card-header">
          <span className="icon-badge badge-cyan"><CalendarDays size={15} /></span>
          <h3>
            {(() => {
              const [y, m, d] = selectedDate.split("-").map(Number);
              return new Date(y, m - 1, d).toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" });
            })()}
          </h3>
        </div>

        <div className="cal-event-list">
          {selectedEvents.length === 0 && (
            <p className="cal-empty">No events yet.</p>
          )}

          {selectedEvents.map(ev => (
            <div className="cal-event-item" key={ev.id}>
              <div>
                {ev.time && <span className="cal-event-time">{ev.time}</span>}
                <span className="cal-event-title">{ev.title}</span>
              </div>
              <button className="cal-delete-btn" onClick={() => deleteEvent(ev.id)}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="cal-add-form">
          <input
            type="text"
            placeholder="Event title..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addEvent()}
          />
          <input
            type="time"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
          />
          <button className="cal-add-btn" onClick={addEvent}>
            <Plus size={16} />
          </button>
        </div>

      </div>

    </div>
  );
}