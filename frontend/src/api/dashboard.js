import { apiFetch } from "./client";

export async function fetchDashboardData(precinct = "all") {
    const q = new URLSearchParams();
    if (precinct && precinct !== "all") q.set("precinct", precinct);
    const qs = q.toString();
    return apiFetch(`/api/dashboard/${qs ? `?${qs}` : ""}`);
}
