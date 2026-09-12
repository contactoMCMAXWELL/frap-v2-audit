const API_BASE = "/api";

async function httpApi(
  path,
  { method = "GET", body, headers = {}, token, companyId, userId } = {}
) {
  const finalHeaders = {
    ...headers,
  };

  if (token) finalHeaders["Authorization"] = `Bearer ${token}`;
  if (companyId) finalHeaders["X-Company-Id"] = companyId;
  if (userId) finalHeaders["X-User-Id"] = userId;

  if (body && !finalHeaders["Content-Type"]) {
    finalHeaders["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: finalHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type") || "";
    let detail = "";
    let data = null;

    try {
      if (contentType.includes("application/json")) {
        data = await response.json();
        detail = data?.detail || JSON.stringify(data);
      } else {
        detail = await response.text();
      }
    } catch {
      detail = "";
    }

    const err = new Error(
      detail || `${response.status} ${response.statusText}`
    );
    err.status = response.status;
    err.data = data;
    throw err;
  }

  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return await response.json();
  }

  return await response.text();
}

export const v2Api = {
  companyLicensesList: async ({ token, companyId, userId } = {}) => {
    return await httpApi(`/v2/company-licenses/`, {
      method: "GET",
      token,
      companyId,
      userId,
    });
  },

  serviceIntakeList: async ({ token, companyId, userId } = {}) => {
    return await httpApi(`/v2/service-intake/`, {
      method: "GET",
      token,
      companyId,
      userId,
    });
  },

  serviceIntakeBoard: async ({ token, companyId, userId } = {}) => {
    return await httpApi(`/v2/service-intake/board`, {
      method: "GET",
      token,
      companyId,
      userId,
    });
  },

  serviceIntakeCreate: async ({ payload, token, companyId, userId } = {}) => {
    return await httpApi(`/v2/service-intake/`, {
      method: "POST",
      body: payload,
      token,
      companyId,
      userId,
    });
  },

  serviceIntakeGet: async ({ intakeId, token, companyId, userId } = {}) => {
    if (!intakeId) {
      throw new Error("serviceIntakeGet requires intakeId");
    }

    return await httpApi(`/v2/service-intake/${encodeURIComponent(intakeId)}`, {
      method: "GET",
      token,
      companyId,
      userId,
    });
  },

  intakeTimeline: async ({ intakeId, token, companyId, userId } = {}) => {
    if (!intakeId) {
      throw new Error("intakeTimeline requires intakeId");
    }

    return await httpApi(`/v2/timeline/intake/${encodeURIComponent(intakeId)}`, {
      method: "GET",
      token,
      companyId,
      userId,
    });
  },

  dispatchEventsList: async ({ intakeId, token, companyId, userId } = {}) => {
    if (!intakeId) {
      throw new Error("dispatchEventsList requires intakeId");
    }

    return await httpApi(
      `/v2/service-dispatch-events/${encodeURIComponent(intakeId)}`,
      {
        method: "GET",
        token,
        companyId,
        userId,
      }
    );
  },

  dispatchEventCreate: async ({ payload, token, companyId, userId } = {}) => {
    return await httpApi(`/v2/service-dispatch-events/`, {
      method: "POST",
      body: payload,
      token,
      companyId,
      userId,
    });
  },

  unitsAdminList: async ({ token, companyId, userId } = {}) => {
    return await httpApi(`/v2/units-admin/`, {
      method: "GET",
      token,
      companyId,
      userId,
    });
  },

  companySuppliesList: async ({ token, companyId, userId } = {}) => {
    return await httpApi(`/v2/company-supplies/`, {
      method: "GET",
      token,
      companyId,
      userId,
    });
  },

  serviceSuppliesList: async ({ intakeId, token, companyId, userId } = {}) => {
    if (!intakeId) {
      throw new Error("serviceSuppliesList requires intakeId");
    }

    return await httpApi(
      `/v2/service-supplies/${encodeURIComponent(intakeId)}`,
      {
        method: "GET",
        token,
        companyId,
        userId,
      }
    );
  },

  serviceSupplyCreate: async ({ payload, token, companyId, userId } = {}) => {
    return await httpApi(`/v2/service-supplies/`, {
      method: "POST",
      body: payload,
      token,
      companyId,
      userId,
    });
  },

  serviceSuppliesCreate: async ({ payload, token, companyId, userId } = {}) => {
    return await httpApi(`/v2/service-supplies/`, {
      method: "POST",
      body: payload,
      token,
      companyId,
      userId,
    });
  },

  serviceFinancialGet: async ({ intakeId, token, companyId, userId } = {}) => {
    if (!intakeId) {
      throw new Error("serviceFinancialGet requires intakeId");
    }

    return await httpApi(
      `/v2/service-financials/${encodeURIComponent(intakeId)}`,
      {
        method: "GET",
        token,
        companyId,
        userId,
      }
    );
  },

  serviceFinancialSave: async ({ payload, token, companyId, userId } = {}) => {
    return await httpApi(`/v2/service-financials/`, {
      method: "PUT",
      body: payload,
      token,
      companyId,
      userId,
    });
  },

  serviceFinancialUpsert: async ({ payload, token, companyId, userId } = {}) => {
    return await httpApi(`/v2/service-financials/`, {
      method: "PUT",
      body: payload,
      token,
      companyId,
      userId,
    });
  },

  frapClinicalGet: async ({ intakeId, token, companyId, userId } = {}) => {
    if (!intakeId) {
      throw new Error("frapClinicalGet requires intakeId");
    }

    return await httpApi(`/v2/frap-clinical/${encodeURIComponent(intakeId)}`, {
      method: "GET",
      token,
      companyId,
      userId,
    });
  },

  frapClinicalSave: async ({ payload, token, companyId, userId } = {}) => {
    return await httpApi(`/v2/frap-clinical/`, {
      method: "PUT",
      body: payload,
      token,
      companyId,
      userId,
    });
  },

  frapClinicalUpsert: async ({ payload, token, companyId, userId } = {}) => {
    return await httpApi(`/v2/frap-clinical/`, {
      method: "PUT",
      body: payload,
      token,
      companyId,
      userId,
    });
  },

  vitalSignsList: async ({ intakeId, token, companyId, userId } = {}) => {
    if (!intakeId) {
      throw new Error("vitalSignsList requires intakeId");
    }

    return await httpApi(
      `/v2/frap-vital-signs/${encodeURIComponent(intakeId)}`,
      {
        method: "GET",
        token,
        companyId,
        userId,
      }
    );
  },

  vitalSignsCreate: async ({ payload, token, companyId, userId } = {}) => {
    return await httpApi(`/v2/frap-vital-signs/`, {
      method: "POST",
      body: payload,
      token,
      companyId,
      userId,
    });
  },

  frapVitalSignsList: async ({ intakeId, token, companyId, userId } = {}) => {
    if (!intakeId) {
      throw new Error("frapVitalSignsList requires intakeId");
    }

    return await httpApi(
      `/v2/frap-vital-signs/${encodeURIComponent(intakeId)}`,
      {
        method: "GET",
        token,
        companyId,
        userId,
      }
    );
  },

  frapVitalSignCreate: async ({ payload, token, companyId, userId } = {}) => {
    return await httpApi(`/v2/frap-vital-signs/`, {
      method: "POST",
      body: payload,
      token,
      companyId,
      userId,
    });
  },

  proceduresList: async ({ intakeId, token, companyId, userId } = {}) => {
    if (!intakeId) {
      throw new Error("proceduresList requires intakeId");
    }

    return await httpApi(
      `/v2/frap-procedures/${encodeURIComponent(intakeId)}`,
      {
        method: "GET",
        token,
        companyId,
        userId,
      }
    );
  },

  proceduresCreate: async ({ payload, token, companyId, userId } = {}) => {
    return await httpApi(`/v2/frap-procedures/`, {
      method: "POST",
      body: payload,
      token,
      companyId,
      userId,
    });
  },

  frapProceduresList: async ({ intakeId, token, companyId, userId } = {}) => {
    if (!intakeId) {
      throw new Error("frapProceduresList requires intakeId");
    }

    return await httpApi(
      `/v2/frap-procedures/${encodeURIComponent(intakeId)}`,
      {
        method: "GET",
        token,
        companyId,
        userId,
      }
    );
  },

  frapProcedureCreate: async ({ payload, token, companyId, userId } = {}) => {
    return await httpApi(`/v2/frap-procedures/`, {
      method: "POST",
      body: payload,
      token,
      companyId,
      userId,
    });
  },

  medicationsList: async ({ intakeId, token, companyId, userId } = {}) => {
    if (!intakeId) {
      throw new Error("medicationsList requires intakeId");
    }

    return await httpApi(
      `/v2/frap-medications/${encodeURIComponent(intakeId)}`,
      {
        method: "GET",
        token,
        companyId,
        userId,
      }
    );
  },

  medicationsCreate: async ({ payload, token, companyId, userId } = {}) => {
    return await httpApi(`/v2/frap-medications/`, {
      method: "POST",
      body: payload,
      token,
      companyId,
      userId,
    });
  },

  frapMedicationsList: async ({ intakeId, token, companyId, userId } = {}) => {
    if (!intakeId) {
      throw new Error("frapMedicationsList requires intakeId");
    }

    return await httpApi(
      `/v2/frap-medications/${encodeURIComponent(intakeId)}`,
      {
        method: "GET",
        token,
        companyId,
        userId,
      }
    );
  },

  frapMedicationCreate: async ({ payload, token, companyId, userId } = {}) => {
    return await httpApi(`/v2/frap-medications/`, {
      method: "POST",
      body: payload,
      token,
      companyId,
      userId,
    });
  },

  traumaGet: async ({ intakeId, token, companyId, userId } = {}) => {
    if (!intakeId) {
      throw new Error("traumaGet requires intakeId");
    }

    return await httpApi(`/v2/frap-trauma/${encodeURIComponent(intakeId)}`, {
      method: "GET",
      token,
      companyId,
      userId,
    });
  },

  traumaSave: async ({ payload, token, companyId, userId } = {}) => {
    return await httpApi(`/v2/frap-trauma/`, {
      method: "PUT",
      body: payload,
      token,
      companyId,
      userId,
    });
  },

  frapTraumaGet: async ({ intakeId, token, companyId, userId } = {}) => {
    if (!intakeId) {
      throw new Error("frapTraumaGet requires intakeId");
    }

    return await httpApi(`/v2/frap-trauma/${encodeURIComponent(intakeId)}`, {
      method: "GET",
      token,
      companyId,
      userId,
    });
  },

  frapTraumaUpsert: async ({ payload, token, companyId, userId } = {}) => {
    return await httpApi(`/v2/frap-trauma/`, {
      method: "PUT",
      body: payload,
      token,
      companyId,
      userId,
    });
  },

  refusalGet: async ({ intakeId, token, companyId, userId } = {}) => {
    if (!intakeId) {
      throw new Error("refusalGet requires intakeId");
    }

    return await httpApi(`/v2/frap-refusal/${encodeURIComponent(intakeId)}`, {
      method: "GET",
      token,
      companyId,
      userId,
    });
  },

  refusalSave: async ({ payload, token, companyId, userId } = {}) => {
    return await httpApi(`/v2/frap-refusal/`, {
      method: "PUT",
      body: payload,
      token,
      companyId,
      userId,
    });
  },

  frapRefusalGet: async ({ intakeId, token, companyId, userId } = {}) => {
    if (!intakeId) {
      throw new Error("frapRefusalGet requires intakeId");
    }

    return await httpApi(`/v2/frap-refusal/${encodeURIComponent(intakeId)}`, {
      method: "GET",
      token,
      companyId,
      userId,
    });
  },

  frapRefusalUpsert: async ({ payload, token, companyId, userId } = {}) => {
    return await httpApi(`/v2/frap-refusal/`, {
      method: "PUT",
      body: payload,
      token,
      companyId,
      userId,
    });
  },

  getAssessment: async ({ intakeId, token, companyId, userId } = {}) => {
    if (!intakeId) {
      throw new Error("getAssessment requiere intakeId");
    }

    return await httpApi(`/v2/frap-assessment/${encodeURIComponent(intakeId)}`, {
      method: "GET",
      token,
      companyId,
      userId,
    });
  },

  saveAssessment: async ({ payload, token, companyId, userId } = {}) => {
    if (!payload) {
      throw new Error("saveAssessment requiere payload");
    }

    const intakeId = payload?.intake_id;
    if (!intakeId) {
      throw new Error("saveAssessment requiere payload.intake_id");
    }

    const cleanPayload = { ...payload };
    delete cleanPayload.intake_id;

    return await httpApi(`/v2/frap-assessment/${encodeURIComponent(intakeId)}`, {
      method: "PUT",
      body: cleanPayload,
      token,
      companyId,
      userId,
    });
  },

  bodyMapGet: async ({ intakeId, token, companyId, userId } = {}) => {
    if (!intakeId) {
      throw new Error("bodyMapGet requires intakeId");
    }

    return await httpApi(`/v2/frap-body-map/${encodeURIComponent(intakeId)}`, {
      method: "GET",
      token,
      companyId,
      userId,
    });
  },

  bodyMapUpsert: async ({ intakeId, payload, token, companyId, userId } = {}) => {
    if (!intakeId) {
      throw new Error("bodyMapUpsert requires intakeId");
    }

    if (!payload) {
      throw new Error("bodyMapUpsert requires payload");
    }

    return await httpApi(`/v2/frap-body-map/${encodeURIComponent(intakeId)}`, {
      method: "PUT",
      body: payload,
      token,
      companyId,
      userId,
    });
  },



  hospitalCatalogList: async ({ token, companyId, userId } = {}) => {
    return await httpApi(`/v2/hospital-catalog/`, {
      method: "GET",
      token,
      companyId,
      userId,
    });
  },

  frapHandoffGet: async ({ intakeId, token, companyId, userId } = {}) => {
    if (!intakeId) {
      throw new Error("frapHandoffGet requires intakeId");
    }

    return await httpApi(`/v2/frap-handoff/${encodeURIComponent(intakeId)}`, {
      method: "GET",
      token,
      companyId,
      userId,
    });
  },

  frapHandoffSave: async ({ payload, token, companyId, userId } = {}) => {
    return await httpApi(`/v2/frap-handoff/`, {
      method: "PUT",
      body: payload,
      token,
      companyId,
      userId,
    });
  },

  frapPediatricsGet: async ({ intakeId, token, companyId, userId } = {}) => {
    if (!intakeId) {
      throw new Error("frapPediatricsGet requires intakeId");
    }

    return await httpApi(`/v2/frap-pediatrics/${encodeURIComponent(intakeId)}`, {
      method: "GET",
      token,
      companyId,
      userId,
    });
  },

  frapPediatricsUpsert: async ({ payload, token, companyId, userId } = {}) => {
    if (!payload) {
      throw new Error("frapPediatricsUpsert requires payload");
    }

    return await httpApi(`/v2/frap-pediatrics/`, {
      method: "PUT",
      body: payload,
      token,
      companyId,
      userId,
    });
  },

  frapCardioGet: async ({ intakeId, token, companyId, userId } = {}) => {
    if (!intakeId) {
      throw new Error("frapCardioGet requires intakeId");
    }

    return await httpApi(`/v2/frap-cardio/${encodeURIComponent(intakeId)}`, {
      method: "GET",
      token,
      companyId,
      userId,
    });
  },

  frapCardioUpsert: async ({ payload, token, companyId, userId } = {}) => {
    if (!payload) {
      throw new Error("frapCardioUpsert requires payload");
    }

    return await httpApi(`/v2/frap-cardio/`, {
      method: "PUT",
      body: payload,
      token,
      companyId,
      userId,
    });
  },

  frapPregnancyGet: async ({ intakeId, token, companyId, userId } = {}) => {
    if (!intakeId) {
      throw new Error("frapPregnancyGet requires intakeId");
    }

    return await httpApi(`/v2/frap-pregnancy/${encodeURIComponent(intakeId)}`, {
      method: "GET",
      token,
      companyId,
      userId,
    });
  },

  frapPregnancyUpsert: async ({ payload, token, companyId, userId } = {}) => {
    if (!payload) {
      throw new Error("frapPregnancyUpsert requires payload");
    }

    return await httpApi(`/v2/frap-pregnancy/`, {
      method: "PUT",
      body: payload,
      token,
      companyId,
      userId,
    });
  },

  companyPdfConfigGet: async ({ token, companyId, userId } = {}) => {
    return await httpApi(`/v2/company-pdf-config/`, {
      method: "GET",
      token,
      companyId,
      userId,
    });
  },

  companyPdfConfigUpsert: async ({ payload, token, companyId, userId } = {}) => {
    if (!payload) {
      throw new Error("companyPdfConfigUpsert requires payload");
    }

    return await httpApi(`/v2/company-pdf-config/`, {
      method: "PUT",
      body: payload,
      token,
      companyId,
      userId,
    });
  },

  companyPrivacyNoticesList: async ({ token, companyId, userId } = {}) => {
    return await httpApi(`/v2/company-privacy-notices`, {
      method: "GET",
      token,
      companyId,
      userId,
    });
  },

  companyPrivacyNoticePublishFromPdfConfig: async ({
    token,
    companyId,
    userId,
  } = {}) => {
    return await httpApi(`/v2/company-privacy-notices/publish-from-pdf-config`, {
      method: "POST",
      token,
      companyId,
      userId,
    });
  },

  frapSignaturesGet: async ({ intakeId, token, companyId, userId } = {}) => {
    if (!intakeId) {
      throw new Error("frapSignaturesGet requires intakeId");
    }

    return await httpApi(`/v2/frap-signatures/${encodeURIComponent(intakeId)}`, {
      method: "GET",
      token,
      companyId,
      userId,
    });
  },

  frapSignatureSave: async ({ payload, token, companyId, userId } = {}) => {
    return await httpApi(`/v2/frap-signatures/`, {
      method: "PUT",
      body: payload,
      token,
      companyId,
      userId,
    });
  },

  frapSignaturesValidation: async ({ intakeId, token, companyId, userId } = {}) => {
    if (!intakeId) {
      throw new Error("frapSignaturesValidation requires intakeId");
    }

    return await httpApi(
      `/v2/frap-signatures/${encodeURIComponent(intakeId)}/validation`,
      {
        method: "GET",
        token,
        companyId,
        userId,
      }
    );
  },


  adminDashboardSummary: async ({ startDate, endDate, token, companyId, userId } = {}) => {
    const qs = new URLSearchParams();
    if (startDate) qs.set("start_date", startDate);
    if (endDate) qs.set("end_date", endDate);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return await httpApi(`/v2/admin-dashboard/summary${suffix}`, { method: "GET", token, companyId, userId });
  },

  adminDashboardOperations: async ({ startDate, endDate, token, companyId, userId } = {}) => {
    const qs = new URLSearchParams();
    if (startDate) qs.set("start_date", startDate);
    if (endDate) qs.set("end_date", endDate);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return await httpApi(`/v2/admin-dashboard/operations${suffix}`, { method: "GET", token, companyId, userId });
  },

  adminDashboardClinical: async ({ startDate, endDate, token, companyId, userId } = {}) => {
    const qs = new URLSearchParams();
    if (startDate) qs.set("start_date", startDate);
    if (endDate) qs.set("end_date", endDate);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return await httpApi(`/v2/admin-dashboard/clinical${suffix}`, { method: "GET", token, companyId, userId });
  },

  adminDashboardDocumental: async ({ startDate, endDate, token, companyId, userId } = {}) => {
    const qs = new URLSearchParams();
    if (startDate) qs.set("start_date", startDate);
    if (endDate) qs.set("end_date", endDate);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return await httpApi(`/v2/admin-dashboard/documental${suffix}`, { method: "GET", token, companyId, userId });
  },

  adminDashboardFinancial: async ({ startDate, endDate, token, companyId, userId } = {}) => {
    const qs = new URLSearchParams();
    if (startDate) qs.set("start_date", startDate);
    if (endDate) qs.set("end_date", endDate);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return await httpApi(`/v2/admin-dashboard/financial${suffix}`, { method: "GET", token, companyId, userId });
  },

  adminDashboardTimeseries: async ({ startDate, endDate, token, companyId, userId } = {}) => {
    const qs = new URLSearchParams();
    if (startDate) qs.set("start_date", startDate);
    if (endDate) qs.set("end_date", endDate);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return await httpApi(`/v2/admin-dashboard/timeseries${suffix}`, { method: "GET", token, companyId, userId });
  },
};

export { httpApi };