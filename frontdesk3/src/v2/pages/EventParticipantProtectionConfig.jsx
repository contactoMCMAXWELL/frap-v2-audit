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

function ImagePreview({ src, alt, compact = false }) {
  if (!src) {
    return (
      <div style={{ ...imagePreviewStyle, ...(compact ? imagePreviewCompactStyle : {}) }}>
        <span style={{ color: "#8294a3", fontSize: 13 }}>Sin imagen configurada</span>
      </div>
    );
  }

  return (
    <div style={{ ...imagePreviewStyle, ...(compact ? imagePreviewCompactStyle : {}) }}>
      <img
        src={src}
        alt={alt}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: "block",
        }}
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
    </div>
  );
}

function normalizeParticipantSearch(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatParticipantDate(value) {
  if (!value) return "Sin registro";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin registro";

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
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
  const [galleryUrl, setGalleryUrl] = useState("");
  const [uploadingKind, setUploadingKind] = useState("");
  const [participantSearch, setParticipantSearch] = useState("");
  const [participantFilter, setParticipantFilter] = useState("TODOS");
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [activeSection, setActiveSection] = useState("resumen");

  const publicUrl = useMemo(() => {
    if (!saved?.public_token) return "";
    return `${window.location.origin}/evento/${saved.public_token}`;
  }, [saved?.public_token]);

  const participantStats = useMemo(() => {
    const completed = participants.filter(
      (participant) =>
        participant.status === "COMPLETO" ||
        participant.status === "ACTUALIZADO"
    ).length;

    const started = participants.filter(
      (participant) => participant.status === "INICIADO"
    ).length;

    return {
      total: participants.length,
      completed,
      started,
    };
  }, [participants]);

  const filteredParticipants = useMemo(() => {
    const search = normalizeParticipantSearch(participantSearch);

    return participants.filter((participant) => {
      const isCompleted =
        participant.status === "COMPLETO" ||
        participant.status === "ACTUALIZADO";

      if (participantFilter === "COMPLETOS" && !isCompleted) {
        return false;
      }

      if (
        participantFilter === "INICIADOS" &&
        participant.status !== "INICIADO"
      ) {
        return false;
      }

      if (!search) return true;

      const searchable = [
        participant.participant_number,
        participant.first_name,
        participant.paternal_surname,
        participant.maternal_surname,
        participant.category,
        participant.team_name,
        participant.vehicle_type,
        participant.vehicle_number,
        participant.vehicle_make_model,
        participant.vehicle_color,
        participant.vehicle_plates,
      ]
        .map(normalizeParticipantSearch)
        .join(" ");

      return searchable.includes(search);
    });
  }, [participants, participantSearch, participantFilter]);

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

  const uploadImage = async (kind, file) => {
    if (!file) return;

    if (kind === "gallery" && form.gallery_json.length >= 8) {
      setError("La galería admite hasta 8 imágenes.");
      return;
    }

    try {
      setUploadingKind(kind);
      setError("");
      setMessage("");

      const result = await participantProtectionApi.uploadEventImage({
        intakeId,
        kind,
        file,
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
      });

      const uploadedUrl = String(result?.url || "").trim();

      if (!uploadedUrl) {
        throw new Error("El servidor no devolvió la URL de la imagen.");
      }

      if (kind === "organizer_logo") {
        setForm((prev) => ({
          ...prev,
          organizer_logo_url: uploadedUrl,
        }));
      } else if (kind === "cover") {
        setForm((prev) => ({
          ...prev,
          cover_image_url: uploadedUrl,
        }));
      } else if (kind === "gallery") {
        setForm((prev) => {
          if (prev.gallery_json.includes(uploadedUrl)) return prev;

          return {
            ...prev,
            gallery_json: [...prev.gallery_json, uploadedUrl].slice(0, 8),
          };
        });
      }

      setMessage("Imagen cargada correctamente. Guarda los cambios para publicarla en el evento.");
    } catch (uploadError) {
      setError(uploadError?.message || "No fue posible cargar la imagen.");
    } finally {
      setUploadingKind("");
    }
  };

  const addGalleryImage = () => {
    const cleanUrl = String(galleryUrl || "").trim();
    if (!cleanUrl) return;

    if (form.gallery_json.length >= 8) {
      setError("La galería admite hasta 8 imágenes.");
      return;
    }

    if (form.gallery_json.includes(cleanUrl)) {
      setError("Esta imagen ya está agregada a la galería.");
      return;
    }

    setError("");
    setForm((prev) => ({
      ...prev,
      gallery_json: [...prev.gallery_json, cleanUrl],
    }));
    setGalleryUrl("");
  };

  const removeGalleryImage = (index) => {
    setForm((prev) => ({
      ...prev,
      gallery_json: prev.gallery_json.filter((_, i) => i !== index),
    }));
  };

  const moveGalleryImage = (index, direction) => {
    setForm((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.gallery_json.length) return prev;

      const nextGallery = [...prev.gallery_json];
      const [item] = nextGallery.splice(index, 1);
      nextGallery.splice(target, 0, item);

      return {
        ...prev,
        gallery_json: nextGallery,
      };
    });
  };

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
        gallery_json: Array.isArray(form.gallery_json)
          ? form.gallery_json.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 8)
          : [],
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
      setForm((prev) => ({
        ...prev,
        organizer_logo_url: result.organizer_logo_url || "",
        cover_image_url: result.cover_image_url || "",
        organizer_message: result.organizer_message || "",
        gallery_json: Array.isArray(result.gallery_json) ? result.gallery_json : [],
      }));
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

  const openPublicPreview = () => {
    if (!publicUrl) return;
    window.open(publicUrl, "_blank", "noopener,noreferrer");
  };

  if (loading) return <div style={{ padding: 24 }}>Cargando configuración...</div>;

  return (
    <div style={pageStyle}>
      <style>{workspaceCss}</style>

      <div style={headerStyle}>
        <div>
          <span style={eyebrowStyle}>Protección Médica del Participante</span>
          <h2 style={{ margin: "4px 0 6px", color: "#18324a" }}>
            Protección de Participantes
          </h2>
          <p style={{ margin: 0, color: "#6b7f90" }}>
            Configura el registro preventivo, la identidad pública del evento y su página de participantes.
          </p>
        </div>

        <div style={statusBadgeStyle}>
          {form.enabled ? "Protección habilitada" : "Protección deshabilitada"}
        </div>
      </div>

      {intake && (
        <div style={infoStyle}>
          <strong>
            {intake.standby_event_name || intake.service_type || "Guardia"}
          </strong>
          <div style={{ marginTop: 4 }}>
            Esta configuración no crea FRAP ni modifica atenciones clínicas.
          </div>
        </div>
      )}

      {error && <div style={errorStyle}>{error}</div>}
      {message && <div style={successStyle}>{message}</div>}

      {!error && (
        <div className="epp-workspace">
          <aside className="epp-sidebar">
            <div style={workspaceNavHeaderStyle}>
              <span style={workspaceNavEyebrowStyle}>Panel del evento</span>
              <strong style={workspaceNavTitleStyle}>Protección médica</strong>
            </div>

            <nav className="epp-nav" aria-label="Secciones de Protección de Participantes">
              {[
                ["resumen", "Resumen", "Vista general"],
                ["configuracion", "Configuración", "Datos y activación"],
                ["landing", "Landing pública", "Imagen y galería"],
                ["privacidad", "Privacidad", "Aviso y versión"],
                ["participantes", "Participantes", `${participants.length} registrados`],
                ["publicacion", "Publicación", "Liga pública"],
              ].map(([value, label, detail]) => {
                const selected = activeSection === value;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setActiveSection(value)}
                    aria-current={selected ? "page" : undefined}
                    style={{
                      ...workspaceNavButtonStyle,
                      ...(selected ? workspaceNavButtonActiveStyle : {}),
                    }}
                  >
                    <span style={workspaceNavButtonLabelStyle}>{label}</span>
                    <span
                      style={{
                        ...workspaceNavButtonDetailStyle,
                        ...(selected ? workspaceNavButtonDetailActiveStyle : {}),
                      }}
                    >
                      {detail}
                    </span>
                  </button>
                );
              })}
            </nav>

            <div className="epp-nav-note">
              Los antecedentes médicos permanecen separados del tablero administrativo y sólo se consultan mediante acceso autorizado.
            </div>
          </aside>

          <main className="epp-content">
            {activeSection === "resumen" && (
              <section style={sectionStyle}>
                <div style={sectionHeaderStyle}>
                  <div>
                    <span style={sectionNumberStyle}>RESUMEN</span>
                    <h3 style={sectionTitleStyle}>Estado del evento</h3>
                  </div>
                  <p style={sectionHelpStyle}>
                    Consulta el avance del registro y entra directamente a la tarea que necesitas.
                  </p>
                </div>

                <div style={summaryHeroStyle}>
                  <div>
                    <span style={summaryHeroEyebrowStyle}>
                      Protección de participantes
                    </span>
                    <h3 style={summaryHeroTitleStyle}>
                      {form.public_event_name ||
                        intake?.standby_event_name ||
                        intake?.service_type ||
                        "Evento"}
                    </h3>
                    <p style={summaryHeroTextStyle}>
                      Panel operativo y de configuración del evento.
                    </p>
                  </div>

                  <span
                    style={{
                      ...summaryProtectionBadgeStyle,
                      ...(form.enabled
                        ? summaryProtectionBadgeActiveStyle
                        : summaryProtectionBadgeInactiveStyle),
                    }}
                  >
                    {form.enabled ? "Protección activa" : "Protección desactivada"}
                  </span>
                </div>

                <div style={summaryStatsStyle}>
                  <button
                    type="button"
                    onClick={() => setActiveSection("participantes")}
                    style={summaryStatButtonStyle}
                  >
                    <span style={summaryStatLabelStyle}>Participantes</span>
                    <strong style={summaryStatValueStyle}>{participantStats.total}</strong>
                    <span style={summaryStatLinkStyle}>Abrir tablero →</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveSection("participantes")}
                    style={summaryStatButtonStyle}
                  >
                    <span style={summaryStatLabelStyle}>Fichas completas</span>
                    <strong style={summaryStatValueStyle}>{participantStats.completed}</strong>
                    <span style={summaryStatLinkStyle}>Ver participantes →</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveSection("participantes")}
                    style={summaryStatButtonStyle}
                  >
                    <span style={summaryStatLabelStyle}>Fichas iniciadas</span>
                    <strong style={summaryStatValueStyle}>{participantStats.started}</strong>
                    <span style={summaryStatLinkStyle}>Revisar pendientes →</span>
                  </button>
                </div>

                <div style={summaryActionsStyle}>
                  <button
                    type="button"
                    onClick={() => setActiveSection("configuracion")}
                    style={summaryActionStyle}
                  >
                    <strong>Configuración del evento</strong>
                    <span>Activación, identidad y datos públicos</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveSection("landing")}
                    style={summaryActionStyle}
                  >
                    <strong>Landing pública</strong>
                    <span>Logo, portada y galería del evento</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveSection("publicacion")}
                    style={summaryActionStyle}
                  >
                    <strong>Compartir registro</strong>
                    <span>Liga pública y vista previa</span>
                  </button>
                </div>
              </section>
            )}

            {["configuracion", "landing", "privacidad"].includes(activeSection) && (
              <form onSubmit={save} style={{ display: "grid", gap: 20 }}>
                {activeSection === "configuracion" && (
                  <>
<section style={sectionStyle}>
            <div style={sectionHeaderStyle}>
              <div>
                <span style={sectionNumberStyle}>01</span>
                <h3 style={sectionTitleStyle}>Activación y publicación</h3>
              </div>
              <p style={sectionHelpStyle}>
                Controla si la función está disponible y si los participantes pueden registrarse.
              </p>
            </div>

            <div style={twoColumnStyle}>
              <label style={switchCardStyle}>
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) => onChange("enabled", e.target.checked)}
                />
                <span>
                  <strong>Habilitar Protección de Participantes</strong>
                  <small style={smallStyle}>Activa esta función para la guardia o cobertura.</small>
                </span>
              </label>

              <label style={switchCardStyle}>
                <input
                  type="checkbox"
                  checked={form.registration_open}
                  onChange={(e) => onChange("registration_open", e.target.checked)}
                />
                <span>
                  <strong>Registro público abierto</strong>
                  <small style={smallStyle}>Permite altas desde la liga pública.</small>
                </span>
              </label>
            </div>
          </section>
<section style={sectionStyle}>
            <div style={sectionHeaderStyle}>
              <div>
                <span style={sectionNumberStyle}>02</span>
                <h3 style={sectionTitleStyle}>Identidad del evento</h3>
              </div>
              <p style={sectionHelpStyle}>
                Estos datos son los que verá el participante en la página pública.
              </p>
            </div>

            <div style={twoColumnStyle}>
              <label style={labelStyle}>
                Tipo de evento
                <select
                  value={form.event_type}
                  onChange={(e) => onChange("event_type", e.target.value)}
                  style={inputStyle}
                >
                  {EVENT_TYPES.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>

              <label style={labelStyle}>
                Nombre público del evento
                <input
                  value={form.public_event_name}
                  onChange={(e) => onChange("public_event_name", e.target.value)}
                  style={inputStyle}
                />
              </label>

              <label style={labelStyle}>
                Organizador
                <input
                  value={form.organizer_name}
                  onChange={(e) => onChange("organizer_name", e.target.value)}
                  style={inputStyle}
                />
              </label>

              <label style={labelStyle}>
                Fecha límite de registro
                <input
                  type="datetime-local"
                  value={form.registration_deadline}
                  onChange={(e) => onChange("registration_deadline", e.target.value)}
                  style={inputStyle}
                />
              </label>
            </div>

            <label style={labelStyle}>
              Mensaje del organizador
              <textarea
                rows={4}
                maxLength={250}
                value={form.organizer_message}
                onChange={(e) => onChange("organizer_message", e.target.value)}
                style={{ ...inputStyle, resize: "vertical" }}
                placeholder="Ej. Tu seguridad es parte de la experiencia. Completa tu ficha antes de participar."
              />
              <small style={smallStyle}>{String(form.organizer_message || "").length}/250 caracteres</small>
            </label>
          </section>
                  </>
                )}

                {activeSection === "landing" && (
                  <>
<section style={sectionStyle}>
            <div style={sectionHeaderStyle}>
              <div>
                <span style={sectionNumberStyle}>03</span>
                <h3 style={sectionTitleStyle}>Personalización de la landing</h3>
              </div>
              <p style={sectionHelpStyle}>
                Sube el logo y la portada del evento. Las imágenes se optimizan automáticamente para web sin recortarlas.
              </p>
            </div>

            <div style={visualGridStyle}>
              <div>
                <label style={labelStyle}>
                  Subir logo del organizador
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={Boolean(uploadingKind)}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      await uploadImage("organizer_logo", file);
                      e.target.value = "";
                    }}
                    style={inputStyle}
                  />
                  <small style={smallStyle}>
                    JPEG, PNG o WEBP. El sistema conserva la proporción y no recorta la imagen.
                    {uploadingKind === "organizer_logo" ? " Subiendo..." : ""}
                  </small>
                </label>

                <label style={{ ...labelStyle, marginTop: 12 }}>
                  URL actual o alternativa
                  <input
                    value={form.organizer_logo_url}
                    onChange={(e) => onChange("organizer_logo_url", e.target.value)}
                    style={inputStyle}
                    placeholder="https://... o /api/v2/public/media/..."
                  />
                </label>
                <div style={{ marginTop: 12 }}>
                  <span style={previewLabelStyle}>Vista previa del logo</span>
                  <ImagePreview
                    src={String(form.organizer_logo_url || "").trim()}
                    alt="Vista previa del logo"
                    compact
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>
                  Subir imagen de portada
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={Boolean(uploadingKind)}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      await uploadImage("cover", file);
                      e.target.value = "";
                    }}
                    style={inputStyle}
                  />
                  <small style={smallStyle}>
                    JPEG, PNG o WEBP. La imagen se optimiza para web sin recortarla.
                    {uploadingKind === "cover" ? " Subiendo..." : ""}
                  </small>
                </label>

                <label style={{ ...labelStyle, marginTop: 12 }}>
                  URL actual o alternativa
                  <input
                    value={form.cover_image_url}
                    onChange={(e) => onChange("cover_image_url", e.target.value)}
                    style={inputStyle}
                    placeholder="https://... o /api/v2/public/media/..."
                  />
                </label>
                <div style={{ marginTop: 12 }}>
                  <span style={previewLabelStyle}>Vista previa de portada</span>
                  <ImagePreview
                    src={String(form.cover_image_url || "").trim()}
                    alt="Vista previa de portada"
                  />
                </div>
              </div>
            </div>
          </section>
