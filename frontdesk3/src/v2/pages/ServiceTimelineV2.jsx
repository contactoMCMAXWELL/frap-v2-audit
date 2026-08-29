import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { v2Api } from "../api/v2";
import MapCardV2 from "../components/MapCardV2";
import FrapPdfSectionV2 from "../components/FrapPdfSectionV2";
import ServiceSectionLauncherV2 from "../components/ServiceSectionLauncherV2";
import { useLayoutScroll } from "../components/V2Layout";
import { SERVICE_SECTION_GROUPS } from "../config/serviceSections";

import ServiceSuppliesV2 from "./ServiceSuppliesV2";
import ServiceFinancialsV2 from "./ServiceFinancialsV2";
import FrapClinicalV2 from "./FrapClinicalV2";
import FrapAssessmentV2 from "./FrapAssessmentV2";
import FrapPediatricsV2 from "./FrapPediatricsV2";
import FrapCardioV2 from "./FrapCardioV2";
import FrapPregnancyV2 from "./FrapPregnancyV2";
import FrapBodyMapV2 from "./FrapBodyMapV2";
import VitalSignsV2 from "./VitalSignsV2";
import ProceduresV2 from "./ProceduresV2";
import MedicationsV2 from "./MedicationsV2";
import FrapTraumaV2 from "./FrapTraumaV2";
import FrapRefusalV2 from "./FrapRefusalV2";
import FrapHandoffV2 from "./FrapHandoffV2";
import { formatDeviceDateTime, localInputToIso } from "../../utils/datetime";
import { getRoleCapabilities } from "../permissions";

async function apiJson(path, { method = "GET", token, companyId, userId, body } = {}) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "X-Company-Id": companyId,
    "X-User-Id": userId,
  };

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      msg = data?.detail || JSON.stringify(data);
    } catch {}
    throw new Error(msg);
  }

  return res.json();
}

const DISPATCH_ACTIONS = [
  { event_type: "unit_en_route", status_label: "Unidad en ruta" },
  { event_type: "unit_on_scene", status_label: "Unidad en escena" },
  { event_type: "patient_contact", status_label: "Contacto con paciente" },
  { event_type: "transport_started", status_label: "Inicio de traslado" },
  { event_type: "hospital_arrival", status_label: "Llegada a hospital" },
  { event_type: "service_closed", status_label: "Servicio cerrado" },
];

const STANDBY_DISPATCH_ACTIONS = [
  { event_type: "unit_en_route", status_label: "Unidad en ruta" },
  { event_type: "unit_on_scene", status_label: "Unidad en sitio" },
  { event_type: "standby_started", status_label: "Cobertura iniciada" },
  { event_type: "standby_finished", status_label: "Cobertura finalizada" },
  { event_type: "service_closed", status_label: "Servicio cerrado" },
];

const CATEGORY_COLORS = {
  Operación: { bg: "#eff6ff", fg: "#1d4ed8", border: "#bfdbfe" },
  Clínico: { bg: "#ecfdf5", fg: "#047857", border: "#a7f3d0" },
  Logística: { bg: "#fff7ed", fg: "#c2410c", border: "#fed7aa" },
  Legal: { bg: "#f5f3ff", fg: "#6d28d9", border: "#ddd6fe" },
  Evento: { bg: "#f3f4f6", fg: "#374151", border: "#d1d5db" },
};

