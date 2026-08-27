import React, { useEffect, useMemo, useState } from "react";
import { v2Api } from "../api/v2";

const cardStyle = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 18,
};

const sectionTitleStyle = {
  marginTop: 0,
  marginBottom: 14,
  fontSize: 28,
  fontWeight: 800,
  color: "#0f172a",
};

const blockTitleStyle = {
  marginTop: 0,
  marginBottom: 12,
  fontSize: 16,
  fontWeight: 800,
  color: "#111827",
};

const grid3 = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
};

const grid2 = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 12,
};

const grid6 = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
};

const fieldStyle = {
  display: "grid",
  gap: 6,
};

const labelStyle = {
  fontSize: 13,
  fontWeight: 700,
  color: "#374151",
};

const inputStyle = {
  width: "100%",
  minHeight: 42,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  boxSizing: "border-box",
  font: "inherit",
  background: "#fff",
  outline: "none",
};

const textareaStyle = {
  ...inputStyle,
  minHeight: 88,
  resize: "vertical",
};

const helpStyle = {
  fontSize: 12,
  color: "#6b7280",
};

function emptyForm() {
  return {
    avpu: "",
    glasgow_eye: "",
    glasgow_verbal: "",
    glasgow_motor: "",
    sample_s: "",
    sample_a: "",
    sample_m: "",
    sample_p: "",
    sample_l: "",
    sample_e: "",
    impression_primary: "",
    impression_secondary: "",
    triage: "",
  };
}

function toSafeInt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function isNotFoundError(error) {
  const status =
    error?.status ??
    error?.response?.status ??
    error?.response?.statusCode ??
    error?.cause?.status;

  if (status === 404) return true;

  const text =
    error?.message ||
    error?.detail ||
    error?.response?.data?.detail ||
    error?.cause?.message ||
    "";

  return String(text).toLowerCase().includes("assessment not found");
}

