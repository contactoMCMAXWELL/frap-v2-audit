import React, { useEffect, useMemo, useState } from "react";
import { participantProtectionApi } from "../api/participantProtection";
import { useParams } from "react-router-dom";
import "./PublicEventParticipantLanding.css";

const STEPS = [
  ["Datos", "Identificación"],
  ["Emergencia", "Contactos"],
  ["Médico", "Información"],
  ["Traslado", "Seguro"],
  ["Consentimiento", "Confirmación"],
];

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "No lo sé"];
const COMMON_ALLERGIES = ["Ninguna conocida", "Penicilina", "AINEs", "Sulfas", "Látex", "Alimentos", "Otra"];
const COMMON_CONDITIONS = ["Ninguna", "Hipertensión", "Diabetes", "Asma", "Epilepsia", "Cardiopatía", "Otra"];
const EQUIPMENT = ["HANS", "Protección cervical", "Airbag de motocicleta", "Traje con airbag", "Prótesis / órtesis", "Otro", "Ninguno"];
const SERVICE_TYPES = ["IMSS", "ISSSTE", "Privado", "Corporativo", "Otro", "Ninguno"];

const blankContact = (order) => ({
  contact_order: order,
  name: "",
  relationship: "",
  phone: "",
  present_at_event: false,
});

const initialForm = {
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
  vehicle_make_model: "",
  vehicle_color: "",
  vehicle_plates: "",
  emergency_contacts: [blankContact(1)],
  medical_profile: {
    blood_type: "",
    allergies_json: [],
    allergies_detail: "",
    conditions_json: [],
    conditions_detail: "",
    medications_json: [],
    uses_anticoagulants: null,
    surgeries_json: [],
    recent_injury_detail: "",
    implants_json: [],
    medical_service_type: "",
    insurer_name: "",
    policy_number: "",
    affiliation_number: "",
    transfer_preference: "",
    preferred_hospital: "",
    emergency_notes: "",
    suit_cut_authorized: null,
    protective_equipment_json: [],
  },
  privacy_notice_accepted: false,
  sensitive_data_authorized: false,
  information_confirmed: false,
};

function Field({ label, hint, children, wide = false }) {
  return (
    <label className={`pp-field ${wide ? "pp-field--wide" : ""}`}>
      <span className="pp-field__label">{label}</span>
      {hint && <span className="pp-field__hint">{hint}</span>}
      {children}
    </label>
  );
}

function Pills({ options, value, onChange, multiple = false }) {
  const selected = multiple ? value || [] : value;
  const toggle = (option) => {
    if (!multiple) return onChange(option);
    onChange(selected.includes(option) ? selected.filter((x) => x !== option) : [...selected, option]);
  };
  return (
    <div className="pp-pills">
      {options.map((option) => {
        const active = multiple ? selected.includes(option) : selected === option;
        return (
          <button
            type="button"
            key={option}
            className={`pp-pill ${active ? "is-active" : ""}`}
            onClick={() => toggle(option)}
          >
            {active && <span aria-hidden="true">✓</span>}
            {option}
          </button>
        );
      })}
    </div>
  );
}

function YesNo({ value, onChange, yes = "Sí", no = "No" }) {
  return (
    <div className="pp-pills pp-pills--binary">
      <button type="button" className={`pp-pill ${value === true ? "is-active" : ""}`} onClick={() => onChange(true)}>
        {value === true && <span>✓</span>} {yes}
      </button>
      <button type="button" className={`pp-pill ${value === false ? "is-active" : ""}`} onClick={() => onChange(false)}>
        {value === false && <span>✓</span>} {no}
      </button>
    </div>
  );
}

