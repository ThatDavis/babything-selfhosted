const BASE = import.meta.env.VITE_API_URL ?? '/api';
async function request(path, init) {
    const res = await fetch(`${BASE}${path}`, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            ...init?.headers,
        },
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Request failed');
    }
    return res.json();
}
export const api = {
    provision: (body) => request('/tenants', { method: 'POST', body: JSON.stringify(body) }),
    tenantStatus: (subdomain) => request(`/tenants/${subdomain}`),
};