<section style={sectionStyle}>
            <div style={sectionHeaderStyle}>
              <div>
                <span style={sectionNumberStyle}>04</span>
                <h3 style={sectionTitleStyle}>Galería del evento</h3>
              </div>
              <p style={sectionHelpStyle}>
                Agrega hasta 8 imágenes. El orden se conserva al guardar.
              </p>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <label style={labelStyle}>
                Subir imagen a la galería
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={Boolean(uploadingKind) || form.gallery_json.length >= 8}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    await uploadImage("gallery", file);
                    e.target.value = "";
                  }}
                  style={inputStyle}
                />
                <small style={smallStyle}>
                  JPEG, PNG o WEBP. Máximo 8 imágenes.
                  {uploadingKind === "gallery" ? " Subiendo..." : ""}
                </small>
              </label>

              <div style={galleryAddStyle}>
                <input
                  value={galleryUrl}
                  onChange={(e) => setGalleryUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addGalleryImage();
                    }
                  }}
                  style={inputStyle}
                  placeholder="URL alternativa de imagen"
                />
                <button type="button" onClick={addGalleryImage} style={secondaryButtonStyle}>
                  Agregar por URL
                </button>
              </div>
            </div>

            <div style={galleryGridStyle}>
              {form.gallery_json.length === 0 && (
                <div style={emptyGalleryStyle}>
                  Todavía no hay imágenes en la galería.
                </div>
              )}

              {form.gallery_json.map((url, index) => (
                <article key={`${url}-${index}`} style={galleryCardStyle}>
                  <ImagePreview src={url} alt={`Imagen ${index + 1} de la galería`} />
                  <div style={galleryCardBodyStyle}>
                    <strong>Imagen {index + 1}</strong>
                    <div style={galleryUrlStyle}>{url}</div>
                    <div style={galleryActionsStyle}>
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveGalleryImage(index, -1)}
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        disabled={index === form.gallery_json.length - 1}
                        onClick={() => moveGalleryImage(index, 1)}
                      >
                        →
                      </button>
                      <button
                        type="button"
                        onClick={() => removeGalleryImage(index)}
                        style={{ color: "#a84242" }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>


          </section>
                  </>
                )}

                {activeSection === "privacidad" && (
                  <>
<section style={sectionStyle}>
            <div style={sectionHeaderStyle}>
              <div>
                <span style={sectionNumberStyle}>05</span>
                <h3 style={sectionTitleStyle}>Privacidad</h3>
              </div>
              <p style={sectionHelpStyle}>
                La versión debe corresponder a un Aviso de Privacidad publicado para esta empresa.
              </p>
            </div>

            <label style={{ ...labelStyle, maxWidth: 360 }}>
              Versión del Aviso de Privacidad
              <input
                value={form.privacy_notice_version}
                onChange={(e) => onChange("privacy_notice_version", e.target.value)}
                style={inputStyle}
              />
            </label>

            <div style={privacyNoteStyle}>
              <strong>Importante</strong>
              <span>
                En una siguiente etapa sustituiremos este campo libre por un selector de versiones publicadas para evitar referencias inválidas.
              </span>
            </div>
          </section>
                  </>
                )}

                <div style={saveBarStyle}>
                  <div>
                    <strong style={{ display: "block", color: "#18324a" }}>
                      {activeSection === "configuracion"
                        ? "Configuración del evento"
                        : activeSection === "landing"
                          ? "Landing pública"
                          : "Privacidad"}
                    </strong>
                    <small style={smallStyle}>
                      Guarda los cambios antes de cambiar de sección.
                    </small>
                  </div>

                  <button type="submit" disabled={saving} style={primaryButtonStyle}>
                    {saving
                      ? "Guardando..."
                      : saved
                        ? "Guardar cambios"
                        : "Activar Protección de Participantes"}
                  </button>
                </div>
              </form>
            )}

            {activeSection === "participantes" && (
              <section style={sectionStyle}>
                <div style={sectionHeaderStyle}>
                  <div>
                    <span style={sectionNumberStyle}>OPERACIÓN</span>
                    <h3 style={sectionTitleStyle}>Participantes</h3>
                  </div>
                  <p style={sectionHelpStyle}>
                    Busca, revisa y administra a los participantes registrados en el evento.
                  </p>
                </div>

<div style={participantDashboardStyle}>
            <div style={participantStatsGridStyle}>
              <div style={participantStatCardStyle}>
                <span style={participantStatLabelStyle}>Participantes</span>
                <strong style={participantStatValueStyle}>
                  {participantStats.total}
                </strong>
              </div>

              <div style={participantStatCardStyle}>
                <span style={participantStatLabelStyle}>Fichas completas</span>
                <strong style={participantStatValueStyle}>
                  {participantStats.completed}
                </strong>
              </div>

              <div style={participantStatCardStyle}>
                <span style={participantStatLabelStyle}>Fichas iniciadas</span>
                <strong style={participantStatValueStyle}>
                  {participantStats.started}
                </strong>
              </div>
            </div>

            <div style={participantToolbarStyle}>
              <div style={participantSearchWrapStyle}>
                <span style={participantSearchIconStyle}>⌕</span>

                <input
                  type="search"
                  value={participantSearch}
                  onChange={(e) => setParticipantSearch(e.target.value)}
                  placeholder="Buscar nombre, número, equipo, vehículo o placas..."
                  style={participantSearchStyle}
                />
              </div>

              <div style={participantFiltersStyle}>
                {[
                  ["TODOS", "Todos"],
                  ["COMPLETOS", "Completos"],
                  ["INICIADOS", "Iniciados"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setParticipantFilter(value)}
                    style={{
                      ...participantFilterButtonStyle,
                      ...(participantFilter === value
                        ? participantFilterButtonActiveStyle
                        : {}),
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div style={participantListHeaderStyle}>
              <strong>Participantes del evento</strong>

              <span>
                {filteredParticipants.length} de {participants.length}
              </span>
            </div>

            {filteredParticipants.length === 0 ? (
              <div style={participantEmptyStyle}>
                No hay participantes que coincidan con la búsqueda.
              </div>
            ) : (
              <div style={participantListStyle}>
                {filteredParticipants.map((participant) => {
                  const fullName = [
                    participant.first_name,
                    participant.paternal_surname,
                    participant.maternal_surname,
                  ]
                    .filter(Boolean)
                    .join(" ");

                  const completed =
                    participant.status === "COMPLETO" ||
                    participant.status === "ACTUALIZADO";

                  return (
                    <article
                      key={participant.id}
                      style={participantCardStyle}
                    >
                      <div style={participantIdentityStyle}>
                        <div style={participantNumberStyle}>
                          {participant.participant_number || "—"}
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <div style={participantNameStyle}>
                            {fullName}
                          </div>

                          <div style={participantMetaStyle}>
                            {participant.category && (
                              <span>{participant.category}</span>
                            )}

                            {participant.team_name && (
                              <span>{participant.team_name}</span>
                            )}

                            {participant.vehicle_number && (
                              <span>
                                Vehículo #{participant.vehicle_number}
                              </span>
                            )}

                            {participant.vehicle_make_model && (
                              <span>
                                {participant.vehicle_make_model}
                              </span>
                            )}

                            {participant.vehicle_plates && (
                              <span>
                                Placas {participant.vehicle_plates}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={participantCardActionsStyle}>
                        <span
                          style={{
                            ...participantStatusStyle,
                            ...(completed
                              ? participantStatusCompleteStyle
                              : participantStatusStartedStyle),
                          }}
                        >
                          {participant.status === "ACTUALIZADO"
                            ? "Actualizada"
                            : completed
                              ? "Completa"
                              : "Iniciada"}
                        </span>

                        <button
                          type="button"
                          onClick={() => setSelectedParticipant(participant)}
                          style={participantViewButtonStyle}
                        >
                          Ver ficha
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          {selectedParticipant && (
            <div
              style={participantModalBackdropStyle}
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) {
                  setSelectedParticipant(null);
                }
              }}
            >
              <div
                style={participantModalStyle}
                role="dialog"
                aria-modal="true"
                aria-label="Ficha del participante"
              >
                <div style={participantModalHeaderStyle}>
                  <div>
                    <span style={participantModalEyebrowStyle}>
                      Ficha del participante
                    </span>

                    <h3 style={participantModalTitleStyle}>
                      {[
                        selectedParticipant.first_name,
                        selectedParticipant.paternal_surname,
                        selectedParticipant.maternal_surname,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedParticipant(null)}
                    style={participantModalCloseStyle}
                    aria-label="Cerrar ficha"
                  >
                    ×
                  </button>
                </div>

                <div style={participantDetailGridStyle}>
                  <div style={participantDetailItemStyle}>
                    <span style={participantDetailLabelStyle}>
                      Número
                    </span>
                    <strong>
                      {selectedParticipant.participant_number ||
                        "No registrado"}
                    </strong>
                  </div>

                  <div style={participantDetailItemStyle}>
                    <span style={participantDetailLabelStyle}>
                      Estado de ficha
                    </span>
                    <strong>
                      {selectedParticipant.status === "ACTUALIZADO"
                        ? "Actualizada"
                        : selectedParticipant.status === "COMPLETO"
                          ? "Completa"
                          : "Iniciada"}
                    </strong>
                  </div>

                  <div style={participantDetailItemStyle}>
                    <span style={participantDetailLabelStyle}>
                      Categoría
                    </span>
                    <strong>
                      {selectedParticipant.category || "No registrada"}
                    </strong>
                  </div>

                  <div style={participantDetailItemStyle}>
                    <span style={participantDetailLabelStyle}>
                      Equipo
                    </span>
                    <strong>
                      {selectedParticipant.team_name || "No registrado"}
                    </strong>
                  </div>

                  <div style={participantDetailItemStyle}>
                    <span style={participantDetailLabelStyle}>
                      Teléfono
                    </span>
                    <strong>
                      {selectedParticipant.phone || "No registrado"}
                    </strong>
                  </div>

                  <div style={participantDetailItemStyle}>
                    <span style={participantDetailLabelStyle}>
                      Correo
                    </span>
                    <strong>
                      {selectedParticipant.email || "No registrado"}
                    </strong>
                  </div>

                  <div style={participantDetailItemStyle}>
                    <span style={participantDetailLabelStyle}>
                      Origen
                    </span>
                    <strong>
                      {[
                        selectedParticipant.city_origin,
                        selectedParticipant.state_origin,
                      ]
                        .filter(Boolean)
                        .join(", ") || "No registrado"}
                    </strong>
                  </div>

                  <div style={participantDetailItemStyle}>
                    <span style={participantDetailLabelStyle}>
                      Fecha de nacimiento
                    </span>
                    <strong>
                      {selectedParticipant.birth_date ||
                        "No registrada"}
                    </strong>
                  </div>
                </div>

                <div style={participantVehicleBoxStyle}>
                  <div style={participantVehicleTitleStyle}>
                    Datos del vehículo
                  </div>

                  <div style={participantDetailGridStyle}>
                    <div style={participantDetailItemStyle}>
                      <span style={participantDetailLabelStyle}>
                        Número
                      </span>
                      <strong>
                        {selectedParticipant.vehicle_number ||
                          "No registrado"}
                      </strong>
                    </div>

                    <div style={participantDetailItemStyle}>
                      <span style={participantDetailLabelStyle}>
                        Tipo
                      </span>
                      <strong>
                        {selectedParticipant.vehicle_type ||
                          "No registrado"}
                      </strong>
                    </div>

                    <div style={participantDetailItemStyle}>
                      <span style={participantDetailLabelStyle}>
                        Marca / modelo
                      </span>
                      <strong>
                        {selectedParticipant.vehicle_make_model ||
                          "No registrado"}
                      </strong>
                    </div>

                    <div style={participantDetailItemStyle}>
                      <span style={participantDetailLabelStyle}>
                        Color
                      </span>
                      <strong>
                        {selectedParticipant.vehicle_color ||
                          "No registrado"}
                      </strong>
                    </div>

                    <div style={participantDetailItemStyle}>
                      <span style={participantDetailLabelStyle}>
                        Placas
                      </span>
                      <strong>
                        {selectedParticipant.vehicle_plates ||
                          "No registradas"}
                      </strong>
                    </div>
                  </div>
                </div>

                <div style={participantUpdateStyle}>
                  Última actualización:{" "}
                  <strong>
                    {formatParticipantDate(
                      selectedParticipant.last_participant_update_at ||
                        selectedParticipant.updated_at
                    )}
                  </strong>
                </div>

                <div style={participantMedicalPlaceholderStyle}>
                  <div>
                    <strong>Información médica protegida</strong>

                    <div style={participantMedicalHelpStyle}>
                      Los antecedentes médicos están separados de esta
                      ficha administrativa y requieren acceso autorizado.
                    </div>
                  </div>

                  <span style={participantMedicalLockStyle}>
                    Protegida
                  </span>
                </div>
              </div>
            </div>
          )}
              </section>
            )}

            {activeSection === "publicacion" && saved?.public_token && (
<section style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <span style={sectionNumberStyle}>PUBLICAR</span>
              <h3 style={sectionTitleStyle}>Publicación</h3>
            </div>
            <p style={sectionHelpStyle}>
              Comparte la liga o revisa exactamente lo que verá el participante.
            </p>
          </div>

          <div style={urlBoxStyle}>{publicUrl}</div>

          <div style={publicationActionsStyle}>
            <button type="button" onClick={copyPublicUrl} style={secondaryButtonStyle}>
              Copiar liga
            </button>
            <button type="button" onClick={openPublicPreview} style={previewButtonStyle}>
              Vista previa de landing ↗
            </button>
          </div>
        </section>
            )}

            {activeSection === "publicacion" && !saved?.public_token && (
              <section style={sectionStyle}>
                <div style={sectionHeaderStyle}>
                  <div>
                    <span style={sectionNumberStyle}>PUBLICAR</span>
                    <h3 style={sectionTitleStyle}>Publicación</h3>
                  </div>
                  <p style={sectionHelpStyle}>
                    Guarda primero la configuración del evento para generar su liga pública.
                  </p>
                </div>
              </section>
            )}
          </main>
        </div>
      )}
    </div>
  );
}

const workspaceCss = `
  .epp-workspace {
    display: grid;
    grid-template-columns: minmax(180px, 215px) minmax(0, 1fr);
    gap: 18px;
    align-items: start;
    margin-top: 20px;
  }

  .epp-sidebar {
    position: sticky;
    top: 18px;
    display: grid;
    gap: 12px;
    padding: 12px;
    border: 1px solid #dce7ee;
    border-radius: 18px;
    background: #ffffff;
    box-shadow: 0 10px 28px rgba(27, 65, 91, 0.06);
  }

  .epp-nav {
    display: grid;
    gap: 5px;
  }

  .epp-nav-note {
    padding: 10px;
    border-radius: 11px;
    background: #f5f9fb;
    color: #71899a;
    font-size: 10px;
    line-height: 1.45;
  }

  .epp-content {
    min-width: 0;
  }

  @media (max-width: 860px) {
    .epp-workspace {
      grid-template-columns: 1fr;
      gap: 12px;
    }

    .epp-sidebar {
      position: static;
      padding: 10px;
    }

    .epp-nav {
      display: flex;
      overflow-x: auto;
      padding-bottom: 4px;
      scrollbar-width: thin;
    }

    .epp-nav > button {
      flex: 0 0 auto;
      min-width: 145px;
    }

    .epp-nav-note {
      display: none;
    }
  }
`;

const workspaceNavHeaderStyle = {
  display: "grid",
  gap: 3,
  padding: "5px 6px 9px",
};

const workspaceNavEyebrowStyle = {
  color: "#7391a5",
  fontSize: 10,
  fontWeight: 850,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const workspaceNavTitleStyle = {
  color: "#173e59",
  fontSize: 16,
};

const workspaceNavButtonStyle = {
  width: "100%",
  display: "grid",
  gap: 2,
  padding: "10px 11px",
  textAlign: "left",
  border: "1px solid transparent",
  borderRadius: 12,
  background: "transparent",
  color: "#496b82",
  cursor: "pointer",
};

const workspaceNavButtonActiveStyle = {
  borderColor: "#d0e3ef",
  background: "#edf6fb",
  color: "#214f70",
};

const workspaceNavButtonLabelStyle = {
  fontSize: 13,
  fontWeight: 800,
};

const workspaceNavButtonDetailStyle = {
  color: "#8a9dac",
  fontSize: 10,
  lineHeight: 1.3,
};

const workspaceNavButtonDetailActiveStyle = {
  color: "#62829a",
};

const summaryHeroStyle = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  padding: 20,
  borderRadius: 16,
  background: "#f4f9fc",
  border: "1px solid #dfebf2",
};

const summaryHeroEyebrowStyle = {
  color: "#5590bb",
  fontSize: 10,
  fontWeight: 850,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const summaryHeroTitleStyle = {
  margin: "4px 0",
  color: "#173e59",
  fontSize: 22,
};

const summaryHeroTextStyle = {
  margin: 0,
  color: "#71899a",
  fontSize: 12,
};

const summaryProtectionBadgeStyle = {
  padding: "8px 11px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 850,
};

const summaryProtectionBadgeActiveStyle = {
  background: "#e6f6ed",
  color: "#26734b",
};

const summaryProtectionBadgeInactiveStyle = {
  background: "#f3f4f5",
  color: "#7b858d",
};

const summaryStatsStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
  gap: 10,
  marginTop: 14,
};

const summaryStatButtonStyle = {
  display: "grid",
  gap: 4,
  padding: 16,
  textAlign: "left",
  border: "1px solid #e0eaf0",
  borderRadius: 14,
  background: "#ffffff",
  cursor: "pointer",
};

const summaryStatLabelStyle = {
  color: "#698397",
  fontSize: 11,
  fontWeight: 750,
};

const summaryStatValueStyle = {
  color: "#173e59",
  fontSize: 28,
  lineHeight: 1,
};

const summaryStatLinkStyle = {
  marginTop: 5,
  color: "#4f8fbd",
  fontSize: 10,
  fontWeight: 750,
};

const summaryActionsStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 10,
  marginTop: 14,
};

const summaryActionStyle = {
  display: "grid",
  gap: 4,
  padding: 15,
  textAlign: "left",
  border: "1px solid #dfe9ef",
  borderRadius: 14,
  background: "#fbfdfe",
  color: "#315b79",
  cursor: "pointer",
};

const pageStyle = {
  maxWidth: 1240,
  margin: "0 auto",
  padding: "24px 18px 90px",
};

const headerStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 18,
  marginBottom: 20,
};

const eyebrowStyle = {
  display: "block",
  color: "#4f8fc7",
  fontSize: 12,
  fontWeight: 850,
  letterSpacing: ".10em",
  textTransform: "uppercase",
};

const statusBadgeStyle = {
  padding: "9px 12px",
  borderRadius: 999,
  background: "#e9f4fb",
  border: "1px solid #d5e7f2",
  color: "#356f9a",
  fontWeight: 800,
  fontSize: 12,
  whiteSpace: "nowrap",
};

const sectionStyle = {
  background: "white",
  border: "1px solid #dfe9f0",
  borderRadius: 20,
  padding: 22,
  display: "grid",
  gap: 18,
  boxShadow: "0 10px 28px rgba(34,67,94,.05)",
};

const sectionHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 20,
  alignItems: "flex-start",
  paddingBottom: 14,
  borderBottom: "1px solid #edf2f5",
};

const sectionNumberStyle = {
  display: "inline-block",
  marginBottom: 4,
  color: "#5b96c2",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: ".08em",
};

const sectionTitleStyle = {
  margin: 0,
  color: "#18324a",
  fontSize: 20,
};

const sectionHelpStyle = {
  maxWidth: 440,
  margin: 0,
  color: "#718494",
  fontSize: 13,
  lineHeight: 1.5,
};

const twoColumnStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 16,
};

const visualGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  gap: 18,
};

const labelStyle = {
  display: "grid",
  gap: 7,
  color: "#29465d",
  fontWeight: 700,
  fontSize: 13,
};

const inputStyle = {
  width: "100%",
  border: "1px solid #d6e3eb",
  borderRadius: 12,
  padding: "11px 12px",
  color: "#18324a",
  background: "#fff",
  outline: "none",
  boxSizing: "border-box",
};

const switchCardStyle = {
  display: "flex",
  gap: 12,
  alignItems: "flex-start",
  padding: 16,
  borderRadius: 14,
  border: "1px solid #dce8ef",
  background: "#f8fbfd",
  color: "#29465d",
  fontWeight: 700,
};

const smallStyle = {
  display: "block",
  marginTop: 3,
  color: "#8393a1",
  fontSize: 11,
  fontWeight: 500,
  lineHeight: 1.45,
};

const infoStyle = {
  padding: 14,
  borderRadius: 14,
  background: "#f4f8fb",
  border: "1px solid #dce8ef",
  marginBottom: 18,
  color: "#395970",
};

const errorStyle = {
  padding: 14,
  borderRadius: 12,
  background: "#feecec",
  border: "1px solid #f2cccc",
  marginBottom: 18,
  color: "#991b1b",
};

const successStyle = {
  padding: 14,
  borderRadius: 12,
  background: "#edf8f2",
  border: "1px solid #d4eadf",
  marginBottom: 18,
  color: "#2d7050",
};

const imagePreviewStyle = {
  width: "100%",
  height: 190,
  overflow: "hidden",
  display: "grid",
  placeItems: "center",
  border: "1px solid #dce7ee",
  borderRadius: 15,
  background: "#f5f9fc",
};

const imagePreviewCompactStyle = {
  height: 120,
  background: "#fff",
};

const previewLabelStyle = {
  display: "block",
  marginBottom: 7,
  color: "#74889a",
  fontSize: 11,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: ".05em",
};

const galleryAddStyle = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 10,
};

const galleryGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
};

const galleryCardStyle = {
  overflow: "hidden",
  border: "1px solid #dde8ef",
  borderRadius: 16,
  background: "#fff",
};

const galleryCardBodyStyle = {
  padding: 12,
  display: "grid",
  gap: 8,
};

const galleryUrlStyle = {
  color: "#7c8c98",
  fontSize: 10,
  overflowWrap: "anywhere",
  lineHeight: 1.4,
};

const galleryActionsStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 7,
};

const emptyGalleryStyle = {
  gridColumn: "1 / -1",
  padding: 24,
  textAlign: "center",
  color: "#8393a1",
  border: "1px dashed #cfdde6",
  borderRadius: 14,
  background: "#f8fbfd",
};

const privacyNoteStyle = {
  display: "grid",
  gap: 3,
  padding: 14,
  borderRadius: 13,
  background: "#f1f7fb",
  border: "1px solid #dbe8f0",
  color: "#466b86",
  fontSize: 12,
};

const saveBarStyle = {
  position: "sticky",
  bottom: 12,
  zIndex: 5,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
  padding: 14,
  borderRadius: 16,
  background: "rgba(255,255,255,.96)",
  border: "1px solid #d9e6ee",
  boxShadow: "0 14px 34px rgba(38,70,96,.12)",
  backdropFilter: "blur(10px)",
};

