const API_BASE = "/api";

async function request(
  path,
  { method = "GET", body, token, companyId, userId } = {}
) {
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

    const error = new Error(
      detail || `${response.status} ${response.statusText}`
    );

    error.status = response.status;
    throw error;
  }

  if (response.status === 204) return null;

  return await response.json();
}

async function uploadRequest(
  path,
  {
    file,
    intakeId,
    kind,
    token,
    companyId,
    userId,
  }
) {
  const headers = {};

  if (token) headers.Authorization = `Bearer ${token}`;
  if (companyId) headers["X-Company-Id"] = companyId;
  if (userId) headers["X-User-Id"] = userId;

  const formData = new FormData();

  formData.append("intake_id", intakeId);
  formData.append("kind", kind);
  formData.append("file", file);

  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    let detail = "";

    try {
      const data = await response.json();
      detail = data?.detail || JSON.stringify(data);
    } catch {
      detail = await response.text();
    }

    const error = new Error(
      detail || `${response.status} ${response.statusText}`
    );

    error.status = response.status;
    throw error;
  }

  return await response.json();
}

export const participantProtectionApi = {
  get: async ({
    intakeId,
    token,
    companyId,
    userId,
  }) =>
    request(
      `/v2/event-participant-protection/${encodeURIComponent(
        intakeId
      )}`,
      {
        token,
        companyId,
        userId,
      }
    ),

  uploadEventImage: async ({
    intakeId,
    kind,
    file,
    token,
    companyId,
    userId,
  }) =>
    uploadRequest(
      "/v2/media/event-images",
      {
        file,
        intakeId,
        kind,
        token,
        companyId,
        userId,
      }
    ),

  save: async ({
    intakeId,
    payload,
    token,
    companyId,
    userId,
  }) =>
    request(
      `/v2/event-participant-protection/${encodeURIComponent(
        intakeId
      )}`,
      {
        method: "PUT",
        body: payload,
        token,
        companyId,
        userId,
      }
    ),

  participants: async ({
    intakeId,
    token,
    companyId,
    userId,
  }) =>
    request(
      `/v2/event-participant-protection/${encodeURIComponent(
        intakeId
      )}/participants`,
      {
        token,
        companyId,
        userId,
      }
    ),
  qrPrint: async ({
    intakeId,
    participantId,
    token,
    companyId,
    userId,
  }) =>
    request(
      `/v2/event-participant-protection/${encodeURIComponent(
        intakeId
      )}/participants/${encodeURIComponent(
        participantId
      )}/qr-print`,
      {
        token,
        companyId,
        userId,
      }
    ),
  medicalProfile: async ({
    intakeId,
    participantId,
    token,
    companyId,
    userId,
  }) =>
    request(
      `/v2/event-participant-protection/${encodeURIComponent(
        intakeId
      )}/participants/${encodeURIComponent(
        participantId
      )}/medical-profile`,
      {
        token,
        companyId,
        userId,
      }
    ),

  linkService: async ({
    intakeId,
    participantId,
    serviceIntakeId,
    token,
    companyId,
    userId,
  }) =>
    request(
      `/v2/event-participant-protection/${encodeURIComponent(
        intakeId
      )}/participant-service-links`,
      {
        method: "POST",
        body: {
          participant_id: participantId,
          intake_id: serviceIntakeId,
        },
        token,
        companyId,
        userId,
      }
    ),

  publicEvent: async ({
    publicToken,
  }) =>
    request(
      `/v2/public/events/${encodeURIComponent(
        publicToken
      )}`
    ),

  publicPrivacyNotice: async ({
    publicToken,
  }) =>
    request(
      `/v2/public/events/${encodeURIComponent(
        publicToken
      )}/privacy-notice`
    ),

  publicRegister: async ({
    publicToken,
    payload,
  }) =>
    request(
      `/v2/public/events/${encodeURIComponent(
        publicToken
      )}/participants`,
      {
        method: "POST",
        body: payload,
      }
    ),

  publicParticipant: async ({
    publicToken,
    participantToken,
  }) =>
    request(
      `/v2/public/events/${encodeURIComponent(
        publicToken
      )}/participants/${encodeURIComponent(
        participantToken
      )}`
    ),

  publicComplete: async ({
    publicToken,
    participantToken,
    payload,
  }) =>
    request(
      `/v2/public/events/${encodeURIComponent(
        publicToken
      )}/participants/${encodeURIComponent(
        participantToken
      )}/complete`,
      {
        method: "PUT",
        body: payload,
      }
    ),
  publicQrValidate: async ({
    qrToken,
  }) =>
    request(
      `/v2/public/participant-qr/${encodeURIComponent(
        qrToken
      )}`
    ),

  resolveQr: async ({
    qrToken,
    token,
    companyId,
    userId,
  }) =>
    request(
      `/v2/event-participant-protection/participant-qr/${encodeURIComponent(
        qrToken
      )}`,
      {
        token,
        companyId,
        userId,
      }
    ),
};