function normalizeText(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCaseEs(value) {
  const text = normalizeText(value);
  if (!text) return "Evento";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function eventMeta(evt) {
  const categoryLabel = evt?.category_label || titleCaseEs(evt?.category || "evento");
  const eventTypeLabel = evt?.event_type_label || titleCaseEs(evt?.event_type || "evento");
  const palette = CATEGORY_COLORS[categoryLabel] || CATEGORY_COLORS.Evento;
  return { categoryLabel, eventTypeLabel, palette };
}

function detailItemsOf(evt) {
  if (Array.isArray(evt?.detail_items) && evt.detail_items.length) {
    return evt.detail_items.filter((item) => item?.label && item?.value);
  }
  if (evt?.notes) {
    return [{ label: "Detalle", value: evt.notes }];
  }
  return [];
}

function operationModeLabel(mode) {
  if (mode === "transfer") return "Traslado";
  if (mode === "standby") return "Guardia / cobertura";
  return "Atención en sitio";
}

function captureModeLabel(mode) {
  return mode === "retrospective"
    ? "Retrospectiva"
    : "Tiempo real";
}

function coverageLabel(value) {
  if (value === "within_coverage") return "Dentro de cobertura";
  if (value === "outside_coverage") return "Fuera de cobertura";
  return "No aplica";
}

function billingScopeLabel(value) {
  if (value === "included_in_standby") return "Incluido en guardia";
  if (value === "additional_charge") return "Cargo adicional";
  return "No aplica";
}

function standbyBillingLabel(value) {
  if (value === "included") return "Incluida";
  if (value === "additional") return "Cargo adicional";
  if (value === "mixed") return "Mixta";
  return "No especificada";
}

function locationRoleLabel(role) {
  if (role === "origin") return "Origen";
  if (role === "destination") return "Destino";
  if (role === "standby") return "Ubicación de guardia";
  return "Ubicación de atención";
}

const SECTION_PALETTE = {
  "detalle-servicio": {
    bg: "#f7fbff",
    border: "#bfdbfe",
    accent: "#2563eb",
  },
  "mapa-incidente": {
    bg: "#f7fbff",
    border: "#bfdbfe",
    accent: "#2563eb",
  },
  "despacho-operativo": {
    bg: "#f7fbff",
    border: "#bfdbfe",
    accent: "#2563eb",
  },
  "timeline-servicio": {
    bg: "#f7fbff",
    border: "#bfdbfe",
    accent: "#2563eb",
  },

  "insumos-servicio": {
    bg: "#fbfcfd",
    border: "#cbd5e1",
    accent: "#475569",
  },

  "frap-clinico": {
    bg: "#f5fdf9",
    border: "#a7f3d0",
    accent: "#047857",
  },

  "signos-vitales": {
    bg: "#faf9ff",
    border: "#ddd6fe",
    accent: "#7c3aed",
  },

  "negativa-atencion": {
    bg: "#fffdf6",
    border: "#fde68a",
    accent: "#b45309",
  },
};

function SectionShell({ id, title, description, children, expanded = true, onToggle }) {
  const palette = SECTION_PALETTE[id] || {
    bg: "#ffffff",
    border: "#e5e7eb",
    accent: "#64748b",
  };

  const detailsStyle = expanded
    ? {
        ...collapsibleStyle,
        background: palette.bg,
        borderColor: palette.border,
        borderLeft: `5px solid ${palette.accent}`,
      }
    : {
        ...collapsibleStyle,
        padding: "9px 12px",
        background: palette.bg,
        borderColor: palette.border,
        borderLeft: `5px solid ${palette.accent}`,
      };

  return (
    <section id={id} style={groupSectionStyle}>
      <details
        open={expanded}
        style={detailsStyle}
        onToggle={(e) => onToggle?.(e.currentTarget.open)}
      >
        <summary
          style={{
            ...summaryToggleStyle,
            minHeight: expanded ? undefined : 30,
          }}
        >
          <div style={{ display: "grid", gap: expanded ? 4 : 1 }}>
            <h3
              style={{
                margin: 0,
                fontSize: expanded ? undefined : 14,
                color: palette.accent,
              }}
            >
              {title}
            </h3>

            {!!description && (
              <div
                style={{
                  color: "#6b7280",
                  fontSize: expanded ? 14 : 11,
                  lineHeight: expanded ? 1.4 : 1.25,
                }}
              >
                {description}
              </div>
            )}
          </div>

          <span
            style={{
              ...summaryPillStyle,
              padding: expanded ? "6px 12px" : "4px 9px",
              fontSize: expanded ? 12 : 11,
            }}
          >
            {expanded ? "Ocultar" : "Mostrar"}
          </span>
        </summary>

        <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
          {children}
        </div>
      </details>
    </section>
  );
}

export default function ServiceTimelineV2({ session }) {
  const { intakeId } = useParams();
  const layoutScroll = useLayoutScroll();

  const [timeline, setTimeline] = useState(null);
  const [intake, setIntake] = useState(null);
  const [units, setUnits] = useState([]);
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [dispatchNote, setDispatchNote] = useState("");
  const [dispatchOccurredAt, setDispatchOccurredAt] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [dispatchBusy, setDispatchBusy] = useState(false);
  const [sectionState, setSectionState] = useState({
    "detalle-servicio": true,
    "mapa-incidente": true,
    "despacho-operativo": true,
    "timeline-servicio": true,
    "insumos-servicio": true,
    "frap-clinico": true,
    "signos-vitales": true,
    "negativa-atencion": true,
  });

  const caps = useMemo(() => getRoleCapabilities(session?.role), [session?.role]);

  const isRetrospective = intake?.capture_mode === "retrospective";
  const normalizedRole = String(session?.role || "").trim().toUpperCase();
  const canOperateRetrospective =
    normalizedRole === "ADMIN" || normalizedRole === "SUPERADMIN";
  const canOperateCurrentDispatch =
    caps.dispatch.operate && (!isRetrospective || canOperateRetrospective);

  const retrospectiveWriteBlocked =
    isRetrospective && !canOperateRetrospective;

  const retrospectiveApproved =
    isRetrospective &&
    Boolean(intake?.approved_at && intake?.approved_by_user_id);

  const pdfSession = useMemo(
    () => ({
      ...session,
      access_token: session?.access_token || session?.token || "",
      company_id: session?.company_id || session?.companyId || "",
      user_id: session?.user_id || session?.userId || "",
    }),
    [session]
  );

  const load = async () => {
    if (!intakeId) {
      setError("No se encontró intakeId para cargar el servicio.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [timelineData, intakeData, unitsData] = await Promise.all([
        v2Api.intakeTimeline({
          intakeId,
          token: session?.token,
          companyId: session?.companyId,
          userId: session?.userId,
        }),
        v2Api.serviceIntakeGet({
          intakeId,
          token: session?.token,
          companyId: session?.companyId,
          userId: session?.userId,
        }),
        apiJson("/v2/units-admin/", {
          token: session?.token,
          companyId: session?.companyId,
          userId: session?.userId,
        }).catch(() => []),
      ]);

      setTimeline(timelineData || null);
      setIntake(intakeData || null);
      setUnits(Array.isArray(unitsData) ? unitsData : []);
    } catch (e) {
      setError(e?.message || "No se pudo cargar el timeline del servicio");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [intakeId]);

  const currentUnitEvent = useMemo(() => {
    const events = timeline?.events || [];
    const assignmentTypes = new Set([
      "unit_assigned",
      "unit_reassigned",
      "unit_en_route",
      "unit_on_scene",
      "standby_started",
      "standby_finished",
      "patient_contact",
      "transport_started",
      "hospital_arrival",
      "service_closed",
      "assigned",
    ]);

    const filtered = events.filter((evt) => evt?.unit_id && assignmentTypes.has(evt.event_type));
    return filtered.length ? filtered[filtered.length - 1] : null;
  }, [timeline]);

  const currentUnitId = currentUnitEvent?.unit_id || "";
  const currentUnitCode =
    currentUnitEvent?.unit_code ||
    units.find((u) => u.id === currentUnitId)?.unit_code ||
    units.find((u) => u.id === currentUnitId)?.code ||
    "";

  const isStandbyOperational =
    intake?.operation_mode === "standby" && !intake?.parent_intake_id;

  const dispatchActions =
    isStandbyOperational
      ? STANDBY_DISPATCH_ACTIONS
      : DISPATCH_ACTIONS;

  const quickFacts = useMemo(
    () =>
      isStandbyOperational
        ? [
            { label: "Servicio", value: intake?.service_type || "Guardia / cobertura" },
            { label: "Evento", value: intake?.standby_event_name || "Sin nombre" },
            { label: "Unidad", value: currentUnitCode || "Sin unidad" },
            { label: "Modalidad", value: "Guardia / cobertura" },
          ]
        : [
            { label: "Servicio", value: intake?.service_type || "Servicio" },
            { label: "Paciente", value: intake?.patient_name || intake?.caller_name || "Por identificar" },
            { label: "Unidad", value: currentUnitCode || "Sin unidad" },
            { label: "Hospital sugerido", value: intake?.destination_suggested || "No especificado" },
          ],
    [currentUnitCode, intake, isStandbyOperational]
  );

  const structuredLocations = useMemo(() => {
    const rows = Array.isArray(intake?.locations)
      ? intake.locations.filter((row) => row?.active !== false)
      : [];

    if (rows.length) {
      return [...rows].sort(
        (a, b) =>
          Number(a?.sequence || 0) - Number(b?.sequence || 0)
      );
    }

    if (
      intake?.location_text ||
      intake?.location_reference ||
      intake?.lat ||
      intake?.lng
    ) {
      return [
        {
          id: "legacy-location",
          location_role:
            intake?.operation_mode === "standby"
              ? "standby"
              : intake?.operation_mode === "transfer"
              ? "origin"
              : "scene",
          name: intake?.location_text || "",
          address_text: intake?.location_text || "",
          reference: intake?.location_reference || "",
          lat: intake?.lat,
          lng: intake?.lng,
          sequence: 1,
          active: true,
          legacy: true,
        },
      ];
    }

    return [];
  }, [intake]);

  const mapPoints = useMemo(
    () =>
      structuredLocations
        .map((row, index) => ({
          id: row?.id || `${row?.location_role || "location"}-${index}`,
          lat: row.lat,
          lng: row.lng,
          role: row?.location_role || "",
          address: row?.address_text || "",
          label:
            row?.name ||
            row?.address_text ||
            locationRoleLabel(row?.location_role),
        })),
    [structuredLocations]
  );

  const allExpanded = Object.values(sectionState).every(Boolean);

  function scrollToTop() {
    const container = layoutScroll?.mainRef?.current;
    if (container && typeof container.scrollTo === "function") {
      container.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setAllSections(expanded) {
    setSectionState((prev) => Object.fromEntries(Object.keys(prev).map((key) => [key, expanded])));
  }

  function updateSection(sectionId, expanded) {
    setSectionState((prev) => ({ ...prev, [sectionId]: expanded }));
  }

  function scrollToSection(sectionId) {
    const sectionParentMap = {
      "detalle-servicio": "detalle-servicio",
      "mapa-incidente": "mapa-incidente",
      "despacho-operativo": "despacho-operativo",
      "timeline-servicio": "timeline-servicio",
      "insumos-servicio": "insumos-servicio",
      "costos-servicio": "insumos-servicio",
      "frap-clinico": "frap-clinico",
      "evaluacion-clinica": "frap-clinico",
      "pediatria": "frap-clinico",
      "cardio": "frap-clinico",
      "embarazo": "frap-clinico",
      "signos-vitales": "signos-vitales",
      "procedimientos": "signos-vitales",
      "medicamentos": "signos-vitales",
      "lesiones-corporales": "signos-vitales",
      "negativa-atencion": "negativa-atencion",
      "traslado-entrega": "negativa-atencion",
      "firmas-pdf": "negativa-atencion",
    };

    const parentId = sectionParentMap[sectionId] || sectionId;

    setSectionState((prev) => ({
      ...prev,
      [parentId]: true,
    }));

    window.setTimeout(() => {
      const node = document.getElementById(sectionId);
      if (!node) return;

      node.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      node.classList.add("v2-section-focus");
      window.setTimeout(
        () => node.classList.remove("v2-section-focus"),
        1400
      );
    }, 60);
  }

  async function createDispatchEvent(event_type, status_label, opts = {}) {
    if (!canOperateCurrentDispatch) return;

    let occurredAtIso = null;

    if (isRetrospective) {
      if (!dispatchOccurredAt) {
        setError(
          "Indica la fecha y hora en que ocurrió este evento operativo."
        );
        return;
      }

      occurredAtIso = localInputToIso(dispatchOccurredAt);

      if (!occurredAtIso) {
        setError("La fecha y hora del evento operativo no son válidas.");
        return;
      }
    }

    try {
      setDispatchBusy(true);
      setError("");

      await apiJson("/v2/service-dispatch-events/", {
        method: "POST",
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
        body: {
          intake_id: intakeId,
          service_id: intake?.service_id || null,
          unit_id: opts.unit_id || currentUnitId || null,
          event_type,
          status_label,
          notes: opts.notes || dispatchNote || "",
          event_payload: opts.event_payload || {},
          ...(isRetrospective ? { occurred_at: occurredAtIso } : {}),
        },
      });

      setDispatchNote("");
      if (isRetrospective) setDispatchOccurredAt("");
      if (opts.resetUnitSelection) setSelectedUnitId("");
      await load();
    } catch (e) {
      setError(e?.message || "No se pudo registrar el evento operativo");
    } finally {
      setDispatchBusy(false);
    }
  }

  async function assignUnit() {
    if (!canOperateCurrentDispatch) return;

    if (!selectedUnitId) {
      setError("Selecciona una unidad para asignarla.");
      return;
    }

    const eventType = currentUnitId ? "unit_reassigned" : "unit_assigned";
    const label = currentUnitId ? "Unidad reasignada" : "Unidad asignada";

    await createDispatchEvent(eventType, label, {
      unit_id: selectedUnitId,
      resetUnitSelection: true,
    });
  }

  return (
    <div style={{ display: "grid", gap: 16, paddingBottom: 140 }}>
      <style>{`.v2-section-focus { box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.18); transition: box-shadow .2s ease; }`}</style>

      <div style={{ display: "grid", gap: 10 }}>
        <div>
          <h2 style={{ marginBottom: 8 }}>Seguimiento del servicio</h2>
          <div style={{ color: "#6b7280" }}>
            Hub clínico-operativo con acceso rápido por bloques, timeline y cierre documental.
          </div>
        </div>

        {isRetrospective && (
          <div
            style={{
              border: "1px solid #f59e0b",
              background: "#fffbeb",
              color: "#78350f",
              borderRadius: 12,
              padding: 14,
              display: "grid",
              gap: 6,
            }}
          >
            <div style={{ fontWeight: 800 }}>
              Captura retrospectiva
            </div>

            <div>
              <strong>Fecha y hora declarada del servicio:</strong>{" "}
              {formatDeviceDateTime(intake?.occurred_at, {
                fallback: "No especificada",
              })}
            </div>

            {intake?.retrospective_reason ? (
              <div>
                <strong>Motivo:</strong> {intake.retrospective_reason}
              </div>
            ) : null}

            <div>
              <strong>Aprobación administrativa:</strong>{" "}
              {retrospectiveApproved
                ? `Aprobada${
                    intake?.approved_at
                      ? ` · ${formatDeviceDateTime(intake.approved_at)}`
                      : ""
                  }`
                : "Pendiente"}
            </div>
          </div>
        )}

        <div style={summaryStripStyle}>
          {quickFacts.map((item) => (
            <div key={item.label} style={summaryItemStyle}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#6b7280", textTransform: "uppercase" }}>{item.label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {loading && <p style={{ color: "#6b7280" }}>Cargando servicio...</p>}
      {error && <p style={{ color: "crimson", whiteSpace: "pre-wrap" }}>{error}</p>}

      <ServiceSectionLauncherV2
        caps={caps}
        groups={
          isStandbyOperational
            ? SERVICE_SECTION_GROUPS.filter((group) => {
                const label = String(
                  group?.label || group?.title || group?.name || ""
                ).toUpperCase();

                return ![
                  "ATENCIÓN CLÍNICA",
                  "ESPECIALIDADES Y LESIONES",
                  "CIERRE MÉDICO-LEGAL",
                ].includes(label);
              })
            : SERVICE_SECTION_GROUPS
        }
        onNavigate={scrollToSection}
        onGoTop={scrollToTop}
        allExpanded={allExpanded}
        onExpandAll={() => setAllSections(true)}
        onCollapseAll={() => setAllSections(false)}
      />

      {intake && (
        <SectionShell
          id="detalle-servicio"
          expanded={sectionState["detalle-servicio"]}
          onToggle={(open) => updateSection("detalle-servicio", open)}
          title="Detalle del servicio"
          description="Datos generales, modalidad operativa, relación comercial y ubicaciones del servicio."
        >
          <div style={cardStyle}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "grid", gap: 8, flex: "1 1 520px" }}>
                <h3 style={{ marginTop: 0, marginBottom: 4 }}>
                  {intake.service_type || "Servicio"}
                </h3>

                <div style={grid2}>
                  <div><strong>Subtipo:</strong> {intake.service_subtype || "No especificado"}</div>
                  <div><strong>Modalidad operativa:</strong> {operationModeLabel(intake.operation_mode)}</div>
                  <div><strong>Tipo de captura:</strong> {captureModeLabel(intake.capture_mode)}</div>
                  <div>
                    <strong>Fecha y hora del servicio:</strong>{" "}
                    {intake.occurred_at
                      ? formatDeviceDateTime(intake.occurred_at)
                      : intake.created_at
                      ? formatDeviceDateTime(intake.created_at)
                      : "No especificada"}
                  </div>
                  <div><strong>Prioridad operativa:</strong> {intake.priority_operational ?? "-"}</div>
                  <div><strong>Prioridad clínica:</strong> {intake.priority_clinical || "-"}</div>
                  <div><strong>Origen de llamada:</strong> {intake.call_source || "No especificado"}</div>
                  <div><strong>Pacientes estimados:</strong> {intake.patient_count_estimated ?? "No especificado"}</div>
                  <div><strong>Solicitante:</strong> {intake.caller_name || "No especificado"}</div>
                  <div><strong>Teléfono:</strong> {intake.caller_phone || "No especificado"}</div>
                  <div><strong>Riesgo en escena:</strong> {intake.scene_risk || "No especificado"}</div>
                  <div><strong>Hospital sugerido:</strong> {intake.destination_suggested || "No especificado"}</div>
                  <div><strong>Pagador:</strong> {intake.payer_type || "No especificado"}</div>
                </div>

                {intake.operation_mode === "standby" && (
                  <div style={detailContextStyle}>
                    <strong>Datos de la guardia / cobertura</strong>
                    <div><strong>Evento:</strong> {intake.standby_event_name || "Sin nombre"}</div>
                    <div>
                      <strong>Inicio:</strong>{" "}
                      {intake.standby_starts_at
                        ? formatDeviceDateTime(intake.standby_starts_at)
                        : "No especificado"}
                    </div>
                    <div>
                      <strong>Fin:</strong>{" "}
                      {intake.standby_ends_at
                        ? formatDeviceDateTime(intake.standby_ends_at)
                        : "No especificado"}
                    </div>
                    <div>
                      <strong>Modalidad comercial:</strong>{" "}
                      {standbyBillingLabel(intake.standby_billing_mode)}
                    </div>
                  </div>
                )}

                {intake.parent_intake_id && (
                  <div style={detailContextStyle}>
                    <strong>Relación con guardia</strong>
                    <div><strong>Folio padre:</strong> {intake.parent_intake_id}</div>
                    <div><strong>Cobertura:</strong> {coverageLabel(intake.coverage_status)}</div>
                    <div><strong>Tratamiento comercial:</strong> {billingScopeLabel(intake.billing_scope)}</div>
                  </div>
                )}

                <div style={{ display: "grid", gap: 10 }}>
                  <strong>Ubicaciones operativas</strong>

                  {structuredLocations.length ? (
                    structuredLocations.map((location) => (
                      <div
                        key={
                          location?.id ||
                          `${location?.location_role}-${location?.sequence}`
                        }
                        style={locationDetailStyle}
                      >
                        <div>
                          <strong>{locationRoleLabel(location?.location_role)}</strong>
                        </div>

                        {!!location?.name && (
                          <div><strong>Nombre:</strong> {location.name}</div>
                        )}

                        <div>
                          <strong>Dirección:</strong>{" "}
                          {location?.address_text ||
                            location?.name ||
                            "No especificada"}
                        </div>

                        <div>
                          <strong>Referencia:</strong>{" "}
                          {location?.reference || "Sin referencia"}
                        </div>

                        {location?.lat !== null &&
                          location?.lat !== undefined &&
                          location?.lng !== null &&
                          location?.lng !== undefined && (
                            <div>
                              <strong>Coordenadas:</strong>{" "}
                              {location.lat}, {location.lng}
                            </div>
                          )}
                      </div>
                    ))
                  ) : (
                    <div style={{ color: "#6b7280" }}>
                      Sin ubicación registrada.
                    </div>
                  )}
                </div>

                {!!intake.notes && (
                  <div style={detailContextStyle}>
                    <strong>Notas del servicio</strong>
                    <div style={{ whiteSpace: "pre-wrap" }}>
                      {intake.notes}
                    </div>
                  </div>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                  alignItems: "flex-start",
                }}
              >
                <Link to="/v2/intakes">
                  <button type="button">Volver a servicios</button>
                </Link>

                {caps.dispatch.operate && (
                  <Link to="/v2/intakes/nuevo">
                    <button type="button">Nuevo servicio</button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </SectionShell>
      )}

      {intake && (
        <SectionShell
          id="mapa-incidente"
          expanded={sectionState["mapa-incidente"]}
          onToggle={(open) => updateSection("mapa-incidente", open)}
          title="Mapa operativo"
          description="Referencia visual de las ubicaciones operativas registradas para el servicio."
        >
          <MapCardV2
            title={
              intake.operation_mode === "transfer"
                ? "Origen y destino del traslado"
                : intake.operation_mode === "standby"
                ? "Ubicación de la guardia"
                : "Ubicación de la atención"
            }
            points={mapPoints}
            lat={intake.lat}
            lng={intake.lng}
            label={intake.location_text || "Servicio"}
          />
        </SectionShell>
      )}

      {caps.dispatch.view && (
        <SectionShell
          id="despacho-operativo"
          expanded={sectionState["despacho-operativo"]}
          onToggle={(open) => updateSection("despacho-operativo", open)}
          title="Despacho operativo"
          description="Asignación de unidad y cambios de estado durante la operación."
        >
          <div style={cardStyle}>
            <div style={{ display: "grid", gap: 12 }}>
              <div><strong>Unidad actual:</strong> {currentUnitCode || "Sin unidad asignada"}</div>

              {canOperateCurrentDispatch ? (
                <>
                  {isRetrospective && (
                    <div style={fieldStyle}>
                      <div style={labelText}>
                        Fecha y hora del evento operativo
                      </div>
                      <input
                        style={controlStyle}
                        type="datetime-local"
                        value={dispatchOccurredAt}
                        onChange={(e) => setDispatchOccurredAt(e.target.value)}
                      />
                      <div style={{ color: "#92400e", fontSize: 13 }}>
                        Obligatoria para cada evento registrado en una captura retrospectiva.
                      </div>
                    </div>
                  )}

                  <div style={grid2}>
                    <div style={fieldStyle}>
                      <div style={labelText}>Seleccionar unidad</div>
                      <select style={controlStyle} value={selectedUnitId} onChange={(e) => setSelectedUnitId(e.target.value)}>
                        <option value="">Selecciona una unidad</option>
                        {units.filter((u) => u.active !== false).map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.unit_code || u.code} {u.type ? `· ${u.type}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: "flex", alignItems: "end" }}>
                      <button type="button" onClick={assignUnit} disabled={dispatchBusy}>
                        {dispatchBusy ? "Guardando..." : currentUnitId ? "Reasignar unidad" : "Asignar unidad"}
                      </button>
                    </div>
                  </div>

                  <div style={fieldStyle}>
                    <div style={labelText}>Nota operativa</div>
                    <textarea
                      style={textAreaStyle}
                      rows={3}
                      value={dispatchNote}
                      onChange={(e) => setDispatchNote(e.target.value)}
                      placeholder="Observación operativa opcional"
                    />
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {dispatchActions.map((action) => (
                      <button
                        key={action.event_type}
                        type="button"
                        disabled={dispatchBusy || !currentUnitId}
                        onClick={() => createDispatchEvent(action.event_type, action.status_label)}
                      >
                        {action.status_label}
                      </button>
                    ))}
                  </div>

                  {!currentUnitId && (
                    <div style={{ color: "#6b7280" }}>
                      Primero asigna una unidad para registrar estados operativos.
                    </div>
                  )}
                </>
              ) : (
                <div style={{ color: "#6b7280" }}>
                  {isRetrospective && caps.dispatch.operate
                    ? "La captura retrospectiva sólo puede ser modificada por ADMIN o SUPERADMIN."
                    : "Este perfil tiene acceso de consulta al bloque operativo, sin permisos para modificar despacho."}
                </div>
              )}
            </div>
          </div>
        </SectionShell>
      )}

      <SectionShell
        id="timeline-servicio"
        expanded={sectionState["timeline-servicio"]}
        onToggle={(open) => updateSection("timeline-servicio", open)}
        title="Timeline clínico-operativo"
        description="Secuencia de eventos y trazabilidad del servicio con hora local del dispositivo."
      >
        <div style={cardStyle}>
          {!timeline?.events?.length && <p style={{ color: "#6b7280" }}>Aún no hay eventos registrados.</p>}

          {!!timeline?.events?.length && (
            <div style={{ display: "grid", gap: 12 }}>
              {timeline.events.map((evt) => {
                const { categoryLabel, eventTypeLabel, palette } = eventMeta(evt);
                const details = detailItemsOf(evt);
                const showSecondaryLabel = eventTypeLabel && eventTypeLabel !== (evt.title || "");

                return (
                  <div key={evt.id} style={eventCardStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
                      <div style={{ display: "grid", gap: 8, flex: 1, minWidth: 260 }}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          <span style={{ background: palette.bg, color: palette.fg, border: `1px solid ${palette.border}`, borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 700 }}>
                            {categoryLabel}
                          </span>
                          {showSecondaryLabel && (
                            <span style={{ color: "#6b7280", fontSize: 13, fontWeight: 600 }}>{eventTypeLabel}</span>
                          )}
                        </div>

                        <strong style={{ fontSize: 16, color: "#111827" }}>{evt.title || eventTypeLabel}</strong>

                        {!!evt.subtitle && (
                          <div style={{ color: "#374151", fontSize: 14, lineHeight: 1.5 }}>{evt.subtitle}</div>
                        )}

                        {evt.unit_code && (
                          <span style={{ color: "#6b7280", fontSize: 13 }}>Unidad: {evt.unit_code}</span>
                        )}
                      </div>

                      <div style={{ color: "#4b5563", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
                        {formatDeviceDateTime(evt.created_at, { fallback: "Sin hora" })}
                      </div>
                    </div>

                    {!!details.length && (
                      <div style={detailsBlockStyle}>
                        {details.map((item, index) => (
                          <div key={`${evt.id}-detail-${index}`} style={detailRowStyle}>
                            <div style={detailLabelStyle}>{item.label}</div>
                            <div style={detailValueStyle}>{item.value}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SectionShell>

      {(caps.supplies.view || caps.financial.view) && (
        <SectionShell
          id="insumos-servicio"
          expanded={sectionState["insumos-servicio"]}
          onToggle={(open) => updateSection("insumos-servicio", open)}
          title="Recursos del servicio"
          description="Control de insumos y resultado económico sin alterar la operación clínica."
        >
          {caps.supplies.view && <ServiceSuppliesV2 session={session} readOnly={!caps.supplies.edit} />}
          {caps.financial.view && (
            <div id="costos-servicio">
              <ServiceFinancialsV2 session={session} readOnly={!caps.financial.edit} />
            </div>
          )}
        </SectionShell>
      )}

      {!isStandbyOperational && caps.clinical.view && (
        <SectionShell
          id="frap-clinico"
          expanded={sectionState["frap-clinico"]}
          onToggle={(open) => updateSection("frap-clinico", open)}
          title="Atención clínica"
          description="Bloques base del FRAP, evaluación y seguimiento clínico del paciente."
        >
          <FrapClinicalV2 session={session} readOnly={!caps.clinical.edit} />

          <div id="evaluacion-clinica">
            <FrapAssessmentV2
              session={session}
              intakeId={intakeId}
              readOnly={!caps.clinical.edit || retrospectiveWriteBlocked}
              isRetrospective={isRetrospective}
            />
          </div>

          <div id="pediatria">
            <FrapPediatricsV2
              session={session}
              intakeId={intakeId}
              readOnly={!caps.clinical.edit || retrospectiveWriteBlocked}
              isRetrospective={isRetrospective}
              onDataChanged={load}
            />
          </div>

          <div id="cardio">
            <FrapCardioV2
              session={session}
              intakeId={intakeId}
              readOnly={!caps.clinical.edit || retrospectiveWriteBlocked}
              isRetrospective={isRetrospective}
              onDataChanged={load}
            />
          </div>

          <div id="embarazo">
            <FrapPregnancyV2
              session={session}
              intakeId={intakeId}
              readOnly={!caps.clinical.edit || retrospectiveWriteBlocked}
              isRetrospective={isRetrospective}
              onDataChanged={load}
            />
          </div>
        </SectionShell>
      )}

      {!isStandbyOperational &&
        (caps.vitals.view || caps.procedures.view || caps.medications.view || caps.trauma.view) && (
        <SectionShell
          id="signos-vitales"
          expanded={sectionState["signos-vitales"]}
          onToggle={(open) => updateSection("signos-vitales", open)}
          title="Soporte clínico, procedimientos y lesiones"
          description="Acceso rápido a signos vitales, intervenciones, medicamentos y trauma."
        >
          {caps.vitals.view && (
            <VitalSignsV2
              session={session}
              readOnly={!caps.vitals.edit || retrospectiveWriteBlocked}
              isRetrospective={isRetrospective}
            />
          )}
          {caps.procedures.view && (
            <div id="procedimientos">
              <ProceduresV2
                session={session}
                readOnly={!caps.procedures.edit || retrospectiveWriteBlocked}
                isRetrospective={isRetrospective}
              />
            </div>
          )}
          {caps.medications.view && (
            <div id="medicamentos">
              <MedicationsV2
                session={session}
                readOnly={!caps.medications.edit || retrospectiveWriteBlocked}
                isRetrospective={isRetrospective}
              />
            </div>
          )}
          {caps.trauma.view && (
            <div id="lesiones-corporales" style={{ display: "grid", gap: 14 }}>
              <FrapBodyMapV2
                session={session}
                intakeId={intakeId}
                readOnly={!caps.trauma.edit || retrospectiveWriteBlocked}
                isRetrospective={isRetrospective}
              />
              <FrapTraumaV2
                session={session}
                readOnly={!caps.trauma.edit || retrospectiveWriteBlocked}
                isRetrospective={isRetrospective}
              />
            </div>
          )}
        </SectionShell>
      )}

      {isStandbyOperational && caps.clinical.view && (
        <SectionShell
          id="cierre-operativo-guardia"
          expanded={sectionState["cierre-operativo-guardia"]}
          onToggle={(open) => updateSection("cierre-operativo-guardia", open)}
          title="Cierre operativo de guardia"
          description="Validación operativa, firma del responsable del evento y constancia documental."
        >
          <div id="firmas-pdf">
            <FrapPdfSectionV2
              session={pdfSession}
              intake={intake}
              onIntakeChanged={load}
            />
          </div>
        </SectionShell>
      )}

      {!isStandbyOperational &&
        (caps.refusal.view || caps.handoff.view || caps.clinical.view) && (
        <SectionShell
          id="negativa-atencion"
          expanded={sectionState["negativa-atencion"]}
          onToggle={(open) => updateSection("negativa-atencion", open)}
          title="Cierre médico-legal"
          description="Bloques finales para negativa, entrega, firmas y PDF médico-legal."
        >
          {caps.refusal.view && (
            <FrapRefusalV2
              session={session}
              readOnly={!caps.refusal.edit || retrospectiveWriteBlocked}
              isRetrospective={isRetrospective}
            />
          )}
          {caps.handoff.view && (
            <div id="traslado-entrega">
              <FrapHandoffV2
                session={session}
                readOnly={!caps.handoff.edit || retrospectiveWriteBlocked}
                isRetrospective={isRetrospective}
                canSignReceiver={caps.handoff.signReceiver}
              />
            </div>
          )}

          {caps.clinical.view && (
            <div id="firmas-pdf">
              <FrapPdfSectionV2 session={pdfSession} intake={intake} onIntakeChanged={load} />
            </div>
          )}
        </SectionShell>
      )}
    </div>
  );
}

const collapsibleStyle = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 16,
};

const summaryToggleStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  cursor: "pointer",
  listStyle: "none",
};

const summaryPillStyle = {
  background: "#f3f4f6",
  color: "#111827",
  border: "1px solid #e5e7eb",
  borderRadius: 999,
  padding: "6px 12px",
  fontSize: 12,
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const cardStyle = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 18,
};

const detailContextStyle = {
  background: "#f9fafb",
  border: "1px solid #d1d5db",
  borderRadius: 10,
  padding: 12,
  display: "grid",
  gap: 6,
};

const locationDetailStyle = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: 12,
  display: "grid",
  gap: 5,
};

const groupSectionStyle = {
  display: "grid",
  gap: 12,
};

const summaryStripStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 10,
};

const summaryItemStyle = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 14,
  display: "grid",
  gap: 6,
};

const eventCardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: 16,
  background: "#fafafa",
};

const detailsBlockStyle = {
  marginTop: 14,
  display: "grid",
  gap: 10,
};

const detailRowStyle = {
  display: "grid",
  gap: 4,
  paddingTop: 10,
  borderTop: "1px solid #e5e7eb",
};

const detailLabelStyle = {
  fontSize: 12,
  fontWeight: 800,
  color: "#374151",
  textTransform: "uppercase",
  letterSpacing: 0.3,
};

const detailValueStyle = {
  fontSize: 15,
  color: "#111827",
  lineHeight: 1.6,
  whiteSpace: "pre-wrap",
};

const fieldStyle = {
  display: "grid",
  gap: 6,
};

const labelText = {
  fontSize: 14,
  fontWeight: 700,
  color: "#111827",
};

const controlStyle = {
  width: "100%",
  minHeight: 40,
  padding: "8px 10px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  boxSizing: "border-box",
  font: "inherit",
  background: "#fff",
};

const textAreaStyle = {
  ...controlStyle,
  minHeight: 96,
  resize: "vertical",
};

const grid2 = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 12,
};
