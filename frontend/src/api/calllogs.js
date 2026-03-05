import { apiFetch } from "./client";

export async function fetchCallLogs(precinctId) {
    const url = precinctId
        ? `/api/calllogs/?precinct=${precinctId}`
        : "/api/calllogs/";
    const data = await apiFetch(url);
    return Array.isArray(data) ? data : [];
}

export async function fetchCallLog(id) {
    return apiFetch(`/api/calllogs/${id}/`);
}

export async function createCallLog(body) {
    return apiFetch("/api/calllogs/", {
        method: "POST",
        needsCsrf: true,
        body,
    });
}

export async function patchCallLog(id, body) {
    return apiFetch(`/api/calllogs/${id}/`, {
        method: "PATCH",
        needsCsrf: true,
        body,
    });
}

export async function escalateCallLog(id, body) {
    return apiFetch(`/api/calllogs/${id}/escalate/`, {
        method: "POST",
        needsCsrf: true,
        body,
    });
}

export async function fetchEscalationEvents(callLogId) {
    const data = await apiFetch(`/api/escalations/?call_log=${callLogId}`);
    return Array.isArray(data) ? data : [];
}
