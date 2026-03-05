import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchPrecincts } from "../api/precincts";
import { fetchTasks, createTask, updateTask, deleteTask } from "../api/tasks";

const STATUS_OPTIONS = [
    { value: "", label: "All statuses" },
    { value: "OPEN", label: "Open" },
    { value: "IN_PROGRESS", label: "In Progress" },
    { value: "DONE", label: "Done" },
    { value: "CANCELED", label: "Canceled" },
];

const TASK_STATUS = [
    { value: "OPEN", label: "Open" },
    { value: "IN_PROGRESS", label: "In Progress" },
    { value: "DONE", label: "Done" },
    { value: "CANCELED", label: "Canceled" },
];

export default function TasksPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [tasks, setTasks] = useState([]);
    const [precincts, setPrecincts] = useState([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    // filters
    const [fPrecinct, setFPrecinct] = useState("");
    const [fStatus, setFStatus] = useState("");

    // form
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState({
        precinct: "",
        task_type: "",
        description: "",
        due_date: "",
        sharepoint_link: "",
        status: "OPEN",
        call_log: "",
        service_provider_engagement: "",
    });

    // Open "new" form with prefill from query params (from engagement or call log)
    useEffect(() => {
        fetchPrecincts().then(setPrecincts).catch(() => { });

        const qPrecinct = searchParams.get("precinct");
        const qCallLog = searchParams.get("call_log");
        const qEngagement = searchParams.get("engagement");
        if (qPrecinct || qCallLog || qEngagement) {
            setForm((f) => ({
                ...f,
                precinct: qPrecinct || "",
                call_log: qCallLog || "",
                service_provider_engagement: qEngagement || "",
            }));
            setShowForm(true);
            setEditId(null);
        }
    }, []);

    async function load() {
        setBusy(true);
        try {
            const params = {};
            if (fPrecinct) params.precinct = fPrecinct;
            if (fStatus) params.status = fStatus;
            const data = await fetchTasks(params);
            setTasks(data);
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    }

    useEffect(() => { load(); }, [fPrecinct, fStatus]);

    function openNew() {
        setEditId(null);
        setForm({
            precinct: "",
            task_type: "",
            description: "",
            sharepoint_link: "",
            due_date: "",
            status: "OPEN",
            call_log: "",
            service_provider_engagement: "",
        });
        setShowForm(true);
        setError("");
    }

    function openEdit(t) {
        setEditId(t.id);
        setForm({
            precinct: t.precinct || "",
            task_type: t.task_type || "",
            description: t.description || "",
            sharepoint_link: t.sharepoint_link || "",
            due_date: t.due_date || "",
            status: t.status || "OPEN",
            call_log: t.call_log || "",
            service_provider_engagement: t.service_provider_engagement || "",
        });
        setShowForm(true);
        setError("");
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        if (!form.precinct) { setError("Precinct is required."); return; }
        if (!form.task_type.trim()) { setError("Task type is required."); return; }
        setBusy(true);
        const body = { ...form };
        if (!body.call_log) delete body.call_log;
        if (!body.service_provider_engagement) delete body.service_provider_engagement;
        if (!body.due_date) body.due_date = null;
        try {
            if (editId) {
                await updateTask(editId, body);
            } else {
                await createTask(body);
            }
            setShowForm(false);
            await load();
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    async function handleDelete(id) {
        if (!confirm("Delete this task?")) return;
        setBusy(true);
        try {
            await deleteTask(id);
            await load();
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    return (
        <>
            <div className="card">
                <div className="cardHeaderRow">
                    <h2 className="cardTitle">Tasks</h2>
                    <button className="btn primary" type="button" onClick={openNew}>
                        + New Task
                    </button>
                </div>

                <div className="filterRow">
                    <select value={fPrecinct} onChange={(e) => setFPrecinct(e.target.value)}>
                        <option value="">All precincts</option>
                        {precincts.map((p) => (
                            <option key={p.id} value={String(p.id)}>{p.name}</option>
                        ))}
                    </select>
                    <select value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
                        {STATUS_OPTIONS.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                    </select>
                </div>

                {error && <div className="error">{error}</div>}

                {showForm && (
                    <div className="pane" style={{ marginTop: 12 }}>
                        <h3 className="sectionTitle">{editId ? "Edit Task" : "New Task"}</h3>
                        <form className="form" onSubmit={handleSubmit}>
                            <div>
                                <div className="label">Precinct *</div>
                                <select value={form.precinct} onChange={(e) => set("precinct", e.target.value)}>
                                    <option value="">-- select --</option>
                                    {precincts.map((p) => (
                                        <option key={p.id} value={String(p.id)}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <div className="label">Task type *</div>
                                <input value={form.task_type} onChange={(e) => set("task_type", e.target.value)} placeholder="e.g. Inspection, Repair..." />
                            </div>
                            <div>
                                <div className="label">Description</div>
                                <input value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Details..." />
                            </div>
                            <div>
                                <div className="label">SharePoint Link (optional)</div>
                                <input value={form.sharepoint_link} onChange={(e) => set("sharepoint_link", e.target.value)} placeholder="https://..." type="url" />
                            </div>
                            <div>
                                <div className="label">Status</div>
                                <select value={form.status} onChange={(e) => set("status", e.target.value)}>
                                    {TASK_STATUS.map((s) => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <div className="label">Due date (optional)</div>
                                <input type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} />
                            </div>
                            <div>
                                <div className="label">Call log ID (optional)</div>
                                <input type="number" value={form.call_log} onChange={(e) => set("call_log", e.target.value)} placeholder="Leave blank if not linked" />
                            </div>
                            <div>
                                <div className="label">Engagement ID (optional)</div>
                                <input type="number" value={form.service_provider_engagement} onChange={(e) => set("service_provider_engagement", e.target.value)} placeholder="Leave blank if not linked" />
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                                <button className="btn primary" type="submit" disabled={busy}>
                                    {busy ? "Saving..." : "Save"}
                                </button>
                                <button className="btn ghost" type="button" onClick={() => setShowForm(false)}>
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>

            <ul className="list" style={{ marginTop: 12 }}>
                {tasks.map((t) => (
                    <li key={t.id} className="item noTap">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                                <div className="itemTitle">{t.task_type || `Task #${t.id}`}</div>
                                <div className="muted">
                                    📍 {t.precinct_name || `Precinct #${t.precinct}`}
                                    {t.call_log && <> · 🔗 CL #{t.call_log}</>}
                                    {t.service_provider_engagement && <> · ⚙️ Eng #{t.service_provider_engagement}</>}
                                </div>
                                {t.description && <div className="muted">{t.description}</div>}
                                {t.sharepoint_link && (
                                    <div style={{ marginTop: 4 }}>
                                        <a href={t.sharepoint_link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none" }}>
                                            🔗 Open Link
                                        </a>
                                    </div>
                                )}
                                <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                                    Created {t.created_at?.slice(0, 10)} {t.created_by_username && `by ${t.created_by_username}`}
                                    {t.due_date && <> · 📅 Due {t.due_date}</>}
                                </div>
                            </div>
                            <div className="chips" style={{ marginTop: 0, flexShrink: 0 }}>
                                <span className="chip">{t.status}</span>
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                            <button className="btn ghost" style={{ height: 32, fontSize: 12 }} onClick={() => openEdit(t)}>Edit</button>
                            <button className="btn ghost" style={{ height: 32, fontSize: 12, color: "rgba(255,180,180,0.9)" }} onClick={() => handleDelete(t.id)}>Delete</button>
                        </div>
                    </li>
                ))}
                {tasks.length === 0 && <div className="muted">No tasks found.</div>}
            </ul>
        </>
    );
}
