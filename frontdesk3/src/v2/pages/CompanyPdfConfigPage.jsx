import React, { useEffect, useMemo, useState } from "react";
import { v2Api } from "../api/v2";

const initialForm = {
  include_legal_legend: true,
  legal_legend_text: "",

  include_signature_legend: true,
  signature_legend_text: "",

  include_footer_legend: true,
  footer_legend_text: "",

  include_privacy_notice: false,
  privacy_notice_text: "",

  include_insurance_legend: false,
  insurance_legend_text: "",
};

export default function CompanyPdfConfigPage({ session }) {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const canEdit = useMemo(() => {
    const role = session?.role || "";
    return role === "SUPERADMIN" || role === "ADMIN";
  }, [session]);

  async function load() {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const data = await v2Api.companyPdfConfigGet({
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
      });

      if (!data) {
        setForm(initialForm);
        return;
      }

      setForm({
        include_legal_legend: !!data.include_legal_legend,
        legal_legend_text: data.legal_legend_text || "",

        include_signature_legend: !!data.include_signature_legend,
        signature_legend_text: data.signature_legend_text || "",

        include_footer_legend: !!data.include_footer_legend,
        footer_legend_text: data.footer_legend_text || "",

        include_privacy_notice: !!data.include_privacy_notice,
        privacy_notice_text: data.privacy_notice_text || "",

        include_insurance_legend: !!data.include_insurance_legend,
        insurance_legend_text: data.insurance_legend_text || "",
      });
    } catch (e) {
      setError(e?.message || "No se pudo cargar la configuración PDF.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save(e) {
    if (e) e.preventDefault();
    if (!canEdit) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");

      await v2Api.companyPdfConfigUpsert({
        payload: form,
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
      });

      setMessage("Configuración PDF guardada correctamente.");
      await load();
    } catch (e2) {
      setError(e2?.message || "No se pudo guardar la configuración PDF.");
    } finally {
      setSaving(false);
    }
  }

  if (!canEdit) {
    return (
      <div style={cardStyle}>
        <h3 style={{ margin: 0 }}>Configuración PDF</h3>
        <div style={helpStyle}>
          No tienes permisos para acceder a esta sección.
        </div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <div>
          <h3 style={{ margin: 0 }}>Configuración PDF</h3>
          <div style={helpStyle}>
            Define qué leyendas legales aparecerán en el PDF final de la empresa.
          </div>
        </div>
      </div>

      {loading ? <div style={helpStyle}>Cargando configuración...</div> : null}
      {error ? <div style={{ ...helpStyle, color: "#b91c1c" }}>{error}</div> : null}
      {message ? <div style={{ ...helpStyle, color: "#047857" }}>{message}</div> : null}

      <form onSubmit={save} style={{ display: "grid", gap: 16 }}>
        <LegendSection
          title="Leyenda legal general"
          checked={form.include_legal_legend}
          onToggle={(v) => updateField("include_legal_legend", v)}
          disabled={saving}
        >
          <textarea
            style={textAreaStyle}
            rows={4}
            value={form.legal_legend_text}
            onChange={(e) => updateField("legal_legend_text", e.target.value)}
            disabled={saving}
            placeholder="Texto legal general del PDF."
          />
        </LegendSection>

        <LegendSection
          title="Leyenda de firma"
          checked={form.include_signature_legend}
          onToggle={(v) => updateField("include_signature_legend", v)}
          disabled={saving}
        >
          <textarea
            style={textAreaStyle}
            rows={4}
            value={form.signature_legend_text}
            onChange={(e) => updateField("signature_legend_text", e.target.value)}
            disabled={saving}
            placeholder="Texto para firmas y validación del servicio."
          />
        </LegendSection>

        <LegendSection
          title="Leyenda de pie de página"
          checked={form.include_footer_legend}
          onToggle={(v) => updateField("include_footer_legend", v)}
          disabled={saving}
        >
          <textarea
            style={textAreaStyle}
            rows={4}
            value={form.footer_legend_text}
            onChange={(e) => updateField("footer_legend_text", e.target.value)}
            disabled={saving}
            placeholder="Texto de pie de página del PDF."
          />
        </LegendSection>

        <LegendSection
          title="Aviso de privacidad"
          checked={form.include_privacy_notice}
          onToggle={(v) => updateField("include_privacy_notice", v)}
          disabled={saving}
        >
          <textarea
            style={textAreaStyle}
            rows={4}
            value={form.privacy_notice_text}
            onChange={(e) => updateField("privacy_notice_text", e.target.value)}
            disabled={saving}
            placeholder="Aviso de privacidad para el PDF."
          />
        </LegendSection>

        <LegendSection
          title="Leyenda para aseguradoras"
          checked={form.include_insurance_legend}
          onToggle={(v) => updateField("include_insurance_legend", v)}
          disabled={saving}
        >
          <textarea
            style={textAreaStyle}
            rows={4}
            value={form.insurance_legend_text}
            onChange={(e) => updateField("insurance_legend_text", e.target.value)}
            disabled={saving}
            placeholder="Leyenda para conciliación, auditoría o reembolso."
          />
        </LegendSection>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" disabled={saving}>
            {saving ? "Guardando..." : "Guardar configuración"}
          </button>
        </div>
      </form>
    </div>
  );
}

function LegendSection({ title, checked, onToggle, disabled, children }) {
  return (
    <div style={sectionStyle}>
      <div style={sectionHeaderStyle}>
        <div style={sectionTitleStyle}>{title}</div>
        <label style={checkboxLabelStyle}>
          <input
            type="checkbox"
            checked={!!checked}
            onChange={(e) => onToggle(e.target.checked)}
            disabled={disabled}
          />
          <span>{checked ? "Incluida" : "No incluida"}</span>
        </label>
      </div>
      {children}
    </div>
  );
}

const cardStyle = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 18,
  display: "grid",
  gap: 16,
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
};

const helpStyle = {
  fontSize: 14,
  color: "#6b7280",
  lineHeight: 1.5,
};

const sectionStyle = {
  display: "grid",
  gap: 10,
  padding: 14,
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  background: "#fafafa",
};

const sectionHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const sectionTitleStyle = {
  fontSize: 15,
  fontWeight: 800,
  color: "#111827",
};

const checkboxLabelStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontWeight: 600,
  color: "#111827",
};

const textAreaStyle = {
  width: "100%",
  minHeight: 96,
  padding: "10px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  boxSizing: "border-box",
  font: "inherit",
  background: "#fff",
  resize: "vertical",
};