function Progress({ step }) {
  return (
    <div className="pp-progress" aria-label={`Paso ${step + 1} de ${STEPS.length}`}>
      {STEPS.map(([title, subtitle], index) => (
        <div className={`pp-step ${index === step ? "is-current" : ""} ${index < step ? "is-done" : ""}`} key={title}>
          <div className="pp-step__dot">{index < step ? "✓" : index + 1}</div>
          <div className="pp-step__text">
            <strong>{title}</strong>
            <span>{subtitle}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatEventDate(value) {
  if (!value) return "Fecha por confirmar";
  try {
    return new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatPrivacyDate(value) {
  if (!value) return "No indicada";
  try {
    return new Intl.DateTimeFormat("es-MX", { dateStyle: "long" }).format(new Date(value));
  } catch {
    return value;
  }
}

function participantStorageKey(publicToken) {
  return `ambulanciaya:participante:${publicToken}`;
}

function readPendingRegistration(publicToken) {
  try {
    const raw = window.localStorage.getItem(participantStorageKey(publicToken));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.participant_token) return null;
    return parsed;
  } catch {
    return null;
  }
}

function savePendingRegistration(publicToken, participantToken, lastStep = 1) {
  try {
    const current = readPendingRegistration(publicToken) || {};
    window.localStorage.setItem(
      participantStorageKey(publicToken),
      JSON.stringify({
        participant_token: participantToken,
        started_at: current.started_at || new Date().toISOString(),
        last_step: Math.max(0, Math.min(Number(lastStep) || 0, 4)),
      })
    );
  } catch {
    // El registro sigue existiendo en servidor aunque el navegador no permita almacenamiento local.
  }
}

function clearPendingRegistration(publicToken) {
  try {
    window.localStorage.removeItem(participantStorageKey(publicToken));
  } catch {
    // Sin acción adicional.
  }
}

function nullableTrim(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

function formFromParticipant(data) {
  const profile = data?.medical_profile || {};
  const contacts = Array.isArray(data?.emergency_contacts) && data.emergency_contacts.length
    ? data.emergency_contacts.slice(0, 2).map((contact, index) => ({
        contact_order: index + 1,
        name: contact?.name || "",
        relationship: contact?.relationship || "",
        phone: contact?.phone || "",
        present_at_event: Boolean(contact?.present_at_event),
      }))
    : [blankContact(1)];

  return {
    ...initialForm,
    participant_number: data?.participant_number || "",
    first_name: data?.first_name || "",
    paternal_surname: data?.paternal_surname || "",
    maternal_surname: data?.maternal_surname || "",
    birth_date: String(data?.birth_date || "").slice(0, 10),
    phone: data?.phone || "",
    email: data?.email || "",
    state_origin: data?.state_origin || "",
    city_origin: data?.city_origin || "",
    category: data?.category || "",
    team_name: data?.team_name || "",
    vehicle_type: data?.vehicle_type || "",
    vehicle_number: data?.vehicle_number || "",
    vehicle_make_model: data?.vehicle_make_model || "",
    vehicle_color: data?.vehicle_color || "",
    vehicle_plates: data?.vehicle_plates || "",
    emergency_contacts: contacts,
    medical_profile: {
      ...initialForm.medical_profile,
      ...profile,
      blood_type: profile?.blood_type || "",
      allergies_detail: profile?.allergies_detail || "",
      conditions_detail: profile?.conditions_detail || "",
      recent_injury_detail: profile?.recent_injury_detail || "",
      medical_service_type: profile?.medical_service_type || "",
      insurer_name: profile?.insurer_name || "",
      policy_number: profile?.policy_number || "",
      affiliation_number: profile?.affiliation_number || "",
      transfer_preference: profile?.transfer_preference || "",
      preferred_hospital: profile?.preferred_hospital || "",
      emergency_notes: profile?.emergency_notes || "",
      allergies_json: Array.isArray(profile?.allergies_json) ? profile.allergies_json : [],
      conditions_json: Array.isArray(profile?.conditions_json) ? profile.conditions_json : [],
      medications_json: Array.isArray(profile?.medications_json) ? profile.medications_json : [],
      surgeries_json: Array.isArray(profile?.surgeries_json) ? profile.surgeries_json : [],
      implants_json: Array.isArray(profile?.implants_json) ? profile.implants_json : [],
      protective_equipment_json: Array.isArray(profile?.protective_equipment_json)
        ? profile.protective_equipment_json
        : [],
    },
    privacy_notice_accepted: false,
    sensitive_data_authorized: false,
    information_confirmed: false,
  };
}

function participantProgressBasePayload(form) {
  return {
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
    vehicle_make_model: form.vehicle_make_model.trim() || null,
    vehicle_color: form.vehicle_color.trim() || null,
    vehicle_plates: form.vehicle_plates.trim() || null,
  };
}

function participantContactsPayload(form) {
  return form.emergency_contacts.map((contact, index) => ({
    ...contact,
    contact_order: index + 1,
    name: contact.name.trim(),
    relationship: contact.relationship.trim(),
    phone: contact.phone.trim(),
  }));
}

function participantMedicalPayload(form) {
  const medical = form.medical_profile;
  return {
    ...medical,
    blood_type: medical.blood_type === "No lo sé" ? null : (medical.blood_type || null),
    allergies_detail: nullableTrim(medical.allergies_detail),
    conditions_detail: nullableTrim(medical.conditions_detail),
    recent_injury_detail: nullableTrim(medical.recent_injury_detail),
    medical_service_type: medical.medical_service_type || null,
    insurer_name: nullableTrim(medical.insurer_name),
    policy_number: nullableTrim(medical.policy_number),
    affiliation_number: nullableTrim(medical.affiliation_number),
    transfer_preference: nullableTrim(medical.transfer_preference),
    preferred_hospital: nullableTrim(medical.preferred_hospital),
    emergency_notes: nullableTrim(medical.emergency_notes),
  };
}

export default function PublicEventParticipantLanding() {
  const { publicToken } = useParams();
  const [event, setEvent] = useState(null);
  const [privacyNotice, setPrivacyNotice] = useState(null);
  const [privacyLoading, setPrivacyLoading] = useState(true);
  const [privacyError, setPrivacyError] = useState("");
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [step, setStep] = useState(0);
  const [participant, setParticipant] = useState(null);
  const [screen, setScreen] = useState("landing");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [pendingParticipant, setPendingParticipant] = useState(null);
  const [pendingRegistrationLoading, setPendingRegistrationLoading] = useState(true);


  useEffect(() => {
    let mounted = true;
    setPendingRegistrationLoading(true);
    const savedRegistration = readPendingRegistration(publicToken);
    const participantToken = savedRegistration?.participant_token;

    if (!participantToken) {
      setPendingParticipant(null);
      setPendingRegistrationLoading(false);
      return () => { mounted = false; };
    }

    participantProtectionApi.publicParticipant({
      publicToken,
      participantToken,
    })
      .then((data) => {
        if (!mounted) return;

        if (String(data?.status || "").toUpperCase() === "INICIADO") {
          setPendingParticipant(data);
          return;
        }

        clearPendingRegistration(publicToken);
        setPendingParticipant(null);
      })
      .catch((e) => {
        if (!mounted) return;

        if (e?.status === 404 || e?.status === 409) {
          clearPendingRegistration(publicToken);
          setPendingParticipant(null);
        }
      })
      .finally(() => {
        if (mounted) setPendingRegistrationLoading(false);
      });

    return () => { mounted = false; };
  }, [publicToken]);

  useEffect(() => {
    let mounted = true;
    participantProtectionApi.publicEvent({ publicToken })
      .then((data) => mounted && setEvent(data))
      .catch((e) => mounted && setError(e?.message || "Evento no disponible."))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [publicToken]);

  useEffect(() => {
    let mounted = true;
    setPrivacyLoading(true);
    setPrivacyError("");
    participantProtectionApi.publicPrivacyNotice({ publicToken })
      .then((data) => {
        if (!mounted) return;
        setPrivacyNotice(data);
      })
      .catch((e) => {
        if (!mounted) return;
        setPrivacyNotice(null);
        setPrivacyError(e?.message || "No fue posible cargar el Aviso de Privacidad.");
      })
      .finally(() => mounted && setPrivacyLoading(false));
    return () => { mounted = false; };
  }, [publicToken]);

  useEffect(() => {
    if (!privacyOpen) return undefined;
    const onKeyDown = (eventKey) => {
      if (eventKey.key === "Escape") setPrivacyOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [privacyOpen]);

  const medical = form.medical_profile;
  const eventOpen = Boolean(event?.registration_open);
  const privacyVersion = privacyNotice?.version || event?.privacy_notice_version || "—";
  const galleryImages = useMemo(
    () => (Array.isArray(event?.gallery_json) ? event.gallery_json.filter(Boolean).slice(0, 8) : []),
    [event?.gallery_json]
  );

  useEffect(() => {
    if (galleryIndex === null) return undefined;
    const onGalleryKeyDown = (eventKey) => {
      if (eventKey.key === "Escape") setGalleryIndex(null);
      if (eventKey.key === "ArrowLeft") setGalleryIndex((i) => i === null ? null : (i - 1 + galleryImages.length) % galleryImages.length);
      if (eventKey.key === "ArrowRight") setGalleryIndex((i) => i === null ? null : (i + 1) % galleryImages.length);
    };
    document.addEventListener("keydown", onGalleryKeyDown);
    return () => document.removeEventListener("keydown", onGalleryKeyDown);
  }, [galleryIndex, galleryImages.length]);


  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const updateMedical = (key, value) =>
    setForm((prev) => ({ ...prev, medical_profile: { ...prev.medical_profile, [key]: value } }));

  const updateContact = (index, key, value) => {
    setForm((prev) => {
      const contacts = prev.emergency_contacts.map((contact, i) => i === index ? { ...contact, [key]: value } : contact);
      return { ...prev, emergency_contacts: contacts };
    });
  };

  const addContact = () => {
    if (form.emergency_contacts.length >= 2) return;
    setForm((prev) => ({ ...prev, emergency_contacts: [...prev.emergency_contacts, blankContact(2)] }));
  };

  const removeSecondContact = () =>
    setForm((prev) => ({ ...prev, emergency_contacts: prev.emergency_contacts.slice(0, 1) }));

  const medicationText = useMemo(() => (medical.medications_json || []).join(", "), [medical.medications_json]);
  const surgeryText = useMemo(() => (medical.surgeries_json || []).join(", "), [medical.surgeries_json]);
  const implantText = useMemo(() => (medical.implants_json || []).join(", "), [medical.implants_json]);

  const continuePendingRegistration = async () => {
    const participantToken = pendingParticipant?.participant_token;
    if (!participantToken) return;

    try {
      setSaving(true);
      setError("");

      const data = await participantProtectionApi.publicParticipant({
        publicToken,
        participantToken,
      });

      if (String(data?.status || "").toUpperCase() !== "INICIADO") {
        clearPendingRegistration(publicToken);
        setPendingParticipant(null);
        setError("Este registro ya no está pendiente de completar.");
        return;
      }

      const savedRegistration = readPendingRegistration(publicToken);
      const resumeStep = Math.max(1, Math.min(Number(savedRegistration?.last_step) || 1, 4));

      setParticipant(data);
      setPendingParticipant(data);
      setForm(formFromParticipant(data));
      setStep(resumeStep);
      setScreen("form");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      if (e?.status === 404 || e?.status === 409) {
        clearPendingRegistration(publicToken);
        setPendingParticipant(null);
      }

      setError(e?.message || "No fue posible recuperar tu registro pendiente.");
    } finally {
      setSaving(false);
    }
  };

  const startNewRegistration = () => {
    clearPendingRegistration(publicToken);
    setPendingParticipant(null);
    setParticipant(null);
    setForm(initialForm);
    setStep(0);
    setError("");
    setScreen("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const validateStep = () => {
    if (step === 0 && (!form.first_name.trim() || !form.paternal_surname.trim())) return "Escribe tu nombre y apellido paterno.";
    if (step === 1) {
      const c = form.emergency_contacts[0];
      if (!c?.name.trim() || !c?.relationship.trim() || !c?.phone.trim()) return "Completa el contacto principal de emergencia.";
    }
    if (step === 2 && medical.uses_anticoagulants === null) return "Indica si utilizas medicamentos anticoagulantes.";
    if (step === 4 && !privacyNotice) return "El Aviso de Privacidad no está disponible. No es posible completar el consentimiento en este momento.";
    if (step === 4 && !(form.privacy_notice_accepted && form.sensitive_data_authorized && form.information_confirmed)) {
      return "Debes marcar las tres confirmaciones para completar tu ficha.";
    }
    return "";
  };

  const next = async () => {
    const validation = validateStep();
    if (validation) return setError(validation);

    setSaving(true);
    setError("");

    try {
      let activeParticipant = participant;

      if (step === 0 && !activeParticipant) {
        const created = await participantProtectionApi.publicRegister({
          publicToken,
          payload: {
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

        activeParticipant = created;
        setParticipant(created);

        if (created?.participant_token) {
          savePendingRegistration(publicToken, created.participant_token, 1);
          setPendingParticipant(created);
        }
      }

      if (!activeParticipant?.participant_token) {
        throw new Error("No encontramos el registro iniciado. Vuelve a comenzar.");
      }

      const progressPayload = participantProgressBasePayload(form);

      if (step >= 1) {
        progressPayload.emergency_contacts = participantContactsPayload(form);
      }

      if (step >= 2) {
        progressPayload.medical_profile = participantMedicalPayload(form);
      }

      const savedParticipant = await participantProtectionApi.publicSaveProgress({
        publicToken,
        participantToken: activeParticipant.participant_token,
        payload: progressPayload,
      });

      const nextStep = Math.min(step + 1, 4);
      savePendingRegistration(publicToken, activeParticipant.participant_token, nextStep);
      setParticipant(savedParticipant);
      setPendingParticipant(savedParticipant);
      setStep(nextStep);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e?.message || "No fue posible guardar tu avance.");
    } finally {
      setSaving(false);
    }
  };

  const complete = async () => {
    const validation = validateStep();
    if (validation) return setError(validation);
    if (!participant?.participant_token) return setError("No encontramos el registro iniciado. Vuelve a comenzar.");
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...participantProgressBasePayload(form),
        emergency_contacts: participantContactsPayload(form),
        medical_profile: participantMedicalPayload(form),
        privacy_notice_accepted: form.privacy_notice_accepted,
        sensitive_data_authorized: form.sensitive_data_authorized,
        information_confirmed: form.information_confirmed,
      };
      const result = await participantProtectionApi.publicComplete({
        publicToken,
        participantToken: participant.participant_token,
        payload,
      });
      setParticipant(result);
      clearPendingRegistration(publicToken);
      setPendingParticipant(null);
      setScreen("done");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e?.message || "No fue posible completar tu ficha.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <main className="pp-page"><div className="pp-loader">Preparando tu evento…</div></main>;
  if (!event) return <main className="pp-page"><div className="pp-state-card"><h2>Evento no disponible</h2><p>{error}</p></div></main>;

  if (screen === "done") {
    return (
      <main className="pp-page">
        <section className="pp-done">
          <div className="pp-done__check">✓</div>
          <span className="pp-eyebrow">Protección Médica del Participante</span>
          <h1>Tu ficha de protección está lista</h1>
          <p>La información quedó asociada a <strong>{event.public_event_name}</strong> y podrá ser consultada por personal autorizado del servicio médico.</p>
          <div className="pp-credential">
            <span>Participante</span>
            <strong>{form.participant_number ? `#${form.participant_number}` : `${form.first_name} ${form.paternal_surname}`}</strong>
            <small>Estado: {participant?.status || "COMPLETO"}</small>
          </div>
          <div className="pp-info-note">
            <strong>Importante</strong>
            <span>Esta ficha no sustituye una valoración médica ni crea automáticamente un FRAP.</span>
          </div>
        </section>
      </main>
    );
  }

  if (screen === "landing") {
    return (
      <main className="pp-page">
        <section className="pp-hero">
          {event.cover_image_url && (
            <>
              <img className="pp-hero__cover-bg" src={event.cover_image_url} alt="" aria-hidden="true" />
              <img className="pp-hero__cover" src={event.cover_image_url} alt="" />
            </>
          )}
          <div className="pp-hero__overlay" />
          <div className="pp-hero__content">
            <div className="pp-brand-row">
              {event.organizer_logo_url && <img className="pp-organizer-logo" src={event.organizer_logo_url} alt="Logo del organizador" />}
              <div>
                <span className="pp-eyebrow pp-eyebrow--light">Protección Médica del Participante</span>
                <h1>{event.public_event_name}</h1>
                <p>{event.organizer_name || "Evento"}</p>
              </div>
            </div>
            <div className="pp-event-chips">
              <span>◷ {formatEventDate(event.event_starts_at)}</span>
              <span>⌖ {event.event_location || "Ubicación por confirmar"}</span>
            </div>
            {event.organizer_message && <p className="pp-hero__message">{event.organizer_message}</p>}
            <div className="pp-medical-badge">
              <span className="pp-medical-badge__icon">✚</span>
              <div><small>Servicio médico oficial</small><strong>{event.ambulance_company_name || "AmbulanciaYA"}</strong></div>
            </div>
          </div>
        </section>

        <section className="pp-intro-card">
          <span className="pp-eyebrow">Preparación antes del evento</span>
          <h2>Tu información puede ayudar a atenderte con mayor rapidez</h2>
          <p>Completa tu ficha de seguridad en pocos minutos. Tus datos médicos no aparecen en búsquedas públicas y su consulta está restringida al personal autorizado.</p>
          <div className="pp-benefits">
            <article><span>01</span><strong>Identificación rápida</strong><p>Nombre, número y datos del participante.</p></article>
            <article><span>02</span><strong>Información útil</strong><p>Contactos y datos declarados para una emergencia.</p></article>
            <article><span>03</span><strong>Acceso restringido</strong><p>Protección y consentimiento para datos sensibles.</p></article>
          </div>
          {eventOpen ? (
            pendingRegistrationLoading ? (
              <div className="pp-warning">Revisando si tienes un registro pendiente…</div>
            ) : pendingParticipant ? (
              <div className="pp-warning">
                <strong>Tienes un registro pendiente</strong>
                <p>Puedes continuar la ficha que comenzaste anteriormente o iniciar un registro nuevo.</p>
                <div className="pp-actions">
                  <button type="button" className="pp-primary" onClick={continuePendingRegistration}>
                    Continuar registro <span>→</span>
                  </button>
                  <button type="button" className="pp-secondary" onClick={startNewRegistration}>
                    Iniciar uno nuevo
                  </button>
                </div>
              </div>
            ) : (
              <button className="pp-primary pp-primary--hero" onClick={() => setScreen("form")}>
                Registrar mi ficha de seguridad <span>→</span>
              </button>
            )
          ) : (
            <div className="pp-warning">El registro público de este evento está cerrado.</div>
          )}
          <p className="pp-privacy-line">Aviso de privacidad · versión {privacyVersion}</p>
        </section>

        {galleryImages.length > 0 && (
          <section className="pp-gallery-card" aria-labelledby="pp-gallery-title">
            <div className="pp-gallery-heading">
              <div><span className="pp-eyebrow">Conoce el evento</span><h2 id="pp-gallery-title">Galería del evento</h2></div>

            </div>
            <div className={`pp-gallery-grid ${galleryImages.length === 1 ? "is-single" : ""}`}>
              {galleryImages.map((imageUrl, index) => (
                <button type="button" className="pp-gallery-item" key={`${imageUrl}-${index}`} onClick={() => setGalleryIndex(index)} aria-label={`Abrir imagen ${index + 1} de la galería`}>
                  <img src={imageUrl} alt={`Galería del evento, imagen ${index + 1}`} loading="lazy" />
                  <span className="pp-gallery-item__overlay">Ver imagen</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {galleryIndex !== null && galleryImages[galleryIndex] && (
          <div className="pp-gallery-modal" role="dialog" aria-modal="true" aria-label="Visor de galería">
            <button type="button" className="pp-gallery-modal__backdrop" aria-label="Cerrar galería" onClick={() => setGalleryIndex(null)} />
            <div className="pp-gallery-modal__panel">
              <div className="pp-gallery-modal__top">
                <span>{galleryIndex + 1} / {galleryImages.length}</span>
                <button type="button" className="pp-gallery-modal__close" aria-label="Cerrar" onClick={() => setGalleryIndex(null)}>×</button>
              </div>
              <img src={galleryImages[galleryIndex]} alt={`Galería del evento, imagen ${galleryIndex + 1}`} />
              {galleryImages.length > 1 && <>
                <button type="button" className="pp-gallery-modal__nav pp-gallery-modal__nav--prev" aria-label="Imagen anterior" onClick={() => setGalleryIndex((galleryIndex - 1 + galleryImages.length) % galleryImages.length)}>‹</button>
                <button type="button" className="pp-gallery-modal__nav pp-gallery-modal__nav--next" aria-label="Imagen siguiente" onClick={() => setGalleryIndex((galleryIndex + 1) % galleryImages.length)}>›</button>
              </>}
            </div>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="pp-page">
      <header className="pp-form-header">
        <button type="button" className="pp-back-link" onClick={() => step === 0 ? setScreen("landing") : setStep((s) => s - 1)}>← Atrás</button>
        <div>
          <span className="pp-eyebrow">Ficha de seguridad</span>
          <strong>{event.public_event_name}</strong>
        </div>
        <span className="pp-step-count">{step + 1} / 5</span>
      </header>

      <Progress step={step} />

      <section className="pp-form-card">
        {step === 0 && (
          <>
            <div className="pp-section-heading"><span className="pp-section-icon">ID</span><div><h2>Datos del participante</h2><p>Comencemos con la información que permite identificarte durante el evento.</p></div></div>
            <div className="pp-grid">
              <Field label="Nombre *"><input value={form.first_name} onChange={(e) => update("first_name", e.target.value)} /></Field>
              <Field label="Apellido paterno *"><input value={form.paternal_surname} onChange={(e) => update("paternal_surname", e.target.value)} /></Field>
              <Field label="Apellido materno"><input value={form.maternal_surname} onChange={(e) => update("maternal_surname", e.target.value)} /></Field>
              <Field label="Fecha de nacimiento"><input type="date" value={form.birth_date} onChange={(e) => update("birth_date", e.target.value)} /></Field>
              <Field label="Teléfono"><input inputMode="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} /></Field>
              <Field label="Correo electrónico"><input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} /></Field>
              <Field label="Estado"><input value={form.state_origin} onChange={(e) => update("state_origin", e.target.value)} /></Field>
              <Field label="Ciudad"><input value={form.city_origin} onChange={(e) => update("city_origin", e.target.value)} /></Field>
            </div>
            <div className="pp-subsection"><h3>Datos del evento</h3><div className="pp-grid">
              <Field label="Número de participante"><input value={form.participant_number} onChange={(e) => update("participant_number", e.target.value)} /></Field>
              <Field label="Categoría"><input value={form.category} onChange={(e) => update("category", e.target.value)} /></Field>
              <Field label="Equipo / escudería"><input value={form.team_name} onChange={(e) => update("team_name", e.target.value)} /></Field>
              <Field label="Tipo de vehículo"><input value={form.vehicle_type} onChange={(e) => update("vehicle_type", e.target.value)} /></Field>
              <Field label="Número de vehículo"><input value={form.vehicle_number} onChange={(e) => update("vehicle_number", e.target.value)} /></Field>
              <Field label="Marca / modelo"><input value={form.vehicle_make_model} onChange={(e) => update("vehicle_make_model", e.target.value)} /></Field>
              <Field label="Color"><input value={form.vehicle_color} onChange={(e) => update("vehicle_color", e.target.value)} /></Field>
              <Field label="Placas"><input value={form.vehicle_plates} onChange={(e) => update("vehicle_plates", e.target.value)} /></Field>
            </div></div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="pp-section-heading"><span className="pp-section-icon">SOS</span><div><h2>Contactos de emergencia</h2><p>¿A quién debemos contactar si necesitas apoyo durante el evento?</p></div></div>
            {form.emergency_contacts.map((contact, index) => (
              <article className="pp-contact-card" key={index}>
                <div className="pp-contact-card__head"><strong>{index === 0 ? "Contacto principal" : "Contacto alterno"}</strong>{index === 1 && <button type="button" onClick={removeSecondContact}>Eliminar</button>}</div>
                <div className="pp-grid">
                  <Field label="Nombre completo *"><input value={contact.name} onChange={(e) => updateContact(index, "name", e.target.value)} /></Field>
                  <Field label="Parentesco / relación *"><input value={contact.relationship} onChange={(e) => updateContact(index, "relationship", e.target.value)} /></Field>
                  <Field label="Teléfono *"><input inputMode="tel" value={contact.phone} onChange={(e) => updateContact(index, "phone", e.target.value)} /></Field>
                  <Field label="¿Está presente en el evento?"><YesNo value={contact.present_at_event} onChange={(v) => updateContact(index, "present_at_event", v)} /></Field>
                </div>
              </article>
            ))}
            {form.emergency_contacts.length < 2 && <button type="button" className="pp-secondary" onClick={addContact}>＋ Agregar contacto alterno</button>}
          </>
        )}

        {step === 2 && (
          <>
            <div className="pp-section-heading"><span className="pp-section-icon">✚</span><div><h2>Información médica declarada</h2><p>Selecciona opciones rápidas. Escribe detalles sólo cuando sea necesario.</p></div></div>
            <div className="pp-question"><h3>Tipo de sangre</h3><Pills options={BLOOD_TYPES} value={medical.blood_type} onChange={(v) => updateMedical("blood_type", v)} /></div>
            <div className="pp-question"><h3>Alergias conocidas</h3><Pills multiple options={COMMON_ALLERGIES} value={medical.allergies_json} onChange={(v) => updateMedical("allergies_json", v)} /><textarea placeholder="Detalles de alergias, reacción o información adicional…" value={medical.allergies_detail} onChange={(e) => updateMedical("allergies_detail", e.target.value)} /></div>
            <div className="pp-question"><h3>Padecimientos o condiciones</h3><Pills multiple options={COMMON_CONDITIONS} value={medical.conditions_json} onChange={(v) => updateMedical("conditions_json", v)} /><textarea placeholder="Agrega detalles si es necesario…" value={medical.conditions_detail} onChange={(e) => updateMedical("conditions_detail", e.target.value)} /></div>
            <div className="pp-critical-question"><div><span className="pp-critical-tag">Dato importante</span><h3>¿Utilizas medicamentos anticoagulantes? *</h3><p>Esta información puede ser relevante durante una atención de emergencia.</p></div><YesNo value={medical.uses_anticoagulants} onChange={(v) => updateMedical("uses_anticoagulants", v)} /></div>
            <div className="pp-grid">
              <Field label="Medicamentos actuales" hint="Sepáralos con coma" wide><input value={medicationText} onChange={(e) => updateMedical("medications_json", e.target.value.split(",").map((x) => x.trim()).filter(Boolean))} placeholder="Ej. Losartán 50 mg, Metformina 850 mg" /></Field>
              <Field label="Cirugías previas" hint="Sepáralas con coma" wide><input value={surgeryText} onChange={(e) => updateMedical("surgeries_json", e.target.value.split(",").map((x) => x.trim()).filter(Boolean))} /></Field>
              <Field label="Lesiones recientes" wide><textarea value={medical.recent_injury_detail} onChange={(e) => updateMedical("recent_injury_detail", e.target.value)} /></Field>
              <Field label="Implantes / dispositivos" hint="Sepáralos con coma" wide><input value={implantText} onChange={(e) => updateMedical("implants_json", e.target.value.split(",").map((x) => x.trim()).filter(Boolean))} /></Field>
            </div>
            <div className="pp-question"><h3>Equipo de protección o dispositivo</h3><Pills multiple options={EQUIPMENT} value={medical.protective_equipment_json} onChange={(v) => updateMedical("protective_equipment_json", v)} /></div>
            <div className="pp-critical-question pp-critical-question--neutral"><div><h3>Autorización de acceso en emergencia</h3><p>En caso de una emergencia en la que no puedas expresar tu voluntad y el personal médico considere necesario acceder rápidamente a una zona de tu cuerpo para realizar la valoración o atención prehospitalaria, ¿autorizas el corte de tu traje, ropa o equipamiento cuando resulte necesario?</p></div><YesNo value={medical.suit_cut_authorized} onChange={(v) => updateMedical("suit_cut_authorized", v)} /></div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="pp-section-heading"><span className="pp-section-icon">↗</span><div><h2>Traslado y seguro</h2><p>Información útil para orientar un posible traslado. No garantiza aceptación o cobertura.</p></div></div>
            <div className="pp-question"><h3>Servicio médico / cobertura</h3><Pills options={SERVICE_TYPES} value={medical.medical_service_type} onChange={(v) => updateMedical("medical_service_type", v)} /></div>
            <div className="pp-grid">
              <Field label="Aseguradora"><input value={medical.insurer_name} onChange={(e) => updateMedical("insurer_name", e.target.value)} /></Field>
              <Field label="Número de póliza"><input value={medical.policy_number} onChange={(e) => updateMedical("policy_number", e.target.value)} /></Field>
              <Field label="NSS / afiliación"><input value={medical.affiliation_number} onChange={(e) => updateMedical("affiliation_number", e.target.value)} /></Field>
              <Field label="Hospital preferido"><input value={medical.preferred_hospital} onChange={(e) => updateMedical("preferred_hospital", e.target.value)} /></Field>
              <Field label="Preferencia de traslado" wide><input value={medical.transfer_preference} onChange={(e) => updateMedical("transfer_preference", e.target.value)} placeholder="Ej. Hospital autorizado por mi aseguradora" /></Field>
              <Field label="Notas importantes para una emergencia" hint="Máximo 300 caracteres" wide><textarea maxLength={300} value={medical.emergency_notes} onChange={(e) => updateMedical("emergency_notes", e.target.value)} placeholder="Información breve que el personal médico deba conocer." /></Field>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <div className="pp-section-heading"><span className="pp-section-icon">✓</span><div><h2>Consentimiento y confirmación</h2><p>Revisa y confirma antes de registrar tu ficha de protección.</p></div></div>
            <div className="pp-summary">
              <div><span>Participante</span><strong>{form.first_name} {form.paternal_surname}</strong></div>
              <div><span>Número</span><strong>{form.participant_number || "No indicado"}</strong></div>
              <div><span>Contacto de emergencia</span><strong>{form.emergency_contacts[0]?.name || "Pendiente"}</strong></div>
              <div><span>Tipo de sangre</span><strong>{medical.blood_type || "No indicado"}</strong></div>
            </div>
            {privacyLoading && <div className="pp-privacy-status">Cargando Aviso de Privacidad…</div>}
            {!privacyLoading && privacyError && (
              <div className="pp-error pp-error--privacy">
                <strong>Aviso de Privacidad no disponible</strong>
                <span>{privacyError}</span>
              </div>
            )}

            <div className="pp-consents">
              <div className={`pp-consent-row ${!privacyNotice ? "is-disabled" : ""}`}>
                <label>
                  <input
                    type="checkbox"
                    checked={form.privacy_notice_accepted}
                    disabled={!privacyNotice}
                    onChange={(e) => update("privacy_notice_accepted", e.target.checked)}
                  />
                  <span>
                    <strong>He leído y acepto el Aviso de Privacidad versión {privacyVersion}</strong>
                    <small>Consulta el documento completo antes de aceptar.</small>
                  </span>
                </label>
                <button
                  type="button"
                  className="pp-privacy-link"
                  disabled={!privacyNotice}
                  onClick={() => setPrivacyOpen(true)}
                >
                  Leer Aviso de Privacidad
                </button>
              </div>

              <label><input type="checkbox" checked={form.sensitive_data_authorized} onChange={(e) => update("sensitive_data_authorized", e.target.checked)} /><span><strong>Autorizo expresamente el tratamiento de mis datos personales sensibles</strong><small>Incluidos los datos relacionados con mi estado de salud, para las finalidades indicadas en el Aviso de Privacidad.</small></span></label>
              <label><input type="checkbox" checked={form.information_confirmed} onChange={(e) => update("information_confirmed", e.target.checked)} /><span><strong>Confirmo que la información proporcionada es correcta</strong><small>Los datos médicos son declarados por mí y no sustituyen una valoración clínica.</small></span></label>
            </div>
            <div className="pp-security-note"><span>▣</span><div><strong>Información protegida</strong><p>Los datos médicos no forman parte de una búsqueda pública y su consulta está restringida a personal autorizado.</p></div></div>
          </>
        )}

        {error && <div className="pp-error">{error}</div>}

        <div className="pp-actions">
          {step > 0 && <button type="button" className="pp-secondary" onClick={() => { setError(""); setStep((s) => s - 1); }}>Atrás</button>}
          {step < 4 ? (
            <button type="button" className="pp-primary" disabled={saving} onClick={next}>{saving ? "Guardando…" : "Guardar y continuar"} <span>→</span></button>
          ) : (
            <button type="button" className="pp-primary" disabled={saving || !privacyNotice} onClick={complete}>{saving ? "Registrando ficha…" : "Registrar mi ficha de seguridad"} <span>✓</span></button>
          )}
        </div>
      </section>
      <p className="pp-footer">Protección Médica del Participante · {event.ambulance_company_name || "AmbulanciaYA"}</p>

      {privacyOpen && privacyNotice && (
        <div className="pp-privacy-modal" role="dialog" aria-modal="true" aria-labelledby="pp-privacy-title">
          <button
            type="button"
            className="pp-privacy-modal__backdrop"
            aria-label="Cerrar Aviso de Privacidad"
            onClick={() => setPrivacyOpen(false)}
          />
          <section className="pp-privacy-modal__panel">
            <header className="pp-privacy-modal__header">
              <div>
                <span className="pp-eyebrow">Aviso de Privacidad</span>
                <h2 id="pp-privacy-title">{privacyNotice.title}</h2>
                <p>Versión {privacyNotice.version}</p>
              </div>
              <button type="button" className="pp-privacy-modal__close" aria-label="Cerrar" onClick={() => setPrivacyOpen(false)}>×</button>
            </header>

            <div className="pp-privacy-modal__body">
              <dl className="pp-privacy-meta">
                <div><dt>Responsable</dt><dd>{privacyNotice.responsible_name || "No indicado"}</dd></div>
                <div><dt>Domicilio</dt><dd>{privacyNotice.responsible_address || "No indicado"}</dd></div>
                <div><dt>Contacto de privacidad</dt><dd>{privacyNotice.privacy_email || "No indicado"}</dd></div>
                <div><dt>Derechos ARCO</dt><dd>{privacyNotice.arco_email || "No indicado"}</dd></div>
                <div><dt>Vigencia</dt><dd>{formatPrivacyDate(privacyNotice.effective_from || privacyNotice.published_at)}</dd></div>
              </dl>

              <div className="pp-privacy-content">{privacyNotice.content}</div>

              <div className="pp-privacy-disclaimer">
                <strong>Información médica declarada por el participante</strong>
                <p>La información capturada en esta ficha es proporcionada por el participante y no sustituye una valoración clínica, diagnóstico médico ni registro prehospitalario.</p>
              </div>
            </div>

            <footer className="pp-privacy-modal__footer">
              <button type="button" className="pp-primary" onClick={() => setPrivacyOpen(false)}>Cerrar aviso</button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