const primaryButtonStyle = {
  border: 0,
  borderRadius: 12,
  padding: "12px 18px",
  color: "#fff",
  background: "linear-gradient(135deg, #5f9fce, #3d7fb2)",
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 8px 20px rgba(79,143,199,.20)",
};

const secondaryButtonStyle = {
  border: "1px solid #cfdee8",
  borderRadius: 11,
  padding: "10px 14px",
  color: "#315b79",
  background: "#f5f9fc",
  fontWeight: 750,
  cursor: "pointer",
};

const previewButtonStyle = {
  ...secondaryButtonStyle,
  color: "#fff",
  background: "#4f8fc7",
  borderColor: "#4f8fc7",
};

const publicationActionsStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
};

const urlBoxStyle = {
  padding: 12,
  borderRadius: 10,
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  overflowWrap: "anywhere",
  color: "#526a7d",
  fontSize: 12,
};

const participantDashboardStyle = {
  marginTop: 18,
  display: "grid",
  gap: 16,
};

const participantStatsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 10,
};

const participantStatCardStyle = {
  padding: "14px 16px",
  borderRadius: 14,
  border: "1px solid #e4edf3",
  background: "#f8fbfd",
  display: "grid",
  gap: 4,
};

const participantStatLabelStyle = {
  color: "#648096",
  fontSize: 12,
  fontWeight: 700,
};

