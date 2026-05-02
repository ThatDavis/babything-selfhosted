const BASE = import.meta.env.VITE_API_URL ?? '/api';
async function request(path, init) {
    const res = await fetch(`${BASE}${path}`, {
        ...init,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...init?.headers,
        },
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new ApiError(res.status, body.error ?? 'Request failed');
    }
    if (res.status === 204)
        return undefined;
    return res.json();
}
export class ApiError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
export const api = {
    auth: {
        setup: () => request('/auth/setup'),
        register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
        login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
        logout: () => request('/auth/logout', { method: 'POST' }),
        me: () => request('/auth/me'),
        invite: (body) => request('/auth/invite', { method: 'POST', body: JSON.stringify(body) }),
        getInvite: (token) => request(`/auth/invite/${token}`),
        acceptInvite: (token) => request(`/auth/invite/${token}/accept`, { method: 'POST' }),
        forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
        checkResetToken: (token) => request(`/auth/reset-password/${token}`),
        resetPassword: (token, password) => request(`/auth/reset-password/${token}`, { method: 'POST', body: JSON.stringify({ password }) }),
        oauthProviders: () => request('/auth/oauth-providers'),
        config: () => request('/auth/config'),
    },
    admin: {
        getSmtp: () => request('/admin/smtp'),
        saveSmtp: (body) => request('/admin/smtp', { method: 'PUT', body: JSON.stringify(body) }),
        testSmtp: (email) => request('/admin/smtp/test', { method: 'POST', body: JSON.stringify({ email }) }),
        getOAuthProviders: () => request('/admin/oauth-providers'),
        createOAuthProvider: (body) => request('/admin/oauth-providers', { method: 'POST', body: JSON.stringify(body) }),
        updateOAuthProvider: (id, body) => request(`/admin/oauth-providers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
        deleteOAuthProvider: (id) => request(`/admin/oauth-providers/${id}`, { method: 'DELETE' }),
        getUsers: () => request('/admin/users'),
        setAdmin: (id, isAdmin) => request(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify({ isAdmin }) }),
        deleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
        getBabies: () => request('/admin/babies'),
        assignBaby: (userId, babyId, role) => request(`/admin/users/${userId}/babies`, { method: 'POST', body: JSON.stringify({ babyId, role }) }),
        removeBaby: (userId, babyId) => request(`/admin/users/${userId}/babies/${babyId}`, { method: 'DELETE' }),
        seedTestData: () => request('/admin/seed', { method: 'POST' }),
    },
    babies: {
        list: () => request('/babies'),
        create: (body) => request('/babies', { method: 'POST', body: JSON.stringify(body) }),
        get: (id) => request(`/babies/${id}`),
        update: (id, body) => request(`/babies/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
        dashboard: (id) => request(`/babies/${id}/dashboard`),
        delete: (id) => request(`/babies/${id}`, { method: 'DELETE' }),
        removeCaregiver: (babyId, userId) => request(`/babies/${babyId}/caregivers/${userId}`, { method: 'DELETE' }),
    },
    feedings: {
        list: (babyId, cursor) => request(`/babies/${babyId}/feedings${cursor ? `?cursor=${cursor}` : ''}`),
        create: (babyId, body) => request(`/babies/${babyId}/feedings`, { method: 'POST', body: JSON.stringify(body) }),
        update: (babyId, id, body) => request(`/babies/${babyId}/feedings/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
        delete: (babyId, id) => request(`/babies/${babyId}/feedings/${id}`, { method: 'DELETE' }),
    },
    diapers: {
        list: (babyId, cursor) => request(`/babies/${babyId}/diapers${cursor ? `?cursor=${cursor}` : ''}`),
        create: (babyId, body) => request(`/babies/${babyId}/diapers`, { method: 'POST', body: JSON.stringify(body) }),
        update: (babyId, id, body) => request(`/babies/${babyId}/diapers/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
        delete: (babyId, id) => request(`/babies/${babyId}/diapers/${id}`, { method: 'DELETE' }),
    },
    sleep: {
        list: (babyId, cursor) => request(`/babies/${babyId}/sleep${cursor ? `?cursor=${cursor}` : ''}`),
        create: (babyId, body) => request(`/babies/${babyId}/sleep`, { method: 'POST', body: JSON.stringify(body) }),
        update: (babyId, id, body) => request(`/babies/${babyId}/sleep/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
        delete: (babyId, id) => request(`/babies/${babyId}/sleep/${id}`, { method: 'DELETE' }),
    },
    events: {
        list: (babyId, before) => request(`/babies/${babyId}/events${before ? `?before=${before}` : ''}`),
    },
    growth: {
        list: (babyId) => request(`/babies/${babyId}/growth`),
        create: (babyId, body) => request(`/babies/${babyId}/growth`, { method: 'POST', body: JSON.stringify(body) }),
        delete: (babyId, id) => request(`/babies/${babyId}/growth/${id}`, { method: 'DELETE' }),
    },
    medications: {
        list: (babyId) => request(`/babies/${babyId}/medications`),
        create: (babyId, body) => request(`/babies/${babyId}/medications`, { method: 'POST', body: JSON.stringify(body) }),
        delete: (babyId, id) => request(`/babies/${babyId}/medications/${id}`, { method: 'DELETE' }),
    },
    milestones: {
        list: (babyId) => request(`/babies/${babyId}/milestones`),
        create: (babyId, body) => request(`/babies/${babyId}/milestones`, { method: 'POST', body: JSON.stringify(body) }),
        delete: (babyId, id) => request(`/babies/${babyId}/milestones/${id}`, { method: 'DELETE' }),
    },
    appointments: {
        list: (babyId) => request(`/babies/${babyId}/appointments`),
        create: (babyId, body) => request(`/babies/${babyId}/appointments`, { method: 'POST', body: JSON.stringify(body) }),
        delete: (babyId, id) => request(`/babies/${babyId}/appointments/${id}`, { method: 'DELETE' }),
    },
    vaccines: {
        list: (babyId) => request(`/babies/${babyId}/vaccines`),
        create: (babyId, body) => request(`/babies/${babyId}/vaccines`, { method: 'POST', body: JSON.stringify(body) }),
        delete: (babyId, id) => request(`/babies/${babyId}/vaccines/${id}`, { method: 'DELETE' }),
    },
    settings: {
        get: () => request('/admin/settings'),
        save: (body) => request('/admin/settings', { method: 'PUT', body: JSON.stringify(body) }),
    },
    stats: {
        get: (babyId) => request(`/babies/${babyId}/stats`),
    },
    reports: {
        download: async (babyId, opts) => {
            const params = new URLSearchParams();
            if (opts.since)
                params.set('since', opts.since);
            if (opts.sections?.length)
                params.set('sections', opts.sections.join(','));
            const res = await fetch(`/api/babies/${babyId}/report?${params}`, {
                credentials: 'include',
            });
            if (!res.ok)
                throw new ApiError(res.status, 'Failed to generate report');
            return res.blob();
        },
        email: (babyId, body) => request(`/babies/${babyId}/report/email`, { method: 'POST', body: JSON.stringify(body) }),
        export: async (babyId, opts) => {
            const params = new URLSearchParams();
            if (opts.from)
                params.set('from', opts.from);
            if (opts.to)
                params.set('to', opts.to);
            const res = await fetch(`/api/babies/${babyId}/export?${params}`, {
                credentials: 'include',
            });
            if (!res.ok)
                throw new ApiError(res.status, 'Failed to export data');
            return res.blob();
        },
    },
};
