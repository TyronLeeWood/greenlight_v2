import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchPrecincts } from "../api/precincts";
import { fetchCallLogs } from "../api/calllogs";
import { fetchTasks } from "../api/tasks";

export default function PrecinctDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [precinct, setPrecinct] = useState(null);
    const [calllogs, setCalllogs] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        setBusy(true);
        Promise.all([
            fetchPrecincts().then((list) => {
                const p = list.find((x) => String(x.id) === String(id));
                setPrecinct(p || { id, name: `Precinct #${id}`, location: "" });
            }),
            // Fetch open/recent tasks limited
            fetchTasks({ precinct: id }).then(allTasks => {
                // simple client side filter to prioritize open/in-progress and limit to ~10
                const active = allTasks.filter(t => t.status !== "CLOSED" && t.status !== "CANCELED" && t.status !== "DONE");
                const others = allTasks.filter(t => t.status === "CLOSED" || t.status === "CANCELED" || t.status === "DONE");
                setTasks([...active, ...others].slice(0, 10));
            }),
            fetchCallLogs(id).then(allLogs => {
                setCalllogs(allLogs.slice(0, 10)); // limit preview to 10
            }),
        ])
            .catch((e) => setError(e.message))
            .finally(() => setBusy(false));
    }, [id]);

    return (
        <div className="card">
            <div className="cardHeaderRow">
                <div>
                    <h2 className="cardTitle">{precinct?.name || "Loading..."}</h2>
                    <div className="muted">
                        {precinct?.location
                            ? `📍 ${precinct.location}`
                            : "📍 Location not set"}
                    </div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                    <button
                        className="btn primary"
                        type="button"
                        onClick={() => navigate(`/calllogs/new?precinct=${id}`)}
                    >
                        + Call Log
                    </button>
                    <button
                        className="btn primary"
                        type="button"
                        onClick={() => navigate(`/tasks/new?precinct=${id}`)}
                    >
                        + Task
                    </button>
                    <button
                        className="btn ghost"
                        type="button"
                        onClick={() => navigate("/precincts")}
                    >
                        Back
                    </button>
                </div>
            </div>

            {error && <div className="error">{error}</div>}

            <div className="grid2">
                {/* -------------------- TASKS PANE -------------------- */}
                <div className="pane">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h3 className="sectionTitle">Recent Tasks</h3>
                        <a href={`/tasks?precinct=${id}`} onClick={(e) => { e.preventDefault(); navigate(`/tasks?precinct=${id}`); }} style={{ fontSize: "12px", color: "var(--accent)" }}>
                            View all tasks
                        </a>
                    </div>
                    <ul className="list">
                        {tasks.map((t) => (
                            <li
                                key={t.id}
                                className="item noTap"
                                style={{ cursor: "default" }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                    <div>
                                        <div className="itemTitle">{t.task_type || `Task #${t.id}`}</div>
                                        {t.sharepoint_link && (
                                            <a href={t.sharepoint_link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none", display: "inline-block", marginTop: 2 }}>
                                                🔗 Open Link
                                            </a>
                                        )}
                                        <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                                            Created {t.created_at?.slice(0, 10)}
                                            {t.due_date && <> • Due {t.due_date}</>}
                                        </div>
                                    </div>
                                    <div className="chips" style={{ marginTop: 0 }}>
                                        <span className="chip">{t.status}</span>
                                    </div>
                                </div>
                            </li>
                        ))}
                        {tasks.length === 0 && !busy && (
                            <div className="muted" style={{ padding: "12px 0", display: "flex", flexDirection: "column", gap: 8 }}>
                                <span>No active tasks yet.</span>
                                <div>
                                    <button
                                        className="btn ghost"
                                        onClick={() => navigate(`/tasks/new?precinct=${id}`)}
                                        style={{ height: 32, fontSize: 12 }}
                                    >
                                        Create Task
                                    </button>
                                </div>
                            </div>
                        )}
                    </ul>
                </div>

                {/* -------------------- CALL LOGS PANE -------------------- */}
                <div className="pane">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h3 className="sectionTitle">Recent Call Logs</h3>
                        <a href={`/calllogs?precinct=${id}`} onClick={(e) => { e.preventDefault(); navigate(`/calllogs?precinct=${id}`); }} style={{ fontSize: "12px", color: "var(--accent)" }}>
                            View all call logs
                        </a>
                    </div>
                    <ul className="list">
                        {calllogs.map((cl) => (
                            <li
                                key={cl.id}
                                className="item"
                                onClick={() => navigate(`/calllogs/${cl.id}`)}
                            >
                                <div className="itemTitle" style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span>{cl.reference_number || `Call Log #${cl.id}`}</span>
                                    {cl.task_items?.length > 0 && <span className="chip">🔗 {cl.task_items.length} tasks</span>}
                                </div>
                                <div className="muted">
                                    {cl.date} {cl.time?.slice(0, 5)} • {cl.issue_type}
                                </div>
                                <div className="chips">
                                    <span className="chip">{cl.status}</span>
                                    <span className="chip">L{cl.escalation_level ?? 0}</span>
                                </div>
                            </li>
                        ))}
                        {calllogs.length === 0 && !busy && (
                            <div className="muted" style={{ padding: "12px 0", display: "flex", flexDirection: "column", gap: 8 }}>
                                <span>No call logs yet.</span>
                                <div>
                                    <button
                                        className="btn ghost"
                                        onClick={() => navigate(`/calllogs/new?precinct=${id}`)}
                                        style={{ height: 32, fontSize: 12 }}
                                    >
                                        Create Call Log
                                    </button>
                                </div>
                            </div>
                        )}
                    </ul>
                </div>
            </div>
        </div>
    );
}
