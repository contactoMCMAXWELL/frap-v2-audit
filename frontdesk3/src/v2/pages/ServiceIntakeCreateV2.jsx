import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { localInputToIso } from "../../utils/datetime";
import { v2Api } from "../api/v2";

const initialState = {
  capture_mode: "realtime",
  occurred_at: "",
  retrospective_reason: "",
  service_type: "",
  service_subtype: "",
  priority_operational: 1,
  priority_clinical: "routine",
  call_source: "",
  caller_name: "",
  caller_phone: "",
  location_text: "",
  location_reference: "",
  lat: "",
  lng: "",
  patient_count_estimated: 1,
  scene_risk: "unknown",
  destination_suggested: "",
  payer_type: "private",
  notes: "",
};

export default function ServiceIntakeCreateV2({ session }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialState);

  const normalizedRole = String(session?.role || "").trim().toUpperCase();
  const canCreateRetrospective =
    normalizedRole === "ADMIN" || normalizedRole === "SUPERADMIN";
  const isRetrospective =
    canCreateRetrospective && form.capture_mode === "retrospective";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  const onChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Este navegador no soporta geolocalización.");
      return;
    }

    setGeoLoading(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange("lat", String(pos.coords.latitude));
        onChange("lng", String(pos.coords.longitude));
        setGeoLoading(false);
      },
      () => {
        setError("No fue posible obtener la ubicación actual.");
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const onSubmit = async (e) => {
  e.preventDefault();

  try {
    setLoading(true);
    setError("");

    if (isRetrospective && !form.occurred_at) {
      setError("La fecha y hora del servicio son obligatorias para una captura retrospectiva.");
      return;
    }

    const {
      capture_mode,
      occurred_at,
      retrospective_reason,
      ...serviceFields
    } = form;

    const payload = {
      ...serviceFields,
      capture_mode: isRetrospective ? "retrospective" : "realtime",
      priority_operational: Number(form.priority_operational || 1),
      patient_count_estimated: Number(form.patient_count_estimated || 1),
      lat: form.lat ? String(form.lat) : "",
      lng: form.lng ? String(form.lng) : "",
    };

    if (isRetrospective) {
      const occurredAtIso = localInputToIso(occurred_at);

      if (!occurredAtIso) {
        setError("La fecha y hora del servicio no son válidas.");
        return;
      }

      payload.occurred_at = occurredAtIso;

      const reason = String(retrospective_reason || "").trim();
      if (reason) {
        payload.retrospective_reason = reason;
      }
    }

    const created = await v2Api.serviceIntakeCreate({
      payload,
      token: session?.token,
      companyId: session?.companyId,
      userId: session?.userId,
    });

    navigate(`/v2/intakes/${created.id}/timeline`);
  } catch (e2) {
    setError(e2?.message || "No se pudo guardar el servicio");
  } finally {
    setLoading(false);
  }
};

  return (
    <div style={{ maxWidth: 960 }}>
      <h2 style={{ marginTop: 0 }}>Nuevo servicio V2</h2>
      <p style={{ color: "#6b7280" }}>
        Captura profesional del servicio con lenguaje humano.
      </p>

      <form onSubmit={onSubmit} style={{ ...formStyle, paddingBottom: 96 }}>
        {canCreateRetrospective && (
          <section style={sectionStyle}>
            <h3 style={{ marginTop: 0 }}>Modalidad de captura</h3>

            <label style={labelStyle}>
              Tipo de captura
              <select
                value={form.capture_mode}
                onChange={(e) => onChange("capture_mode", e.target.value)}
              >
                <option value="realtime">En tiempo real</option>
                <option value="retrospective">Retrospectiva</option>
              </select>
            </label>

            {isRetrospective && (
              <>
                <div
                  style={{
                    border: "1px solid #f59e0b",
                    background: "#fffbeb",
                    color: "#92400e",
                    borderRadius: 10,
                    padding: 12,
                    lineHeight: 1.5,
                  }}
                >
                  Esta modalidad documenta posteriormente un servicio ya ocurrido.
                  La fecha y hora declaradas corresponderán al momento real del servicio;
                  el sistema conservará por separado la fecha de registro.
                </div>

                <label style={labelStyle}>
                  Fecha y hora del servicio
                  <input
                    type="datetime-local"
                    value={form.occurred_at}
                    onChange={(e) => onChange("occurred_at", e.target.value)}
                    required
                  />
                </label>

                <label style={labelStyle}>
                  Motivo de captura retrospectiva
                  <textarea
                    rows={3}
                    value={form.retrospective_reason}
                    onChange={(e) =>
                      onChange("retrospective_reason", e.target.value)
                    }
                    placeholder="Motivo u observación administrativa opcional"
                  />
                </label>
              </>
            )}
          </section>
        )}

        <section style={sectionStyle}>
          <h3>Datos generales</h3>

          <label style={labelStyle}>
            Tipo de servicio
            <input value={form.service_type} onChange={(e) => onChange("service_type", e.target.value)} />
          </label>

          <label style={labelStyle}>
            Subtipo
            <input value={form.service_subtype} onChange={(e) => onChange("service_subtype", e.target.value)} />
          </label>

          <label style={labelStyle}>
            Prioridad operativa
            <input
              type="number"
              value={form.priority_operational}
              onChange={(e) => onChange("priority_operational", e.target.value)}
            />
          </label>

          <label style={labelStyle}>
            Prioridad clínica
            <select value={form.priority_clinical} onChange={(e) => onChange("priority_clinical", e.target.value)}>
              <option value="routine">Rutinaria</option>
              <option value="urgent">Urgente</option>
              <option value="critical">Crítica</option>
            </select>
          </label>
        </section>

        <section style={sectionStyle}>
          <h3>Solicitante</h3>

          <label style={labelStyle}>
            Origen de la llamada
            <input value={form.call_source} onChange={(e) => onChange("call_source", e.target.value)} />
          </label>

          <label style={labelStyle}>
            Nombre del solicitante
            <input value={form.caller_name} onChange={(e) => onChange("caller_name", e.target.value)} />
          </label>

          <label style={labelStyle}>
            Teléfono
            <input value={form.caller_phone} onChange={(e) => onChange("caller_phone", e.target.value)} />
          </label>
        </section>

        <section style={sectionStyle}>
          <h3>Ubicación</h3>

          <label style={labelStyle}>
            Ubicación principal
            <input value={form.location_text} onChange={(e) => onChange("location_text", e.target.value)} />
          </label>

          <label style={labelStyle}>
            Referencia
            <input value={form.location_reference} onChange={(e) => onChange("location_reference", e.target.value)} />
          </label>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <label style={{ ...labelStyle, flex: 1 }}>
              Latitud
              <input value={form.lat} onChange={(e) => onChange("lat", e.target.value)} />
            </label>

            <label style={{ ...labelStyle, flex: 1 }}>
              Longitud
              <input value={form.lng} onChange={(e) => onChange("lng", e.target.value)} />
            </label>
          </div>

          <div>
            <button type="button" onClick={useMyLocation} disabled={geoLoading}>
              {geoLoading ? "Obteniendo ubicación..." : "Usar mi ubicación"}
            </button>
          </div>
        </section>

        <section style={sectionStyle}>
          <h3>Contexto del servicio</h3>

          <label style={labelStyle}>
            Pacientes estimados
            <input
              type="number"
              value={form.patient_count_estimated}
              onChange={(e) => onChange("patient_count_estimated", e.target.value)}
            />
          </label>

          <label style={labelStyle}>
            Riesgo en escena
            <select value={form.scene_risk} onChange={(e) => onChange("scene_risk", e.target.value)}>
              <option value="unknown">No determinado</option>
              <option value="low">Bajo</option>
              <option value="medium">Medio</option>
              <option value="high">Alto</option>
            </select>
          </label>

          <label style={labelStyle}>
            Hospital sugerido
            <input value={form.destination_suggested} onChange={(e) => onChange("destination_suggested", e.target.value)} />
          </label>

          <label style={labelStyle}>
            Tipo de pagador
            <select value={form.payer_type} onChange={(e) => onChange("payer_type", e.target.value)}>
              <option value="private">Particular</option>
              <option value="insurance">Aseguradora</option>
              <option value="contract">Convenio</option>
              <option value="public">Público</option>
            </select>
          </label>
        </section>

        <section style={sectionStyle}>
          <h3>Observaciones</h3>
          <label style={labelStyle}>
            Notas
            <textarea rows={5} value={form.notes} onChange={(e) => onChange("notes", e.target.value)} />
          </label>
        </section>

        {error && <p style={{ color: "crimson", whiteSpace: "pre-wrap" }}>{error}</p>}

        <div style={stickyFooterStyle}>
          <button type="submit" disabled={loading}>
            {loading ? "Guardando..." : "Guardar servicio"}
          </button>
        </div>
      </form>
    </div>
  );
}

const formStyle = {
  display: "grid",
  gap: 16,
};

const sectionStyle = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 18,
  display: "grid",
  gap: 12,
};

const labelStyle = {
  display: "grid",
  gap: 6,
};

const stickyFooterStyle = {
  position: "sticky",
  bottom: 12,
  display: "flex",
  gap: 12,
  paddingTop: 8,
  background: "linear-gradient(180deg, rgba(243,246,251,0) 0%, #f3f6fb 28px)",
};
