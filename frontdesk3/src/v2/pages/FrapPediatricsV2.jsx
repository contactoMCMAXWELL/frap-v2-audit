import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { v2Api } from "../api/v2";
import { localInputToIso, toDatetimeLocalValue } from "../../utils/datetime";

const initialForm = {
  assessed_at: "",
  age_group: "",
  estimated_age_value: "",
  estimated_age_unit: "",
  weight_kg: "",
  broselow_color: "",
  caregiver_present: false,
  caregiver_name: "",
  pediatric_assessment_triangle: "",
  appearance: "",
  work_of_breathing: "",
  circulation_to_skin: "",
  capillary_refill_seconds: "",
  blood_glucose_mg_dl: "",
  pain_scale_flacc: "",
  immunization_status: "",
  suspected_abuse: false,
  temperature_control: "",
  notes: "",
  active: true,
};

const AGE_GROUP_OPTIONS = [
  { value: "", label: "Seleccionar" },
  { value: "newborn", label: "Recién nacido" },
  { value: "neonate", label: "Neonato" },
  { value: "infant", label: "Lactante menor" },
  { value: "lactante", label: "Lactante" },
  { value: "toddler", label: "Preescolar menor" },
  { value: "preschool", label: "Preescolar" },
  { value: "school_age", label: "Escolar" },
  { value: "adolescent", label: "Adolescente" },
];

const AGE_GROUP_LABELS = Object.fromEntries(
  AGE_GROUP_OPTIONS.filter((x) => x.value).map((x) => [x.value, x.label])
);

const AGE_UNIT_OPTIONS = [
  { value: "", label: "Unidad" },
  { value: "días", label: "Días" },
  { value: "meses", label: "Meses" },
  { value: "años", label: "Años" },
];

const BROSelow_OPTIONS = [
  { value: "", label: "Seleccionar" },
  { value: "grey", label: "Gris" },
  { value: "pink", label: "Rosado" },
  { value: "red", label: "Rojo" },
  { value: "purple", label: "Morado" },
  { value: "yellow", label: "Amarillo" },
  { value: "white", label: "Blanco" },
  { value: "blue", label: "Azul" },
  { value: "orange", label: "Naranja" },
  { value: "green", label: "Verde" },
];

const BROSelow_LABELS = Object.fromEntries(
  BROSelow_OPTIONS.filter((x) => x.value).map((x) => [x.value, x.label])
);

const PAT_OPTIONS = [
  { value: "", label: "Seleccionar" },
  { value: "stable", label: "Estable" },
  { value: "respiratory_distress", label: "Dificultad respiratoria" },
  { value: "respiratory_failure", label: "Falla respiratoria" },
  { value: "shock", label: "Choque" },
  { value: "cns_metabolic_disorder", label: "Alteración SNC/metabólica" },
  { value: "cardiopulmonary_failure", label: "Falla cardiopulmonar" },
];

const PAT_LABELS = Object.fromEntries(
  PAT_OPTIONS.filter((x) => x.value).map((x) => [x.value, x.label])
);

const IMMUNIZATION_OPTIONS = [
  { value: "", label: "Seleccionar" },
  { value: "complete", label: "Completo" },
  { value: "incomplete", label: "Incompleto" },
  { value: "delayed", label: "Atrasado" },
  { value: "unknown", label: "Desconocido" },
];

function isNotFoundError(error) {
  const text =
    error?.message ||
    error?.detail ||
    error?.response?.data?.detail ||
    error?.cause?.message ||
    "";
  return String(text).toLowerCase().includes("not found");
}

function boolLabel(value) {
  return value ? "Sí" : "No";
}

function humanizeAgeGroup(value) {
  return AGE_GROUP_LABELS[value] || value || "";
}

function humanizeBroselow(value) {
  return BROSelow_LABELS[value] || value || "";
}

function humanizePat(value) {
  return PAT_LABELS[value] || value || "";
}

