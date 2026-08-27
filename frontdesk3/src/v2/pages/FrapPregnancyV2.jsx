import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { v2Api } from "../api/v2";

const initialForm = {
  pregnancy_confirmed: false,
  gestational_weeks: "",
  gravida: "",
  para: "",
  abortions: "",
  c_sections: "",
  last_menstrual_period: "",
  prenatal_control: false,
  high_risk_pregnancy: false,
  multiple_pregnancy: false,

  abdominal_pain: false,
  vaginal_bleeding: false,
  fluid_leak: false,
  fetal_movements_present: false,
  contractions_present: false,
  contraction_frequency: "",
  contraction_duration: "",
  fetal_presentation: "",
  crowning: false,
  urge_to_push: false,
  uterine_height: "",
  uterine_tone: "",
  fetal_heart_rate: "",
  suspected_preeclampsia: false,
  suspected_eclampsia: false,
  pregnancy_trauma: false,

  active_labor: false,
  delivery_performed: false,
  birth_time: "",
  newborn_sex: "",
  apgar_1_min: "",
  apgar_5_min: "",
  placenta_delivered: false,
  placenta_complete: false,
  maternal_complications: "",
  neonatal_complications: "",
  neonatal_resuscitation: false,

  oxygen_administered: false,
  iv_access: false,
  hemorrhage_control: false,
  cord_clamping: false,
  skin_to_skin_contact: false,
  newborn_thermal_care: false,
  mother_destination: "",
  newborn_destination: "",

  notes: "",
  active: true,
};

const PRESENTATION_OPTIONS = [
  { value: "", label: "Seleccionar" },
  { value: "cephalic", label: "Cefálica" },
  { value: "breech", label: "Pélvica" },
  { value: "transverse", label: "Transversa" },
  { value: "unknown", label: "Desconocida" },
];

const UTERINE_TONE_OPTIONS = [
  { value: "", label: "Seleccionar" },
  { value: "normal", label: "Normal" },
  { value: "hypertonic", label: "Hipertónico" },
  { value: "hypotonic", label: "Hipotónico" },
];

const NEWBORN_SEX_OPTIONS = [
  { value: "", label: "Seleccionar" },
  { value: "female", label: "Femenino" },
  { value: "male", label: "Masculino" },
  { value: "indeterminate", label: "Indeterminado" },
];

function buildMap(options) {
  return Object.fromEntries(options.filter((x) => x.value).map((x) => [x.value, x.label]));
}

const PRESENTATION_LABELS = buildMap(PRESENTATION_OPTIONS);
const UTERINE_TONE_LABELS = buildMap(UTERINE_TONE_OPTIONS);
const NEWBORN_SEX_LABELS = buildMap(NEWBORN_SEX_OPTIONS);

function boolLabel(value) {
  return value ? "Sí" : "No";
}

