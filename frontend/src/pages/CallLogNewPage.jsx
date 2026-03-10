import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchPrecincts } from "../api/precincts";
import { createCallLog } from "../api/calllogs";

function pad2(n) {
    return String(n).padStart(2, "0");
}
function nowLocalDate() {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function nowLocalTime() {
    const d = new Date();
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:00`;
}

const STATUS_OPTIONS = [
    { value: "OPEN", label: "Open" },
    { value: "IN_PROGRESS", label: "In Progress" },
    { value: "RESOLVED", label: "Resolved" },
    { value: "CLOSED", label: "Closed" },
];

export default function CallLogNewPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [precincts, setPrecincts] = useState([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    // Form state
    const [clPrecinct, setClPrecinct] = useState("");
    const [clDate, setClDate] = useState(nowLocalDate());
    const [clTime, setClTime] = useState(nowLocalTime());
    const [clIssueType, setClIssueType] = useState("");
    const [clStatus, setClStatus] = useState("OPEN");

    useEffect(() => {
        setBusy(true);
        fetchPrecincts()
            .then((list) => {
                setPrecincts(list);
                // Pre-fill precinct from query parameter if available
                const paramPrecinct = searchParams.get("precinct");
                if (paramPrecinct && list.some(p => String(p.id) === paramPrecinct)) {
                    setClPrecinct(paramPrecinct);
                }
            })
            .catch(() => setError("Failed to load precincts"))
            .finally(() => setBusy(false));
    }, [searchParams]);

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");

        if (!clPrecinct) {
            setError("Precinct is required.");
            return;
        }

        const issue_type = clIssueType.trim();
        if (!issue_type) {
            setError("Issue type is required.");
            return;
        }

        setBusy(true);
        try {
            await createCallLog({
                date: clDate,
                time: clTime,
                issue_type,
                status: clStatus,
                precinct: Number(clPrecinct),
            });
            // Redirect back to either the precinct overview or the call log list.
            navigate(clPrecinct ? `/precincts/${clPrecinct}` : `/calllogs`);
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

            <div className="card" style={{ zIndex: 1, position: "relative", backgroundColor: "rgba(11, 18, 32, 0.75)", border: "1px solid rgba(255, 255, 255, 0.15)", backdropFilter: "blur(12px)" }}>
                <div className="cardHeaderRow">
                    <h2 className="cardTitle">Create Call Log</h2>
                    <button
                        className="btn ghost"
                        type="button"
                        onClick={() => navigate(-1)}
                    >
                        Back
                    </button>
                </div>

                {error && <div className="error">{error}</div>}

                <form className="form" onSubmit={handleSubmit} style={{ marginTop: "1rem" }}>
                    <div>
                        <div className="label">Precinct *</div>
                        <select
                            value={clPrecinct}
                            onChange={(e) => setClPrecinct(e.target.value)}
                        >
                            <option value="">-- select a precinct --</option>
                            {precincts.map((p) => (
                                <option key={p.id} value={String(p.id)}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <div className="label">Date</div>
                        <input
                            type="date"
                            value={clDate}
                            onChange={(e) => setClDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <div className="label">Time</div>
                        <input
                            type="time"
                            value={clTime.slice(0, 5)}
                            onChange={(e) => setClTime(`${e.target.value}:00`)}
                        />
                    </div>
                    <div>
                        <div className="label">Issue type *</div>
                        <input
                            value={clIssueType}
                            onChange={(e) => setClIssueType(e.target.value)}
                            placeholder="Describe the issue..."
                        />
                    </div>
                    <div>
                        <div className="label">Status</div>
                        <select
                            value={clStatus}
                            onChange={(e) => setClStatus(e.target.value)}
                        >
                            {STATUS_OPTIONS.map((s) => (
                                <option key={s.value} value={s.value}>
                                    {s.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div style={{ marginTop: "1rem" }}>
                        <button className="btn primary" type="submit" disabled={busy}>
                            {busy ? "Saving..." : "Create Call Log"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
