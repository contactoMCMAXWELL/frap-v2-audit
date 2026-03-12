import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";

function fmt(dt) {
  if (!dt) return "";
  try {
    const d = new Date(dt);
    if (Number.isNaN(d.getTime())) return String(dt);
    return d.toLocaleString();
  } catch {
    return String(dt);
  }
}

function statusAccent(status) {
  const s = (status || "").toLowerCase();
  return (
    s === "draft" ? "#CBD5E1" :
    s === "assigned" ? "#60A5FA" :
    s === "accepted" ? "#34D399" :
    s === "en_route" ? "#FB923C" :
    s === "on_scene" ? "#FBBF24" :
    s === "transport" ? "#FB7185" :
    s === "delivered" ? "#A78BFA" :
    s === "finished" ? "#94A3B8" :
    "#CBD5E1"
  );
}

function StatusPill({ status }) {
  const s = (status || "").toLowerCase();

  const label =
    s === "draft" ? "borrador" :
    s === "assigned" ? "asignado" :
    s === "accepted" ? "aceptado" :
    s === "en_route" ? "en ruta" :
    s === "on_scene" ? "en escena" :
    s === "transport" ? "traslado" :
    s === "delivered" ? "entregado" :
    s === "finished" ? "finalizado" :
    (status || "—");

  // Pastel tones (no aggressive colors)
  const bg =
    s === "draft" ? "var(--surface, #F3F4F6)" :
    s === "assigned" ? "var(--secondarySoft, #EFF6FF)" :
    s === "accepted" ? "var(--primarySoft, #ECFDF5)" :
    s === "en_route" ? "#FFF7ED" :
    s === "on_scene" ? "#FEF9C3" :
    s === "transport" ? "#FFF1F2" :
    s === "delivered" ? "#F5F3FF" :
    s === "finished" ? "var(--surface, #F3F4F6)" :
    "#F3F4F6";

  const bd =
    s === "draft" ? "var(--borderStrong, #D1D5DB)" :
    s === "assigned" ? "#BFDBFE" :
    s === "accepted" ? "#BBF7D0" :
    s === "en_route" ? "#FED7AA" :
    s === "on_scene" ? "#FDE68A" :
    s === "transport" ? "#FECDD3" :
    s === "delivered" ? "#DDD6FE" :
    s === "finished" ? "var(--border, #E5E7EB)" :
    "var(--border, #E5E7EB)";

  const fg =
    s === "assigned" ? "var(--secondary, #2563EB)" :
    s === "accepted" ? "var(--primary, #047857)" :
    s === "draft" ? "var(--muted, #6B7280)" :
    "var(--text, #111827)";

  return (
    <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 999, border: `1px solid ${bd}`, background: bg, color: fg, textTransform: "uppercase", letterSpacing: 0.4 }}>
      {label}
    </span>
  );
}

function Badge({ children }) {
  return (
    <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 999, border: "1px solid var(--border, #E5E7EB)", background: "#fff" }}>
      {children}
    </span>
  );
}

function Timeline({ s }) {
  const events = [
    { key: "created_at", label: "Creado", at: s.created_at },
    { key: "assigned_at", label: "Asignado", at: s.assigned_at },
    { key: "accepted_at", label: "Aceptado", at: s.accepted_at },
    { key: "en_route_at", label: "En ruta", at: s.en_route_at },
    { key: "on_scene_at", label: "En escena", at: s.on_scene_at },
    { key: "transport_at", label: "Traslado", at: s.transport_at },
    { key: "delivered_at", label: "Entregado", at: s.delivered_at },
    { key: "finished_at", label: "Terminado", at: s.finished_at },
    { key: "closed_at", label: "Cerrado", at: s.closed_at },
  ].filter((e) => !!e.at);

  if (!events.length) {
    return <div style={{ color: "var(--muted, #6b7280)", fontSize: 13 }}>Sin eventos aún.</div>;
  }

  return (
    <div className="ga-page" style={{ display: "grid", gap: 10, padding: 16, background: "var(--bg, #F9FAFB)", minHeight: "100vh" }}>
      {events.map((e) => (
        <div key={e.key} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13 }}>
          <div style={{ fontWeight: 700 }}>{e.label}</div>
          <div style={{ color: "var(--muted, #6b7280)" }}>{fmt(e.at)}</div>
        </div>
      ))}
    </div>
  );
}

