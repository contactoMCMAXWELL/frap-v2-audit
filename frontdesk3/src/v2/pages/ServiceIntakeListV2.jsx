import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { v2Api } from "../api/v2";
import { hasCoordinates } from "../utils/maps";

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "service_created", label: "Creado" },
  { value: "unit_assigned", label: "Asignado" },
  { value: "unit_reassigned", label: "Reasignado" },
  { value: "unit_en_route", label: "En ruta" },
  { value: "unit_on_scene", label: "En escena" },
  { value: "patient_contact", label: "Contacto" },
  { value: "transport_started", label: "Traslado" },
  { value: "hospital_arrival", label: "Llegó hospital" },
  { value: "service_closed", label: "Cerrado" },
];

const QUICK_ACTIONS = [
  { event_type: "unit_en_route", status_label: "Unidad en ruta" },
  { event_type: "unit_on_scene", status_label: "Unidad en escena" },
  { event_type: "patient_contact", status_label: "Contacto con paciente" },
  { event_type: "transport_started", status_label: "Inicio de traslado" },
  { event_type: "hospital_arrival", status_label: "Llegada a hospital" },
  { event_type: "service_closed", status_label: "Servicio cerrado" },
];

function normalizeList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.value)) return data.value;
  return [];
}

function statusPalette(status) {
  const s = String(status || "").toLowerCase();
  if (s === "unit_assigned" || s === "unit_reassigned" || s === "assigned") {
    return { bg: "#eff6ff", fg: "#1d4ed8", bd: "#bfdbfe" };
  }
  if (s === "unit_en_route") return { bg: "#fff7ed", fg: "#c2410c", bd: "#fed7aa" };
  if (s === "unit_on_scene") return { bg: "#fef3c7", fg: "#92400e", bd: "#fde68a" };
  if (s === "patient_contact") return { bg: "#ecfccb", fg: "#3f6212", bd: "#bef264" };
  if (s === "transport_started") return { bg: "#ffe4e6", fg: "#be123c", bd: "#fecdd3" };
  if (s === "hospital_arrival") return { bg: "#f5f3ff", fg: "#6d28d9", bd: "#ddd6fe" };
  if (s === "service_closed") return { bg: "#e5e7eb", fg: "#111827", bd: "#d1d5db" };
  return { bg: "#f3f4f6", fg: "#374151", bd: "#d1d5db" };
}

