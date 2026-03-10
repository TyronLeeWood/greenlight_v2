import { useNavigate } from "react-router-dom";
import "./LandingPage.css";

export default function LandingPage() {
    const navigate = useNavigate();

    return (
        <div className="landing-wrapper">
            <div className="landing-bg">
                <div className="landing-overlay" />
            </div>

            {/* Sticky Banner */}
            <header className="landing-banner">
                <div className="landing-brand">Greenlight</div>
                <button
                    className="btn primary"
                    onClick={() => navigate("/login")}
                    style={{ minWidth: "120px", fontWeight: "bold" }}
                >
                    Login
                </button>
            </header>

            <main className="landing-content">
                <section className="landing-hero">
                    <h1>Welcome to Greenlight</h1>
                    <p>
                        The intelligent platform for managing internal precinct operations, ensuring compliance, coordinating tasks, and overseeing service providers in real time.
                    </p>
                </section>

                <section className="landing-features">
                    <div className="landing-grid">
                        <div className="landing-feature">
                            <h3 style={{ color: "var(--accent)" }}>Dashboard & Analytics</h3>
                            <p>
                                Get a high-level overview of operational health, compliance percentages, and recent activities. The dashboard aggregates data to help identify trends and critical areas needing attention.
                            </p>
                        </div>
                        <div className="landing-feature">
                            <h3 style={{ color: "var(--accent)" }}>Precincts</h3>
                            <p>
                                Access a structured directory of all precinct locations. View specific details per precinct, including location data, specialized metrics, and quick links to localized tasks and call logs.
                            </p>
                        </div>
                        <div className="landing-feature">
                            <h3 style={{ color: "var(--accent)" }}>Call Logs</h3>
                            <p>
                                Log, categorize, and track incidents, queries, or operational events. Ensure nothing falls through the cracks by escalating critical logs and attaching follow-up tasks directly to the issue.
                            </p>
                        </div>
                        <div className="landing-feature">
                            <h3 style={{ color: "var(--accent)" }}>Tasks</h3>
                            <p>
                                Create, assign, and monitor actionable tasks with due dates. Keep your team aligned by linking tasks to specific precincts and visualizing upcoming deadlines in an organized list.
                            </p>
                        </div>
                        <div className="landing-feature">
                            <h3 style={{ color: "var(--accent)" }}>Service Providers</h3>
                            <p>
                                Manage external vendors and contractors. Maintain a comprehensive list of service provider contacts tailored by precinct to ensure the right people are contacted for specific operational needs.
                            </p>
                        </div>
                        <div className="landing-feature">
                            <h3 style={{ color: "var(--accent)" }}>Scheduling & Engagements</h3>
                            <p>
                                Coordinate and track active engagements across different locations. Monitor what service providers are scheduled to do, when they are doing it, and ensure all commitments are met flawlessly.
                            </p>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
