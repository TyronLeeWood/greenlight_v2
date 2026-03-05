export default function SidebarEscalationTimeline({ events, onRefresh }) {
    return (
        <>
            <div className="sidebarActions">
                <button className="btn ghost" type="button" onClick={onRefresh}>
                    Refresh
                </button>
            </div>

            <div className="divider" />

            <h3 className="sectionTitle">Escalation timeline</h3>
            {events.length === 0 ? (
                <div className="muted">No escalations yet.</div>
            ) : (
                <ul className="list">
                    {events
                        .slice()
                        .sort((a, b) => (a.level ?? 0) - (b.level ?? 0))
                        .map((e) => (
                            <li key={e.id} className="item noTap">
                                <div className="itemTitle">Level {e.level}</div>
                                <div className="muted">
                                    {new Date(e.occurred_at).toLocaleString()}
                                </div>
                                <div className="muted">
                                    {e.name} • {e.email || "-"} {e.phone ? `• ${e.phone}` : ""}
                                </div>
                                <div className="muted">
                                    By: {e.escalated_by_username || "-"}
                                </div>
                            </li>
                        ))}
                </ul>
            )}
        </>
    );
}
