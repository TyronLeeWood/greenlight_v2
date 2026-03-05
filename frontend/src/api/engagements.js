import { apiFetch } from "./client";

export async function fetchEngagements(params = {}) {
    const q = new URLSearchParams();
    if (params.precinct) q.set("precinct", params.precinct);
    if (params.date) q.set("date", params.date);
    if (params.shift) q.set("shift", params.shift);
    if (params.service_provider) q.set("service_provider", params.service_provider);
    const qs = q.toString();
    const url = `/api/service-provider-engagements/${qs ? `?${qs}` : ""}`;
    const data = await apiFetch(url);
    return Array.isArray(data) ? data : [];
}

export async function fetchEngagement(id) {
    return apiFetch(`/api/service-provider-engagements/${id}/`);
}

export async function createEngagement(body) {
    return apiFetch("/api/service-provider-engagements/", {
        method: "POST",
        needsCsrf: true,
        body,
    });
}

export async function updateEngagement(id, body) {
    return apiFetch(`/api/service-provider-engagements/${id}/`, {
        method: "PATCH",
        needsCsrf: true,
        body,
    });
}

export async function deleteEngagement(id) {
    return apiFetch(`/api/service-provider-engagements/${id}/`, {
        method: "DELETE",
        needsCsrf: true,
    });
}

export async function fetchEngagementActivity(id) {
    const data = await apiFetch(`/api/service-provider-engagements/${id}/activity/`);
    return Array.isArray(data) ? data : [];
}

export async function addEngagementActivity(id, message) {
    return apiFetch(`/api/service-provider-engagements/${id}/activity/`, {
        method: "POST",
        needsCsrf: true,
        body: { message },
    });
}
