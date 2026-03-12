// src/lib/api.js
import { httpApi } from "./http";

/**
 * Soporta 2 formatos de listado:
 * 1) Array directo: [ {..}, {..} ]
 * 2) Wrapper: { value: [..], Count: n } (legacy)
 */
function normalizeList(payload) {
  if (!payload) return { value: [], Count: 0 };

  if (Array.isArray(payload)) {
    return { value: payload, Count: payload.length };
  }

  const value = Array.isArray(payload.value) ? payload.value : [];
  const Count =
    typeof payload.Count === "number"
      ? payload.Count
      : typeof payload.count === "number"
        ? payload.count
        : value.length;

  return { value, Count };
}

/**
 * Firma: compat con backends que acepten base64 "puro" o DataURL.
 */
function normalizeImageBase64(input) {
  const s = (input || "").trim();
  if (!s) return s;

  const m = s.match(/^data:([^;]+);base64,(.+)$/i);
  if (m && m[2]) return m[2].trim();

  return s;
}


function localIsoNow() {
  // Local timestamp with offset (matches laptop time)
  const d = new Date();
  const pad = (n, w = 2) => String(Math.floor(Math.abs(n))).padStart(w, "0");
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  const mss = pad(d.getMilliseconds(), 3);

  const offMin = -d.getTimezoneOffset();
  const sign = offMin >= 0 ? "+" : "-";
  const offAbs = Math.abs(offMin);
  const offH = pad(offAbs / 60);
  const offM = pad(offAbs % 60);

  return `${yyyy}-${MM}-${dd}T${hh}:${mm}:${ss}.${mss}${sign}${offH}:${offM}`;
}

/**
 * Normaliza role a los 3 permitidos por backend:
 * receptor | responsable | tripulacion
 */
function normalizeRole(role) {
  const r = String(role || "").trim().toLowerCase();
  if (!r) return r;

  if (r === "tripulación" || r === "tripulacion" || r === "crew" || r === "crew_member") return "tripulacion";
  if (r === "responsable" || r === "patient" || r === "paciente" || r === "owner") return "responsable";
  if (r === "receptor" || r === "receiver" || r === "hospital") return "receptor";

  return r;
}

const EVENT_TYPES = new Set(["vitals", "med", "procedure", "note", "milestone", "status"]);
function normalizeEventType(t) {
  const s = String(t || "").trim().toLowerCase();
  if (!s) return s;
  if (EVENT_TYPES.has(s)) return s;
  throw new Error(`Event type inválido: ${t}. Permitidos: vitals|med|procedure|note|milestone|status`);
}

