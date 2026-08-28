import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { v2Api } from "../api/v2";
import { localInputToIso, toDatetimeLocalValue } from "../../utils/datetime";

const initialForm = {
  refused_at: "",
  refusal_type: "",
  refusal_reason: "",
  risks_explained: "",
  decision_capacity: "",
  patient_condition_at_refusal: "",
  witness_name: "",
  witness_relation: "",
  witness_phone: "",
  accepted_recommendations: "",
  advised_return_precautions: "",
  signature_pending: true,
  active: true,
};

export default function FrapRefusalV2({
  session,
  onDataChanged,
  readOnly = false,
  isRetrospective = false,
}) {
  const { intakeId } = useParams();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await v2Api.frapRefusalGet({
        intakeId,
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
      });

      setForm({
        refused_at: toDatetimeLocalValue(data?.refused_at),
        refusal_type: data?.refusal_type || "",
        refusal_reason: data?.refusal_reason || "",
        risks_explained: data?.risks_explained || "",
        decision_capacity: data?.decision_capacity || "",
        patient_condition_at_refusal: data?.patient_condition_at_refusal || "",
        witness_name: data?.witness_name || "",
        witness_relation: data?.witness_relation || "",
        witness_phone: data?.witness_phone || "",
        accepted_recommendations: data?.accepted_recommendations || "",
        advised_return_precautions: data?.advised_return_precautions || "",
        signature_pending: data?.signature_pending ?? true,
        active: data?.active ?? true,
      });
    } catch (e) {
      if (!String(e?.message || "").includes("404")) {
        setError(e?.message || "No se pudo cargar negativa");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (intakeId) load();
  }, [intakeId]);

  const onChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (readOnly || !intakeId) return;

    if (isRetrospective && !form.refused_at) {
      setError("Captura la fecha y hora declarada de la negativa.");
      return;
    }

    const refusedAtIso = isRetrospective
      ? localInputToIso(form.refused_at)
      : null;

    if (isRetrospective && !refusedAtIso) {
      setError("La fecha y hora declarada de la negativa no es válida.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await v2Api.frapRefusalUpsert({
        payload: {
          intake_id: intakeId,
          ...(isRetrospective ? { refused_at: refusedAtIso } : {}),
          ...Object.fromEntries(
            Object.entries(form).filter(([key]) => key !== "refused_at")
          ),
          signature_pending: !!form.signature_pending,
          active: !!form.active,
        },
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
      });

      await load();
      if (typeof onDataChanged === "function") {
        await onDataChanged();
      }
    } catch (e2) {
      setError(e2?.message || "No se pudo guardar negativa");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={cardStyle}>
      <h3 style={{ marginTop: 0 }}>Negativa de atención / traslado</h3>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <fieldset
          disabled={readOnly}
          style={{ border: 0, padding: 0, margin: 0, minWidth: 0, display: "grid", gap: 12 }}
        >
          {isRetrospective ? (
            <label style={labelStyle}>
              Fecha y hora declarada de la negativa
              <input
                type="datetime-local"
                value={form.refused_at}
                onChange={(e) => onChange("refused_at", e.target.value)}
              />
            </label>
          ) : null}

        <div style={grid2}>
          <label style={labelStyle}>
            Tipo de negativa
            <select value={form.refusal_type} onChange={(e) => onChange("refusal_type", e.target.value)}>
              <option value="">Seleccionar</option>
              <option value="assessment">Negativa de valoración</option>
              <option value="treatment">Negativa de tratamiento</option>
              <option value="transport">Negativa de traslado</option>
              <option value="full">Negativa total</option>
            </select>
          </label>

          <label style={labelStyle}>
            Capacidad de decisión
            <select value={form.decision_capacity} onChange={(e) => onChange("decision_capacity", e.target.value)}>
              <option value="">Seleccionar</option>
              <option value="intact">Conservada</option>
              <option value="questionable">Cuestionable</option>
              <option value="impaired">Alterada</option>
            </select>
          </label>
        </div>

        <label style={labelStyle}>
          Motivo de negativa
          <textarea rows={3} value={form.refusal_reason} onChange={(e) => onChange("refusal_reason", e.target.value)} />
        </label>

        <label style={labelStyle}>
          Riesgos explicados
          <textarea rows={3} value={form.risks_explained} onChange={(e) => onChange("risks_explained", e.target.value)} />
        </label>

        <label style={labelStyle}>
          Condición del paciente al momento de negativa
          <textarea
            rows={3}
            value={form.patient_condition_at_refusal}
            onChange={(e) => onChange("patient_condition_at_refusal", e.target.value)}
          />
        </label>

        <div style={grid3}>
          <label style={labelStyle}>
            Testigo
            <input value={form.witness_name} onChange={(e) => onChange("witness_name", e.target.value)} />
          </label>

          <label style={labelStyle}>
            Relación
            <input value={form.witness_relation} onChange={(e) => onChange("witness_relation", e.target.value)} />
          </label>

          <label style={labelStyle}>
            Teléfono
            <input value={form.witness_phone} onChange={(e) => onChange("witness_phone", e.target.value)} />
          </label>
        </div>

        <label style={labelStyle}>
          Recomendaciones aceptadas
          <textarea
            rows={3}
            value={form.accepted_recommendations}
            onChange={(e) => onChange("accepted_recommendations", e.target.value)}
          />
        </label>

        <label style={labelStyle}>
          Signos de alarma / retorno sugerido
          <textarea
            rows={3}
            value={form.advised_return_precautions}
            onChange={(e) => onChange("advised_return_precautions", e.target.value)}
          />
        </label>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={!!form.signature_pending}
            onChange={(e) => onChange("signature_pending", e.target.checked)}
          />
          Firma pendiente / digitalización pendiente
        </label>

        <div>
          <button type="submit" disabled={saving}>
            {saving ? "Guardando..." : "Guardar negativa"}
          </button>
        </div>
        </fieldset>
      </form>

      {loading && <p style={{ color: "#6b7280" }}>Cargando negativa...</p>}
      {error && <p style={{ color: "crimson" }}>{error}</p>}
    </div>
  );
}

const cardStyle = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 18,
};

const labelStyle = {
  display: "grid",
  gap: 6,
};

const grid2 = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 12,
};

const grid3 = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
};