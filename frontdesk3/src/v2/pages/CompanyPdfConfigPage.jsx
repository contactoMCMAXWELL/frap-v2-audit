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

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}

export default function CompanyPdfConfigPage({ session }) {
  const [form, setForm] = useState(initialForm);
  const [privacyNotices, setPrivacyNotices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishingPrivacy, setPublishingPrivacy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const canEdit = useMemo(() => {
    const role = session?.role || "";
    return role === "SUPERADMIN" || role === "ADMIN";
  }, [session]);

  const publishedPrivacyNotices = useMemo(
    () =>
      privacyNotices
        .filter(
          (notice) =>
            String(notice?.status || "").toUpperCase() === "PUBLISHED" &&
            Boolean(notice?.published_at)
        )
        .sort((a, b) => {
          const aTime = new Date(a?.published_at || a?.created_at || 0).getTime();
          const bTime = new Date(b?.published_at || b?.created_at || 0).getTime();
          return bTime - aTime;
        }),
    [privacyNotices]
  );

  const latestPublishedPrivacy = publishedPrivacyNotices[0] || null;

  async function loadPrivacyNotices() {
    const rows = await v2Api.companyPrivacyNoticesList({
      token: session?.token,
      companyId: session?.companyId,
      userId: session?.userId,
    });
    setPrivacyNotices(Array.isArray(rows) ? rows : []);
  }

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
      } else {
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
      }

      try {
        await loadPrivacyNotices();
      } catch (privacyError) {
        setPrivacyNotices([]);
        setError(
          privacyError?.message ||
            "La configuración PDF se cargó, pero no fue posible consultar las versiones publicadas del Aviso de Privacidad."
        );
      }
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

  async function publishPrivacyNotice() {
    if (!canEdit || publishingPrivacy || saving) return;

    if (!String(form.privacy_notice_text || "").trim()) {
      setError("Captura el Aviso de Privacidad antes de publicarlo.");
      setMessage("");
      return;
    }

    const confirmed = window.confirm(
      "Se guardará la configuración actual y se publicará una nueva versión inmutable del Aviso de Privacidad. ¿Deseas continuar?"
    );
    if (!confirmed) return;

    try {
      setPublishingPrivacy(true);
      setError("");
      setMessage("");

      await v2Api.companyPdfConfigUpsert({
        payload: form,
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
      });

      const published = await v2Api.companyPrivacyNoticePublishFromPdfConfig({
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
      });

      await loadPrivacyNotices();

      setMessage(
        `Aviso de Privacidad publicado correctamente como versión ${published?.version || ""}.`
      );
    } catch (e) {
      setError(e?.message || "No se pudo publicar el Aviso de Privacidad.");
    } finally {
      setPublishingPrivacy(false);
    }
  }

  if (!canEdit) {
    return (
      <div style={cardStyle}>
        <h3 style={{ margin: 0 }}>Configuración PDF</h3>
        <div style={helpStyle}>No tienes permisos para acceder a esta sección.</div>
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
          disabled={saving || publishingPrivacy}
        >
          <textarea style={textAreaStyle} rows={4} value={form.legal_legend_text}
            onChange={(e) => updateField("legal_legend_text", e.target.value)}
            disabled={saving || publishingPrivacy} placeholder="Texto legal general del PDF." />
        </LegendSection>

        <LegendSection
          title="Leyenda de firma"
          checked={form.include_signature_legend}
          onToggle={(v) => updateField("include_signature_legend", v)}
          disabled={saving || publishingPrivacy}
        >
          <textarea style={textAreaStyle} rows={4} value={form.signature_legend_text}
            onChange={(e) => updateField("signature_legend_text", e.target.value)}
            disabled={saving || publishingPrivacy} placeholder="Texto para firmas y validación del servicio." />
        </LegendSection>

        <LegendSection
          title="Leyenda de pie de página"
          checked={form.include_footer_legend}
          onToggle={(v) => updateField("include_footer_legend", v)}
          disabled={saving || publishingPrivacy}
        >
          <textarea style={textAreaStyle} rows={4} value={form.footer_legend_text}
            onChange={(e) => updateField("footer_legend_text", e.target.value)}
            disabled={saving || publishingPrivacy} placeholder="Texto de pie de página del PDF." />
        </LegendSection>

        <LegendSection
          title="Aviso de privacidad"
          checked={form.include_privacy_notice}
          onToggle={(v) => updateField("include_privacy_notice", v)}
          disabled={saving || publishingPrivacy}
        >
          <textarea
            style={{ ...textAreaStyle, minHeight: 180 }}
            rows={8}
            value={form.privacy_notice_text}
            onChange={(e) => updateField("privacy_notice_text", e.target.value)}
            disabled={saving || publishingPrivacy}
            placeholder="Captura aquí el Aviso de Privacidad completo de la empresa."
          />

          <div style={privacyPublishPanelStyle}>
            <div style={{ display: "grid", gap: 4 }}>
              <strong style={{ color: "#111827" }}>Publicación para consentimientos</strong>

              {latestPublishedPrivacy ? (
                <>
                  <span style={helpStyle}>
                    Versión publicada actual: <strong>v{latestPublishedPrivacy.version}</strong>
                  </span>
                  <span style={helpStyle}>
                    Publicada: {formatDate(latestPublishedPrivacy.published_at)}
                  </span>
                </>
              ) : (
                <span style={helpStyle}>
                  Esta empresa todavía no tiene un Aviso de Privacidad publicado.
                </span>
              )}

              <span style={helpStyle}>
                Al publicar se guarda una copia inmutable del texto actual. Los consentimientos
                anteriores conservan la versión que fue aceptada.
              </span>
              <span style={helpStyle}>
                El responsable, domicilio y correo se toman de los datos registrados de la empresa.
              </span>
            </div>

            <div>
              <button type="button" onClick={publishPrivacyNotice}
                disabled={saving || publishingPrivacy}>
                {publishingPrivacy ? "Publicando..." : "Publicar nueva versión"}
              </button>
            </div>
          </div>

          {publishedPrivacyNotices.length > 0 ? (
            <div style={versionsStyle}>
              <strong style={{ color: "#111827" }}>Versiones publicadas</strong>
              {publishedPrivacyNotices.map((notice) => (
                <div key={notice.id} style={versionRowStyle}>
                  <span>
                    <strong>v{notice.version}</strong> · {notice.title || "Aviso de Privacidad"}
                  </span>
                  <span style={helpStyle}>{formatDate(notice.published_at)}</span>
                </div>
              ))}
            </div>
          ) : null}
        </LegendSection>

        <LegendSection
          title="Leyenda para aseguradoras"
          checked={form.include_insurance_legend}
          onToggle={(v) => updateField("include_insurance_legend", v)}
          disabled={saving || publishingPrivacy}
        >
          <textarea style={textAreaStyle} rows={4} value={form.insurance_legend_text}
            onChange={(e) => updateField("insurance_legend_text", e.target.value)}
            disabled={saving || publishingPrivacy}
            placeholder="Leyenda para conciliación, auditoría o reembolso." />
        </LegendSection>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" disabled={saving || publishingPrivacy}>
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
          <input type="checkbox" checked={!!checked}
            onChange={(e) => onToggle(e.target.checked)} disabled={disabled} />
          <span>{checked ? "Incluida" : "No incluida"}</span>
        </label>
      </div>
      {children}
    </div>
  );
}

const cardStyle = {
  background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12,
  padding: 18, display: "grid", gap: 16,
};
const headerStyle = {
  display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12,
};
const helpStyle = { fontSize: 14, color: "#6b7280", lineHeight: 1.5 };
const sectionStyle = {
  display: "grid", gap: 10, padding: 14, border: "1px solid #e5e7eb",
  borderRadius: 10, background: "#fafafa",
};
const sectionHeaderStyle = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  gap: 12, flexWrap: "wrap",
};
const sectionTitleStyle = { fontSize: 15, fontWeight: 800, color: "#111827" };
const checkboxLabelStyle = {
  display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 600, color: "#111827",
};
const textAreaStyle = {
  width: "100%", minHeight: 96, padding: "10px 12px", border: "1px solid #d1d5db",
  borderRadius: 8, boxSizing: "border-box", font: "inherit", background: "#fff", resize: "vertical",
};
const privacyPublishPanelStyle = {
  display: "flex", justifyContent: "space-between", alignItems: "flex-start",
  gap: 16, flexWrap: "wrap", padding: 14, border: "1px solid #d1d5db",
  borderRadius: 10, background: "#fff",
};
const versionsStyle = {
  display: "grid", gap: 8, padding: 12, border: "1px solid #e5e7eb",
  borderRadius: 10, background: "#fff",
};
const versionRowStyle = {
  display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center",
  flexWrap: "wrap", paddingTop: 8, borderTop: "1px solid #f3f4f6",
};
