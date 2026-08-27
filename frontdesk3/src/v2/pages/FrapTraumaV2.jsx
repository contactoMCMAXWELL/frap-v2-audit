import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { v2Api } from "../api/v2";

const initialForm = {
  trauma_type: "",
  mechanism: "",
  kinematics: "",
  safety_equipment: "",
  injured_regions: "",
  deformity: "",
  wounds: "",
  bleeding: "",
  burns: "",
  immobilization: "",
  trauma_priority: "",
  notes: "",
  active: true,
};

export default function FrapTraumaV2({ session, onDataChanged }) {
  const { intakeId } = useParams();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await v2Api.frapTraumaGet({
        intakeId,
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
      });

      setForm({
        trauma_type: data?.trauma_type || "",
        mechanism: data?.mechanism || "",
        kinematics: data?.kinematics || "",
        safety_equipment: data?.safety_equipment || "",
        injured_regions: data?.injured_regions || "",
        deformity: data?.deformity || "",
        wounds: data?.wounds || "",
        bleeding: data?.bleeding || "",
        burns: data?.burns || "",
        immobilization: data?.immobilization || "",
        trauma_priority: data?.trauma_priority || "",
        notes: data?.notes || "",
        active: data?.active ?? true,
      });
    } catch (e) {
      if (!String(e?.message || "").includes("404")) {
        setError(e?.message || "No se pudo cargar trauma");
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
    try {
      setSaving(true);
      setError("");

      await v2Api.frapTraumaUpsert({
        payload: {
          intake_id: intakeId,
          ...form,
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
      setError(e2?.message || "No se pudo guardar trauma");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={cardStyle}>
      <h3 style={{ marginTop: 0 }}>Trauma base</h3>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <div style={grid2}>
          <Field label="Tipo de trauma">
            <select
              style={controlStyle}
              value={form.trauma_type}
              onChange={(e) => onChange("trauma_type", e.target.value)}
            >
              <option value="">Seleccionar</option>
              <option value="blunt">Contuso</option>
              <option value="penetrating">Penetrante</option>
              <option value="burn">Quemadura</option>
              <option value="mixed">Mixto</option>
            </select>
          </Field>

          <Field label="Prioridad trauma">
            <select
              style={controlStyle}
              value={form.trauma_priority}
              onChange={(e) => onChange("trauma_priority", e.target.value)}
            >
              <option value="">Seleccionar</option>
              <option value="low">Baja</option>
              <option value="moderate">Moderada</option>
              <option value="high">Alta</option>
              <option value="critical">Crítica</option>
            </select>
          </Field>
        </div>

        <Field label="Mecanismo">
          <input
            style={controlStyle}
            value={form.mechanism}
            onChange={(e) => onChange("mechanism", e.target.value)}
          />
        </Field>

        <Field label="Cinemática">
          <input
            style={controlStyle}
            value={form.kinematics}
            onChange={(e) => onChange("kinematics", e.target.value)}
          />
        </Field>

        <Field label="Equipo de seguridad">
          <input
            style={controlStyle}
            value={form.safety_equipment}
            onChange={(e) => onChange("safety_equipment", e.target.value)}
          />
        </Field>

        <Field label="Regiones lesionadas">
          <textarea
            style={textAreaStyle}
            rows={3}
            value={form.injured_regions}
            onChange={(e) => onChange("injured_regions", e.target.value)}
          />
        </Field>

        <Field label="Deformidad">
          <textarea
            style={textAreaStyle}
            rows={3}
            value={form.deformity}
            onChange={(e) => onChange("deformity", e.target.value)}
          />
        </Field>

        <Field label="Heridas">
          <textarea
            style={textAreaStyle}
            rows={3}
            value={form.wounds}
            onChange={(e) => onChange("wounds", e.target.value)}
          />
        </Field>

        <Field label="Hemorragia">
          <textarea
            style={textAreaStyle}
            rows={3}
            value={form.bleeding}
            onChange={(e) => onChange("bleeding", e.target.value)}
          />
        </Field>

        <Field label="Quemaduras">
          <textarea
            style={textAreaStyle}
            rows={3}
            value={form.burns}
            onChange={(e) => onChange("burns", e.target.value)}
          />
        </Field>

        <Field label="Inmovilización">
          <textarea
            style={textAreaStyle}
            rows={3}
            value={form.immobilization}
            onChange={(e) => onChange("immobilization", e.target.value)}
          />
        </Field>

        <Field label="Notas trauma">
          <textarea
            style={textAreaStyle}
            rows={4}
            value={form.notes}
            onChange={(e) => onChange("notes", e.target.value)}
          />
        </Field>

        <div>
          <button type="submit" disabled={saving}>
            {saving ? "Guardando..." : "Guardar trauma"}
          </button>
        </div>
      </form>

      {loading && <p style={{ color: "#6b7280" }}>Cargando trauma...</p>}
      {error && <p style={{ color: "crimson" }}>{error}</p>}
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

const fieldStyle = {
  display: "grid",
  gap: 6,
};

const labelText = {
  fontSize: 14,
  fontWeight: 700,
  color: "#111827",
};

const grid2 = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
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