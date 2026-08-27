import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { v2Api } from "../api/v2";

function formatUiError(err, fallback) {
  const msg = String(err?.message || "").trim();
  if (msg) return msg;
  return fallback;
}

const initialForm = {
  patient_name: "",
  patient_age: "",
  patient_sex: "",
  patient_birth_date: "",
  patient_identifier: "",
  patient_address: "",
  responsible_name: "",
  responsible_relationship: "",
  responsible_phone: "",
  pregnancy_status: "",
  gestational_weeks: "",
  allergies: "",
  current_medications: "",
  relevant_history: "",
  chief_complaint: "",
  mechanism_of_injury: "",
  clinical_impression: "",
  consciousness_level: "",
  airway_status: "",
  breathing_status: "",
  circulation_status: "",
  narrative: "",
  destination_outcome: "",
  refusal_of_care: false,
  active: true,
};

export default function FrapClinicalV2({ session, readOnly = false }) {
  const { intakeId } = useParams();

  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const onChange = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const data = await v2Api.frapClinicalGet({
        intakeId,
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
      });

      if (!data) return;

      setForm({
        patient_name: data?.patient_name || "",
        patient_age: data?.patient_age || "",
        patient_sex: data?.patient_sex || "",
        patient_birth_date: data?.patient_birth_date || "",
        patient_identifier: data?.patient_identifier || "",
        patient_address: data?.patient_address || "",
        responsible_name: data?.responsible_name || "",
        responsible_relationship: data?.responsible_relationship || "",
        responsible_phone: data?.responsible_phone || "",
        pregnancy_status: data?.pregnancy_status || "",
        gestational_weeks: data?.gestational_weeks ?? "",
        allergies: data?.allergies || "",
        current_medications: data?.current_medications || "",
        relevant_history: data?.relevant_history || "",
        chief_complaint: data?.chief_complaint || "",
        mechanism_of_injury: data?.mechanism_of_injury || "",
        clinical_impression: data?.clinical_impression || "",
        consciousness_level: data?.consciousness_level || "",
        airway_status: data?.airway_status || "",
        breathing_status: data?.breathing_status || "",
        circulation_status: data?.circulation_status || "",
        narrative: data?.narrative || "",
        destination_outcome: data?.destination_outcome || "",
        refusal_of_care: !!data?.refusal_of_care,
        active: !!data?.active,
      });
    } catch (e) {
      if (!String(e?.message || "").includes("404")) {
        setError(formatUiError(e, "No se pudo cargar FRAP clínico"));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (intakeId) load();
  }, [intakeId]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (readOnly) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const payload = {
        intake_id: intakeId,
        ...form,
        patient_birth_date: form.patient_birth_date ? form.patient_birth_date : null,
        gestational_weeks:
          form.gestational_weeks === ""
            ? null
            : Number(form.gestational_weeks),
        refusal_of_care: !!form.refusal_of_care,
        active: !!form.active,
      };

      await v2Api.frapClinicalSave({
        payload,
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
      });

      setMessage("FRAP clínico guardado correctamente.");
      await load();
    } catch (e2) {
      setError(formatUiError(e2, "No se pudo guardar FRAP clínico"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={cardStyle}>
      <h3 style={titleStyle}>FRAP clínico</h3>

      {loading && <p style={{ color: "#6b7280" }}>Cargando...</p>}
      {error && <p style={{ color: "crimson", whiteSpace: "pre-wrap" }}>{error}</p>}
      {message && <p style={{ color: "#166534" }}>{message}</p>}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 14, paddingBottom: 96 }}>
        <div style={sectionTitle}>Identificación del paciente</div>

        <div style={grid3}>
          <Field label="Nombre del paciente">
            <input
              style={controlStyle}
              value={form.patient_name}
              disabled={readOnly}
              onChange={(e) => onChange("patient_name", e.target.value)}
            />
          </Field>

          <Field label="Edad">
            <input
              style={controlStyle}
              value={form.patient_age}
              disabled={readOnly}
              onChange={(e) => onChange("patient_age", e.target.value)}
            />
          </Field>

          <Field label="Sexo">
            <select
              style={controlStyle}
              value={form.patient_sex}
              disabled={readOnly}
              onChange={(e) => onChange("patient_sex", e.target.value)}
            >
              <option value="">Seleccionar</option>
              <option value="female">Femenino</option>
              <option value="male">Masculino</option>
              <option value="other">Otro</option>
            </select>
          </Field>
        </div>

        <div style={grid2}>
          <Field label="Fecha de nacimiento">
            <input
              style={controlStyle}
              type="date"
              value={form.patient_birth_date}
              disabled={readOnly}
              onChange={(e) => onChange("patient_birth_date", e.target.value)}
            />
          </Field>

          <Field label="Identificación">
            <input
              style={controlStyle}
              value={form.patient_identifier}
              disabled={readOnly}
              onChange={(e) => onChange("patient_identifier", e.target.value)}
            />
          </Field>
        </div>

        <Field label="Domicilio">
          <input
            style={controlStyle}
            value={form.patient_address}
            disabled={readOnly}
            onChange={(e) => onChange("patient_address", e.target.value)}
          />
        </Field>

        <div style={grid3}>
          <Field label="Responsable">
            <input
              style={controlStyle}
              value={form.responsible_name}
              disabled={readOnly}
              onChange={(e) => onChange("responsible_name", e.target.value)}
            />
          </Field>

          <Field label="Parentesco">
            <input
              style={controlStyle}
              value={form.responsible_relationship}
              disabled={readOnly}
              onChange={(e) => onChange("responsible_relationship", e.target.value)}
            />
          </Field>

          <Field label="Teléfono responsable">
            <input
              style={controlStyle}
              value={form.responsible_phone}
              disabled={readOnly}
              onChange={(e) => onChange("responsible_phone", e.target.value)}
            />
          </Field>
        </div>

        <div style={grid2}>
          <Field label="Embarazo">
            <select
              style={controlStyle}
              value={form.pregnancy_status}
              disabled={readOnly}
              onChange={(e) => onChange("pregnancy_status", e.target.value)}
            >
              <option value="">No aplica</option>
              <option value="no">No</option>
              <option value="yes">Sí</option>
              <option value="unknown">Desconocido</option>
            </select>
          </Field>

          <Field label="Semanas de gestación">
            <input
              style={controlStyle}
              type="number"
              value={form.gestational_weeks}
              disabled={readOnly}
              onChange={(e) => onChange("gestational_weeks", e.target.value)}
            />
          </Field>
        </div>

        <div style={sectionTitle}>Antecedentes</div>

        <Field label="Alergias">
          <textarea
            style={textAreaStyle}
            rows={3}
            value={form.allergies}
            disabled={readOnly}
            onChange={(e) => onChange("allergies", e.target.value)}
          />
        </Field>

        <Field label="Medicamentos habituales">
          <textarea
            style={textAreaStyle}
            rows={3}
            value={form.current_medications}
            disabled={readOnly}
            onChange={(e) => onChange("current_medications", e.target.value)}
          />
        </Field>

        <Field label="Antecedentes relevantes">
          <textarea
            style={textAreaStyle}
            rows={3}
            value={form.relevant_history}
            disabled={readOnly}
            onChange={(e) => onChange("relevant_history", e.target.value)}
          />
        </Field>

        <div style={sectionTitle}>Motivo de atención</div>

        <Field label="Motivo principal">
          <textarea
            style={textAreaStyle}
            rows={3}
            value={form.chief_complaint}
            disabled={readOnly}
            onChange={(e) => onChange("chief_complaint", e.target.value)}
          />
        </Field>

        <Field label="Mecanismo / contexto">
          <textarea
            style={textAreaStyle}
            rows={3}
            value={form.mechanism_of_injury}
            disabled={readOnly}
            onChange={(e) => onChange("mechanism_of_injury", e.target.value)}
          />
        </Field>

        <Field label="Impresión clínica general">
          <textarea
            style={textAreaStyle}
            rows={3}
            value={form.clinical_impression}
            disabled={readOnly}
            onChange={(e) => onChange("clinical_impression", e.target.value)}
          />
        </Field>

        <div style={sectionTitle}>Estado clínico</div>

        <div style={grid4}>
          <Field label="Conciencia">
            <input
              style={controlStyle}
              value={form.consciousness_level}
              disabled={readOnly}
              onChange={(e) => onChange("consciousness_level", e.target.value)}
            />
          </Field>

          <Field label="Vía aérea">
            <input
              style={controlStyle}
              value={form.airway_status}
              disabled={readOnly}
              onChange={(e) => onChange("airway_status", e.target.value)}
            />
          </Field>

          <Field label="Respiración">
            <input
              style={controlStyle}
              value={form.breathing_status}
              disabled={readOnly}
              onChange={(e) => onChange("breathing_status", e.target.value)}
            />
          </Field>

          <Field label="Circulación">
            <input
              style={controlStyle}
              value={form.circulation_status}
              disabled={readOnly}
              onChange={(e) => onChange("circulation_status", e.target.value)}
            />
          </Field>
        </div>

        <div style={sectionTitle}>Narrativa</div>

        <Field label="Narrativa clínica">
          <textarea
            style={narrativeStyle}
            rows={5}
            value={form.narrative}
            disabled={readOnly}
            onChange={(e) => onChange("narrative", e.target.value)}
          />
        </Field>

        <Field label="Resultado / destino">
          <input
            style={controlStyle}
            value={form.destination_outcome}
            disabled={readOnly}
            onChange={(e) => onChange("destination_outcome", e.target.value)}
          />
        </Field>

        {!readOnly ? (
          <div style={actionBarStyle}>
            <button type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar FRAP clínico"}
            </button>
          </div>
        ) : (
          <div style={{ color: "#6b7280", fontSize: 13 }}>
            Este perfil tiene acceso de consulta al FRAP clínico.
          </div>
        )}
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={fieldStyle}>
      <div style={labelText}>{label}</div>
      {children}
    </div>
  );
}

const cardStyle = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 18,
};

const titleStyle = {
  marginTop: 0,
  marginBottom: 8,
  fontSize: 28,
  fontWeight: 800,
  color: "#0f172a",
};

const fieldStyle = {
  display: "grid",
  gap: 6,
};

const labelText = {
  fontSize: 14,
  fontWeight: 700,
  color: "#111827",
};

const sectionTitle = {
  fontWeight: 800,
  fontSize: 15,
  color: "#111827",
  marginTop: 4,
};

const grid2 = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 12,
};

const grid3 = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
  alignItems: "end",
};

const grid4 = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
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

const narrativeStyle = {
  ...controlStyle,
  minHeight: 140,
  resize: "vertical",
};

const actionBarStyle = {
  position: "sticky",
  bottom: 12,
  display: "flex",
  justifyContent: "flex-start",
  paddingTop: 8,
  background: "linear-gradient(180deg, rgba(255,255,255,0) 0%, #ffffff 28px)",
};
