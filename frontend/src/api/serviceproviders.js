import { apiFetch } from "./client";

export async function fetchServiceProviders(params = {}) {
    const q = new URLSearchParams();
    if (params.provider_type) q.set("provider_type", params.provider_type);
    const qs = q.toString();
    const url = `/api/serviceproviders/${qs ? `?${qs}` : ""}`;
    const data = await apiFetch(url);
    return Array.isArray(data) ? data : [];
}

export async function fetchServiceProvider(id) {
    return apiFetch(`/api/serviceproviders/${id}/`);
}

export async function createServiceProvider(body) {
    return apiFetch("/api/serviceproviders/", {
        method: "POST",
        needsCsrf: true,
        body,
    });
}

export async function updateServiceProvider(id, body) {
    return apiFetch(`/api/serviceproviders/${id}/`, {
        method: "PATCH",
        needsCsrf: true,
        body,
    });
}

export async function deleteServiceProvider(id) {
    return apiFetch(`/api/serviceproviders/${id}/`, {
        method: "DELETE",
        needsCsrf: true,
    });
}
