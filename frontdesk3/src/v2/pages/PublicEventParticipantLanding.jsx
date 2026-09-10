import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { participantProtectionApi } from "../api/participantProtection";

const initialParticipant = {
  participant_number: "",
  first_name: "",
  paternal_surname: "",
  maternal_surname: "",
  birth_date: "",
  phone: "",
  email: "",
  state_origin: "",
  city_origin: "",
  category: "",
  team_name: "",
  vehicle_type: "",
  vehicle_number: "",
};

export default function PublicEventParticipantLanding() {
  const { publicToken } = useParams();
  const [event, setEvent] = useState(null);
  const [form, setForm] = useState(initialParticipant);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null);

  useEffect(() => {
    let mounted = true;
    participantProtectionApi.publicEvent({ publicToken })
      .then((data) => {
        if (mounted) setEvent(data);
      })
      .catch((e) => {
        if (mounted) setError(e?.message || "Evento no disponible.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [publicToken]);

  const onChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError("");
      const result = await participantProtectionApi.publicRegister({
        publicToken,
        payload: {
          ...form,
          participant_number: form.participant_number.trim() || null,
          first_name: form.first_name.trim(),
          paternal_surname: form.paternal_surname.trim(),
          maternal_surname: form.maternal_surname.trim() || null,
          birth_date: form.birth_date || null,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          state_origin: form.state_origin.trim() || null,
          city_origin: form.city_origin.trim() || null,
          category: form.category.trim() || null,
          team_name: form.team_name.trim() || null,
          vehicle_type: form.vehicle_type.trim() || null,
          vehicle_number: form.vehicle_number.trim() || null,
        },
      });
      setCreated(result);
    } catch (e2) {
      setError(e2?.message || "No fue posible iniciar tu registro.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <main style={pageStyle}><div style={cardStyle}>Cargando evento...</div></main>;
  if (!event) return <main style={pageStyle}><div style={cardStyle}>{error || "Evento no disponible."}</div></main>;

  if (created) {
    return (
      <main style={pageStyle}>
        <section style={cardStyle}>
          <div style={{ fontSize: 44 }}>✓</div>
          <h1>Registro iniciado</h1>
          <p>Tu identificación básica quedó asociada al evento.</p>
          <p><strong>Estado:</strong> {created.status}</p>
          <p style={{ color: "#6b7280" }}>
            En el siguiente corte añadiremos tu ficha médica, contactos de emergencia, consentimiento y QR individual.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <section style={heroStyle}>
        {event.cover_image_url && (
          <img src={event.cover_image_url} alt="Portada del evento" style={coverStyle} />
        )}
        <div style={{ padding: 24 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            {event.organizer_logo_url && (
              <img src={event.organizer_logo_url} alt="Organizador" style={{ width: 72, height: 72, objectFit: "contain", borderRadius: 12, background: "white" }} />
            )}
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>
                Protección Médica del Participante
              </div>
              <h1 style={{ margin: "6px 0" }}>{event.public_event_name}</h1>
              <div>{event.organizer_name || "Evento"}</div>
            </div>
          </div>
          {event.organizer_message && <p style={{ fontSize: 18 }}>{event.organizer_message}</p>}
          <div style={{ marginTop: 12, opacity: 0.85 }}>
            Servicio médico: {event.ambulance_company_name || "AmbulanciaYA"}
          </div>
        </div>
      </section>

      <section style={cardStyle}>
        <h2>Tu seguridad también se prepara antes del evento</h2>
        <p>
          Registra tus datos básicos para que el equipo médico pueda identificarte rápidamente en caso de requerir atención.
        </p>
        <div style={benefitsStyle}>
          <div><strong>Identificación rápida</strong><br />Relaciona tu nombre y número de participante.</div>
          <div><strong>Atención preparada</strong><br />La ficha médica se añadirá en el siguiente paso.</div>
          <div><strong>Acceso restringido</strong><br />Tus datos médicos no forman parte de una búsqueda pública.</div>
        </div>
      </section>

      <section style={cardStyle}>
        <h2>Registrar mi ficha de seguridad</h2>
        {!event.registration_open ? (
          <div style={warningStyle}>El registro público de este evento está cerrado.</div>
        ) : (
          <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
            <div style={twoColumns}>
              <label style={labelStyle}>Nombre<input required value={form.first_name} onChange={(e) => onChange("first_name", e.target.value)} /></label>
              <label style={labelStyle}>Apellido paterno<input required value={form.paternal_surname} onChange={(e) => onChange("paternal_surname", e.target.value)} /></label>
            </div>
            <div style={twoColumns}>
              <label style={labelStyle}>Apellido materno<input value={form.maternal_surname} onChange={(e) => onChange("maternal_surname", e.target.value)} /></label>
              <label style={labelStyle}>Fecha de nacimiento<input type="date" value={form.birth_date} onChange={(e) => onChange("birth_date", e.target.value)} /></label>
            </div>
            <div style={twoColumns}>
              <label style={labelStyle}>Teléfono<input inputMode="tel" value={form.phone} onChange={(e) => onChange("phone", e.target.value)} /></label>
              <label style={labelStyle}>Correo electrónico<input type="email" value={form.email} onChange={(e) => onChange("email", e.target.value)} /></label>
            </div>
            <div style={twoColumns}>
              <label style={labelStyle}>Número de participante<input value={form.participant_number} onChange={(e) => onChange("participant_number", e.target.value)} /></label>
              <label style={labelStyle}>Categoría<input value={form.category} onChange={(e) => onChange("category", e.target.value)} /></label>
            </div>
            <div style={twoColumns}>
              <label style={labelStyle}>Equipo / escudería<input value={form.team_name} onChange={(e) => onChange("team_name", e.target.value)} /></label>
              <label style={labelStyle}>Tipo de vehículo<input value={form.vehicle_type} onChange={(e) => onChange("vehicle_type", e.target.value)} /></label>
            </div>
            <label style={labelStyle}>Número de vehículo<input value={form.vehicle_number} onChange={(e) => onChange("vehicle_number", e.target.value)} /></label>
            {error && <div style={errorStyle}>{error}</div>}
            <button type="submit" disabled={saving} style={primaryButtonStyle}>
              {saving ? "Registrando..." : "Continuar con mi registro"}
            </button>
          </form>
        )}
      </section>

      <section style={{ ...cardStyle, fontSize: 14, color: "#4b5563" }}>
        <strong>Privacidad</strong>
        <p>
          Este primer paso registra únicamente datos básicos. La captura de datos personales sensibles y el consentimiento explícito se incorporarán antes de completar la ficha médica.
        </p>
        <div>Aviso de privacidad: versión {event.privacy_notice_version}</div>
      </section>
    </main>
  );
}

const pageStyle = { minHeight: "100vh", background: "#f3f4f6", padding: "22px 14px 60px", fontFamily: "system-ui, sans-serif" };
const heroStyle = { maxWidth: 980, margin: "0 auto 18px", background: "#111827", color: "white", borderRadius: 20, overflow: "hidden" };
const coverStyle = { width: "100%", maxHeight: 320, objectFit: "cover", display: "block" };
const cardStyle = { maxWidth: 930, margin: "0 auto 18px", background: "white", borderRadius: 18, padding: 24, boxShadow: "0 8px 30px rgba(0,0,0,.06)" };
const benefitsStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginTop: 18 };
const twoColumns = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 };
const labelStyle = { display: "grid", gap: 6, fontWeight: 650 };
const primaryButtonStyle = { padding: "14px 18px", fontWeight: 800, fontSize: 16, cursor: "pointer" };
const warningStyle = { padding: 14, borderRadius: 12, background: "#fef3c7", color: "#92400e" };
const errorStyle = { padding: 14, borderRadius: 12, background: "#fee2e2", color: "#991b1b" };