const participantStatValueStyle = {
  color: "#173e59",
  fontSize: 25,
  lineHeight: 1,
};

const participantToolbarStyle = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
};

const participantSearchWrapStyle = {
  position: "relative",
  flex: "1 1 390px",
};

const participantSearchIconStyle = {
  position: "absolute",
  left: 13,
  top: "50%",
  transform: "translateY(-50%)",
  color: "#7d93a4",
  fontSize: 20,
  pointerEvents: "none",
};

const participantSearchStyle = {
  width: "100%",
  minHeight: 44,
  padding: "10px 14px 10px 40px",
  border: "1px solid #d8e3ea",
  borderRadius: 12,
  outline: "none",
  boxSizing: "border-box",
  fontSize: 14,
  color: "#173e59",
  background: "#fff",
};

const participantFiltersStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
};

const participantFilterButtonStyle = {
  border: "1px solid #d7e3eb",
  borderRadius: 999,
  padding: "8px 13px",
  background: "#fff",
  color: "#587387",
  fontSize: 12,
  fontWeight: 750,
  cursor: "pointer",
};

const participantFilterButtonActiveStyle = {
  borderColor: "#315b79",
  background: "#315b79",
  color: "#fff",
};

const participantListHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  color: "#315b79",
  fontSize: 13,
};