function StatusPill({ status, label }) {
  const p = statusPalette(status);
  return (
    <span
      style={{
        background: p.bg,
        color: p.fg,
        border: `1px solid ${p.bd}`,
        borderRadius: 999,
        padding: "6px 10px",
        fontSize: 12,
        fontWeight: 800,
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      {label || "Sin estado"}
    </span>
  );
}

function fmtDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

export default function ServiceIntakeListV2({ session }) {
  const [items, setItems] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedUnits, setSelectedUnits] = useState({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyById, setBusyById] = useState({});

  const canOperate = ["SUPERADMIN", "ADMIN", "DISPATCH"].includes(String(session?.role || "").toUpperCase());

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const [boardData, unitsData] = await Promise.all([
        v2Api.serviceIntakeBoard({
          token: session?.token,
          companyId: session?.companyId,
          userId: session?.userId,
        }),
        v2Api.unitsAdminList({
          token: session?.token,
          companyId: session?.companyId,
          userId: session?.userId,
        }).catch(() => []),
      ]);
      setItems(normalizeList(boardData));
      setUnits(normalizeList(unitsData));
    } catch (e) {
      setError(e?.message || "No se pudo cargar despacho");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [session?.companyId]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((row) => {
      const haystack = [
        row.incident_number,
        row.service_type,
        row.service_subtype,
        row.location_text,
        row.location_reference,
        row.caller_name,
        row.current_unit_code,
        row.dispatch_status_label,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const okSearch = !q || haystack.includes(q);
      const okStatus = statusFilter === "all" || row.dispatch_status === statusFilter;
      return okSearch && okStatus;
    });
  }, [items, search, statusFilter]);

  const setBusy = (id, value) => {
    setBusyById((prev) => ({ ...prev, [id]: value }));
  };

  const setSelectedUnit = (intakeId, unitId) => {
    setSelectedUnits((prev) => ({ ...prev, [intakeId]: unitId }));
  };

  const createEvent = async (row, event_type, status_label, unit_id = null) => {
    try {
      setBusy(row.id, true);
      setError("");
      await v2Api.dispatchEventCreate({
        payload: {
          intake_id: row.id,
          service_id: row.service_id || null,
          unit_id: unit_id || row.current_unit_id || null,
          event_type,
          status_label,
          notes: "",
          event_payload: {},
        },
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
      });
      setSelectedUnit(row.id, "");
      await load();
    } catch (e) {
      setError(e?.message || "No se pudo actualizar estado operativo");
    } finally {
      setBusy(row.id, false);
    }
  };

  const assignUnit = async (row) => {
    const selectedUnitId = selectedUnits[row.id];
    if (!selectedUnitId) {
      setError("Selecciona una unidad antes de asignarla.");
      return;
    }
    const eventType = row.current_unit_id ? "unit_reassigned" : "unit_assigned";
    const label = row.current_unit_id ? "Unidad reasignada" : "Unidad asignada";
    await createEvent(row, eventType, label, selectedUnitId);
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Dispatch V2</h2>
          <div style={{ fontSize: 13, color: "#6b7280" }}>
            Control operativo de servicios, estatus y timeline rápido.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to="/v2/intakes/nuevo">
            <button type="button">Nuevo servicio</button>
          </Link>
          <button type="button" onClick={load}>Recargar</button>
        </div>
      </div>

      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
          <label style={labelStyle}>
            Buscar
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Incidente, tipo, ubicación, solicitante, unidad..."
            />
          </label>

          <label style={labelStyle}>
            Estatus
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              {STATUS_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {loading && <p>Cargando despacho...</p>}
      {error && <p style={{ color: "crimson", whiteSpace: "pre-wrap" }}>{error}</p>}

      {!loading && !filteredItems.length && (
        <div style={emptyBox}>
          <p style={{ margin: 0 }}>No hay servicios para mostrar.</p>
        </div>
      )}

      <div style={{ display: "grid", gap: 16 }}>
        {filteredItems.map((row) => {
          const isBusy = !!busyById[row.id];
          const currentUnitCode = row.current_unit_code || "Sin unidad";
          const availableUnits = units.filter((u) => u.active !== false);
          const selectedUnitId = selectedUnits[row.id] || "";

          return (
            <div key={row.id} style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
                    <h3 style={{ margin: 0 }}>{row.service_type || "Servicio sin tipo"}</h3>
                    <StatusPill status={row.dispatch_status} label={row.dispatch_status_label} />
                  </div>
                  <div style={subText}>{row.service_subtype || "Sin subtipo"}</div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={chipStyle}>{row.priority_clinical || "routine"}</div>
                  <div style={{ ...subText, marginTop: 8 }}>Actualizado: {fmtDate(row.dispatch_updated_at)}</div>
                </div>
              </div>

              <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                <div><strong>Ubicación:</strong> {row.location_text || "No especificada"}</div>
                <div><strong>Referencia:</strong> {row.location_reference || "Sin referencia"}</div>
                <div><strong>Solicitante:</strong> {row.caller_name || "No especificado"}</div>
                <div><strong>Origen de llamada:</strong> {row.call_source || "No especificado"}</div>
                <div><strong>Pacientes estimados:</strong> {row.patient_count_estimated ?? 1}</div>
                <div><strong>Unidad actual:</strong> {currentUnitCode}</div>
                <div><strong>Mapa:</strong> {hasCoordinates(row.lat, row.lng) ? "Coordenadas disponibles" : "Sin coordenadas"}</div>
              </div>

              {Array.isArray(row.timeline_preview) && row.timeline_preview.length > 0 ? (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>Timeline rápido</div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {row.timeline_preview.map((evt) => (
                      <div
                        key={evt.id}
                        style={{
                          border: "1px solid #e5e7eb",
                          borderRadius: 10,
                          padding: "8px 10px",
                          background: "#fafafa",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                          <div style={{ fontWeight: 700 }}>{evt.status_label || evt.event_type}</div>
                          <div style={subText}>{fmtDate(evt.created_at)}</div>
                        </div>
                        {evt.notes ? <div style={{ marginTop: 4 }}>{evt.notes}</div> : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
                {canOperate ? (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "2fr auto", gap: 10 }}>
                      <select
                        value={selectedUnitId}
                        onChange={(e) => setSelectedUnit(row.id, e.target.value)}
                      >
                        <option value="">Selecciona una unidad</option>
                        {availableUnits.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.unit_code || u.code} {u.type ? `· ${u.type}` : ""}
                          </option>
                        ))}
                      </select>
                      <button type="button" onClick={() => assignUnit(row)} disabled={isBusy}>
                        {isBusy ? "Procesando..." : row.current_unit_id ? "Reasignar unidad" : "Asignar unidad"}
                      </button>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {QUICK_ACTIONS.map((action) => (
                        <button
                          key={action.event_type}
                          type="button"
                          disabled={isBusy || (!row.current_unit_id && action.event_type !== "service_closed")}
                          onClick={() => createEvent(row, action.event_type, action.status_label)}
                        >
                          {action.status_label}
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <Link to={`/v2/intakes/${row.id}/timeline`}>
                    <button type="button">Abrir detalle</button>
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const cardStyle = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 18,
};

const emptyBox = {
  background: "#fff",
  border: "1px dashed #d1d5db",
  borderRadius: 12,
  padding: 20,
};

const subText = {
  color: "#6b7280",
  fontSize: 13,
};

const chipStyle = {
  background: "#eef2ff",
  color: "#3730a3",
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 600,
  display: "inline-block",
};

const labelStyle = {
  display: "grid",
  gap: 6,
  fontWeight: 600,
};