export default function FrapAssessmentV2({
  session,
  intakeId,
  readOnly = false,
}) {
  const [form, setForm] = useState(emptyForm());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    if (!intakeId) {
      setForm(emptyForm());
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const data = await v2Api.getAssessment({
        intakeId,
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
      });

      if (data) {
        setForm({
          avpu: data.avpu || "",
          glasgow_eye: data.glasgow_eye ?? "",
          glasgow_verbal: data.glasgow_verbal ?? "",
          glasgow_motor: data.glasgow_motor ?? "",
          sample_s: data.sample_s || "",
          sample_a: data.sample_a || "",
          sample_m: data.sample_m || "",
          sample_p: data.sample_p || "",
          sample_l: data.sample_l || "",
          sample_e: data.sample_e || "",
          impression_primary: data.impression_primary || "",
          impression_secondary: data.impression_secondary || "",
          triage: data.triage || "",
        });
      } else {
        setForm(emptyForm());
      }
    } catch (e) {
      if (isNotFoundError(e)) {
        setForm(emptyForm());
        setError("");
      } else {
        setError(e?.message || "No se pudo cargar la evaluación clínica.");
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

  const glasgowTotal = useMemo(() => {
    return (
      toSafeInt(form.glasgow_eye) +
      toSafeInt(form.glasgow_verbal) +
      toSafeInt(form.glasgow_motor)
    );
  }, [form.glasgow_eye, form.glasgow_verbal, form.glasgow_motor]);

  async function save() {
    if (readOnly || !intakeId) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");

      await v2Api.saveAssessment({
        payload: {
          intake_id: intakeId,
          avpu: form.avpu || null,
          glasgow_eye:
            form.glasgow_eye === "" ? null : Number(form.glasgow_eye),
          glasgow_verbal:
            form.glasgow_verbal === "" ? null : Number(form.glasgow_verbal),
          glasgow_motor:
            form.glasgow_motor === "" ? null : Number(form.glasgow_motor),
          sample_s: form.sample_s || null,
          sample_a: form.sample_a || null,
          sample_m: form.sample_m || null,
          sample_p: form.sample_p || null,
          sample_l: form.sample_l || null,
          sample_e: form.sample_e || null,
          impression_primary: form.impression_primary || null,
          impression_secondary: form.impression_secondary || null,
          triage: form.triage || null,
        },
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
      });

      setMessage("Evaluación clínica guardada correctamente.");
      await load();
    } catch (e) {
      setError(e?.message || "No se pudo guardar la evaluación clínica.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={cardStyle}>
      <h3 style={sectionTitleStyle}>Evaluación clínica</h3>

      {loading ? <div style={helpStyle}>Cargando evaluación...</div> : null}
      {error ? <div style={{ ...helpStyle, color: "#b91c1c" }}>{error}</div> : null}
      {message ? <div style={{ ...helpStyle, color: "#166534" }}>{message}</div> : null}

      <div style={{ display: "grid", gap: 18 }}>
        <section style={{ display: "grid", gap: 12 }}>
          <h4 style={blockTitleStyle}>Estado neurológico inicial</h4>

          <div style={{ ...grid3, alignItems: "end" }}>
            <div style={fieldStyle}>
              <div style={labelStyle}>AVPU</div>
              <select
                style={inputStyle}
                value={form.avpu}
                disabled={readOnly}
                onChange={(e) => updateField("avpu", e.target.value)}
              >
                <option value="">Selecciona una opción</option>
                <option value="A">Alerta</option>
                <option value="V">Responde a estímulo verbal</option>
                <option value="P">Responde al dolor</option>
                <option value="U">No responde</option>
              </select>
            </div>

            <div
              style={{
                border: "1px solid #dbeafe",
                background: "#eff6ff",
                color: "#1d4ed8",
                borderRadius: 12,
                padding: "12px 14px",
                fontWeight: 800,
                minHeight: 42,
                display: "flex",
                alignItems: "center",
              }}
            >
              Glasgow total: {glasgowTotal}
            </div>
          </div>

          <div style={grid3}>
            <div style={fieldStyle}>
              <div style={labelStyle}>Glasgow ocular</div>
              <input
                type="number"
                min="1"
                max="4"
                style={inputStyle}
                value={form.glasgow_eye}
                disabled={readOnly}
                onChange={(e) => updateField("glasgow_eye", e.target.value)}
              />
            </div>

            <div style={fieldStyle}>
              <div style={labelStyle}>Glasgow verbal</div>
              <input
                type="number"
                min="1"
                max="5"
                style={inputStyle}
                value={form.glasgow_verbal}
                disabled={readOnly}
                onChange={(e) => updateField("glasgow_verbal", e.target.value)}
              />
            </div>

            <div style={fieldStyle}>
              <div style={labelStyle}>Glasgow motor</div>
              <input
                type="number"
                min="1"
                max="6"
                style={inputStyle}
                value={form.glasgow_motor}
                disabled={readOnly}
                onChange={(e) => updateField("glasgow_motor", e.target.value)}
              />
            </div>
          </div>

          <div style={helpStyle}>
            Glasgow total calculado automáticamente con los tres componentes.
          </div>
        </section>

        <section style={{ display: "grid", gap: 12 }}>
          <h4 style={blockTitleStyle}>Historia clínica rápida — SAMPLE</h4>

          <div style={grid6}>
            <div style={fieldStyle}>
              <div style={labelStyle}>S — Signos y síntomas</div>
              <textarea
                style={textareaStyle}
                value={form.sample_s}
                disabled={readOnly}
                onChange={(e) => updateField("sample_s", e.target.value)}
              />
            </div>

            <div style={fieldStyle}>
              <div style={labelStyle}>A — Alergias</div>
              <textarea
                style={textareaStyle}
                value={form.sample_a}
                disabled={readOnly}
                onChange={(e) => updateField("sample_a", e.target.value)}
              />
            </div>

            <div style={fieldStyle}>
              <div style={labelStyle}>M — Medicamentos</div>
              <textarea
                style={textareaStyle}
                value={form.sample_m}
                disabled={readOnly}
                onChange={(e) => updateField("sample_m", e.target.value)}
              />
            </div>

            <div style={fieldStyle}>
              <div style={labelStyle}>P — Padecimientos previos</div>
              <textarea
                style={textareaStyle}
                value={form.sample_p}
                disabled={readOnly}
                onChange={(e) => updateField("sample_p", e.target.value)}
              />
            </div>

            <div style={fieldStyle}>
              <div style={labelStyle}>L — Última ingesta</div>
              <textarea
                style={textareaStyle}
                value={form.sample_l}
                disabled={readOnly}
                onChange={(e) => updateField("sample_l", e.target.value)}
              />
            </div>

            <div style={fieldStyle}>
              <div style={labelStyle}>E — Eventos relacionados</div>
              <textarea
                style={textareaStyle}
                value={form.sample_e}
                disabled={readOnly}
                onChange={(e) => updateField("sample_e", e.target.value)}
              />
            </div>
          </div>
        </section>

        <section style={{ display: "grid", gap: 12 }}>
          <h4 style={blockTitleStyle}>Impresión diagnóstica</h4>

          <div style={grid2}>
            <div style={fieldStyle}>
              <div style={labelStyle}>Impresión diagnóstica primaria</div>
              <textarea
                style={textareaStyle}
                value={form.impression_primary}
                disabled={readOnly}
                onChange={(e) => updateField("impression_primary", e.target.value)}
              />
            </div>

            <div style={fieldStyle}>
              <div style={labelStyle}>Impresión diagnóstica secundaria</div>
              <textarea
                style={textareaStyle}
                value={form.impression_secondary}
                disabled={readOnly}
                onChange={(e) => updateField("impression_secondary", e.target.value)}
              />
            </div>
          </div>

          <div style={{ ...grid2, alignItems: "end" }}>
            <div style={fieldStyle}>
              <div style={labelStyle}>Triage</div>
              <select
                style={inputStyle}
                value={form.triage}
                disabled={readOnly}
                onChange={(e) => updateField("triage", e.target.value)}
              >
                <option value="">Selecciona prioridad</option>
                <option value="rojo">Rojo</option>
                <option value="amarillo">Amarillo</option>
                <option value="verde">Verde</option>
                <option value="negro">Negro</option>
              </select>
            </div>

            {!readOnly ? (
              <div>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  style={{
                    minHeight: 42,
                    padding: "10px 16px",
                    borderRadius: 10,
                    border: "1px solid #111827",
                    background: saving ? "#e5e7eb" : "#111827",
                    color: saving ? "#111827" : "#fff",
                    fontWeight: 800,
                    cursor: saving ? "not-allowed" : "pointer",
                  }}
                >
                  {saving ? "Guardando..." : "Guardar evaluación"}
                </button>
              </div>
            ) : (
              <div style={helpStyle}>
                Este perfil tiene acceso de consulta a la evaluación clínica.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}