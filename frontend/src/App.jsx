import { Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./hooks/useAuth";
import TopNav from "./components/TopNav";
import SidebarPrecinctList from "./components/SidebarPrecinctList";
import SidebarCallLogFilters from "./components/SidebarCallLogFilters";
import SidebarEscalationTimeline from "./components/SidebarEscalationTimeline";
import LoginPage from "./pages/LoginPage";
import PrecinctsPage from "./pages/PrecinctsPage";
import PrecinctDetailPage from "./pages/PrecinctDetailPage";
import CallLogsPage from "./pages/CallLogsPage";
import CallLogDetailPage from "./pages/CallLogDetailPage";
import CallLogNewPage from "./pages/CallLogNewPage";
import ServiceProvidersPage from "./pages/ServiceProvidersPage";
import SchedulePage from "./pages/SchedulePage";
import TasksPage from "./pages/TasksPage";
import CalendarPage from "./pages/CalendarPage";
import DashboardPage from "./pages/DashboardPage";
import { fetchCallLog, fetchEscalationEvents } from "./api/calllogs";

/* ------------------------------------------------------------------ */
/* Protected wrapper — redirects to /login if not authenticated       */
/* ------------------------------------------------------------------ */
function RequireAuth({ children }) {
  const { me } = useAuth();
  if (me === null) return null;          // still checking session
  if (me === false) return <Navigate to="/login" replace />;
  return children;
}

/* ------------------------------------------------------------------ */
/* Sidebar router — picks the right sidebar based on current path     */
/* ------------------------------------------------------------------ */
function SidebarRouter({ escalationState }) {
  const location = useLocation();
  const path = location.pathname;

  if (path.startsWith("/calllogs/") && path !== "/calllogs/") {
    // call log detail — show escalation timeline
    return (
      <SidebarEscalationTimeline
        events={escalationState.events}
        onRefresh={escalationState.refresh}
      />
    );
  }
  if (path.startsWith("/calllogs")) {
    return <SidebarCallLogFilters />;
  }
  if (path.startsWith("/precincts")) {
    return <SidebarPrecinctList />;
  }
  // Non-sidebar pages (Providers, Schedule, Tasks) — hide sidebar
  return null;
}

/* ------------------------------------------------------------------ */
/* Layout — TopNav + Sidebar + Main                                    */
/* ------------------------------------------------------------------ */
function AuthenticatedLayout() {
  const [events, setEvents] = useState([]);
  const location = useLocation();

  // Extract call log ID from URL when on detail page
  const callLogIdMatch = location.pathname.match(/^\/calllogs\/(\d+)/);
  const callLogId = callLogIdMatch ? callLogIdMatch[1] : null;

  const loadEvents = useCallback(async () => {
    if (!callLogId) return;
    try {
      const ev = await fetchEscalationEvents(callLogId);
      setEvents(ev);
    } catch {
      // ignore
    }
  }, [callLogId]);

  useEffect(() => {
    if (callLogId) {
      loadEvents();
    } else {
      setEvents([]);
    }
  }, [callLogId, loadEvents]);

  // Determine if we should show the sidebar layout
  const path = location.pathname;
  const hasSidebar =
    path.startsWith("/precincts") || path.startsWith("/calllogs");

  return (
    <>
      <TopNav />
      {hasSidebar ? (
        <div className="layout">
          <div className="panel">
            <div className="panelBody scroll">
              <SidebarRouter escalationState={{ events, refresh: loadEvents }} />
            </div>
          </div>
          <Routes>
            <Route path="/precincts" element={<PrecinctsPage />} />
            <Route path="/precincts/:id" element={<PrecinctDetailPage />} />
            <Route path="/calllogs" element={<CallLogsPage />} />
            <Route path="/calllogs/new" element={<CallLogNewPage />} />
            <Route path="/calllogs/:id" element={<CallLogDetailPage onEventsChange={loadEvents} />} />
            <Route path="*" element={<Navigate to="/precincts" replace />} />
          </Routes>
        </div>
      ) : (
        <div className="mainOnly">
          <Routes>
            <Route path="/service-providers" element={<ServiceProvidersPage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/tasks/new" element={<TasksPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* App — top-level routes                                              */
/* ------------------------------------------------------------------ */
export default function App() {
  return (
    <div className="appWrap">
      <div className="app">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <RequireAuth>
                <AuthenticatedLayout />
              </RequireAuth>
            }
          />
        </Routes>
      </div>
    </div>
  );
}