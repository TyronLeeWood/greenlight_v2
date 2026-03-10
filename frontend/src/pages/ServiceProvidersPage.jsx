import { useState, useEffect } from "react";
import { fetchServiceProviders, createServiceProvider, updateServiceProvider, deleteServiceProvider } from "../api/serviceproviders";

const PROVIDER_TYPES = [
    { value: "", label: "All types" },
    { value: "ADHOC", label: "Ad-hoc" },
    { value: "RETAINED", label: "Retained" },
];

const EMPTY_FORM = {
    company: "",
    provider_type: "ADHOC",
    primary_contact_name: "",
    email: "",
    phone: "",
    notes: "",
};

export default function ServiceProvidersPage() {
    const [providers, setProviders] = useState([]);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });

    async function load() {
        setBusy(true);
        try {
            const data = await fetchServiceProviders(
                typeFilter ? { provider_type: typeFilter } : {}
            );
            setProviders(data);
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    }

    useEffect(() => { load(); }, [typeFilter]);

    function openNew() {
        setEditId(null);
        setForm({ ...EMPTY_FORM });
        setShowForm(true);
        setError("");
    }
    function openEdit(sp) {
        setEditId(sp.id);
        setForm({
            company: sp.company || "",
            provider_type: sp.provider_type || "ADHOC",
            primary_contact_name: sp.primary_contact_name || "",
            email: sp.email || "",
            phone: sp.phone || "",
            notes: sp.notes || "",
        });
        setShowForm(true);
        setError("");
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        if (!form.company.trim()) { setError("Company name is required."); return; }
        setBusy(true);
        try {
            if (editId) {
                await updateServiceProvider(editId, form);
            } else {
                await createServiceProvider(form);
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
        if (!confirm("Delete this provider?")) return;
        setBusy(true);
        try {
            await deleteServiceProvider(id);
            await load();
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    const filtered = providers.filter((p) =>
        p.company.toLowerCase().includes(search.toLowerCase())
    );

    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

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
                backgroundImage: "url('/service-providers.png')",
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
                    <h2 className="cardTitle">Service Providers</h2>
                    <button className="btn primary" type="button" onClick={openNew}>
                        + New Provider
                    </button>
                </div>

                <div className="filterRow">
                    <input
                        placeholder="Search company..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                        {PROVIDER_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                    </select>
                </div>

                {error && <div className="error">{error}</div>}

                {showForm && (
                    <div className="pane" style={{ marginTop: 12 }}>
                        <h3 className="sectionTitle">{editId ? "Edit Provider" : "New Provider"}</h3>
                        <form className="form" onSubmit={handleSubmit}>
                            <div>
                                <div className="label">Company *</div>
                                <input value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="Company name" />
                            </div>
                            <div>
                                <div className="label">Type</div>
                                <select value={form.provider_type} onChange={(e) => set("provider_type", e.target.value)}>
                                    <option value="ADHOC">Ad-hoc (once-off)</option>
                                    <option value="RETAINED">Retained (recurring)</option>
                                </select>
                            </div>
                            <div>
                                <div className="label">Contact name</div>
                                <input value={form.primary_contact_name} onChange={(e) => set("primary_contact_name", e.target.value)} placeholder="Primary contact" />
                            </div>
                            <div>
                                <div className="label">Email</div>
                                <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="email@example.com" />
                            </div>
                            <div>
                                <div className="label">Phone</div>
                                <input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="082..." />
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

            <ul className="list" style={{ marginTop: 12, position: "relative", zIndex: 1 }}>
                {filtered.map((sp) => (
                    <li key={sp.id} className="item noTap" style={{ backgroundColor: "rgba(11, 18, 32, 0.75)", border: "1px solid rgba(255, 255, 255, 0.15)", backdropFilter: "blur(12px)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                                <div className="itemTitle">{sp.company}</div>
                                <div className="muted" style={{ color: "rgba(255,255,255,0.72)" }}>
                                    {sp.primary_contact_name && <>{sp.primary_contact_name} · </>}
                                    {sp.email && <>{sp.email} · </>}
                                    {sp.phone}
                                </div>
                            </div>
                            <div className="chips" style={{ marginTop: 0, flexShrink: 0 }}>
                                <span className="chip">{sp.provider_type === "RETAINED" ? "Retained" : "Ad-hoc"}</span>
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                            <button className="btn ghost" style={{ height: 32, fontSize: 12 }} onClick={() => openEdit(sp)}>Edit</button>
                            <button className="btn ghost" style={{ height: 32, fontSize: 12, color: "rgba(255,180,180,0.9)" }} onClick={() => handleDelete(sp.id)}>Delete</button>
                        </div>
                    </li>
                ))}
                {filtered.length === 0 && <div className="muted" style={{ position: "relative", zIndex: 1, padding: "12px", backgroundColor: "rgba(11, 18, 32, 0.75)", borderRadius: "14px", backdropFilter: "blur(12px)" }}>No providers found.</div>}
            </ul>
        </div>
    );
}
