import { useState, useEffect } from "react";
import { fetchPrecincts } from "../api/precincts";

function pad2(n) {
    return String(n).padStart(2, "0");
}

export default function CallLogsPage() {
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [format, setFormat] = useState("csv");
    const [precinct, setPrecinct] = useState("");
    const [precincts, setPrecincts] = useState([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchPrecincts().then(setPrecincts).catch(() => { });
    }, []);

    async function handleDownload(e) {
        e.preventDefault();
        setError("");
        setBusy(true);

        try {
            let url = `/api/reports/calllogs/monthly/?year=${year}&month=${month}&file_format=${format}`;
            if (precinct) url += `&precinct=${precinct}`;

            const res = await fetch(url, { credentials: "include" });

            if (!res.ok) {
                const text = await res.text();
                let msg;
                try {
                    const data = JSON.parse(text);
                    msg = data.detail || JSON.stringify(data);
                } catch {
                    msg = text || `Download failed (${res.status})`;
                }
                throw new Error(msg);
            }

            const blob = await res.blob();

            // Try to get filename from Content-Disposition header
            let filename = `calllog_report_${year}_${pad2(month)}${precinct ? `_P${precinct}` : ""}.${format}`;
            const cd = res.headers.get("Content-Disposition");
            if (cd) {
                const match = cd.match(/filename="?([^";\n]+)"?/);
                if (match) filename = match[1];
            }

            // Trigger browser download
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
    ];

    return (
        <>
            {/* Download report section */}
            <div className="card">
                <h2 className="cardTitle">📊 Download Monthly Report</h2>
                <div className="muted" style={{ marginTop: 4 }}>
                    Export call logs for a given month as CSV or PDF.
                </div>

                {error && <div className="error">{error}</div>}

                <form className="form" onSubmit={handleDownload} style={{ marginTop: 12 }}>
                    <div className="grid2" style={{ marginTop: 0 }}>
                        <div>
                            <div className="label">Year</div>
                            <input
                                type="number"
                                min="2020"
                                max="2099"
                                value={year}
                                onChange={(e) => setYear(Number(e.target.value))}
                            />
                        </div>
                        <div>
                            <div className="label">Month</div>
                            <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                                {monthNames.map((name, i) => (
                                    <option key={i + 1} value={i + 1}>
                                        {name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid2" style={{ marginTop: 0 }}>
                        <div>
                            <div className="label">Precinct</div>
                            <select value={precinct} onChange={(e) => setPrecinct(e.target.value)}>
                                <option value="">All precincts</option>
                                {precincts.map((p) => (
                                    <option key={p.id} value={String(p.id)}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <div className="label">Format</div>
                            <select value={format} onChange={(e) => setFormat(e.target.value)}>
                                <option value="csv">CSV</option>
                                <option value="pdf">PDF</option>
                            </select>
                        </div>
                    </div>

                    <button className="btn primary" type="submit" disabled={busy}>
                        {busy ? "Downloading..." : "Download Report"}
                    </button>
                </form>
            </div>

            {/* Instruction card */}
            <div className="card">
                <div className="cardHeaderRow" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                    <div style={{ flex: "1 1 auto" }}>
                        <h2 className="cardTitle">Call Logs</h2>
                        <div className="divider" style={{ margin: "8px 0" }} />
                        <div className="muted">
                            Use the sidebar to search and filter call logs, then click one to view details.
                        </div>
                    </div>
                    <button
                        className="btn primary"
                        type="button"
                        style={{ whiteSpace: "nowrap" }}
                        onClick={() => window.location.href = "/calllogs/new"}
                    >
                        + Call Log
                    </button>
                </div>
            </div>
        </>
    );
}