export default function FrapPediatricsV2({
  session,
  intakeId: intakeIdProp,
  readOnly = false,
  isRetrospective = false,
  onDataChanged,
}) {
  const { intakeId: intakeIdFromParams } = useParams();
  const intakeId = intakeIdProp || intakeIdFromParams;

  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    if (!intakeId) {
      setForm(initialForm);
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const data = await v2Api.frapPediatricsGet({
        intakeId,
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
      });

      if (!data) {
        setForm(initialForm);
        return;
      }

      setForm({
        assessed_at: toDatetimeLocalValue(data.assessed_at),
        age_group: data.age_group || "",
        estimated_age_value: data.estimated_age_value || "",
        estimated_age_unit: data.estimated_age_unit || "",
        weight_kg: data.weight_kg || "",
        broselow_color: data.broselow_color || "",
        caregiver_present: !!data.caregiver_present,
        caregiver_name: data.caregiver_name || "",
        pediatric_assessment_triangle: data.pediatric_assessment_triangle || "",
        appearance: data.appearance || "",
        work_of_breathing: data.work_of_breathing || "",
        circulation_to_skin: data.circulation_to_skin || "",
        capillary_refill_seconds: data.capillary_refill_seconds || "",
        blood_glucose_mg_dl: data.blood_glucose_mg_dl || "",
        pain_scale_flacc: data.pain_scale_flacc || "",
        immunization_status: data.immunization_status || "",
        suspected_abuse: !!data.suspected_abuse,
        temperature_control: data.temperature_control || "",
        notes: data.notes || "",
        active: data.active ?? true,
      });
    } catch (e) {
      if (isNotFoundError(e)) {
        setForm(initialForm);
        setError("");
      } else {
        setError(e?.message || "No se pudo cargar pediatría.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [intakeId]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const summary = useMemo(() => {
    const parts = [];
    if (form.age_group) parts.push(humanizeAgeGroup(form.age_group));
    if (form.weight_kg) parts.push(`${form.weight_kg} kg`);
    if (form.broselow_color) parts.push(`Broselow ${humanizeBroselow(form.broselow_color)}`);
    if (form.pediatric_assessment_triangle) parts.push(`PAT ${humanizePat(form.pediatric_assessment_triangle)}`);
    return parts.join(" · ");
  }, [form]);

  async function save(e) {
    if (e) e.preventDefault();
    if (readOnly || !intakeId) return;

    if (isRetrospective && !form.assessed_at) {
      setError("Captura la fecha y hora declarada de la evaluación pediátrica.");
      return;
    }

    const assessedAtIso = isRetrospective
      ? localInputToIso(form.assessed_at)
      : null;

    if (isRetrospective && !assessedAtIso) {
      setError("La fecha y hora declarada de la evaluación pediátrica no es válida.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      await v2Api.frapPediatricsUpsert({
        payload: {
          intake_id: intakeId,
          ...(isRetrospective ? { assessed_at: assessedAtIso } : {}),
          ...Object.fromEntries(
            Object.entries(form).filter(([key]) => key !== "assessed_at")
          ),
          caregiver_present: !!form.caregiver_present,
          suspected_abuse: !!form.suspected_abuse,
          active: !!form.active,
        },
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
      });

      setMessage("Pediatría guardada correctamente.");
      await load();
      if (typeof onDataChanged === "function") {
        await onDataChanged();
      }
    } catch (e2) {
      setError(e2?.message || "No se pudo guardar pediatría.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={cardStyle}>
      <div style={headerRowStyle}>
        <div>
          <h3 style={{ margin: 0 }}>Pediatría</h3>
          <div style={helpStyle}>
            Triángulo de evaluación pediátrica, Broselow, FLACC y acompañante.
          </div>
        </div>
        {!!summary && <div style={summaryBadgeStyle}>{summary}</div>}
      </div>

      {loading ? <div style={helpStyle}>Cargando pediatría...</div> : null}
      {error ? <div style={{ ...helpStyle, color: "#b91c1c" }}>{error}</div> : null}
      {message ? <div style={{ ...helpStyle, color: "#047857" }}>{message}</div> : null}

      <form onSubmit={save} style={{ display: "grid", gap: 12 }}>
        {isRetrospective ? (
          <Field label="Fecha y hora declarada de la evaluación">
            <input
              style={controlStyle}
              type="datetime-local"
              value={form.assessed_at}
              onChange={(e) => updateField("assessed_at", e.target.value)}
              disabled={readOnly}
            />
          </Field>
        ) : null}

        <div style={grid3}>
          <Field label="Grupo etario">
            <select
              style={controlStyle}
              value={form.age_group}
              onChange={(e) => updateField("age_group", e.target.value)}
              disabled={readOnly}
            >
              {AGE_GROUP_OPTIONS.map((opt) => (
                <option key={opt.value || "blank"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Edad estimada">
            <div style={inlineGridStyle}>
              <input
                style={controlStyle}
                value={form.estimated_age_value}
                onChange={(e) => updateField("estimated_age_value", e.target.value)}
                disabled={readOnly}
                placeholder="Valor"
              />
              <select
                style={controlStyle}
                value={form.estimated_age_unit}
                onChange={(e) => updateField("estimated_age_unit", e.target.value)}
                disabled={readOnly}
              >
                {AGE_UNIT_OPTIONS.map((opt) => (
                  <option key={opt.value || "blank"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </Field>

          <Field label="Peso (kg)">
            <input
              style={controlStyle}
              value={form.weight_kg}
              onChange={(e) => updateField("weight_kg", e.target.value)}
              disabled={readOnly}
              placeholder="Ej. 9.5"
            />
          </Field>
        </div>

        <div style={grid3}>
          <Field label="Color Broselow">
            <select
              style={controlStyle}
              value={form.broselow_color}
              onChange={(e) => updateField("broselow_color", e.target.value)}
              disabled={readOnly}
            >
              {BROSelow_OPTIONS.map((opt) => (
                <option key={opt.value || "blank"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="PAT">
            <select
              style={controlStyle}
              value={form.pediatric_assessment_triangle}
              onChange={(e) => updateField("pediatric_assessment_triangle", e.target.value)}
              disabled={readOnly}
            >
              {PAT_OPTIONS.map((opt) => (
                <option key={opt.value || "blank"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="FLACC">
            <input
              style={controlStyle}
              value={form.pain_scale_flacc}
              onChange={(e) => updateField("pain_scale_flacc", e.target.value)}
              disabled={readOnly}
              placeholder="0 a 10"
            />
          </Field>
        </div>

        <div style={grid3}>
          <Field label="Relleno capilar">
            <input
              style={controlStyle}
              value={form.capillary_refill_seconds}
              onChange={(e) => updateField("capillary_refill_seconds", e.target.value)}
              disabled={readOnly}
              placeholder="Segundos"
            />
          </Field>

          <Field label="Glucosa mg/dL">
            <input
              style={controlStyle}
              value={form.blood_glucose_mg_dl}
              onChange={(e) => updateField("blood_glucose_mg_dl", e.target.value)}
              disabled={readOnly}
              placeholder="Ej. 92"
            />
          </Field>

          <Field label="Estado de inmunización">
            <select
              style={controlStyle}
              value={form.immunization_status}
              onChange={(e) => updateField("immunization_status", e.target.value)}
              disabled={readOnly}
            >
              {IMMUNIZATION_OPTIONS.map((opt) => (
                <option key={opt.value || "blank"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div style={grid2}>
          <Field label="Acompañante / cuidador presente">
            <div style={checkboxRowStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={!!form.caregiver_present}
                  onChange={(e) => updateField("caregiver_present", e.target.checked)}
                  disabled={readOnly}
                />
                <span>{boolLabel(form.caregiver_present)}</span>
              </label>
            </div>
          </Field>

          <Field label="Nombre del cuidador">
            <input
              style={controlStyle}
              value={form.caregiver_name}
              onChange={(e) => updateField("caregiver_name", e.target.value)}
              disabled={readOnly}
              placeholder="Nombre del responsable o acompañante"
            />
          </Field>
        </div>

        <div style={grid2}>
          <Field label="Apariencia">
            <textarea
              style={textAreaStyle}
              rows={3}
              value={form.appearance}
              onChange={(e) => updateField("appearance", e.target.value)}
              disabled={readOnly}
              placeholder="Tono, interacción, consuelo, respuesta..."
            />
          </Field>

          <Field label="Trabajo respiratorio">
            <textarea
              style={textAreaStyle}
              rows={3}
              value={form.work_of_breathing}
              onChange={(e) => updateField("work_of_breathing", e.target.value)}
              disabled={readOnly}
              placeholder="Aleteo, tiraje, ruidos, esfuerzo..."
            />
          </Field>
        </div>

        <div style={grid2}>
          <Field label="Circulación a piel">
            <textarea
              style={textAreaStyle}
              rows={3}
              value={form.circulation_to_skin}
              onChange={(e) => updateField("circulation_to_skin", e.target.value)}
              disabled={readOnly}
              placeholder="Color, perfusión, moteado, palidez..."
            />
          </Field>

          <Field label="Control térmico">
            <input
              style={controlStyle}
              value={form.temperature_control}
              onChange={(e) => updateField("temperature_control", e.target.value)}
              disabled={readOnly}
              placeholder="Normotermia, abrigo, manta térmica..."
            />
          </Field>
        </div>

        <div style={grid2}>
          <Field label="Sospecha de maltrato">
            <div style={checkboxRowStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={!!form.suspected_abuse}
                  onChange={(e) => updateField("suspected_abuse", e.target.checked)}
                  disabled={readOnly}
                />
                <span>{boolLabel(form.suspected_abuse)}</span>
              </label>
            </div>
          </Field>

          <Field label="Activo">
            <div style={checkboxRowStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={!!form.active}
                  onChange={(e) => updateField("active", e.target.checked)}
                  disabled={readOnly}
                />
                <span>{boolLabel(form.active)}</span>
              </label>
            </div>
          </Field>
        </div>

        <Field label="Observaciones">
          <textarea
            style={textAreaStyle}
            rows={4}
            value={form.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            disabled={readOnly}
            placeholder="Hallazgos pediátricos, evolución y observaciones médico-legales."
          />
        </Field>

        {!readOnly && (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar pediatría"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={fieldStyle}>
      <span style={labelStyle}>{label}</span>
      {children}
    </label>
  );
}

const cardStyle = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 18,
  display: "grid",
  gap: 12,
};

const headerRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  flexWrap: "wrap",
};

const helpStyle = {
  fontSize: 14,
  color: "#6b7280",
  lineHeight: 1.5,
};

const summaryBadgeStyle = {
  background: "#eff6ff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
  borderRadius: 999,
  padding: "8px 12px",
  fontSize: 13,
  fontWeight: 700,
  maxWidth: "100%",
};

const fieldStyle = {
  display: "grid",
  gap: 6,
};

const labelStyle = {
  fontSize: 14,
  fontWeight: 700,
  color: "#111827",
};

const controlStyle = {
  width: "100%",
  minHeight: 40,
  padding: "8px 10px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  boxSizing: "border-box",
  font: "inherit",
  background: "#fff",
};

const textAreaStyle = {
  ...controlStyle,
  minHeight: 96,
  resize: "vertical",
};

const grid2 = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 12,
};

const grid3 = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
};

const inlineGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 8,
};

const checkboxRowStyle = {
  minHeight: 40,
  display: "flex",
  alignItems: "center",
};

const checkboxLabelStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  fontWeight: 600,
  color: "#111827",
};