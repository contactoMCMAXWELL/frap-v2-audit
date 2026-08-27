import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { v2Api } from "../api/v2";

function formatUiError(err, fallback) {
  const msg = String(err?.message || "").trim();
  if (msg) return msg;
  return fallback;
}

const initialForm = {
  chief_complaint: "",
  chest_pain_type: "",
  pain_severity: "",
  symptom_onset: "",
  pain_radiation: "",
  dyspnea: false,
  diaphoresis: false,
  nausea_vomiting: false,
  syncope: false,
  edema: false,
  palpitations: false,

  detected_rhythm: "",
  interpreted_heart_rate: "",
  low_output_signs: "",
  suspected_acute_coronary_syndrome: false,
  suspected_stemi: false,
  cardiac_arrest: false,
  rosc: false,
  killip_class: "",
  ecg_performed: false,
  ecg_findings: "",
  interpreted_blood_pressure: "",
  peripheral_perfusion: "",

  oxygen_administered: false,
  aspirin_administered: false,
  nitroglycerin_administered: false,
  iv_io_access: false,
  monitor_defibrillator: false,
  defibrillation_performed: false,
  cardioversion_performed: false,
  transcutaneous_pacing: false,
  cpr_performed: false,

  notes: "",
  active: true,
};

const CHEST_PAIN_OPTIONS = [
  { value: "", label: "Seleccionar" },
  { value: "typical_angina", label: "Angina típica" },
  { value: "atypical_angina", label: "Angina atípica" },
  { value: "oppressive", label: "Opresivo" },
  { value: "pleuritic", label: "Pleurítico" },
  { value: "burning", label: "Urente" },
  { value: "stabbing", label: "Punzante" },
  { value: "absent", label: "Sin dolor" },
];

const RHYTHM_OPTIONS = [
  { value: "", label: "Seleccionar" },
  { value: "sinus_rhythm", label: "Ritmo sinusal" },
  { value: "sinus_bradycardia", label: "Bradicardia sinusal" },
  { value: "sinus_tachycardia", label: "Taquicardia sinusal" },
  { value: "atrial_fibrillation", label: "Fibrilación auricular" },
  { value: "atrial_flutter", label: "Flutter auricular" },
  { value: "svt", label: "Taquicardia supraventricular" },
  { value: "vt", label: "Taquicardia ventricular" },
  { value: "vf", label: "Fibrilación ventricular" },
  { value: "pea", label: "Actividad eléctrica sin pulso" },
  { value: "asystole", label: "Asistolia" },
  { value: "unknown", label: "Desconocido" },
];

const HEART_RATE_OPTIONS = [
  { value: "", label: "Seleccionar" },
  { value: "bradycardia", label: "Bradicardia" },
  { value: "normal", label: "Normal" },
  { value: "tachycardia", label: "Taquicardia" },
  { value: "extreme_tachycardia", label: "Taquicardia extrema" },
];

const KILLIP_OPTIONS = [
  { value: "", label: "Seleccionar" },
  { value: "i", label: "Killip I" },
  { value: "ii", label: "Killip II" },
  { value: "iii", label: "Killip III" },
  { value: "iv", label: "Killip IV" },
];

const BP_OPTIONS = [
  { value: "", label: "Seleccionar" },
  { value: "normal", label: "Normal" },
  { value: "hypertensive", label: "Hipertensiva" },
  { value: "hypotensive", label: "Hipotensiva" },
  { value: "shock_pattern", label: "Patrón de choque" },
];

const PERFUSION_OPTIONS = [
  { value: "", label: "Seleccionar" },
  { value: "adequate", label: "Adecuada" },
  { value: "delayed", label: "Retardada" },
  { value: "poor", label: "Deficiente" },
  { value: "critical_perfusion", label: "Perfusión crítica" },
];

const optionLabelMap = (items) =>
  Object.fromEntries(items.filter((x) => x.value).map((x) => [x.value, x.label]));

const CHEST_PAIN_LABELS = optionLabelMap(CHEST_PAIN_OPTIONS);
const RHYTHM_LABELS = optionLabelMap(RHYTHM_OPTIONS);
const HEART_RATE_LABELS = optionLabelMap(HEART_RATE_OPTIONS);
const KILLIP_LABELS = optionLabelMap(KILLIP_OPTIONS);
const BP_LABELS = optionLabelMap(BP_OPTIONS);
const PERFUSION_LABELS = optionLabelMap(PERFUSION_OPTIONS);

