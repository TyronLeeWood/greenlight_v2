import { apiFetch, ensureCsrf } from "./client";

export async function apiLogin(username, password) {
    await ensureCsrf();
    return apiFetch("/api/auth/session-login/", {
        method: "POST",
        needsCsrf: true,
        body: { username, password },
    });
}

export async function apiLogout() {
    return apiFetch("/api/auth/session-logout/", {
        method: "POST",
        needsCsrf: true,
        body: {},
    });
}
