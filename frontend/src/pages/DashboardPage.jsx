import { useState, useEffect, useCallback } from "react";
import { fetchDashboardData } from "../api/dashboard";
import { fetchPrecincts } from "../api/precincts";

export default function DashboardPage() {
    const [precinct, setPrecinct] = useState("all");
    const [precincts, setPrecincts] = useState([]);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchPrecincts().then(setPrecincts).catch(() => { });
    }, []);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const d = await fetchDashboardData(precinct);
            setData(d);
        } catch {
            // ignore
        }
        setLoading(false);
    }, [precinct]);

    useEffect(() => { loadData(); }, [loadData]);

    const counts = data?.counts || {};
    const compliance = data?.compliance_percent ?? 0;

    // colour for compliance arc
    const compColor = compliance >= 80 ? "#34d399" : compliance >= 50 ? "#fbbf24" : "#f87171";

    return (
        <div className="card" style={{ maxWidth: 700, margin: "0 auto" }}>
            <div className="cardHeaderRow">
                <h2 className="cardTitle">Dashboard</h2>
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

            {loading && <p className="muted">Loading…</p>}

            {data && (
                <>
                    {/* ---- Compliance ---- */}
                    <div className="dashCompliance">
                        <svg viewBox="0 0 120 120" className="dashComplianceRing">
                            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
                            <circle
                                cx="60" cy="60" r="52"
                                fill="none"
                                stroke={compColor}
                                strokeWidth="10"
                                strokeLinecap="round"
                                strokeDasharray={`${(compliance / 100) * 326.73} 326.73`}
                                transform="rotate(-90 60 60)"
                                style={{ transition: "stroke-dasharray 0.5s ease" }}
                            />
                        </svg>
                        <div className="dashComplianceText">
                            <span className="dashComplianceNum" style={{ color: compColor }}>{compliance}%</span>
                            <span className="dashComplianceLabel">Compliance</span>
                        </div>
                    </div>

                    {/* ---- Counts ---- */}
                    <div className="dashCards">
                        <div className="dashCard">
                            <div className="dashCardValue">
                                {counts.call_logs_open ?? 0} <span className="dashCardSlash">/</span> {counts.call_logs_total ?? 0}
                            </div>
                            <div className="dashCardLabel">Open Call Logs</div>
                        </div>
                        <div className="dashCard">
                            <div className="dashCardValue">
                                {counts.tasks_open ?? 0} <span className="dashCardSlash">/</span> {counts.tasks_total ?? 0}
                            </div>
                            <div className="dashCardLabel">Open Tasks</div>
                        </div>
                        <div className="dashCard">
                            <div className="dashCardValue">
                                {counts.items_open ?? 0} <span className="dashCardSlash">/</span> {counts.items_total ?? 0}
                            </div>
                            <div className="dashCardLabel">Items Open</div>
                        </div>
                    </div>

                    <p className="muted" style={{ textAlign: "center", marginTop: 14, fontSize: 12 }}>
                        Compliance = completed items ÷ total items. A call log is complete when Resolved or Closed. A task is complete when Done.
                    </p>
                </>
            )}
        </div>
    );
}
