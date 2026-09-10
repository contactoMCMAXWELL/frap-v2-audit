import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { v2Api } from "../api/v2";
import { participantProtectionApi } from "../api/participantProtection";

const EVENT_TYPES = [
  ["automovilismo", "Automovilismo"],
  ["motociclismo", "Motociclismo"],
  ["ciclismo", "Ciclismo"],
  ["carrera_atletica", "Carrera atlética"],
  ["triatlon", "Triatlón"],
  ["evento_deportivo", "Evento deportivo"],
  ["evento_empresarial", "Evento empresarial"],
  ["espectaculo", "Espectáculo"],
  ["otro", "Otro"],
];

const emptyForm = {
  enabled: true,
  registration_open: true,
  event_type: "otro",
  public_event_name: "",
  organizer_name: "",
  registration_deadline: "",
  organizer_logo_url: "",
  cover_image_url: "",
  organizer_message: "",
  gallery_json: [],
  privacy_notice_version: "1.0",
  extra_json: {},
};

function toLocalInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function EventParticipantProtectionConfig({ session }) {
  const { intakeId } = useParams();
  const [intake, setIntake] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saved, setSaved] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const publicUrl = useMemo(() => {
    if (!saved?.public_token) return "";
    return `${window.location.origin}/evento/${saved.public_token}`;
  }, [saved?.public_token]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setError("");
        const intakeData = await v2Api.serviceIntakeGet({
          intakeId,
          token: session?.token,
          companyId: session?.companyId,
          userId: session?.userId,
        });
        if (!mounted) return;
        setIntake(intakeData);

        if (String(intakeData?.operation_mode || "").toLowerCase() !== "standby") {
          setError("Protección de Participantes sólo está disponible para guardias o coberturas.");
          return;
        }

        try {
          const config = await participantProtectionApi.get({
            intakeId,
            token: session?.token,
            companyId: session?.companyId,
            userId: session?.userId,
          });
          if (!mounted) return;
          setSaved(config);
          setForm({
            enabled: config.enabled !== false,
            registration_open: config.registration_open !== false,
            event_type: config.event_type || "otro",
            public_event_name: config.public_event_name || intakeData.standby_event_name || "",
            organizer_name: config.organizer_name || "",
            registration_deadline: toLocalInput(config.registration_deadline),
            organizer_logo_url: config.organizer_logo_url || "",
            cover_image_url: config.cover_image_url || "",
            organizer_message: config.organizer_message || "",
            gallery_json: Array.isArray(config.gallery_json) ? config.gallery_json : [],
            privacy_notice_version: config.privacy_notice_version || "1.0",
            extra_json: config.extra_json || {},
          });
          const rows = await participantProtectionApi.participants({
            intakeId,
            token: session?.token,
            companyId: session?.companyId,
            userId: session?.userId,
          });
          if (mounted) setParticipants(Array.isArray(rows) ? rows : []);
        } catch (configError) {
          if (configError?.status === 404) {
            setForm((prev) => ({
              ...prev,
              public_event_name: intakeData.standby_event_name || "",
            }));
          } else {
            throw configError;
          }
        }
      } catch (e) {
        if (mounted) setError(e?.message || "No fue posible cargar la configuración.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [intakeId, session?.token, session?.companyId, session?.userId]);

  const onChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const save = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const payload = {
        ...form,
        public_event_name: String(form.public_event_name || "").trim(),
        organizer_name: String(form.organizer_name || "").trim(),
        organizer_logo_url: String(form.organizer_logo_url || "").trim() || null,
        cover_image_url: String(form.cover_image_url || "").trim() || null,
        organizer_message: String(form.organizer_message || "").trim() || null,
        registration_deadline: form.registration_deadline
          ? new Date(form.registration_deadline).toISOString()
          : null,
      };
      const result = await participantProtectionApi.save({
        intakeId,
        payload,
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
      });
      setSaved(result);
      setMessage("Configuración guardada. La liga pública ya está disponible.");
    } catch (e2) {
      setError(e2?.message || "No fue posible guardar la configuración.");
    } finally {
      setSaving(false);
    }
  };

  const copyPublicUrl = async () => {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    setMessage("Liga pública copiada.");
  };

  if (loading) return <div style={{ padding: 24 }}>Cargando configuración...</div>;

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", paddingBottom: 80 }}>
      <h2 style={{ marginBottom: 4 }}>Protección de Participantes</h2>
      <p style={{ marginTop: 0, color: "#6b7280" }}>
        Configura el registro médico preventivo ligado a esta guardia o evento.
      </p>

      {intake && (
        <div style={infoStyle}>
          <strong>{intake.standby_event_name || intake.service_type || "Guardia"}</strong>
          <div>Esta configuración no crea FRAP ni modifica atenciones clínicas.</div>
        </div>
      )}

      {error && <div style={errorStyle}>{error}</div>}
      {message && <div style={successStyle}>{message}</div>}

      {!error && (
        <form onSubmit={save} style={{ display: "grid", gap: 18 }}>
          <section style={sectionStyle}>
            <h3 style={{ marginTop: 0 }}>Activación</h3>
            <label style={checkStyle}>
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => onChange("enabled", e.target.checked)}
              />
              Habilitar Protección de Participantes para este evento
            </label>
            <label style={checkStyle}>
              <input
                type="checkbox"
                checked={form.registration_open}
                onChange={(e) => onChange("registration_open", e.target.checked)}
              />
              Registro público abierto
            </label>
          </section>

          <section style={sectionStyle}>
            <h3 style={{ marginTop: 0 }}>Página pública</h3>
            <label style={labelStyle}>
              Tipo de evento
              <select value={form.event_type} onChange={(e) => onChange("event_type", e.target.value)}>
                {EVENT_TYPES.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label style={labelStyle}>
              Nombre público del evento
              <input value={form.public_event_name} onChange={(e) => onChange("public_event_name", e.target.value)} />
            </label>
            <label style={labelStyle}>
              Organizador
              <input value={form.organizer_name} onChange={(e) => onChange("organizer_name", e.target.value)} />
            </label>
            <label style={labelStyle}>
              Fecha límite de registro (opcional)
              <input type="datetime-local" value={form.registration_deadline} onChange={(e) => onChange("registration_deadline", e.target.value)} />
            </label>
            <label style={labelStyle}>
              Mensaje del organizador
              <textarea rows={3} maxLength={250} value={form.organizer_message} onChange={(e) => onChange("organizer_message", e.target.value)} />
              <small>{String(form.organizer_message || "").length}/250</small>
            </label>
            <label style={labelStyle}>
              URL del logo del organizador (temporal para primera prueba)
              <input value={form.organizer_logo_url} onChange={(e) => onChange("organizer_logo_url", e.target.value)} />
            </label>
            <label style={labelStyle}>
              URL de imagen de portada (temporal para primera prueba)
              <input value={form.cover_image_url} onChange={(e) => onChange("cover_image_url", e.target.value)} />
            </label>
            <label style={labelStyle}>
              Versión del aviso de privacidad
              <input value={form.privacy_notice_version} onChange={(e) => onChange("privacy_notice_version", e.target.value)} />
            </label>
          </section>

          <button type="submit" disabled={saving} style={primaryButtonStyle}>
            {saving ? "Guardando..." : saved ? "Guardar cambios" : "Activar Protección de Participantes"}
          </button>
        </form>
      )}

      {saved?.public_token && (
        <section style={{ ...sectionStyle, marginTop: 22 }}>
          <h3 style={{ marginTop: 0 }}>Liga pública generada</h3>
          <div style={urlBoxStyle}>{publicUrl}</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <button type="button" onClick={copyPublicUrl}>Copiar liga</button>
            <a href={publicUrl} target="_blank" rel="noreferrer">Ver página pública</a>
          </div>
          <div style={{ marginTop: 18 }}>
            <strong>Participantes registrados/iniciados:</strong> {participants.length}
          </div>
        </section>
      )}
    </div>
  );
}

const sectionStyle = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 20,
  display: "grid",
  gap: 14,
};
const labelStyle = { display: "grid", gap: 6, fontWeight: 600 };
const checkStyle = { display: "flex", gap: 10, alignItems: "center", fontWeight: 600 };
const infoStyle = { padding: 14, borderRadius: 12, background: "#f3f4f6", marginBottom: 18 };
const errorStyle = { padding: 14, borderRadius: 12, background: "#fee2e2", marginBottom: 18, color: "#991b1b" };
const successStyle = { padding: 14, borderRadius: 12, background: "#dcfce7", marginBottom: 18, color: "#166534" };
const primaryButtonStyle = { padding: "12px 18px", fontWeight: 700, cursor: "pointer" };
const urlBoxStyle = { padding: 12, borderRadius: 10, background: "#f9fafb", border: "1px solid #e5e7eb", overflowWrap: "anywhere" };
