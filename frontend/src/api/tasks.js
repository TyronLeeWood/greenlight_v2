import { apiFetch } from "./client";

export async function fetchTasks(params = {}) {
    const q = new URLSearchParams();
    if (params.precinct) q.set("precinct", params.precinct);
    if (params.status) q.set("status", params.status);
    if (params.call_log) q.set("call_log", params.call_log);
    if (params.service_provider_engagement)
        q.set("service_provider_engagement", params.service_provider_engagement);
    const qs = q.toString();
    const url = `/api/tasks/${qs ? `?${qs}` : ""}`;
    const data = await apiFetch(url);
    return Array.isArray(data) ? data : [];
}

export async function fetchTask(id) {
    return apiFetch(`/api/tasks/${id}/`);
}

export async function createTask(body) {
    return apiFetch("/api/tasks/", {
        method: "POST",
        needsCsrf: true,
        body,
    });
}

export async function updateTask(id, body) {
    return apiFetch(`/api/tasks/${id}/`, {
        method: "PATCH",
        needsCsrf: true,
        body,
    });
}

export async function deleteTask(id) {
    return apiFetch(`/api/tasks/${id}/`, {
        method: "DELETE",
        needsCsrf: true,
    });
}
