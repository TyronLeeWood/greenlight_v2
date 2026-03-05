import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { fetchPrecincts } from "../api/precincts";
import { useEffect } from "react";

export default function SidebarPrecinctList() {
    const [precincts, setPrecincts] = useState([]);
    const [query, setQuery] = useState("");
    const navigate = useNavigate();

    const load = () => fetchPrecincts().then(setPrecincts).catch(() => { });

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return precincts;
        return precincts.filter((p) =>
            `${p.name} ${p.location || ""}`.toLowerCase().includes(q)
        );
    }, [precincts, query]);

    return (
        <>
            <h3 className="sectionTitle">Precincts</h3>
            <div className="form">
                <div>
                    <div className="label">Search</div>
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="name/location..."
                    />
                </div>
                <button className="btn ghost" type="button" onClick={load}>
                    Refresh
                </button>
            </div>

            <div className="divider" />

            <ul className="list">
                {filtered.map((p) => (
                    <li
                        key={p.id}
                        className="item"
                        onClick={() => navigate(`/precincts/${p.id}`)}
                    >
                        <div className="itemTitle">
                            #{p.id} — {p.name}
                        </div>
                        <div className="muted">
                            {p.location ? `📍 ${p.location}` : "📍 Location not set"}
                        </div>
                    </li>
                ))}
                {filtered.length === 0 && <div className="muted">No precincts.</div>}
            </ul>
        </>
    );
}