// Flujo canónico (1 paso por click)
const FLOW = ["draft", "assigned", "accepted", "en_route", "on_scene", "transport", "delivered", "finished"];

function nextStatuses(current) {
  const c = (current || "").toLowerCase();
  const i = FLOW.indexOf(c);
  if (i === -1) return [];
  return i < FLOW.length - 1 ? [FLOW[i + 1]] : [];
}

function labelForStatus(s) {
  switch ((s || "").toLowerCase()) {
    case "assigned": return "Asignar";
    case "accepted": return "Aceptar";
    case "en_route": return "En ruta";
    case "on_scene": return "En escena";
    case "transport": return "Traslado";
    case "delivered": return "Entregado";
    case "finished": return "Terminar";
    default: return s;
  }
}

function Input({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div style={{ fontSize: 12, color: "var(--muted, #6b7280)", fontWeight: 800 }}>{label}</div>
      <input
        type={type}
        value={value ?? ""}
        placeholder={placeholder || ""}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid var(--border, #E5E7EB)",
          outline: "none",
        }}
      />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div style={{ fontSize: 12, color: "var(--muted, #6b7280)", fontWeight: 800 }}>{label}</div>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid var(--border, #E5E7EB)",
          outline: "none",
          background: "white",
        }}
      >
        {options.map((op) => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </select>
    </label>
  );
}

// Opciones precargadas (ajustables)
const SERVICE_TYPE_OPTIONS = [
  { value: "emergency", label: "Emergency" },
  { value: "traslado", label: "Traslado" },
  { value: "interhospitalario", label: "Interhospitalario" },
  { value: "domicilio", label: "Domicilio" },
  { value: "evento", label: "Evento" },
  { value: "__other__", label: "Otro…" },
];

const MOTIVE_OPTIONS = [
  { value: "Dolor torácico", label: "Dolor torácico" },
  { value: "Dificultad respiratoria", label: "Dificultad respiratoria" },
  { value: "Trauma", label: "Trauma" },
  { value: "Convulsiones", label: "Convulsiones" },
  { value: "Síncope", label: "Síncope" },
  { value: "Parto", label: "Parto" },
  { value: "__other__", label: "Otro…" },
];

function normalizeListShape(res) {
  if (Array.isArray(res)) {
    return { value: res, Count: res.length };
  }
  if (res && Array.isArray(res.value)) {
    return { value: res.value, Count: res.Count ?? res.value.length };
  }
  return { value: [], Count: 0 };
}

function isActiveStatus(status) {
  return String(status || "").toLowerCase() !== "finished";
}

