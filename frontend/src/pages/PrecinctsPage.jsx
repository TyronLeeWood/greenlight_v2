import { useState } from "react";
import { createPrecinct } from "../api/precincts";

export default function PrecinctsPage() {
    const [name, setName] = useState("");
    const [location, setLocation] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        const trimmedName = name.trim();
        if (!trimmedName) return;

        setBusy(true);
        try {
            await createPrecinct(trimmedName, location.trim());
            setName("");
            setLocation("");
            // The sidebar will re-fetch on its own mount, but we can force a
            // page-level event if needed later. For now this is fine.
            window.dispatchEvent(new Event("precincts-changed"));
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="card">
            <h2 className="cardTitle">Create precinct</h2>
            {error && <div className="error">{error}</div>}
            <form className="form" onSubmit={handleSubmit}>
                <div>
                    <div className="label">Name</div>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Precinct name..."
                    />
                </div>
                <div>
                    <div className="label">Location</div>
                    <input
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Address / area..."
                    />
                </div>
                <button className="btn primary" type="submit" disabled={busy}>
                    {busy ? "Saving..." : "Add precinct"}
                </button>
            </form>

            <div className="divider" />

            <div className="muted">
                Select a precinct from the left to view and add call logs.
            </div>
        </div>
    );
}
