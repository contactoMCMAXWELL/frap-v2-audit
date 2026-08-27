import { httpApi } from "../../lib/http";

function normalizeList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.value)) return data.value;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.roles)) return data.roles;
  return [];
}

export const v2AdminApi = {
  // =========================
  // SUPPLIES
  // =========================
  async suppliesList({ token, companyId, userId }) {
    const res = await httpApi("/v2/company-supplies/", {
      method: "GET",
      token,
      companyId,
      userId,
    });
    return normalizeList(res);
  },

  async suppliesCreate({ payload, token, companyId, userId }) {
    return httpApi("/v2/company-supplies/", {
      method: "POST",
      body: payload,
      token,
      companyId,
      userId,
    });
  },

  async suppliesPatch({ supplyId, payload, token, companyId, userId }) {
    return httpApi(`/v2/company-supplies/${encodeURIComponent(supplyId)}`, {
      method: "PATCH",
      body: payload,
      token,
      companyId,
      userId,
    });
  },

  // =========================
  // HOSPITAL CATALOG
  // =========================
  async hospitalsList({ token, companyId, userId }) {
    const res = await httpApi("/v2/hospital-catalog/", {
      method: "GET",
      token,
      companyId,
      userId,
    });
    return normalizeList(res);
  },

  async hospitalsCreate({ payload, token, companyId, userId }) {
    return httpApi("/v2/hospital-catalog/", {
      method: "POST",
      body: payload,
      token,
      companyId,
      userId,
    });
  },

  async hospitalsPatch({ hospitalId, payload, token, companyId, userId }) {
    return httpApi(`/v2/hospital-catalog/${encodeURIComponent(hospitalId)}`, {
      method: "PATCH",
      body: payload,
      token,
      companyId,
      userId,
    });
  },

  // =========================
  // MEDICATION CATALOG
  // =========================
  async medicationsPatch({ medicationId, payload, token, companyId, userId }) {
    return httpApi(`/v2/medication-catalog/${encodeURIComponent(medicationId)}`, {
      method: "PATCH",
      body: payload,
      token,
      companyId,
      userId,
    });
  },

  async medicationsCatalogList({ token, companyId, userId }) {
    const res = await httpApi("/v2/medication-catalog/", {
      method: "GET",
      token,
      companyId,
      userId,
    });
    return normalizeList(res);
  },

  async medicationsCatalogCreate({ payload, token, companyId, userId }) {
    return httpApi("/v2/medication-catalog/", {
      method: "POST",
      body: payload,
      token,
      companyId,
      userId,
    });
  },

  async medicationsList({ token, companyId, userId }) {
    const res = await httpApi("/v2/medication-catalog/", {
      method: "GET",
      token,
      companyId,
      userId,
    });
    return normalizeList(res);
  },

  async medicationsCreate({ payload, token, companyId, userId }) {
    return httpApi("/v2/medication-catalog/", {
      method: "POST",
      body: payload,
      token,
      companyId,
      userId,
    });
  },

  // =========================
  // PROCEDURE CATALOG
  // =========================
  async proceduresCatalogList({ token, companyId, userId }) {
    const res = await httpApi("/v2/procedure-catalog/", {
      method: "GET",
      token,
      companyId,
      userId,
    });
    return normalizeList(res);
  },

  async proceduresCatalogCreate({ payload, token, companyId, userId }) {
    return httpApi("/v2/procedure-catalog/", {
      method: "POST",
      body: payload,
      token,
      companyId,
      userId,
    });
  },

  async proceduresPatch({ procedureId, payload, token, companyId, userId }) {
    return httpApi(`/v2/procedure-catalog/${encodeURIComponent(procedureId)}`, {
      method: "PATCH",
      body: payload,
      token,
      companyId,
      userId,
    });
  },

  async proceduresList({ token, companyId, userId }) {
    const res = await httpApi("/v2/procedure-catalog/", {
      method: "GET",
      token,
      companyId,
      userId,
    });
    return normalizeList(res);
  },

  async proceduresCreate({ payload, token, companyId, userId }) {
    return httpApi("/v2/procedure-catalog/", {
      method: "POST",
      body: payload,
      token,
      companyId,
      userId,
    });
  },

  // =========================
  // ROLES
  // =========================
  async rolesList({ token, companyId, userId }) {
    const res = await httpApi("/v2/roles/", {
      method: "GET",
      token,
      companyId,
      userId,
    });
    return normalizeList(res);
  },

  async rolesMeta({ token, companyId, userId }) {
    return httpApi("/v2/roles/", {
      method: "GET",
      token,
      companyId,
      userId,
    });
  },

  async rolesMatrix({ token, companyId, userId }) {
    return httpApi("/v2/roles/matrix", {
      method: "GET",
      token,
      companyId,
      userId,
    });
  },

  // =========================
  // USERS
  // =========================
  async usersList({ token, companyId, userId }) {
    const qs = companyId ? `?company_id=${encodeURIComponent(companyId)}` : "";
    const res = await httpApi(`/admin/users${qs}`, {
      method: "GET",
      token,
      companyId,
      userId,
    });
    return normalizeList(res);
  },

  async usersCreate({ payload, token, companyId, userId }) {
    return httpApi("/admin/users", {
      method: "POST",
      body: payload,
      token,
      companyId,
      userId,
    });
  },

  async usersPatch({ userIdTarget, payload, token, companyId, userId }) {
    return httpApi(`/admin/users/${encodeURIComponent(userIdTarget)}`, {
      method: "PATCH",
      body: payload,
      token,
      companyId,
      userId,
    });
  },

  // =========================
  // COMPANIES
  // =========================
  async companiesList({ token, companyId, userId }) {
    const res = await httpApi("/admin/companies", {
      method: "GET",
      token,
      companyId,
      userId,
    });
    return normalizeList(res);
  },

  async companyCreate({ payload, token, companyId, userId }) {
    return httpApi("/admin/companies", {
      method: "POST",
      body: payload,
      token,
      companyId,
      userId,
    });
  },

  async companyGet({ companyIdTarget, token, companyId, userId }) {
    return httpApi(`/admin/companies/${encodeURIComponent(companyIdTarget)}`, {
      method: "GET",
      token,
      companyId,
      userId,
    });
  },

  async companyPatch({ companyIdTarget, payload, token, companyId, userId }) {
    return httpApi(`/admin/companies/${encodeURIComponent(companyIdTarget)}`, {
      method: "PATCH",
      body: payload,
      token,
      companyId,
      userId,
    });
  },

  // =========================
  // UNITS ADMIN V2
  // =========================
  async unitsAdminList({ token, companyId, userId }) {
    const res = await httpApi("/v2/units-admin/", {
      method: "GET",
      token,
      companyId,
      userId,
    });
    return normalizeList(res);
  },

  async unitsAdminCreate({ payload, token, companyId, userId }) {
    return httpApi("/v2/units-admin/", {
      method: "POST",
      body: payload,
      token,
      companyId,
      userId,
    });
  },

  async unitsAdminPatch({ unitId, payload, token, companyId, userId }) {
    return httpApi(`/v2/units-admin/${encodeURIComponent(unitId)}`, {
      method: "PATCH",
      body: payload,
      token,
      companyId,
      userId,
    });
  },

  async unitsList({ token, companyId, userId }) {
    const res = await httpApi("/v2/units-admin/", {
      method: "GET",
      token,
      companyId,
      userId,
    });
    return normalizeList(res);
  },

  async unitsCreate({ payload, token, companyId, userId }) {
    return httpApi("/v2/units-admin/", {
      method: "POST",
      body: payload,
      token,
      companyId,
      userId,
    });
  },
};