function boolLabel(value) {
  return value ? "Sí" : "No";
}

function isNotFoundError(error) {
  const text =
    error?.message ||
    error?.detail ||
    error?.response?.data?.detail ||
    error?.cause?.message ||
    "";
  return String(text).toLowerCase().includes("not found");
}

function humanize(map, value) {
  return map[value] || value || "";
}

export default function FrapCardioV2({
  session,
  intakeId: intakeIdProp,
  readOnly = false,
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

      const data = await v2Api.frapCardioGet({
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
        chief_complaint: data.chief_complaint || "",
        chest_pain_type: data.chest_pain_type || "",
        pain_severity: data.pain_severity || "",
        symptom_onset: data.symptom_onset || "",
        pain_radiation: data.pain_radiation || "",
        dyspnea: !!data.dyspnea,
        diaphoresis: !!data.diaphoresis,
        nausea_vomiting: !!data.nausea_vomiting,
        syncope: !!data.syncope,
        edema: !!data.edema,
        palpitations: !!data.palpitations,

        detected_rhythm: data.detected_rhythm || "",
        interpreted_heart_rate: data.interpreted_heart_rate || "",
        low_output_signs: data.low_output_signs || "",
        suspected_acute_coronary_syndrome: !!data.suspected_acute_coronary_syndrome,
        suspected_stemi: !!data.suspected_stemi,
        cardiac_arrest: !!data.cardiac_arrest,
        rosc: !!data.rosc,
        killip_class: data.killip_class || "",
        ecg_performed: !!data.ecg_performed,
        ecg_findings: data.ecg_findings || "",
        interpreted_blood_pressure: data.interpreted_blood_pressure || "",
        peripheral_perfusion: data.peripheral_perfusion || "",

        oxygen_administered: !!data.oxygen_administered,
        aspirin_administered: !!data.aspirin_administered,
        nitroglycerin_administered: !!data.nitroglycerin_administered,
        iv_io_access: !!data.iv_io_access,
        monitor_defibrillator: !!data.monitor_defibrillator,
        defibrillation_performed: !!data.defibrillation_performed,
        cardioversion_performed: !!data.cardioversion_performed,
        transcutaneous_pacing: !!data.transcutaneous_pacing,
        cpr_performed: !!data.cpr_performed,

        notes: data.notes || "",
        active: data.active ?? true,
      });
    } catch (e) {
      if (isNotFoundError(e)) {
        setForm(initialForm);
        setError("");
      } else {
        setError(formatUiError(e, "No se pudo cargar cardio."));
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
    if (form.chief_complaint) parts.push(form.chief_complaint);
    if (form.chest_pain_type) parts.push(humanize(CHEST_PAIN_LABELS, form.chest_pain_type));
    if (form.detected_rhythm) parts.push(humanize(RHYTHM_LABELS, form.detected_rhythm));
    if (form.suspected_acute_coronary_syndrome) parts.push("Sospecha de SCA");
    if (form.suspected_stemi) parts.push("Sospecha de STEMI");
    if (form.cardiac_arrest) parts.push("Paro cardiaco");
    return parts.join(" · ");
  }, [form]);

  async function save(e) {
    if (e) e.preventDefault();
    if (readOnly || !intakeId) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");

      await v2Api.frapCardioUpsert({
        payload: {
          intake_id: intakeId,
          ...form,
        },
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
      });

      setMessage("Cardio guardado correctamente.");
      await load();
      if (typeof onDataChanged === "function") {
        await onDataChanged();
      }
    } catch (e2) {
      setError(formatUiError(e2, "No se pudo guardar cardio."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={cardStyle}>
      <div style={headerRowStyle}>
        <div>
          <h3 style={{ margin: 0 }}>Cardio</h3>
          <div style={helpStyle}>
            Dolor torácico, ritmo, ECG, perfusión e intervenciones cardiovasculares.
          </div>
        </div>
        {!!summary && <div style={summaryBadgeStyle}>{summary}</div>}
      </div>

      {loading ? <div style={helpStyle}>Cargando cardio...</div> : null}
      {error ? <div style={{ ...helpStyle, color: "#b91c1c" }}>{error}</div> : null}
      {message ? <div style={{ ...helpStyle, color: "#047857" }}>{message}</div> : null}

      <form onSubmit={save} style={{ display: "grid", gap: 12 }}>
        <div style={grid3}>
          <Field label="Motivo principal">
            <input
              style={controlStyle}
              value={form.chief_complaint}
              onChange={(e) => updateField("chief_complaint", e.target.value)}
              disabled={readOnly}
              placeholder="Ej. Dolor torácico"
            />
          </Field>

          <Field label="Tipo de dolor torácico">
            <select
              style={controlStyle}
              value={form.chest_pain_type}
              onChange={(e) => updateField("chest_pain_type", e.target.value)}
              disabled={readOnly}
            >
              {CHEST_PAIN_OPTIONS.map((opt) => (
                <option key={opt.value || "blank"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Intensidad del dolor">
            <input
              style={controlStyle}
              value={form.pain_severity}
              onChange={(e) => updateField("pain_severity", e.target.value)}
              disabled={readOnly}
              placeholder="0 a 10"
            />
          </Field>
        </div>

        <div style={grid2}>
          <Field label="Inicio del síntoma">
            <input
              style={controlStyle}
              value={form.symptom_onset}
              onChange={(e) => updateField("symptom_onset", e.target.value)}
              disabled={readOnly}
              placeholder="Ej. Hace 30 minutos"
            />
          </Field>

          <Field label="Irradiación">
            <input
              style={controlStyle}
              value={form.pain_radiation}
              onChange={(e) => updateField("pain_radiation", e.target.value)}
              disabled={readOnly}
              placeholder="Ej. Brazo izquierdo, mandíbula"
            />
          </Field>
        </div>

        <div style={grid3}>
          <FieldCheckbox
            label="Disnea"
            checked={form.dyspnea}
            disabled={readOnly}
            onChange={(v) => updateField("dyspnea", v)}
          />
          <FieldCheckbox
            label="Diaforesis"
            checked={form.diaphoresis}
            disabled={readOnly}
            onChange={(v) => updateField("diaphoresis", v)}
          />
          <FieldCheckbox
            label="Náusea / vómito"
            checked={form.nausea_vomiting}
            disabled={readOnly}
            onChange={(v) => updateField("nausea_vomiting", v)}
          />
        </div>

        <div style={grid3}>
          <FieldCheckbox
            label="Síncope"
            checked={form.syncope}
            disabled={readOnly}
            onChange={(v) => updateField("syncope", v)}
          />
          <FieldCheckbox
            label="Edema"
            checked={form.edema}
            disabled={readOnly}
            onChange={(v) => updateField("edema", v)}
          />
          <FieldCheckbox
            label="Palpitaciones"
            checked={form.palpitations}
            disabled={readOnly}
            onChange={(v) => updateField("palpitations", v)}
          />
        </div>

        <div style={grid3}>
          <Field label="Ritmo detectado">
            <select
              style={controlStyle}
              value={form.detected_rhythm}
              onChange={(e) => updateField("detected_rhythm", e.target.value)}
              disabled={readOnly}
            >
              {RHYTHM_OPTIONS.map((opt) => (
                <option key={opt.value || "blank"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Frecuencia cardiaca interpretada">
            <select
              style={controlStyle}
              value={form.interpreted_heart_rate}
              onChange={(e) => updateField("interpreted_heart_rate", e.target.value)}
              disabled={readOnly}
            >
              {HEART_RATE_OPTIONS.map((opt) => (
                <option key={opt.value || "blank"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Killip">
            <select
              style={controlStyle}
              value={form.killip_class}
              onChange={(e) => updateField("killip_class", e.target.value)}
              disabled={readOnly}
            >
              {KILLIP_OPTIONS.map((opt) => (
                <option key={opt.value || "blank"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div style={grid2}>
          <Field label="Signos de bajo gasto">
            <textarea
              style={textAreaStyle}
              rows={3}
              value={form.low_output_signs}
              onChange={(e) => updateField("low_output_signs", e.target.value)}
              disabled={readOnly}
              placeholder="Diaforesis, palidez, perfusión lenta..."
            />
          </Field>

          <Field label="Hallazgos ECG">
            <textarea
              style={textAreaStyle}
              rows={3}
              value={form.ecg_findings}
              onChange={(e) => updateField("ecg_findings", e.target.value)}
              disabled={readOnly}
              placeholder="Cambios isquémicos, elevación ST..."
            />
          </Field>
        </div>

        <div style={grid3}>
          <FieldCheckbox
            label="Sospecha de SCA"
            checked={form.suspected_acute_coronary_syndrome}
            disabled={readOnly}
            onChange={(v) => updateField("suspected_acute_coronary_syndrome", v)}
          />
          <FieldCheckbox
            label="Sospecha de STEMI"
            checked={form.suspected_stemi}
            disabled={readOnly}
            onChange={(v) => updateField("suspected_stemi", v)}
          />
          <FieldCheckbox
            label="Paro cardiaco"
            checked={form.cardiac_arrest}
            disabled={readOnly}
            onChange={(v) => updateField("cardiac_arrest", v)}
          />
        </div>

        <div style={grid3}>
          <FieldCheckbox
            label="ROSC"
            checked={form.rosc}
            disabled={readOnly}
            onChange={(v) => updateField("rosc", v)}
          />
          <FieldCheckbox
            label="ECG realizado"
            checked={form.ecg_performed}
            disabled={readOnly}
            onChange={(v) => updateField("ecg_performed", v)}
          />
          <Field label="Presión arterial interpretada">
            <select
              style={controlStyle}
              value={form.interpreted_blood_pressure}
              onChange={(e) => updateField("interpreted_blood_pressure", e.target.value)}
              disabled={readOnly}
            >
              {BP_OPTIONS.map((opt) => (
                <option key={opt.value || "blank"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div style={grid2}>
          <Field label="Perfusión periférica">
            <select
              style={controlStyle}
              value={form.peripheral_perfusion}
              onChange={(e) => updateField("peripheral_perfusion", e.target.value)}
              disabled={readOnly}
            >
              {PERFUSION_OPTIONS.map((opt) => (
                <option key={opt.value || "blank"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Observaciones cardio">
            <input
              style={controlStyle}
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              disabled={readOnly}
              placeholder="Ej. Paciente con dolor opresivo"
            />
          </Field>
        </div>

        <div style={grid3}>
          <FieldCheckbox
            label="Oxígeno administrado"
            checked={form.oxygen_administered}
            disabled={readOnly}
            onChange={(v) => updateField("oxygen_administered", v)}
          />
          <FieldCheckbox
            label="Aspirina administrada"
            checked={form.aspirin_administered}
            disabled={readOnly}
            onChange={(v) => updateField("aspirin_administered", v)}
          />
          <FieldCheckbox
            label="Nitroglicerina administrada"
            checked={form.nitroglycerin_administered}
            disabled={readOnly}
            onChange={(v) => updateField("nitroglycerin_administered", v)}
          />
        </div>

        <div style={grid3}>
          <FieldCheckbox
            label="Acceso IV / IO"
            checked={form.iv_io_access}
            disabled={readOnly}
            onChange={(v) => updateField("iv_io_access", v)}
          />
          <FieldCheckbox
            label="Monitor-desfibrilador"
            checked={form.monitor_defibrillator}
            disabled={readOnly}
            onChange={(v) => updateField("monitor_defibrillator", v)}
          />
          <FieldCheckbox
            label="Desfibrilación"
            checked={form.defibrillation_performed}
            disabled={readOnly}
            onChange={(v) => updateField("defibrillation_performed", v)}
          />
        </div>

        <div style={grid3}>
          <FieldCheckbox
            label="Cardioversión"
            checked={form.cardioversion_performed}
            disabled={readOnly}
            onChange={(v) => updateField("cardioversion_performed", v)}
          />
          <FieldCheckbox
            label="Marcapasos transcutáneo"
            checked={form.transcutaneous_pacing}
            disabled={readOnly}
            onChange={(v) => updateField("transcutaneous_pacing", v)}
          />
          <FieldCheckbox
            label="RCP"
            checked={form.cpr_performed}
            disabled={readOnly}
            onChange={(v) => updateField("cpr_performed", v)}
          />
        </div>

        <div style={grid2}>
          <FieldCheckbox
            label="Activo"
            checked={form.active}
            disabled={readOnly}
            onChange={(v) => updateField("active", v)}
          />
        </div>

        {!readOnly && (
          <div style={stickyFooterStyle}>
            <button type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar cardio"}
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

function FieldCheckbox({ label, checked, onChange, disabled }) {
  return (
    <div style={fieldStyle}>
      <span style={labelStyle}>{label}</span>
      <div style={checkboxRowStyle}>
        <label style={checkboxLabelStyle}>
          <input
            type="checkbox"
            checked={!!checked}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
          />
          <span>{boolLabel(checked)}</span>
        </label>
      </div>
    </div>
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

const stickyFooterStyle = {
  position: "sticky",
  bottom: 12,
  display: "flex",
  justifyContent: "flex-start",
  paddingTop: 8,
  background: "linear-gradient(180deg, rgba(255,255,255,0) 0%, #ffffff 28px)",
};