const participantListStyle = {
  display: "grid",
  gap: 8,
};

const participantCardStyle = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: 14,
  border: "1px solid #e1e9ef",
  borderRadius: 14,
  background: "#fff",
};

const participantIdentityStyle = {
  minWidth: 0,
  flex: "1 1 420px",
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const participantNumberStyle = {
  width: 48,
  minWidth: 48,
  height: 48,
  borderRadius: 13,
  display: "grid",
  placeItems: "center",
  background: "#edf5fa",
  color: "#315b79",
  fontWeight: 850,
  fontSize: 16,
};

const participantNameStyle = {
  color: "#183e58",
  fontWeight: 800,
  fontSize: 15,
  overflowWrap: "anywhere",
};

const participantMetaStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "4px 12px",
  marginTop: 4,
  color: "#708899",
  fontSize: 12,
};

const participantCardActionsStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const participantStatusStyle = {
  borderRadius: 999,
  padding: "6px 9px",
  fontSize: 11,
  fontWeight: 800,
};

const participantStatusCompleteStyle = {
  background: "#e7f6ee",
  color: "#24734a",
};

const participantStatusStartedStyle = {
  background: "#fff4d9",
  color: "#87620b",
};

const participantViewButtonStyle = {
  border: "1px solid #cfdde6",
  borderRadius: 10,
  padding: "8px 11px",
  background: "#fff",
  color: "#315b79",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
};

