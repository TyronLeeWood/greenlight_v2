// Shared HTTP client — CSRF handling + JSON fetch wrapper

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
    return null;
}

export async function ensureCsrf() {
    await fetch("/api/auth/csrf/", { credentials: "include" });
    return getCookie("csrftoken");
}

export async function apiFetch(
    path,
    { method = "GET", body = null, needsCsrf = false } = {}
) {
    const headers = { "Content-Type": "application/json" };

    if (needsCsrf) {
        const csrfToken = getCookie("csrftoken") || (await ensureCsrf());
        if (!csrfToken)
            throw new Error("Missing CSRF token. Try logging in again.");
        headers["X-CSRFToken"] = csrfToken;
    }

    const res = await fetch(path, {
        method,
        headers,
        credentials: "include",
        body: body ? JSON.stringify(body) : null,
    });

    const text = await res.text();
    let data = null;
    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
    }

    if (!res.ok) {
        const msg =
            (data && data.detail) ||
            (typeof data === "string" ? data : JSON.stringify(data)) ||
            `Request failed: ${res.status}`;
        throw new Error(msg);
    }

    return data;
}
