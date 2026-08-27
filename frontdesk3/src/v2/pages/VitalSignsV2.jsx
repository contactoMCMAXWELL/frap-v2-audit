import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { v2Api } from "../api/v2";

const initialForm = {
  taken_at_label: "",
  blood_pressure: "",
  heart_rate: "",
  respiratory_rate: "",
  spo2: "",
  temperature: "",
  glucose: "",
  pain_scale: "",
  pupils: "",
  notes: "",
};

export default function VitalSignsV2({ session, onDataChanged }) {
  const { intakeId } = useParams();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await v2Api.frapVitalSignsList({
        intakeId,
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
      });

      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || "No se pudieron cargar los signos vitales");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (intakeId) load();
  }, [intakeId]);

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      await v2Api.frapVitalSignCreate({
        payload: {
          intake_id: intakeId,
          ...form,
        },
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
      });

      setForm(initialForm);
      await load();
      if (typeof onDataChanged === "function") {
        await onDataChanged();
      }
    } catch (e2) {
      setError(e2?.message || "No se pudo guardar el signo vital");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={cardStyle}>
      <h3 style={{ marginTop: 0 }}>Signos vitales seriados</h3>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10, marginBottom: 18 }}>
        <div style={grid3}>
          <label style={labelStyle}>
            Momento / etiqueta
            <input
              value={form.taken_at_label}
              onChange={(e) => onChange("taken_at_label", e.target.value)}
              placeholder="Inicial, 5 min, arribo, etc."
            />
          </label>

          <label style={labelStyle}>
            TA
            <input value={form.blood_pressure} onChange={(e) => onChange("blood_pressure", e.target.value)} />
          </label>

          <label style={labelStyle}>
            FC
            <input value={form.heart_rate} onChange={(e) => onChange("heart_rate", e.target.value)} />
          </label>
        </div>

        <div style={grid3}>
          <label style={labelStyle}>
            FR
            <input value={form.respiratory_rate} onChange={(e) => onChange("respiratory_rate", e.target.value)} />
          </label>

          <label style={labelStyle}>
            SpO2
            <input value={form.spo2} onChange={(e) => onChange("spo2", e.target.value)} />
          </label>

          <label style={labelStyle}>
            Temp
            <input value={form.temperature} onChange={(e) => onChange("temperature", e.target.value)} />
          </label>
        </div>

        <div style={grid3}>
          <label style={labelStyle}>
            Glucosa
            <input value={form.glucose} onChange={(e) => onChange("glucose", e.target.value)} />
          </label>

          <label style={labelStyle}>
            EVA dolor
            <input value={form.pain_scale} onChange={(e) => onChange("pain_scale", e.target.value)} />
          </label>

          <label style={labelStyle}>
            Pupilas
            <input value={form.pupils} onChange={(e) => onChange("pupils", e.target.value)} />
          </label>
        </div>

        <label style={labelStyle}>
          Notas
          <textarea rows={3} value={form.notes} onChange={(e) => onChange("notes", e.target.value)} />
        </label>

        <div>
          <button type="submit" disabled={saving}>
            {saving ? "Guardando..." : "Agregar signo vital"}
          </button>
        </div>
      </form>

      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {loading && <p style={{ color: "#6b7280" }}>Cargando signos vitales...</p>}

      {!loading && !items.length && (
        <p style={{ color: "#6b7280" }}>Aún no hay signos vitales registrados.</p>
      )}

      {!!items.length && (
        <div style={{ display: "grid", gap: 10 }}>
          {items.map((row) => (
            <div key={row.id} style={itemStyle}>
              <strong>{row.taken_at_label || "Registro"}</strong>
              <div>TA: {row.blood_pressure || "-"}</div>
              <div>FC: {row.heart_rate || "-"}</div>
              <div>FR: {row.respiratory_rate || "-"}</div>
              <div>SpO2: {row.spo2 || "-"}</div>
              <div>Temp: {row.temperature || "-"}</div>
              <div>Glucosa: {row.glucose || "-"}</div>
              <div>Dolor: {row.pain_scale || "-"}</div>
              <div>Pupilas: {row.pupils || "-"}</div>
              {row.notes && <div>Notas: {row.notes}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const cardStyle = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 18,
};

const itemStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: 12,
  background: "#fafafa",
};

const labelStyle = {
  display: "grid",
  gap: 6,
};

const grid3 = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
};