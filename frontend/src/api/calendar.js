import { apiFetch } from "./client";

export async function fetchCalendarData(start, end, precinct = "all") {
    const q = new URLSearchParams({ start, end });
    if (precinct && precinct !== "all") q.set("precinct", precinct);
    return apiFetch(`/api/calendar/?${q.toString()}`);
}
