const API_BASE = "/api";

async function request(path, { method = "GET", body, token, companyId, userId } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (companyId) headers["X-Company-Id"] = companyId;
  if (userId) headers["X-User-Id"] = userId;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let detail = "";
    try {
      const data = await response.json();
      detail = data?.detail || JSON.stringify(data);
    } catch {
      detail = await response.text();
    }
    const error = new Error(detail || `${response.status} ${response.statusText}`);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) return null;
  return await response.json();
}

export const participantProtectionApi = {
  get: async ({ intakeId, token, companyId, userId }) =>
    request(`/v2/event-participant-protection/${encodeURIComponent(intakeId)}`, {
      token,
      companyId,
      userId,
    }),

  save: async ({ intakeId, payload, token, companyId, userId }) =>
    request(`/v2/event-participant-protection/${encodeURIComponent(intakeId)}`, {
      method: "PUT",
      body: payload,
      token,
      companyId,
      userId,
    }),

  participants: async ({ intakeId, token, companyId, userId }) =>
    request(`/v2/event-participant-protection/${encodeURIComponent(intakeId)}/participants`, {
      token,
      companyId,
      userId,
    }),

  publicEvent: async ({ publicToken }) =>
    request(`/v2/public/events/${encodeURIComponent(publicToken)}`),

  publicRegister: async ({ publicToken, payload }) =>
    request(`/v2/public/events/${encodeURIComponent(publicToken)}/participants`, {
      method: "POST",
      body: payload,
    }),
};
