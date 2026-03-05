import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchPrecincts } from "../api/precincts";
import { fetchServiceProviders } from "../api/serviceproviders";
import { fetchCallLogs } from "../api/calllogs";
import {
    fetchEngagements,
    createEngagement,
    updateEngagement,
    deleteEngagement,
    fetchEngagementActivity,
    addEngagementActivity,
} from "../api/engagements";

const SHIFTS = [
    { value: "", label: "All shifts" },
    { value: "DAY", label: "Day" },
    { value: "NIGHT", label: "Night" },
    { value: "OTHER", label: "Other" },
];

const SERVICE_TYPES = [
    { value: "CLEANING", label: "Cleaning" },
    { value: "SECURITY", label: "Security" },
    { value: "MAINTENANCE", label: "Maintenance" },
    { value: "OTHER", label: "Other" },
];

function pad2(n) { return String(n).padStart(2, "0"); }
function todayStr() { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }

const EMPTY_FORM = {
    precinct: "",
    service_provider: "",
    call_log: "",
    service_type: "OTHER",
    shift: "DAY",
    date: todayStr(),
    contact_details: "",
    notes: "",
};

export default function SchedulePage() {
    const navigate = useNavigate();
    const [engagements, setEngagements] = useState([]);
    const [precincts, setPrecincts] = useState([]);
    const [providers, setProviders] = useState([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    // filters
    const [fPrecinct, setFPrecinct] = useState("");
    const [fDate, setFDate] = useState("");
    const [fShift, setFShift] = useState("");

    // form
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });

    // activity log
    const [activityId, setActivityId] = useState(null);
    const [activityEvents, setActivityEvents] = useState([]);
    const [activityMsg, setActivityMsg] = useState("");

    useEffect(() => {
        fetchPrecincts().then(setPrecincts).catch(() => { });
        fetchServiceProviders().then(setProviders).catch(() => { });
    }, []);

    async function load() {
        setBusy(true);
        try {
            const params = {};
            if (fPrecinct) params.precinct = fPrecinct;
            if (fDate) params.date = fDate;
            if (fShift) params.shift = fShift;
            const data = await fetchEngagements(params);
            setEngagements(data);
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    }

    useEffect(() => { load(); }, [fPrecinct, fDate, fShift]);

    function openNew() {
        setEditId(null);
        setForm({ ...EMPTY_FORM });
        setShowForm(true);
        setError("");
    }
    function openEdit(eng) {
        setEditId(eng.id);
        setForm({
            precinct: eng.precinct || "",
            service_provider: eng.service_provider || "",
            call_log: eng.call_log || "",
            service_type: eng.service_type || "OTHER",
            shift: eng.shift || "DAY",
            date: eng.date || todayStr(),
            contact_details: eng.contact_details || "",
            notes: eng.notes || "",
        });
        setShowForm(true);
        setError("");
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        if (!form.precinct) { setError("Precinct is required."); return; }
        if (!form.service_provider) { setError("Service Provider is required."); return; }
        if (!form.date) { setError("Date is required."); return; }
        setBusy(true);
        const body = { ...form };
        if (!body.call_log) delete body.call_log;
        try {
            if (editId) {
                await updateEngagement(editId, body);
            } else {
                await createEngagement(body);
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
        if (!confirm("Delete this engagement?")) return;
        setBusy(true);
        try {
            await deleteEngagement(id);
            await load();
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    async function openActivity(id) {
        setActivityId(id);
        setActivityMsg("");
        try {
            const events = await fetchEngagementActivity(id);
            setActivityEvents(events);
        } catch {
            setActivityEvents([]);
        }
    }

    async function handleAddActivity(e) {
        e.preventDefault();
        if (!activityMsg.trim()) return;
        try {
            await addEngagementActivity(activityId, activityMsg.trim());
            setActivityMsg("");
            const events = await fetchEngagementActivity(activityId);
            setActivityEvents(events);
        } catch (err) {
            setError(err.message);
        }
    }

    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    return (
        <>
            <div className="card">
                <div className="cardHeaderRow">
                    <h2 className="cardTitle">SP Schedule</h2>
                    <button className="btn primary" type="button" onClick={openNew}>
                        + New Engagement
                    </button>
                </div>

                <div className="filterRow">
                    <select value={fPrecinct} onChange={(e) => setFPrecinct(e.target.value)}>
                        <option value="">All precincts</option>
                        {precincts.map((p) => (
                            <option key={p.id} value={String(p.id)}>{p.name}</option>
                        ))}
                    </select>
                    <input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} />
                    <select value={fShift} onChange={(e) => setFShift(e.target.value)}>
                        {SHIFTS.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                    </select>
                </div>

                {error && <div className="error">{error}</div>}

                {showForm && (
                    <div className="pane" style={{ marginTop: 12 }}>
                        <h3 className="sectionTitle">{editId ? "Edit Engagement" : "New Engagement"}</h3>
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
                                <div className="label">Service Provider *</div>
                                <select value={form.service_provider} onChange={(e) => set("service_provider", e.target.value)}>
                                    <option value="">-- select --</option>
                                    {providers.map((sp) => (
                                        <option key={sp.id} value={String(sp.id)}>{sp.company}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <div className="label">Date *</div>
                                <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
                            </div>
                            <div>
                                <div className="label">Shift</div>
                                <select value={form.shift} onChange={(e) => set("shift", e.target.value)}>
                                    <option value="DAY">Day</option>
                                    <option value="NIGHT">Night</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>
                            <div>
                                <div className="label">Service type</div>
                                <select value={form.service_type} onChange={(e) => set("service_type", e.target.value)}>
                                    {SERVICE_TYPES.map((t) => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <div className="label">Call Log ID (optional)</div>
                                <input type="number" value={form.call_log} onChange={(e) => set("call_log", e.target.value)} placeholder="Leave blank if not linked" />
                            </div>
                            <div>
                                <div className="label">Contact details</div>
                                <input value={form.contact_details} onChange={(e) => set("contact_details", e.target.value)} placeholder="On-site contact info snapshot" />
                            </div>
                            <div>
                                <div className="label">Notes</div>
                                <input value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Optional notes" />
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
                {engagements.map((eng) => (
                    <li key={eng.id} className="item noTap">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                                <div className="itemTitle">{eng.service_provider_name || `Provider #${eng.service_provider}`}</div>
                                <div className="muted">
                                    📍 {eng.precinct_name || `Precinct #${eng.precinct}`} · {eng.date} · {eng.shift}
                                </div>
                                {eng.contact_details && <div className="muted">📞 {eng.contact_details}</div>}
                                {eng.call_log && <div className="muted">🔗 Call Log #{eng.call_log}</div>}
                            </div>
                            <div className="chips" style={{ marginTop: 0, flexShrink: 0 }}>
                                <span className="chip">{eng.service_type}</span>
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                            <button className="btn ghost" style={{ height: 32, fontSize: 12 }} onClick={() => openEdit(eng)}>Edit</button>
                            <button className="btn ghost" style={{ height: 32, fontSize: 12 }} onClick={() => openActivity(eng.id)}>Activity</button>
                            <button
                                className="btn ghost"
                                style={{ height: 32, fontSize: 12 }}
                                onClick={() => navigate(`/tasks/new?precinct=${eng.precinct}&engagement=${eng.id}`)}
                            >
                                + Task
                            </button>
                            <button className="btn ghost" style={{ height: 32, fontSize: 12, color: "rgba(255,180,180,0.9)" }} onClick={() => handleDelete(eng.id)}>Delete</button>
                        </div>

                        {/* Activity log inline */}
                        {activityId === eng.id && (
                            <div className="pane" style={{ marginTop: 10 }}>
                                <h3 className="sectionTitle">Activity log</h3>
                                {activityEvents.length === 0 && <div className="muted">No activity yet.</div>}
                                {activityEvents.map((ev) => (
                                    <div key={ev.id} className="muted" style={{ marginBottom: 6 }}>
                                        <strong>{ev.occurred_at?.slice(0, 16).replace("T", " ")}</strong> — {ev.message}
                                        {ev.created_by_username && <> (by {ev.created_by_username})</>}
                                    </div>
                                ))}
                                <form className="form" onSubmit={handleAddActivity} style={{ marginTop: 8 }}>
                                    <input
                                        value={activityMsg}
                                        onChange={(e) => setActivityMsg(e.target.value)}
                                        placeholder="Add a note..."
                                    />
                                    <button className="btn primary" type="submit" style={{ height: 36 }}>Add</button>
                                </form>
                                <button className="btn ghost" type="button" style={{ height: 32, fontSize: 12, marginTop: 6 }} onClick={() => setActivityId(null)}>
                                    Close
                                </button>
                            </div>
                        )}
                    </li>
                ))}
                {engagements.length === 0 && <div className="muted">No engagements found.</div>}
            </ul>
        </>
    );
}
