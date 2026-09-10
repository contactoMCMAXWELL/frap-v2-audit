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
      <div style={headerStyle}>
        <div>
          <span style={eyebrowStyle}>Protección Médica del Participante</span>
          <h2 style={{ margin: "4px 0 6px", color: "#18324a" }}>Protección de Participantes</h2>
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
          <strong>{intake.standby_event_name || intake.service_type || "Guardia"}</strong>
          <div style={{ marginTop: 4 }}>
            Esta configuración no crea FRAP ni modifica atenciones clínicas.
          </div>
        </div>
      )}

      {error && <div style={errorStyle}>{error}</div>}
      {message && <div style={successStyle}>{message}</div>}

      {!error && (
        <form onSubmit={save} style={{ display: "grid", gap: 20 }}>
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

          <div style={saveBarStyle}>
            <div>
              <strong style={{ display: "block", color: "#18324a" }}>Configuración del evento</strong>
              <small style={smallStyle}>
                Guarda los cambios antes de abrir la vista pública.
              </small>
            </div>

            <button type="submit" disabled={saving} style={primaryButtonStyle}>
              {saving ? "Guardando..." : saved ? "Guardar cambios" : "Activar Protección de Participantes"}
            </button>
          </div>
        </form>
      )}

      {saved?.public_token && (
        <section style={{ ...sectionStyle, marginTop: 22 }}>
          <div style={sectionHeaderStyle}>
            <div>
              <span style={sectionNumberStyle}>06</span>
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

          <div style={participantsStyle}>
            <span>Participantes registrados / iniciados</span>
            <strong>{participants.length}</strong>
          </div>
        </section>
      )}
    </div>
  );
}

const pageStyle = {
  maxWidth: 1040,
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