function serviceMatchesQuery(s, q) {
  if (!q) return true;
  const t = q.trim().toLowerCase();
  if (!t) return true;

  const hay = [
    s?.frap_folio,
    s?.service_type,
    s?.location,
    s?.motive,
    s?.requested_by,
    s?.status,
    s?.id,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return hay.includes(t);
}

function ServiceCard({ s, active, onSelect, onAssignUnit }) {
  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      style={{
        textAlign: "left",
        width: "100%",
        padding: 10,
        borderRadius: 12,
        border: active ? "2px solid var(--text, #111827)" : "1px solid var(--border, #E5E7EB)",
        background: "var(--card, #ffffff)",
        borderLeft: `4px solid ${statusAccent(s.status)}`,
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <div style={{ fontWeight: 900, fontSize: 13 }}>
          {s.service_type || "Servicio"}{" "}
          <span style={{ color: "var(--muted, #6b7280)", fontWeight: 700 }}>· P{String(s.priority ?? "—")}</span>
        </div>
        <StatusPill status={s.status} />
      </div>

      <div style={{ marginTop: 6, color: "var(--muted, #6b7280)", fontSize: 12, lineHeight: 1.3 }}>
        {s.location || "Sin ubicación"} {s.motive ? `· ${s.motive}` : ""}
      </div>

      <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <Badge>id: {String(s.id).slice(0, 8)}…</Badge>
        {s.unit_id ? <Badge>unit: {String(s.unit_id).slice(0, 8)}…</Badge> : <Badge>sin unidad</Badge>}
        {s.frap_id ? <Badge>frap: {String(s.frap_id).slice(0, 8)}…</Badge> : <Badge>sin frap</Badge>}

        <div style={{ flex: 1 }} />

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAssignUnit?.(s);
          }}
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid var(--primary, #047857)",
            background: "white",
            fontWeight: 900,
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          Asignar unidad
        </button>
      </div>

      <div style={{ marginTop: 8, color: "var(--muted2, #9ca3af)", fontSize: 12 }}>
        creado: {fmt(s.created_at)}
      </div>
    </div>
  );
}

function TopMenu({ activeKey, isAdmin, onGoDispatch, onGoUnits, onGoUsers }) {
  const btn = (key, label, onClick, disabled) => {
    const active = key === activeKey;
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        style={{
          padding: "10px 12px",
          borderRadius: 12,
          border: active ? "1px solid var(--text, #111827)" : "1px solid var(--border, #E5E7EB)",
          background: active ? "var(--primary, #047857)" : "white",
          color: active ? "white" : "var(--text, #111827)",
          fontWeight: 900,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {btn("dispatch", "Dispatch", onGoDispatch, false)}
      {btn("units", "Unidades", onGoUnits, !isAdmin)}
      {btn("users", "Usuarios", onGoUsers, !isAdmin)}
    </div>
  );
}

export default function Dispatch() {
  const nav = useNavigate();
  const { token, companyId, userId, user, role, clear } = useAuthStore();

  const isAdmin = useMemo(() => {
    const r = String(role || "").toUpperCase();
    return r === "ADMIN" || r === "SUPERADMIN";
  }, [role]);

  const [busy, setBusy] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [err, setErr] = useState("");

  const [list, setList] = useState({ value: [], Count: 0 });

  // ---- Unidades (para asignación desde cada tarjeta) ----
  const [units, setUnits] = useState({ value: [], Count: 0 });
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignService, setAssignService] = useState(null);
  const [assignUnitId, setAssignUnitId] = useState("");



  const [selectedId, setSelectedId] = useState("");
  const selected = useMemo(
    () => (list.value || []).find((x) => x.id === selectedId) || null,
    [list, selectedId]
  );

  const itemsRaw = list.value || [];
  const countRaw = list.Count ?? itemsRaw.length;

  const canLoad = useMemo(() => !!token, [token]);

  // ---- Crear servicio (form) ----
  const [createOpen, setCreateOpen] = useState(true);

  const [cPriority, setCPriority] = useState("2");
  const [cServiceType, setCServiceType] = useState("emergency");
  const [cServiceTypeOther, setCServiceTypeOther] = useState("");
  const [cLocation, setCLocation] = useState("");
  const [cMotive, setCMotive] = useState("Dolor torácico");
  const [cMotiveOther, setCMotiveOther] = useState("");
  const [cRequestedBy, setCRequestedBy] = useState("Llamada 911");

  const effectiveServiceType = cServiceType === "__other__" ? (cServiceTypeOther || "").trim() : (cServiceType || "").trim();
  const effectiveMotive = cMotive === "__other__" ? (cMotiveOther || "").trim() : (cMotive || "").trim();

  // ---- Filtros (Kanban) ----
  const [q, setQ] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [prioOnly, setPrioOnly] = useState(false);

  function resetCreateForm() {
    setCPriority("2");
    setCServiceType("emergency");
    setCServiceTypeOther("");
    setCLocation("");
    setCMotive("Dolor torácico");
    setCMotiveOther("");
    setCRequestedBy("Llamada 911");
  }

  async function load({ keepSelected = true } = {}) {
    if (!canLoad) return;
    setErr("");
    setBusy(true);
    try {
      const res = await api.servicesList({
        limit: 200,
        token,
        companyId: companyId || undefined,
        userId: userId || undefined,
      });

      const norm = normalizeListShape(res);
      setList(norm);

      if (!keepSelected) return;

      const currentStillExists = selectedId && (norm.value || []).some((x) => x.id === selectedId);
      if (!currentStillExists) {
        const firstId = norm.value?.[0]?.id || "";
        if (firstId) setSelectedId(firstId);
      }
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Error cargando servicios");
    } finally {
      setBusy(false);
    }
  }
  async function loadUnits() {
    if (!canLoad) return;
    try {
      const res = await api.unitsList({
        limit: 200,
        token,
        companyId: companyId || undefined,
        userId: userId || undefined,
      });
      const norm = normalizeListShape(res);
      setUnits(norm);
    } catch (e) {
      console.error(e);
      // No bloquea dispatch
    }
  }

  function openAssignUnit(serviceRow) {
    setAssignService(serviceRow);
    setAssignUnitId(serviceRow?.unit_id || "");
    setAssignOpen(true);
  }

  async function confirmAssignUnit() {
    if (!assignService?.id) return;
    if (!assignUnitId) {
      setErr("Selecciona una unidad.");
      return;
    }
    setErr("");
    setMutating(true);
    try {
      await api.serviceAssignUnit({
        serviceId: assignService.id,
        unitId: assignUnitId,
        token,
        companyId: companyId || undefined,
        userId: userId || undefined,
      });
      setAssignOpen(false);
      setAssignService(null);
      setAssignUnitId("");
      await load({ keepSelected: true });
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Error asignando unidad");
    } finally {
      setMutating(false);
    }
  }



  async function advanceStatus(targetStatus) {
    if (!selected) return;
    setErr("");
    setMutating(true);
    try {
      await api.serviceUpdateStatus({
        serviceId: selected.id,
        status: targetStatus,
        token,
        companyId: companyId || undefined,
        userId: userId || undefined,
      });
      await load();
      setSelectedId(selected.id);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Error actualizando estatus");
    } finally {
      setMutating(false);
    }
  }

  async function createService() {
    setErr("");

    const pr = Number(cPriority);
    if (!Number.isFinite(pr) || pr < 1 || pr > 5) {
      setErr("priority inválido (1..5)");
      return;
    }
    if (!effectiveServiceType) {
      setErr("Falta service_type (elige opción o captura 'Otro')");
      return;
    }
    if (cServiceType === "__other__" && !cServiceTypeOther.trim()) {
      setErr("Captura el valor para service_type (Otro)");
      return;
    }
    if (cMotive === "__other__" && !cMotiveOther.trim()) {
      setErr("Captura el valor para motive (Otro)");
      return;
    }

    setMutating(true);
    try {
      const created = await api.serviceCreate({
        payload: {
          priority: pr,
          service_type: effectiveServiceType,
          location: cLocation.trim() || null,
          motive: effectiveMotive || null,
          requested_by: cRequestedBy.trim() || null,
        },
        token,
        companyId: companyId || undefined,
        userId: userId || undefined,
      });

      const res = await api.servicesList({
        limit: 200,
        token,
        companyId: companyId || undefined,
        userId: userId || undefined,
      });
      const norm = normalizeListShape(res);
      setList(norm);
      if (created?.id) setSelectedId(created.id);

      resetCreateForm();
      setCreateOpen(false);
      alert(`Servicio creado ✅\nID: ${created?.id || ""}`);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Error creando servicio");
    } finally {
      setMutating(false);
    }
  }

  async function createFrapFromService() {
    if (!selected) return;
    if (selected.frap_id) return;
    setErr("");
    setMutating(true);
    try {
      const frap = await api.frapCreateFromService({
        serviceId: selected.id,
        token,
        companyId: companyId || undefined,
        userId: userId || undefined,
      });
      await load();
      setSelectedId(selected.id);
      alert(`FRAP creado: ${frap?.id || ""} · Folio: ${frap?.folio || ""}`);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Error creando FRAP");
    } finally {
      setMutating(false);
    }
  }

  function openFrap() {
    if (!selected?.frap_id) return;
    nav(`/frap/${selected.frap_id}`);
  }

  useEffect(() => {
    load();
    loadUnits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, companyId, userId]);

  const intervalRef = useRef(null);
  useEffect(() => {
    if (!canLoad) return;

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (mutating) return;
      if (createOpen) return;
      if (document?.hidden) return;

      load({ keepSelected: true });
    }, 10000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canLoad, mutating, createOpen]);

  const actions = selected ? nextStatuses(selected.status) : [];

  const items = useMemo(() => {
    let arr = [...itemsRaw];

    if (activeOnly) arr = arr.filter((s) => isActiveStatus(s.status));
    if (prioOnly) arr = arr.filter((s) => Number(s.priority || 0) >= 4);
    if (q.trim()) arr = arr.filter((s) => serviceMatchesQuery(s, q));

    return arr;
  }, [itemsRaw, activeOnly, prioOnly, q]);

  const count = items.length;
  const countAll = countRaw;

  const byStatus = useMemo(() => {
    const map = {};
    FLOW.forEach((st) => { map[st] = []; });

    items.forEach((s) => {
      const st = String(s.status || "").toLowerCase();
      if (map[st]) map[st].push(s);
      else map.draft.push(s);
    });

    return map;
  }, [items]);

  return (
    <div style={{ padding: 16, maxWidth: 1400, margin: "0 auto" }}>
      {/* TOP HEADER + MENU */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 18 }}>Dispatch</div>
          <div style={{ color: "var(--muted, #6b7280)", fontSize: 13 }}>
            Usuario: {user || "—"} · Role: {role || "—"} · Company: {companyId || "—"}
          </div>
        </div>

        <TopMenu
          activeKey="dispatch"
          isAdmin={isAdmin}
          onGoDispatch={() => nav("/dispatch")}
          onGoUnits={() => nav("/admin/company/units")}
          onGoUsers={() => nav("/admin/company/users")}
        />

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => load()}
            disabled={busy || mutating}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid var(--borderStrong, #D1D5DB)",
              cursor: busy || mutating ? "not-allowed" : "pointer",
              background: busy || mutating ? "var(--surface, #F3F4F6)" : "white",
              fontWeight: 800,
            }}
          >
            {busy ? "Cargando…" : "Refrescar"}
          </button>

          <button
            onClick={clear}
            disabled={mutating}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid var(--primary, #047857)",
              cursor: mutating ? "not-allowed" : "pointer",
              background: "var(--primary, #047857)",
              color: "white",
              fontWeight: 900,
              opacity: mutating ? 0.6 : 1,
            }}
          >
            Salir
          </button>
        </div>
      </div>

      {err ? <div style={{ marginTop: 12, color: "#b91c1c", whiteSpace: "pre-wrap" }}>{err}</div> : null}

      <div className="ga-dispatch-layout" style={{ marginTop: 14, display: "grid", gap: 14 }}>
        {/* LIST + FORM + KANBAN */}
        <div style={{ border: "1px solid var(--border, #E5E7EB)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: 12, borderBottom: "1px solid var(--border, #E5E7EB)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 900 }}>
              Servicios ({count}{count !== countAll ? ` / ${countAll}` : ""})
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ color: "var(--muted, #6b7280)", fontSize: 13 }}>Orden: created_at desc</div>
              <button
                onClick={() => setCreateOpen((v) => !v)}
                disabled={mutating}
                style={{
                  padding: "8px 10px",
                  borderRadius: 12,
                  border: "1px solid var(--primary, #047857)",
                  background: createOpen ? "#f0fdfa" : "var(--primary, #047857)",
                  color: createOpen ? "var(--primary, #047857)" : "#fff",
                  fontWeight: 900,
                  cursor: mutating ? "not-allowed" : "pointer",
                }}
              >
                {createOpen ? "Cerrar form" : "Crear servicio"}
              </button>
            </div>
          </div>

          {/* FILTER BAR */}
          <div style={{ padding: 12, borderBottom: "1px solid var(--surface, #F3F4F6)", background: "#fff" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, alignItems: "end" }}>
              <Input label="Buscar" value={q} onChange={setQ} placeholder="folio, ubicación, motivo, solicita, status, id…" />
              <label style={{ display: "flex", gap: 8, alignItems: "center", paddingBottom: 6 }}>
                <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />
                <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text, #111827)" }}>Activos</span>
              </label>
              <label style={{ display: "flex", gap: 8, alignItems: "center", paddingBottom: 6 }}>
                <input type="checkbox" checked={prioOnly} onChange={(e) => setPrioOnly(e.target.checked)} />
                <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text, #111827)" }}>Prioridad ≥ 4</span>
              </label>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted, #6b7280)" }}>
              Auto-refresh cada 10s (se pausa si el form está abierto o si estás actualizando estatus).
            </div>
          </div>

          {/* CREATE SERVICE FORM */}
          {createOpen ? (
            <div style={{ padding: 12, borderBottom: "1px solid var(--border, #E5E7EB)", background: "var(--bg, #F9FAFB)" }}>
              <div style={{ fontWeight: 900, marginBottom: 10 }}>Nuevo servicio</div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Input label="priority (1..5)" type="number" value={cPriority} onChange={setCPriority} placeholder="1..5" />

                <Select
                  label="service_type"
                  value={cServiceType}
                  onChange={(v) => {
                    setCServiceType(v);
                    if (v !== "__other__") setCServiceTypeOther("");
                  }}
                  options={SERVICE_TYPE_OPTIONS}
                />

                {cServiceType === "__other__" ? (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <Input
                      label="service_type (Otro)"
                      value={cServiceTypeOther}
                      onChange={setCServiceTypeOther}
                      placeholder="Escribe el tipo de servicio"
                    />
                  </div>
                ) : null}

                <div style={{ gridColumn: "1 / -1" }}>
                  <Input label="location" value={cLocation} onChange={setCLocation} placeholder="Dirección / referencia" />
                </div>

                <Select
                  label="motive"
                  value={cMotive}
                  onChange={(v) => {
                    setCMotive(v);
                    if (v !== "__other__") setCMotiveOther("");
                  }}
                  options={MOTIVE_OPTIONS}
                />

                {cMotive === "__other__" ? (
                  <Input
                    label="motive (Otro)"
                    value={cMotiveOther}
                    onChange={setCMotiveOther}
                    placeholder="Escribe el motivo"
                  />
                ) : (
                  <Input
                    label="requested_by"
                    value={cRequestedBy}
                    onChange={setCRequestedBy}
                    placeholder="Quién solicita"
                  />
                )}

                {cMotive === "__other__" ? (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <Input
                      label="requested_by"
                      value={cRequestedBy}
                      onChange={setCRequestedBy}
                      placeholder="Quién solicita"
                    />
                  </div>
                ) : null}
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={createService}
                  disabled={mutating}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid var(--primary, #047857)",
                    background: mutating ? "var(--surface, #F3F4F6)" : "var(--primary, #047857)",
                    color: mutating ? "var(--primary, #047857)" : "#fff",
                    fontWeight: 900,
                    cursor: mutating ? "not-allowed" : "pointer",
                  }}
                >
                  {mutating ? "Creando…" : "Crear"}
                </button>

                <button
                  onClick={resetCreateForm}
                  disabled={mutating}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid var(--borderStrong, #D1D5DB)",
                    background: "white",
                    fontWeight: 900,
                    cursor: mutating ? "not-allowed" : "pointer",
                    opacity: mutating ? 0.6 : 1,
                  }}
                >
                  Limpiar
                </button>
              </div>

              <div style={{ marginTop: 10, fontSize: 12, color: "var(--muted, #6b7280)" }}>
                Tip: usa “Otro…” solo cuando no exista opción. Mantén opciones cortas y consistentes.
              </div>
            </div>
          ) : null}

          {/* KANBAN */}
          <div style={{ padding: 12 }}>
            <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6 }}>
              {FLOW.map((st) => {
                const col = byStatus[st] || [];
                return (
                  <div
                    key={st}
                    style={{
                      minWidth: 290,
                      border: "1px solid var(--border, #E5E7EB)",
                      borderRadius: 14,
                      background: "#fff",
                      overflow: "hidden",
                      flex: "0 0 auto",
                    }}
                  >
                    <div
                      style={{
                        padding: 10,
                        borderBottom: "1px solid var(--surface, #F3F4F6)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10,
                        background: "var(--bg, #F9FAFB)",
                      }}
                    >
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <div style={{ fontWeight: 900, fontSize: 13 }}>{st}</div>
                        <StatusPill status={st} />
                      </div>
                      <Badge>{col.length}</Badge>
                    </div>

                    <div style={{ padding: 10, display: "grid", gap: 10 }}>
                      {col.length ? (
                        col.map((s) => (
                          <ServiceCard
                            key={s.id}
                            s={s}
                            active={s.id === selectedId}
                            onSelect={() => setSelectedId(s.id)}
                            onAssignUnit={openAssignUnit}
                          />
                        ))
                      ) : (
                        <div style={{ fontSize: 12, color: "var(--muted2, #9ca3af)" }}>Sin servicios.</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* DETAIL */}
        <div style={{ border: "1px solid var(--border, #E5E7EB)", borderRadius: 16, padding: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Detalle</div>

          {!selected ? (
            <div style={{ color: "var(--muted, #6b7280)" }}>Selecciona un servicio.</div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <div style={{ fontWeight: 900 }}>{selected.service_type || "Servicio"}</div>
                <StatusPill status={selected.status} />
              </div>

              <div style={{ marginTop: 8, color: "var(--muted, #6b7280)", fontSize: 13 }}>
                {selected.location || "Sin ubicación"} {selected.motive ? `· ${selected.motive}` : ""}
              </div>

              {/* Status flow actions */}
              {actions.length ? (
                <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {actions.map((st) => (
                    <button
                      key={st}
                      onClick={() => advanceStatus(st)}
                      disabled={mutating}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid var(--primary, #047857)",
                        background: mutating ? "var(--surface, #F3F4F6)" : "var(--primary, #047857)",
                        color: mutating ? "var(--text, #111827)" : "#fff",
                        fontWeight: 900,
                        cursor: mutating ? "not-allowed" : "pointer",
                      }}
                    >
                      {mutating ? "Actualizando…" : labelForStatus(st)}
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ marginTop: 12, color: "var(--muted, #6b7280)", fontSize: 13 }}>
                  {selected?.status?.toLowerCase() === "finished" ? "Servicio finalizado." : "Sin acciones disponibles."}
                </div>
              )}

              {/* Details */}
              <div style={{ marginTop: 10, display: "grid", gap: 6, fontSize: 13 }}>
                <div><b>Priority:</b> {String(selected.priority ?? "—")}</div>
                <div><b>Requested by:</b> {selected.requested_by || "—"}</div>
                <div><b>Unit ID:</b> {selected.unit_id || "—"}</div>
                <div><b>FRAP ID:</b> {selected.frap_id || "—"}</div>
              </div>

              {/* FRAP actions */}
              <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {!selected.frap_id ? (
                  <button
                    onClick={createFrapFromService}
                    disabled={mutating}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid var(--primary, #047857)",
                      background: mutating ? "var(--surface, #F3F4F6)" : "var(--primary, #047857)",
                      color: mutating ? "var(--primary, #047857)" : "#fff",
                      fontWeight: 900,
                      cursor: mutating ? "not-allowed" : "pointer",
                    }}
                  >
                    {mutating ? "Procesando…" : "Crear FRAP"}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={openFrap}
                      disabled={mutating}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid var(--secondary, #2563EB)",
                        background: mutating ? "var(--surface, #F3F4F6)" : "var(--secondary, #2563EB)",
                        color: mutating ? "var(--secondary, #2563EB)" : "#fff",
                        fontWeight: 900,
                        cursor: mutating ? "not-allowed" : "pointer",
                      }}
                    >
                      Abrir FRAP
                    </button>
                    <Badge>FRAP ligado ✅</Badge>
                  </>
                )}
              </div>

              <div style={{ marginTop: 12, borderTop: "1px solid var(--surface, #F3F4F6)", paddingTop: 10 }}>
                <div style={{ fontWeight: 900, marginBottom: 8 }}>Timeline</div>
                <Timeline s={selected} />
              </div>
            </>
          )}
        </div>
      </div>
    

      {/* Modal: Asignar unidad */}
      {assignOpen ? (
        <div
          onClick={() => !mutating && setAssignOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "grid",
            placeItems: "center",
            padding: 16,
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(560px, 100%)",
              background: "white",
              borderRadius: 16,
              border: "1px solid var(--border, #E5E7EB)",
              padding: 14,
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 16 }}>Asignar unidad</div>
            <div style={{ marginTop: 6, color: "var(--muted, #6b7280)", fontSize: 13 }}>
              Servicio: {assignService?.id ? String(assignService.id).slice(0, 8) + "…" : "—"}
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, color: "var(--muted, #6b7280)", fontWeight: 800, marginBottom: 6 }}>Unidad</div>
              <select
                value={assignUnitId || ""}
                onChange={(e) => setAssignUnitId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid var(--border, #E5E7EB)",
                  outline: "none",
                  background: "white",
                }}
              >
                <option value="">— Selecciona —</option>
                {(units.value || []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {(u.code || u.name || String(u.id).slice(0, 8)) + (u.plate ? ` · ${u.plate}` : "")}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                disabled={mutating}
                onClick={() => setAssignOpen(false)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid var(--borderStrong, #D1D5DB)",
                  background: "white",
                  fontWeight: 900,
                  cursor: mutating ? "not-allowed" : "pointer",
                  opacity: mutating ? 0.6 : 1,
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={mutating}
                onClick={confirmAssignUnit}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid var(--primary, #047857)",
                  background: mutating ? "var(--surface, #F3F4F6)" : "var(--primary, #047857)",
                  color: mutating ? "var(--text, #111827)" : "white",
                  fontWeight: 900,
                  cursor: mutating ? "not-allowed" : "pointer",
                }}
              >
                {mutating ? "Asignando…" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

</div>
  );
}