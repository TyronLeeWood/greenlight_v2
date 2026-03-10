import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    fetchCallLog,
    patchCallLog,
    escalateCallLog,
} from "../api/calllogs";

const STATUS_OPTIONS = [
    { value: "OPEN", label: "Open" },
    { value: "IN_PROGRESS", label: "In Progress" },
    { value: "RESOLVED", label: "Resolved" },
    { value: "CLOSED", label: "Closed" },
];

export default function CallLogDetailPage({ onEventsChange }) {
    const { id } = useParams();
    const navigate = useNavigate();

    const [detail, setDetail] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    // status form
    const [statusDraft, setStatusDraft] = useState("OPEN");

    // escalation form
    const [escName, setEscName] = useState("");
    const [escEmail, setEscEmail] = useState("");
    const [escPhone, setEscPhone] = useState("");

    const loadDetail = useCallback(async () => {
        setBusy(true);
        try {
            const cl = await fetchCallLog(id);
            setDetail(cl);
            setStatusDraft(cl.status);
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    }, [id]);

    useEffect(() => {
        loadDetail();
    }, [loadDetail]);

    async function handleUpdateStatus(e) {
        e.preventDefault();
        setError("");
        setBusy(true);
        try {
            await patchCallLog(id, { status: statusDraft });
            await loadDetail();
            onEventsChange?.();
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    async function handleEscalate(e) {
        e.preventDefault();
        setError("");

        const name = escName.trim();
        const email = escEmail.trim();
        const phone = escPhone.trim();

        if (!name) {
            setError("Name is required.");
            return;
        }
        if (!email && !phone) {
            setError("Provide email or phone (or both).");
            return;
        }

        setBusy(true);
        try {
            await escalateCallLog(id, { name, email, phone });
            setEscName("");
            setEscEmail("");
            setEscPhone("");
            await loadDetail();
            onEventsChange?.();
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            minHeight: "100%",
        }}>
            {/* Full-screen Background that escapes the layout container */}
            <div style={{
                position: "fixed",
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundImage: "url('/call-log.png')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                zIndex: -1
            }}>
                {/* Dark overlay */}
                <div style={{
                    position: "absolute",
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: "rgba(11, 18, 32, 0.65)"
                }} />
            </div>

            {/* Main content */}
            <div className="card" style={{ zIndex: 1, position: "relative", backgroundColor: "rgba(11, 18, 32, 0.75)", border: "1px solid rgba(255, 255, 255, 0.15)", backdropFilter: "blur(12px)" }}>
                <div className="cardHeaderRow">
                    <div>
                        <h2 className="cardTitle">
                            {detail?.reference_number || `Call Log #${id}`}
                        </h2>
                        <div className="muted" style={{ color: "rgba(255,255,255,0.72)" }}>
                            {detail?.date} {detail?.time?.slice(0, 5)} • {detail?.issue_type}
                        </div>
                        <div className="chips">
                            <span className="chip">Status: {detail?.status || "-"}</span>
                            <span className="chip">
                                Escalation: L{detail?.escalation_level ?? 0}
                            </span>
                        </div>
                    </div>
                    <button
                        className="btn ghost"
                        type="button"
                        onClick={() => navigate(`/tasks/new?precinct=${detail?.precinct || ""}&call_log=${id}`)}
                    >
                        + Task
                    </button>
                    <button
                        className="btn ghost"
                        type="button"
                        onClick={() => navigate(-1)}
                    >
                        Back
                    </button>
                </div>

                {error && <div className="error">{error}</div>}

                <div className="grid2">
                    <div className="pane" style={{ backgroundColor: "rgba(11, 18, 32, 0.6)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(8px)" }}>
                        <h3 className="sectionTitle">Change status</h3>
                        <form className="form" onSubmit={handleUpdateStatus}>
                            <select
                                value={statusDraft}
                                onChange={(e) => setStatusDraft(e.target.value)}
                            >
                                {STATUS_OPTIONS.map((s) => (
                                    <option key={s.value} value={s.value}>
                                        {s.label}
                                    </option>
                                ))}
                            </select>
                            <button className="btn primary" type="submit" disabled={busy}>
                                {busy ? "Updating..." : "Update"}
                            </button>
                        </form>
                    </div>

                    <div className="pane" style={{ backgroundColor: "rgba(11, 18, 32, 0.6)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(8px)" }}>
                        <h3 className="sectionTitle">Escalate</h3>
                        <form className="form" onSubmit={handleEscalate}>
                            <div>
                                <div className="label">Name</div>
                                <input
                                    value={escName}
                                    onChange={(e) => setEscName(e.target.value)}
                                    placeholder="Escalate to..."
                                />
                            </div>
                            <div>
                                <div className="label">Email (optional)</div>
                                <input
                                    value={escEmail}
                                    onChange={(e) => setEscEmail(e.target.value)}
                                    placeholder="someone@company.com"
                                />
                            </div>
                            <div>
                                <div className="label">Phone (optional)</div>
                                <input
                                    value={escPhone}
                                    onChange={(e) => setEscPhone(e.target.value)}
                                    placeholder="083..."
                                />
                            </div>
                            <button className="btn primary" type="submit" disabled={busy}>
                                {busy ? "Escalating..." : "Escalate"}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