function humanize(map, value) {
  return map[value] || value || "";
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

export default function FrapPregnancyV2({
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

      const data = await v2Api.frapPregnancyGet({
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
        pregnancy_confirmed: !!data.pregnancy_confirmed,
        gestational_weeks: data.gestational_weeks || "",
        gravida: data.gravida || "",
        para: data.para || "",
        abortions: data.abortions || "",
        c_sections: data.c_sections || "",
        last_menstrual_period: data.last_menstrual_period || "",
        prenatal_control: !!data.prenatal_control,
        high_risk_pregnancy: !!data.high_risk_pregnancy,
        multiple_pregnancy: !!data.multiple_pregnancy,

        abdominal_pain: !!data.abdominal_pain,
        vaginal_bleeding: !!data.vaginal_bleeding,
        fluid_leak: !!data.fluid_leak,
        fetal_movements_present: !!data.fetal_movements_present,
        contractions_present: !!data.contractions_present,
        contraction_frequency: data.contraction_frequency || "",
        contraction_duration: data.contraction_duration || "",
        fetal_presentation: data.fetal_presentation || "",
        crowning: !!data.crowning,
        urge_to_push: !!data.urge_to_push,
        uterine_height: data.uterine_height || "",
        uterine_tone: data.uterine_tone || "",
        fetal_heart_rate: data.fetal_heart_rate || "",
        suspected_preeclampsia: !!data.suspected_preeclampsia,
        suspected_eclampsia: !!data.suspected_eclampsia,
        pregnancy_trauma: !!data.pregnancy_trauma,

        active_labor: !!data.active_labor,
        delivery_performed: !!data.delivery_performed,
        birth_time: data.birth_time || "",
        newborn_sex: data.newborn_sex || "",
        apgar_1_min: data.apgar_1_min || "",
        apgar_5_min: data.apgar_5_min || "",
        placenta_delivered: !!data.placenta_delivered,
        placenta_complete: !!data.placenta_complete,
        maternal_complications: data.maternal_complications || "",
        neonatal_complications: data.neonatal_complications || "",
        neonatal_resuscitation: !!data.neonatal_resuscitation,

        oxygen_administered: !!data.oxygen_administered,
        iv_access: !!data.iv_access,
        hemorrhage_control: !!data.hemorrhage_control,
        cord_clamping: !!data.cord_clamping,
        skin_to_skin_contact: !!data.skin_to_skin_contact,
        newborn_thermal_care: !!data.newborn_thermal_care,
        mother_destination: data.mother_destination || "",
        newborn_destination: data.newborn_destination || "",

        notes: data.notes || "",
        active: data.active ?? true,
      });
    } catch (e) {
      if (isNotFoundError(e)) {
        setForm(initialForm);
        setError("");
      } else {
        setError(e?.message || "No se pudo cargar obstetricia.");
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
    if (form.gestational_weeks) parts.push(`${form.gestational_weeks} semanas`);
    if (form.fetal_presentation) parts.push(`Presentación ${humanize(PRESENTATION_LABELS, form.fetal_presentation)}`);
    if (form.contractions_present) parts.push("Contracciones");
    if (form.vaginal_bleeding) parts.push("Sangrado vaginal");
    if (form.fluid_leak) parts.push("Salida de líquido");
    if (form.active_labor) parts.push("Trabajo de parto");
    if (form.delivery_performed) parts.push("Parto atendido");
    return parts.join(" · ");
  }, [form]);

  async function save(e) {
    if (e) e.preventDefault();
    if (readOnly || !intakeId) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");

      await v2Api.frapPregnancyUpsert({
        payload: {
          intake_id: intakeId,
          ...form,
        },
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
      });

      setMessage("Obstetricia guardada correctamente.");
      await load();
      if (typeof onDataChanged === "function") {
        await onDataChanged();
      }
    } catch (e2) {
      setError(e2?.message || "No se pudo guardar obstetricia.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={cardStyle}>
      <div style={headerRowStyle}>
        <div>
          <h3 style={{ margin: 0 }}>Pregnancy avanzado</h3>
          <div style={helpStyle}>
            Evaluación obstétrica, trabajo de parto, parto, recién nacido e intervenciones.
          </div>
        </div>
        {!!summary && <div style={summaryBadgeStyle}>{summary}</div>}
      </div>

      {loading ? <div style={helpStyle}>Cargando obstetricia...</div> : null}
      {error ? <div style={{ ...helpStyle, color: "#b91c1c" }}>{error}</div> : null}
      {message ? <div style={{ ...helpStyle, color: "#047857" }}>{message}</div> : null}

      <form onSubmit={save} style={{ display: "grid", gap: 12 }}>
        <Section title="Identificación obstétrica">
          <div style={grid3}>
            <FieldCheckbox
              label="Embarazo confirmado"
              checked={form.pregnancy_confirmed}
              disabled={readOnly}
              onChange={(v) => updateField("pregnancy_confirmed", v)}
            />
            <Field label="Semanas de gestación">
              <input
                style={controlStyle}
                value={form.gestational_weeks}
                onChange={(e) => updateField("gestational_weeks", e.target.value)}
                disabled={readOnly}
                placeholder="Ej. 38"
              />
            </Field>
            <Field label="FUM">
              <input
                style={controlStyle}
                value={form.last_menstrual_period}
                onChange={(e) => updateField("last_menstrual_period", e.target.value)}
                disabled={readOnly}
                placeholder="Fecha o referencia"
              />
            </Field>
          </div>

          <div style={grid4}>
            <Field label="Gestas">
              <input style={controlStyle} value={form.gravida} onChange={(e) => updateField("gravida", e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="Partos">
              <input style={controlStyle} value={form.para} onChange={(e) => updateField("para", e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="Abortos">
              <input style={controlStyle} value={form.abortions} onChange={(e) => updateField("abortions", e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="Cesáreas">
              <input style={controlStyle} value={form.c_sections} onChange={(e) => updateField("c_sections", e.target.value)} disabled={readOnly} />
            </Field>
          </div>

          <div style={grid3}>
            <FieldCheckbox
              label="Control prenatal"
              checked={form.prenatal_control}
              disabled={readOnly}
              onChange={(v) => updateField("prenatal_control", v)}
            />
            <FieldCheckbox
              label="Embarazo de alto riesgo"
              checked={form.high_risk_pregnancy}
              disabled={readOnly}
              onChange={(v) => updateField("high_risk_pregnancy", v)}
            />
            <FieldCheckbox
              label="Embarazo múltiple"
              checked={form.multiple_pregnancy}
              disabled={readOnly}
              onChange={(v) => updateField("multiple_pregnancy", v)}
            />
          </div>
        </Section>

        <Section title="Evaluación y motivo">
          <div style={grid3}>
            <FieldCheckbox label="Dolor abdominal" checked={form.abdominal_pain} disabled={readOnly} onChange={(v) => updateField("abdominal_pain", v)} />
            <FieldCheckbox label="Sangrado vaginal" checked={form.vaginal_bleeding} disabled={readOnly} onChange={(v) => updateField("vaginal_bleeding", v)} />
            <FieldCheckbox label="Salida de líquido" checked={form.fluid_leak} disabled={readOnly} onChange={(v) => updateField("fluid_leak", v)} />
          </div>

          <div style={grid3}>
            <FieldCheckbox label="Movimientos fetales" checked={form.fetal_movements_present} disabled={readOnly} onChange={(v) => updateField("fetal_movements_present", v)} />
            <FieldCheckbox label="Contracciones" checked={form.contractions_present} disabled={readOnly} onChange={(v) => updateField("contractions_present", v)} />
            <FieldCheckbox label="Pujo" checked={form.urge_to_push} disabled={readOnly} onChange={(v) => updateField("urge_to_push", v)} />
          </div>

          <div style={grid3}>
            <Field label="Frecuencia de contracciones">
              <input style={controlStyle} value={form.contraction_frequency} onChange={(e) => updateField("contraction_frequency", e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="Duración de contracciones">
              <input style={controlStyle} value={form.contraction_duration} onChange={(e) => updateField("contraction_duration", e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="Presentación fetal">
              <select style={controlStyle} value={form.fetal_presentation} onChange={(e) => updateField("fetal_presentation", e.target.value)} disabled={readOnly}>
                {PRESENTATION_OPTIONS.map((opt) => (
                  <option key={opt.value || "blank"} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </Field>
          </div>

          <div style={grid3}>
            <FieldCheckbox label="Coronamiento" checked={form.crowning} disabled={readOnly} onChange={(v) => updateField("crowning", v)} />
            <Field label="Altura uterina">
              <input style={controlStyle} value={form.uterine_height} onChange={(e) => updateField("uterine_height", e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="Tono uterino">
              <select style={controlStyle} value={form.uterine_tone} onChange={(e) => updateField("uterine_tone", e.target.value)} disabled={readOnly}>
                {UTERINE_TONE_OPTIONS.map((opt) => (
                  <option key={opt.value || "blank"} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </Field>
          </div>

          <div style={grid3}>
            <Field label="Frecuencia cardiaca fetal">
              <input style={controlStyle} value={form.fetal_heart_rate} onChange={(e) => updateField("fetal_heart_rate", e.target.value)} disabled={readOnly} placeholder="Ej. 142" />
            </Field>
            <FieldCheckbox label="Sospecha de preeclampsia" checked={form.suspected_preeclampsia} disabled={readOnly} onChange={(v) => updateField("suspected_preeclampsia", v)} />
            <FieldCheckbox label="Sospecha de eclampsia" checked={form.suspected_eclampsia} disabled={readOnly} onChange={(v) => updateField("suspected_eclampsia", v)} />
          </div>

          <div style={grid2}>
            <FieldCheckbox label="Trauma en embarazo" checked={form.pregnancy_trauma} disabled={readOnly} onChange={(v) => updateField("pregnancy_trauma", v)} />
          </div>
        </Section>

        <Section title="Parto y recién nacido">
          <div style={grid3}>
            <FieldCheckbox label="Trabajo de parto activo" checked={form.active_labor} disabled={readOnly} onChange={(v) => updateField("active_labor", v)} />
            <FieldCheckbox label="Parto atendido" checked={form.delivery_performed} disabled={readOnly} onChange={(v) => updateField("delivery_performed", v)} />
            <Field label="Hora de nacimiento">
              <input style={controlStyle} value={form.birth_time} onChange={(e) => updateField("birth_time", e.target.value)} disabled={readOnly} />
            </Field>
          </div>

          <div style={grid3}>
            <Field label="Sexo del recién nacido">
              <select style={controlStyle} value={form.newborn_sex} onChange={(e) => updateField("newborn_sex", e.target.value)} disabled={readOnly}>
                {NEWBORN_SEX_OPTIONS.map((opt) => (
                  <option key={opt.value || "blank"} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </Field>
            <Field label="APGAR 1 minuto">
              <input style={controlStyle} value={form.apgar_1_min} onChange={(e) => updateField("apgar_1_min", e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="APGAR 5 minutos">
              <input style={controlStyle} value={form.apgar_5_min} onChange={(e) => updateField("apgar_5_min", e.target.value)} disabled={readOnly} />
            </Field>
          </div>

          <div style={grid3}>
            <FieldCheckbox label="Alumbramiento" checked={form.placenta_delivered} disabled={readOnly} onChange={(v) => updateField("placenta_delivered", v)} />
            <FieldCheckbox label="Placenta íntegra" checked={form.placenta_complete} disabled={readOnly} onChange={(v) => updateField("placenta_complete", v)} />
            <FieldCheckbox label="Reanimación neonatal" checked={form.neonatal_resuscitation} disabled={readOnly} onChange={(v) => updateField("neonatal_resuscitation", v)} />
          </div>

          <div style={grid2}>
            <Field label="Complicaciones maternas">
              <textarea style={textAreaStyle} rows={3} value={form.maternal_complications} onChange={(e) => updateField("maternal_complications", e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="Complicaciones neonatales">
              <textarea style={textAreaStyle} rows={3} value={form.neonatal_complications} onChange={(e) => updateField("neonatal_complications", e.target.value)} disabled={readOnly} />
            </Field>
          </div>
        </Section>

        <Section title="Intervenciones y cierre">
          <div style={grid3}>
            <FieldCheckbox label="Oxígeno administrado" checked={form.oxygen_administered} disabled={readOnly} onChange={(v) => updateField("oxygen_administered", v)} />
            <FieldCheckbox label="Acceso IV" checked={form.iv_access} disabled={readOnly} onChange={(v) => updateField("iv_access", v)} />
            <FieldCheckbox label="Control de hemorragia" checked={form.hemorrhage_control} disabled={readOnly} onChange={(v) => updateField("hemorrhage_control", v)} />
          </div>

          <div style={grid3}>
            <FieldCheckbox label="Pinzamiento de cordón" checked={form.cord_clamping} disabled={readOnly} onChange={(v) => updateField("cord_clamping", v)} />
            <FieldCheckbox label="Contacto piel a piel" checked={form.skin_to_skin_contact} disabled={readOnly} onChange={(v) => updateField("skin_to_skin_contact", v)} />
            <FieldCheckbox label="Abrigo térmico RN" checked={form.newborn_thermal_care} disabled={readOnly} onChange={(v) => updateField("newborn_thermal_care", v)} />
          </div>

          <div style={grid2}>
            <Field label="Destino madre">
              <input style={controlStyle} value={form.mother_destination} onChange={(e) => updateField("mother_destination", e.target.value)} disabled={readOnly} />
            </Field>
            <Field label="Destino RN">
              <input style={controlStyle} value={form.newborn_destination} onChange={(e) => updateField("newborn_destination", e.target.value)} disabled={readOnly} />
            </Field>
          </div>

          <Field label="Observaciones">
            <textarea
              style={textAreaStyle}
              rows={4}
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              disabled={readOnly}
              placeholder="Ej. Paciente en trabajo de parto activo, presentación cefálica."
            />
          </Field>

          <div style={grid2}>
            <FieldCheckbox label="Activo" checked={form.active} disabled={readOnly} onChange={(v) => updateField("active", v)} />
          </div>
        </Section>

        {!readOnly && (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar obstetricia"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={sectionStyle}>
      <div style={sectionTitleStyle}>{title}</div>
      <div style={{ display: "grid", gap: 12 }}>{children}</div>
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

const sectionStyle = {
  display: "grid",
  gap: 10,
  paddingTop: 6,
  borderTop: "1px solid #f3f4f6",
};

const sectionTitleStyle = {
  fontSize: 15,
  fontWeight: 800,
  color: "#111827",
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

const grid4 = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
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