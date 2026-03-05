import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCalendarData } from "../api/calendar";
import { fetchPrecincts } from "../api/precincts";

/* ---- helpers ---- */
function pad(n) { return String(n).padStart(2, "0"); }
function fmtDate(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function monthLabel(d) {
    return d.toLocaleString("default", { month: "long", year: "numeric" });
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const KIND_COLORS = {
    call_log: "#60a5fa",
    engagement: "#a78bfa",
    task: "#34d399",
};
const KIND_LABELS = {
    call_log: "📞",
    engagement: "🤝",
    task: "✅",
};

function getMonthRange(year, month) {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return { start: fmtDate(start), end: fmtDate(end) };
}

function getCalendarGrid(year, month) {
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    let startDay = first.getDay(); // 0=Sun
    startDay = startDay === 0 ? 6 : startDay - 1; // Mon=0

    const days = [];
    // leading blanks
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let d = 1; d <= last.getDate(); d++) days.push(d);
    // trailing blanks to fill last row
    while (days.length % 7 !== 0) days.push(null);
    return days;
}

function eventDateKey(ev) {
    // extract YYYY-MM-DD from ISO string
    return (ev.start || "").slice(0, 10);
}

/* ---- main component ---- */
export default function CalendarPage() {
    const navigate = useNavigate();
    const today = new Date();
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth());
    const [precinct, setPrecinct] = useState("all");
    const [precincts, setPrecincts] = useState([]);
    const [data, setData] = useState({ events: [], tasks_side_list: { no_due: [], due: [] } });
    const [loading, setLoading] = useState(false);
    const [selectedDay, setSelectedDay] = useState(null);
    const [modalEvent, setModalEvent] = useState(null);

    // load precincts once
    useEffect(() => {
        fetchPrecincts().then(setPrecincts).catch(() => { });
    }, []);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const { start, end } = getMonthRange(year, month);
            const d = await fetchCalendarData(start, end, precinct);
            setData(d || { events: [], tasks_side_list: { no_due: [], due: [] } });
        } catch {
            // ignore
        }
        setLoading(false);
    }, [year, month, precinct]);

    useEffect(() => { loadData(); }, [loadData]);

    const days = getCalendarGrid(year, month);

    // group events by date key
    const eventsByDate = {};
    for (const ev of data.events) {
        const k = eventDateKey(ev);
        if (!eventsByDate[k]) eventsByDate[k] = [];
        eventsByDate[k].push(ev);
    }

    function prevMonth() {
        if (month === 0) { setMonth(11); setYear(y => y - 1); }
        else setMonth(m => m - 1);
        setSelectedDay(null);
    }
    function nextMonth() {
        if (month === 11) { setMonth(0); setYear(y => y + 1); }
        else setMonth(m => m + 1);
        setSelectedDay(null);
    }

    const todayKey = fmtDate(today);
    const selectedKey = selectedDay ? `${year}-${pad(month + 1)}-${pad(selectedDay)}` : null;
    const selectedEvents = selectedKey ? (eventsByDate[selectedKey] || []) : [];

    function goToEvent(ev) {
        if (ev.kind === "call_log") navigate(`/calllogs/${ev.id}`);
        else if (ev.kind === "task") navigate("/tasks");
        else if (ev.kind === "engagement") navigate("/schedule");
    }

    const { no_due, due } = data.tasks_side_list || { no_due: [], due: [] };

    return (
        <div className="calendarPageWrap">
            {/* ---- Header ---- */}
            <div className="card calendarHeader">
                <div className="cardHeaderRow">
                    <h2 className="cardTitle">Calendar</h2>
                    <select
                        value={precinct}
                        onChange={e => setPrecinct(e.target.value)}
                        style={{ width: "auto", minWidth: 160 }}
                    >
                        <option value="all">All precincts</option>
                        {precincts.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>

                {/* Month nav */}
                <div className="calMonthNav">
                    <button className="btn ghost" onClick={prevMonth} type="button">◀</button>
                    <span className="calMonthLabel">{monthLabel(new Date(year, month))}</span>
                    <button className="btn ghost" onClick={nextMonth} type="button">▶</button>
                </div>
            </div>

            <div className="calendarLayout">
                {/* ---- Calendar grid ---- */}
                <div className="card calendarGrid" style={{ position: "relative" }}>
                    {loading && <div className="calLoading">Loading…</div>}
                    <div className="calWeekRow">
                        {WEEKDAYS.map(d => <div key={d} className="calWeekDay">{d}</div>)}
                    </div>
                    <div className="calDays">
                        {days.map((day, i) => {
                            if (day === null) return <div key={`b${i}`} className="calCell calBlank" />;
                            const dk = `${year}-${pad(month + 1)}-${pad(day)}`;
                            const evs = eventsByDate[dk] || [];
                            const isToday = dk === todayKey;
                            const isSelected = day === selectedDay;
                            return (
                                <div
                                    key={dk}
                                    className={`calCell ${isToday ? "calToday" : ""} ${isSelected ? "calSelected" : ""}`}
                                    onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                                >
                                    <span className="calDayNum">{day}</span>
                                    {evs.length > 0 && (
                                        <div className="calDots">
                                            {evs.slice(0, 4).map((ev, j) => (
                                                <span
                                                    key={j}
                                                    className="calDot"
                                                    style={{ background: KIND_COLORS[ev.kind] || "#888" }}
                                                    title={ev.title}
                                                />
                                            ))}
                                            {evs.length > 4 && <span className="calDotMore">+{evs.length - 4}</span>}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Legend */}
                    <div className="calLegend">
                        {Object.entries(KIND_COLORS).map(([k, c]) => (
                            <span key={k} className="calLegendItem">
                                <span className="calDot" style={{ background: c }} />
                                {KIND_LABELS[k]} {k.replace("_", " ")}
                            </span>
                        ))}
                    </div>
                </div>

                {/* ---- Side task list ---- */}
                <div className="calSideList">
                    {/* Selected day events */}
                    {selectedDay && (
                        <div className="card" style={{ marginBottom: 12 }}>
                            <h3 className="sectionTitle" style={{ margin: "0 0 8px" }}>
                                Events — {pad(selectedDay)} {monthLabel(new Date(year, month))}
                            </h3>
                            {selectedEvents.length === 0 && <p className="muted">No events on this day.</p>}
                            {selectedEvents.map(ev => (
                                <div
                                    key={`${ev.kind}-${ev.id}`}
                                    className="item"
                                    style={{ marginBottom: 6, borderLeft: `3px solid ${KIND_COLORS[ev.kind]}` }}
                                    onClick={() => setModalEvent(ev)}
                                >
                                    <div className="itemTitle">{KIND_LABELS[ev.kind]} {ev.title}</div>
                                    <div className="muted">{ev.precinct?.name || ""}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* No due date tasks */}
                    <div className="card" style={{ marginBottom: 12 }}>
                        <h3 className="sectionTitle" style={{ margin: "0 0 8px" }}>No due date</h3>
                        {no_due.length === 0 && <p className="muted">No tasks without due date.</p>}
                        {no_due.map(t => (
                            <div key={t.id} className="item" style={{ marginBottom: 6 }}>
                                <div className="itemTitle">{t.title}</div>
                                <div className="chips" style={{ marginTop: 4 }}>
                                    <span className="chip">{t.status}</span>
                                    {t.precinct && <span className="chip">{t.precinct.name}</span>}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Due tasks */}
                    <div className="card">
                        <h3 className="sectionTitle" style={{ margin: "0 0 8px" }}>Due soon</h3>
                        {due.length === 0 && <p className="muted">No tasks with due dates.</p>}
                        {due.map(t => (
                            <div key={t.id} className="item" style={{ marginBottom: 6 }}>
                                <div className="itemTitle">{t.title}</div>
                                <div className="chips" style={{ marginTop: 4 }}>
                                    <span className="chip">{t.status}</span>
                                    {t.precinct && <span className="chip">{t.precinct.name}</span>}
                                    {t.due_date && <span className="chip">📅 {t.due_date}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ---- Event detail modal ---- */}
            {modalEvent && (
                <div className="calModalBackdrop" onClick={() => setModalEvent(null)}>
                    <div className="calModal card" onClick={e => e.stopPropagation()}>
                        <div className="cardHeaderRow">
                            <h3 className="cardTitle" style={{ fontSize: 16 }}>
                                {KIND_LABELS[modalEvent.kind]} {modalEvent.kind.replace("_", " ").toUpperCase()}
                            </h3>
                            <button className="btn ghost" onClick={() => setModalEvent(null)} type="button">✕</button>
                        </div>
                        <p className="itemTitle" style={{ margin: "4px 0 8px" }}>{modalEvent.title}</p>
                        <div className="muted" style={{ marginBottom: 8 }}>
                            <div>Date: {modalEvent.start?.slice(0, 10)}</div>
                            {modalEvent.precinct && <div>Precinct: {modalEvent.precinct.name}</div>}
                            {modalEvent.meta && Object.entries(modalEvent.meta).map(([k, v]) => (
                                v ? <div key={k}>{k.replace("_", " ")}: {v}</div> : null
                            ))}
                        </div>
                        <button
                            className="btn primary"
                            style={{ width: "100%" }}
                            onClick={() => { setModalEvent(null); goToEvent(modalEvent); }}
                            type="button"
                        >
                            Go to {modalEvent.kind.replace("_", " ")}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
