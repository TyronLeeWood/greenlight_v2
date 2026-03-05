import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function TopNav() {
    const { me, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    if (!me) return null;

    const path = location.pathname;
    const isPrecincts = path.startsWith("/precincts");
    const isCallLogs = path.startsWith("/calllogs");
    const isProviders = path.startsWith("/service-providers");
    const isSchedule = path.startsWith("/schedule");
    const isTasks = path.startsWith("/tasks");
    const isDashboard = path.startsWith("/dashboard");
    const isCalendar = path.startsWith("/calendar");

    return (
        <nav className="topNav">
            {/* Row 1: brand + user status */}
            <div className="topNavHeader">
                <div className="brand">Greenlight</div>
                <div className="userPill">✅ {me.username || "Logged in"}</div>
            </div>

            {/* Row 2: navigation tabs — wraps on mobile */}
            <div className="topNavBtns">
                <button
                    className={`navBtn ${isDashboard ? "navBtnActive" : ""}`}
                    type="button"
                    onClick={() => navigate("/dashboard")}
                >
                    Dashboard
                </button>
                <button
                    className={`navBtn ${isCalendar ? "navBtnActive" : ""}`}
                    type="button"
                    onClick={() => navigate("/calendar")}
                >
                    Calendar
                </button>
                <button
                    className={`navBtn ${isPrecincts ? "navBtnActive" : ""}`}
                    type="button"
                    onClick={() => navigate("/precincts")}
                >
                    Precincts
                </button>
                <button
                    className={`navBtn ${isCallLogs ? "navBtnActive" : ""}`}
                    type="button"
                    onClick={() => navigate("/calllogs")}
                >
                    Call Logs
                </button>
                <button
                    className={`navBtn ${isProviders ? "navBtnActive" : ""}`}
                    type="button"
                    onClick={() => navigate("/service-providers")}
                >
                    Service Providers
                </button>
                <button
                    className={`navBtn ${isSchedule ? "navBtnActive" : ""}`}
                    type="button"
                    onClick={() => navigate("/schedule")}
                >
                    SP Schedule
                </button>
                <button
                    className={`navBtn ${isTasks ? "navBtnActive" : ""}`}
                    type="button"
                    onClick={() => navigate("/tasks")}
                >
                    Tasks
                </button>
                {/* spacer pushes logout to the right on desktop */}
                <span className="navSpacer" />
                <button className="navBtn navBtnLogout" type="button" onClick={logout}>
                    Logout
                </button>
            </div>
        </nav>
    );
}
