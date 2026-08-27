import React, { useState } from "react";
import { v2Api } from "../api/v2";

const initialState = {
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

export default function ServiceIntakeV2({ session }) {
  const [form, setForm] = useState(initialState);
  const [saved, setSaved] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      setSaved(null);

      const data = await v2Api.serviceIntakeCreate({
        payload: form,
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
      });

      setSaved(data);
      setForm(initialState);
    } catch (e2) {
      setError(e2?.message || "No se pudo guardar intake");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 920 }}>
      <h1>Registro profesional del servicio</h1>
      <form onSubmit={onSubmit}>
        <div>
          <label>Tipo de servicio</label><br />
          <input value={form.service_type} onChange={(e) => onChange("service_type", e.target.value)} />
        </div>

        <div>
          <label>Subtipo</label><br />
          <input value={form.service_subtype} onChange={(e) => onChange("service_subtype", e.target.value)} />
        </div>

        <div>
          <label>Origen de la llamada</label><br />
          <input value={form.call_source} onChange={(e) => onChange("call_source", e.target.value)} />
        </div>

        <div>
          <label>Solicitante</label><br />
          <input value={form.caller_name} onChange={(e) => onChange("caller_name", e.target.value)} />
        </div>

        <div>
          <label>Teléfono</label><br />
          <input value={form.caller_phone} onChange={(e) => onChange("caller_phone", e.target.value)} />
        </div>

        <div>
          <label>Ubicación</label><br />
          <input value={form.location_text} onChange={(e) => onChange("location_text", e.target.value)} />
        </div>

        <div>
          <label>Referencia</label><br />
          <input value={form.location_reference} onChange={(e) => onChange("location_reference", e.target.value)} />
        </div>

        <div>
          <label>Notas</label><br />
          <textarea value={form.notes} onChange={(e) => onChange("notes", e.target.value)} rows={4} />
        </div>

        <div style={{ marginTop: 16 }}>
          <button type="submit" disabled={loading}>
            {loading ? "Guardando..." : "Guardar intake"}
          </button>
        </div>
      </form>

      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {saved && <p style={{ color: "green" }}>Intake guardado: {saved.id}</p>}
    </div>
  );
}