const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("authentix_token");
}

async function apiFetch(path: string, options: RequestInit = {}) {
    const token = getToken();
    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "API Error");
    return data;
}

export const api = {
    // Auth
    register: (body: { name: string; email: string; password: string }) =>
        apiFetch("/auth/register", { method: "POST", body: JSON.stringify(body) }),
    login: (body: { email: string; password: string }) =>
        apiFetch("/auth/login", { method: "POST", body: JSON.stringify(body) }),
    me: () => apiFetch("/auth/me"),

    // Analysis
    analyze: (text: string) =>
        apiFetch("/analyze", { method: "POST", body: JSON.stringify({ text }) }),
    humanize: (text: string) =>
        apiFetch("/humanize", { method: "POST", body: JSON.stringify({ text }) }),
    fullReport: (text: string) =>
        apiFetch("/full-report", { method: "POST", body: JSON.stringify({ text }) }),

    // Upload
    upload: (file: File) => {
        const form = new FormData();
        form.append("file", file);
        const token = getToken();
        return fetch(`${API_URL}/upload`, {
            method: "POST",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: form,
        }).then((r) => r.json());
    },

    // Jobs
    getJob: (jobId: string) => apiFetch(`/jobs/${jobId}`),
    listJobs: () => apiFetch("/jobs"),
};
