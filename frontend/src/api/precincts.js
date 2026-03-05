import { apiFetch } from "./client";

export async function fetchPrecincts() {
    const data = await apiFetch("/api/precincts/");
    return Array.isArray(data) ? data : [];
}

export async function createPrecinct(name, location) {
    return apiFetch("/api/precincts/", {
        method: "POST",
        needsCsrf: true,
        body: { name, location },
    });
}
