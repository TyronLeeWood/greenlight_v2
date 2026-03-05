import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCallLogs } from "../api/calllogs";
import { fetchPrecincts } from "../api/precincts";

export default function SidebarCallLogFilters() {
    const [precincts, setPrecincts] = useState([]);
    const [allCalllogs, setAllCalllogs] = useState([]);
    const [query, setQuery] = useState("");
    const [precinctFilter, setPrecinctFilter] = useState("");
    const navigate = useNavigate();

    const loadAll = () => fetchCallLogs().then(setAllCalllogs).catch(() => { });

    useEffect(() => {
        fetchPrecincts().then(setPrecincts).catch(() => { });
        loadAll();
    }, []);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const pid = precinctFilter ? Number(precinctFilter) : null;

        return allCalllogs
            .filter((cl) => (!pid ? true : cl.precinct === pid))
            .filter((cl) => {
                if (!q) return true;
                const hay = `${cl.reference_number || ""} ${cl.issue_type || ""} ${cl.status || ""}`.toLowerCase();
                return hay.includes(q);
            });
    }, [allCalllogs, query, precinctFilter]);

    return (
        <>
            <h3 className="sectionTitle">Filters</h3>
            <div className="form">
                <div>
                    <div className="label">Search</div>
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="ref, issue, status..."
                    />
                </div>
                <div>
                    <div className="label">Precinct</div>
                    <select
                        value={precinctFilter}
                        onChange={(e) => setPrecinctFilter(e.target.value)}
                    >
                        <option value="">All precincts</option>
                        {precincts.map((p) => (
                            <option key={p.id} value={String(p.id)}>
                                {p.name}
                            </option>
                        ))}
                    </select>
                </div>
                <button className="btn ghost" type="button" onClick={loadAll}>
                    Refresh
                </button>
            </div>

            <div className="divider" />

            <h3 className="sectionTitle">All call logs</h3>
            <ul className="list">
                {filtered.map((cl) => (
                    <li
                        key={cl.id}
                        className="item"
                        onClick={() => navigate(`/calllogs/${cl.id}`)}
                    >
                        <div className="itemTitle">
                            {cl.reference_number || `Call Log #${cl.id}`}
                        </div>
                        <div className="muted">
                            {cl.date} {cl.time?.slice(0, 5)} • {cl.issue_type}
                        </div>
                        <div className="chips">
                            <span className="chip">P{cl.precinct ?? "-"}</span>
                            <span className="chip">{cl.status}</span>
                            <span className="chip">L{cl.escalation_level ?? 0}</span>
                        </div>
                    </li>
                ))}
                {filtered.length === 0 && <div className="muted">No call logs.</div>}
            </ul>
        </>
    );
}