export const api = {
  // ---------------- AUTH ----------------
  authLogin: async ({ username, email, password } = {}) => {
    const user = (username ?? email ?? "").trim();
    if (!user) throw new Error("Falta username/email");
    if (!password) throw new Error("Falta password");

    return await httpApi("/auth/login", {
      method: "POST",
      body: { username: user, password },
      headers: { "Content-Type": "application/json" },
    });
  },

  // ---------------- UNITS ----------------
  unitsList: async ({ limit = 200, token, companyId, userId } = {}) => {
    const qs = limit ? `?limit=${encodeURIComponent(limit)}` : "";
    const data = await httpApi(`/units/${qs}`, {
      method: "GET",
      token,
      companyId,
      userId,
    });
    return normalizeList(data);
  },



  // ---------------- SERVICES ----------------
  servicesList: async ({ limit = 80, token, companyId, userId } = {}) => {
    const qs = limit ? `?limit=${encodeURIComponent(limit)}` : "";
    const data = await httpApi(`/services/services/${qs}`, {
      method: "GET",
      token,
      companyId,
      userId,
    });
    return normalizeList(data);
  },

  serviceStatuses: async ({ token, companyId, userId } = {}) => {
    return await httpApi(`/services/services/statuses`, {
      method: "GET",
      token,
      companyId,
      userId,
    });
  },

  serviceCreate: async ({ payload, token, companyId, userId } = {}) => {
    if (!payload) throw new Error("Falta payload");
    if (payload.priority == null) throw new Error("Falta priority");
    if (!payload.service_type) throw new Error("Falta service_type");

    return await httpApi(`/services/services/`, {
      method: "POST",
      body: payload,
      headers: { "Content-Type": "application/json" },
      token,
      companyId,
      userId,
    });
  },

  serviceUpdateStatus: async ({ serviceId, status, token, companyId, userId } = {}) => {
    if (!serviceId) throw new Error("Falta serviceId");
    if (!status) throw new Error("Falta status");

    return await httpApi(`/services/services/${encodeURIComponent(serviceId)}/status`, {
      method: "POST",
      body: { status },
      headers: { "Content-Type": "application/json" },
      token,
      companyId,
      userId,
    });
  },

  // Asignar unidad a servicio
  serviceAssignUnit: async ({ serviceId, unitId, token, companyId, userId } = {}) => {
    if (!serviceId) throw new Error("Falta serviceId");
    if (!unitId) throw new Error("Falta unitId");

    return await httpApi(`/services/services/${encodeURIComponent(serviceId)}/assign-unit`, {
      method: "POST",
      body: { unit_id: unitId },
      headers: { "Content-Type": "application/json" },
      token,
      companyId,
      userId,
    });
  },



  // ---------------- FRAPS ----------------
  frapCreateFromService: async ({ serviceId, token, companyId, userId } = {}) => {
    if (!serviceId) throw new Error("Falta serviceId");

    return await httpApi(`/fraps/from-service/${encodeURIComponent(serviceId)}`, {
      method: "POST",
      body: {},
      headers: { "Content-Type": "application/json" },
      token,
      companyId,
      userId,
    });
  },

  frapGet: async ({ frapId, token, companyId, userId } = {}) => {
    if (!frapId) throw new Error("Falta frapId");

    return await httpApi(`/fraps/${encodeURIComponent(frapId)}`, {
      method: "GET",
      token,
      companyId,
      userId,
    });
  },

  frapPatchServiceSection: async ({ frapId, payload, token, companyId, userId } = {}) => {
    if (!frapId) throw new Error("Falta frapId");
    if (!payload) throw new Error("Falta payload");

    return await httpApi(`/fraps/${encodeURIComponent(frapId)}/sections/service`, {
      method: "PATCH",
      body: payload,
      headers: { "Content-Type": "application/json" },
      token,
      companyId,
      userId,
    });
  },


  frapPatchPatientSection: async ({ frapId, payload, token, companyId, userId } = {}) => {
    if (!frapId) throw new Error("Falta frapId");
    if (!payload) throw new Error("Falta payload");

    return await httpApi(`/fraps/${encodeURIComponent(frapId)}/sections/patient`, {
      method: "PATCH",
      body: payload,
      headers: { "Content-Type": "application/json" },
      token,
      companyId,
      userId,
    });
  },

  frapPatchTransportSection: async ({ frapId, payload, token, companyId, userId } = {}) => {
    if (!frapId) throw new Error("Falta frapId");
    if (!payload) throw new Error("Falta payload");

    return await httpApi(`/fraps/${encodeURIComponent(frapId)}/sections/transport`, {
      method: "PATCH",
      body: payload,
      headers: { "Content-Type": "application/json" },
      token,
      companyId,
      userId,
    });
  },

  frapEventsList: async ({ frapId, token, companyId, userId } = {}) => {
    if (!frapId) throw new Error("Falta frapId");

    const data = await httpApi(`/fraps/${encodeURIComponent(frapId)}/events`, {
      method: "GET",
      token,
      companyId,
      userId,
    });

    const norm = normalizeList(data);
    return Array.isArray(data) ? data : norm.value;
  },

  frapEventCreate: async ({ frapId, type, ts, data, token, companyId, userId } = {}) => {
    if (!frapId) throw new Error("Falta frapId");
    const t = normalizeEventType(type);

    const payload = {
      type: t,
      ts: ts || localIsoNow(),
      data: data ?? {},
    };

    return await httpApi(`/fraps/${encodeURIComponent(frapId)}/events`, {
      method: "POST",
      body: payload,
      headers: { "Content-Type": "application/json" },
      token,
      companyId,
      userId,
    });
  },

  frapSignaturesList: async ({ frapId, token, companyId, userId } = {}) => {
    if (!frapId) throw new Error("Falta frapId");

    return await httpApi(`/fraps/${encodeURIComponent(frapId)}/signatures`, {
      method: "GET",
      token,
      companyId,
      userId,
    });
  },

  frapSignatureUpsert: async (
    {
      frapId,
      role,
      image_base64,
      signer_name,
      device_id,
      geo_lat,
      geo_lng,
      geo_accuracy_m,

      imageBase64,
      signerName,
      deviceId,
      geoLat,
      geoLng,
      geoAccuracyM,

      token,
      companyId,
      userId,
    } = {}
  ) => {
    if (!frapId) throw new Error("Falta frapId");

    const r = normalizeRole(role);
    if (!r) throw new Error("Falta role (receptor|responsable|tripulacion)");

    const imgRaw = image_base64 ?? imageBase64 ?? "";
    const img = normalizeImageBase64(imgRaw);
    if (!img) throw new Error("Falta image_base64 (base64 o dataURL)");

    const body = {
      role: r,
      image_base64: img,
      signer_name: signer_name ?? signerName ?? null,
      device_id: device_id ?? deviceId ?? null,
      geo_lat: geo_lat ?? geoLat ?? null,
      geo_lng: geo_lng ?? geoLng ?? null,
      geo_accuracy_m: geo_accuracy_m ?? geoAccuracyM ?? null,
    };

    return await httpApi(`/fraps/${encodeURIComponent(frapId)}/signatures`, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/json" },
      token,
      companyId,
      userId,
    });
  },

  frapSign: async ({ frapId, role, payload, token, companyId, userId } = {}) => {
    const p = payload || {};
    return await api.frapSignatureUpsert({
      frapId,
      role,
      image_base64: p.image_base64,
      signer_name: p.signer_name,
      device_id: p.device_id,
      geo_lat: p.geo_lat,
      geo_lng: p.geo_lng,
      geo_accuracy_m: p.geo_accuracy_m,
      token,
      companyId,
      userId,
    });
  },

  frapLock: async ({ frapId, token, companyId, userId } = {}) => {
    if (!frapId) throw new Error("Falta frapId");

    return await httpApi(`/fraps/${encodeURIComponent(frapId)}/lock`, {
      method: "POST",
      body: {},
      headers: { "Content-Type": "application/json" },
      token,
      companyId,
      userId,
    });
  },

  // ---------------- ADMIN (SUPERADMIN) ----------------
  // ✅ Lista empresas (solo SUPERADMIN)
  adminCompaniesList: async ({ token, companyId, userId } = {}) => {
    const data = await httpApi(`/admin/companies`, {
      method: "GET",
      token,
      companyId,
      userId,
    });
    return normalizeList(data);
  },

  // ✅ Crear empresa (solo SUPERADMIN)
  adminCompanyCreate: async ({ payload, token, companyId, userId } = {}) => {
    if (!payload?.name) throw new Error("Falta name");
    if (!payload?.code) throw new Error("Falta code");

    return await httpApi(`/admin/companies`, {
      method: "POST",
      body: payload,
      headers: { "Content-Type": "application/json" },
      token,
      companyId,
      userId,
    });
  },
};