const participantEmptyStyle = {
  padding: 28,
  border: "1px dashed #ccdbe4",
  borderRadius: 14,
  textAlign: "center",
  color: "#718899",
  background: "#fbfdfe",
};

const participantModalBackdropStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 5000,
  padding: 18,
  display: "grid",
  placeItems: "center",
  overflowY: "auto",
  background: "rgba(18, 38, 52, 0.62)",
};

const participantModalStyle = {
  width: "min(760px, 100%)",
  maxHeight: "calc(100vh - 36px)",
  overflowY: "auto",
  padding: 22,
  boxSizing: "border-box",
  borderRadius: 20,
  background: "#fff",
  boxShadow: "0 24px 70px rgba(0, 0, 0, 0.22)",
};

const participantModalHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 18,
  marginBottom: 20,
};

const participantModalEyebrowStyle = {
  color: "#6b8799",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontSize: 10,
  fontWeight: 850,
};

const participantModalTitleStyle = {
  margin: "5px 0 0",
  color: "#173e59",
  fontSize: 24,
};

const participantModalCloseStyle = {
  width: 38,
  minWidth: 38,
  height: 38,
  border: "1px solid #dce6ec",
  borderRadius: 12,
  background: "#fff",
  color: "#496a82",
  fontSize: 24,
  lineHeight: 1,
  cursor: "pointer",
};

const participantDetailGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 10,
};

const participantDetailItemStyle = {
  display: "grid",
  gap: 3,
  padding: 12,
  borderRadius: 11,
  background: "#f7fafc",
  color: "#315b79",
  fontSize: 13,
  overflowWrap: "anywhere",
};

const participantDetailLabelStyle = {
  color: "#7890a1",
  fontSize: 11,
  fontWeight: 700,
};

const participantVehicleBoxStyle = {
  marginTop: 16,
  padding: 14,
  borderRadius: 14,
  border: "1px solid #e2eaf0",
};

const participantVehicleTitleStyle = {
  marginBottom: 10,
  color: "#315b79",
  fontWeight: 850,
  fontSize: 13,
};

const participantUpdateStyle = {
  marginTop: 14,
  color: "#6e8596",
  fontSize: 12,
};

const participantMedicalPlaceholderStyle = {
  marginTop: 18,
  padding: 14,
  borderRadius: 14,
  border: "1px solid #dce7ed",
  background: "#f6fafc",
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  color: "#315b79",
};

const participantMedicalHelpStyle = {
  marginTop: 3,
  color: "#748b9c",
  fontSize: 12,
  fontWeight: 400,
};

const participantMedicalLockStyle = {
  borderRadius: 999,
  padding: "6px 10px",
  background: "#e9f1f6",
  color: "#496b83",
  fontSize: 11,
  fontWeight: 850,
};

const participantsStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginTop: 4,
  padding: 14,
  borderRadius: 13,
  background: "#f4f8fb",
  color: "#496a82",
};
