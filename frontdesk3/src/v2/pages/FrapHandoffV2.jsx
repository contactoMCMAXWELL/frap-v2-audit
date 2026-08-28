import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { v2Api } from "../api/v2";
import { localInputToIso, toDatetimeLocalValue } from "../../utils/datetime";

const initialForm = {
  destination_hospital: "",
  receiving_person_name: "",
  receiving_person_role: "",
  handoff_summary: "",
  patient_final_condition: "",
  handoff_result: "",
  continuity_notes: "",
  handoff_at: "",
};

async function loadHospitalCatalogDirect({ token, companyId, userId }) {
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (companyId) headers["X-Company-Id"] = companyId;
  if (userId) headers["X-User-Id"] = userId;

  const response = await fetch("/api/v2/hospital-catalog/", {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `No se pudo cargar el catálogo de hospitales (${response.status})`);
  }

  const data = await response.json().catch(() => []);
  return Array.isArray(data) ? data : [];
}

export default function FrapHandoffV2({
  session,
  readOnly = false,
  isRetrospective = false,
}) {
  const { intakeId } = useParams();

  const [form, setForm] = useState(initialForm);
  const [hospitalCatalog, setHospitalCatalog] = useState([]);
  const [hospitalLoading, setHospitalLoading] = useState(false);
  const [selectedHospitalId, setSelectedHospitalId] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hospitalHint, setHospitalHint] = useState("");

  const loadHospitals = async () => {
    setHospitalLoading(true);
    setHospitalHint("");
    try {
      const hospitalsData = await loadHospitalCatalogDirect({
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
      });

      const clean = hospitalsData
        .filter((row) => row && row.id && String(row.name || "").trim())
        .filter((row) => row.active !== false)
        .sort((a, b) =>
          String(a.name || "").localeCompare(String(b.name || ""), "es", {
            sensitivity: "base",
          })
        );

      setHospitalCatalog(clean);
      if (clean.length === 0) {
        setHospitalHint(
          "No se encontraron hospitales activos para esta empresa. Verifica que existan en el catálogo de hospitales de la empresa activa."
        );
      }
      return clean;
    } catch (e) {
      setHospitalCatalog([]);
      setHospitalHint(e?.message || "No se pudo cargar el catálogo de hospitales");
      return [];
    } finally {
      setHospitalLoading(false);
    }
  };

  const load = async () => {
    try {
      setLoading(true);
      setError("");

      const [handoffData, hospitals] = await Promise.all([
        v2Api
          .frapHandoffGet({
            intakeId,
            token: session?.token,
            companyId: session?.companyId,
            userId: session?.userId,
          })
          .catch((e) => {
            if (!String(e?.message || "").includes("404")) throw e;
            return null;
          }),
        loadHospitals(),
      ]);

      if (handoffData) {
        setForm({
          destination_hospital: handoffData?.destination_hospital || "",
          receiving_person_name: handoffData?.receiving_person_name || "",
          receiving_person_role: handoffData?.receiving_person_role || "",
          handoff_summary: handoffData?.handoff_summary || "",
          patient_final_condition: handoffData?.patient_final_condition || "",
          handoff_result: handoffData?.handoff_result || "",
          continuity_notes: handoffData?.continuity_notes || "",
          handoff_at: toDatetimeLocalValue(handoffData?.handoff_at),
        });

        const match = hospitals.find(
          (row) =>
            String(row.name || "").trim().toLowerCase() ===
            String(handoffData?.destination_hospital || "").trim().toLowerCase()
        );
        setSelectedHospitalId(match?.id || "");
      } else {
        setForm(initialForm);
        setSelectedHospitalId("");
      }
    } catch (e) {
      setError(e?.message || "No se pudo cargar la entrega hospitalaria");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (intakeId) load();
  }, [intakeId, session?.companyId]);

  const selectedHospital = useMemo(
    () => hospitalCatalog.find((x) => x.id === selectedHospitalId) || null,
    [hospitalCatalog, selectedHospitalId]
  );

  useEffect(() => {
    if (!selectedHospital) return;
    setForm((prev) => ({
      ...prev,
      destination_hospital: selectedHospital.name || prev.destination_hospital,
    }));
  }, [selectedHospital]);

  const onChange = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (readOnly || !intakeId) return;

    if (isRetrospective && !form.handoff_at) {
      setError("Captura la fecha y hora declarada de la entrega.");
      return;
    }

    const handoffAtIso = form.handoff_at
      ? localInputToIso(form.handoff_at)
      : null;

    if (isRetrospective && !handoffAtIso) {
      setError("La fecha y hora declarada de la entrega no es válida.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      const payload = {
        intake_id: intakeId,
        ...form,
        handoff_at: handoffAtIso,
      };
      await v2Api.frapHandoffSave({
        payload,
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
      });
      await load();
    } catch (e2) {
      setError(e2?.message || "No se pudo guardar la entrega hospitalaria");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={cardStyle}>
      <h3 style={{ marginTop: 0 }}>Traslado y entrega</h3>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <fieldset
          disabled={readOnly}
          style={{ border: 0, padding: 0, margin: 0, minWidth: 0, display: "grid", gap: 12 }}
        >
        <div style={fieldStyle}>
          <div style={labelText}>Hospital del catálogo</div>
          <select
            style={controlStyle}
            value={selectedHospitalId}
            onChange={(e) => setSelectedHospitalId(e.target.value)}
            disabled={hospitalLoading || readOnly}
          >
            <option value="">
              {hospitalLoading ? "Cargando hospitales..." : "Selecciona un hospital"}
            </option>
            {hospitalCatalog.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </div>

        {!hospitalLoading && hospitalHint ? (
          <div style={hintWarningStyle}>{hospitalHint}</div>
        ) : null}

        {selectedHospital ? (
          <div style={hintBoxStyle}>
            <div><strong>Nivel:</strong> {selectedHospital.level || "-"}</div>
            <div><strong>Teléfono:</strong> {selectedHospital.phone || "-"}</div>
            <div><strong>Dirección:</strong> {selectedHospital.address || "-"}</div>
            <div><strong>Centro de trauma:</strong> {selectedHospital.trauma_center ? "Sí" : "No"}</div>
          </div>
        ) : null}

        <div style={grid2}>
          <div style={fieldStyle}>
            <div style={labelText}>Hospital destino</div>
            <input style={controlStyle} value={form.destination_hospital} onChange={(e) => onChange("destination_hospital", e.target.value)} />
          </div>
          <div style={fieldStyle}>
            <div style={labelText}>Fecha y hora de entrega</div>
            <input style={controlStyle} type="datetime-local" value={form.handoff_at} onChange={(e) => onChange("handoff_at", e.target.value)} />
          </div>
        </div>

        <div style={grid2}>
          <div style={fieldStyle}>
            <div style={labelText}>Persona que recibe</div>
            <input style={controlStyle} value={form.receiving_person_name} onChange={(e) => onChange("receiving_person_name", e.target.value)} />
          </div>
          <div style={fieldStyle}>
            <div style={labelText}>Cargo</div>
            <input style={controlStyle} value={form.receiving_person_role} onChange={(e) => onChange("receiving_person_role", e.target.value)} />
          </div>
        </div>

        <div style={fieldStyle}>
          <div style={labelText}>Resumen de entrega</div>
          <textarea style={textAreaStyle} rows={4} value={form.handoff_summary} onChange={(e) => onChange("handoff_summary", e.target.value)} />
        </div>

        <div style={grid2}>
          <div style={fieldStyle}>
            <div style={labelText}>Condición final del paciente</div>
            <input style={controlStyle} value={form.patient_final_condition} onChange={(e) => onChange("patient_final_condition", e.target.value)} />
          </div>
          <div style={fieldStyle}>
            <div style={labelText}>Resultado</div>
            <input style={controlStyle} value={form.handoff_result} onChange={(e) => onChange("handoff_result", e.target.value)} />
          </div>
        </div>

        <div style={fieldStyle}>
          <div style={labelText}>Notas de continuidad</div>
          <textarea style={textAreaStyle} rows={3} value={form.continuity_notes} onChange={(e) => onChange("continuity_notes", e.target.value)} />
        </div>

        {error ? <div style={errorStyle}>{error}</div> : null}
        {loading ? <div style={helpStyle}>Cargando entrega hospitalaria...</div> : null}

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" style={primaryButton} disabled={saving || loading}>
            {saving ? "Guardando..." : "Guardar traslado y entrega"}
          </button>
        </div>
        </fieldset>
      </form>
    </div>
  );
}

const cardStyle = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 20,
  boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
};
const fieldStyle = { display: "grid", gap: 6 };
const grid2 = { display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" };
const labelText = { fontSize: 14, fontWeight: 700, color: "#0f172a" };
const controlStyle = { width: "100%", minHeight: 42, borderRadius: 10, border: "1px solid #cbd5e1", padding: "10px 12px", fontSize: 14, background: "#fff" };
const textAreaStyle = { ...controlStyle, minHeight: 110, resize: "vertical" };
const primaryButton = { background: "#0f4c81", color: "#fff", border: "none", borderRadius: 10, padding: "10px 16px", fontWeight: 700, cursor: "pointer" };
const errorStyle = { color: "#991b1b", background: "#fef2f2", border: "1px solid #fecaca", padding: 10, borderRadius: 10 };
const helpStyle = { color: "#475569", fontSize: 13 };
const hintBoxStyle = { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, display: "grid", gap: 6, color: "#0f172a" };
const hintWarningStyle = { color: "#9a3412", background: "#fffbeb", border: "1px solid #fcd34d", padding: 10, borderRadius: 10 };
