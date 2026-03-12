import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { formatEvent } from "../lib/eventFormatter";
import { useAuthStore } from "../store/authStore";

function normalizeErr(e) {
  if (!e) return "Error desconocido";
  if (typeof e === "string") return e;
  if (e?.message) return e.message;

  const d = e?.detail ?? e?.response?.data?.detail ?? e?.body?.detail;
  if (d) {
    if (typeof d === "string") return d;
    try {
      return JSON.stringify(d, null, 2);
    } catch {
      return String(d);
    }
  }

  try {
    return JSON.stringify(e, null, 2);
  } catch {
    return String(e);
  }
}

function Input({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div style={{ fontSize: 12, color: "var(--muted, #6b7280)", fontWeight: 700 }}>{label}</div>
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

function Textarea({ label, value, onChange, placeholder, rows = 3 }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div style={{ fontSize: 12, color: "var(--muted, #6b7280)", fontWeight: 700 }}>{label}</div>
      <textarea
        rows={rows}
        value={value ?? ""}
        placeholder={placeholder || ""}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid var(--border, #E5E7EB)",
          outline: "none",
          resize: "vertical",
        }}
      />
    </label>
  );
}

function Select({ label, value, onChange, options = [] }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div style={{ fontSize: 12, color: "var(--muted, #6b7280)", fontWeight: 700 }}>{label}</div>
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
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Badge({ children }) {
  return (
    <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 999, border: "1px solid var(--border, #E5E7EB)", background: "#fff" }}>
      {children}
    </span>
  );
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = reject;
    r.onload = () => resolve(String(r.result || ""));
    r.readAsDataURL(file);
  });
}

function dataUrlToBase64(dataUrl) {
  const s = String(dataUrl || "");
  const idx = s.indexOf("base64,");
  return idx >= 0 ? s.slice(idx + 7) : s;
}


// ====== Signature Pad (Canvas) ======
function SignatureCanvas({ disabled, onSave, height = 120 }) {
  const ref = React.useRef(null);
  const drawing = React.useRef(false);

  function getPosFromClient(clientX, clientY) {
    const canvas = ref.current;
    const r = canvas.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  }

  // Pointer events funcionan mejor en móvil (Android/iOS) y desktop.
  function pStart(e) {
    if (disabled) return;
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {}
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    const p = getPosFromClient(e.clientX, e.clientY);
    drawing.current = true;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    e.preventDefault?.();
  }

  function pMove(e) {
    if (disabled) return;
    if (!drawing.current) return;
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    const p = getPosFromClient(e.clientX, e.clientY);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    e.preventDefault?.();
  }

  function pEnd(e) {
    if (disabled) return;
    drawing.current = false;
    e.preventDefault?.();
  }

  function clear() {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // blanco para que en PDF no salga transparente
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function save() {
    const canvas = ref.current;
    const dataUrl = canvas.toDataURL("image/png");
    onSave?.(dataUrl);
  }

  React.useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");

    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.parentElement?.clientWidth || 520;
    const cssH = height;

    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111827";

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, cssW, cssH);
  }, [height]);

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", background: "white" }}>
        <canvas
          ref={ref}
          onPointerDown={pStart}
          onPointerMove={pMove}
          onPointerUp={pEnd}
          onPointerCancel={pEnd}
          onPointerLeave={pEnd}
          style={{ display: "block", width: "100%", height, touchAction: "none", userSelect: "none" }}
        />
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" disabled={disabled} onClick={clear}>
          Limpiar
        </button>
        <button type="button" disabled={disabled} onClick={save}>
          Guardar firma (canvas)
        </button>
      </div>
    </div>
  );
}

// ✅ fuera del componente principal para evitar perder foco en inputs (bug de 1 carácter)
function SigCard({
  roleName,
  title,
  note,
  enabled,
  lockedAt,
  disabled,
  ROLE,
  signs,
  sigNames,
  setSigNames,
  sigPreview,
  setSigPreview,
  uploadSignature,
  saveCanvasSignature,
}) {
  const captured = isRoleCaptured(signs, roleName);
  const canInteract = enabled && !lockedAt && !disabled;

  const [mode, setMode] = React.useState("canvas"); // canvas | file

  return (
    <div style={{ border: "1px solid var(--border, #E5E7EB)", borderRadius: 16, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div style={{ fontWeight: 900 }}>{title}</div>
        <div style={{ fontSize: 12, color: "var(--muted, #6b7280)" }}>{captured ? "✅ Capturada" : "—"}</div>
      </div>

      {note ? <div style={{ marginTop: 6, fontSize: 12, color: "var(--muted, #6b7280)" }}>{note}</div> : null}

      <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
        <Input
          label="Nombre"
          value={sigNames[roleName] || ""}
          onChange={(v) => setSigNames((s) => ({ ...s, [roleName]: v }))}
          placeholder="Nombre"
        />

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setMode("canvas")}
            style={{
              padding: "8px 10px",
              borderRadius: 999,
              border: mode === "canvas" ? "1px solid var(--text, #111827)" : "1px solid var(--border, #E5E7EB)",
              background: mode === "canvas" ? "var(--primary, #047857)" : "white",
              color: mode === "canvas" ? "white" : "var(--text, #111827)",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Canvas
          </button>
          <button
            type="button"
            onClick={() => setMode("file")}
            style={{
              padding: "8px 10px",
              borderRadius: 999,
              border: mode === "file" ? "1px solid var(--text, #111827)" : "1px solid var(--border, #E5E7EB)",
              background: mode === "file" ? "var(--primary, #047857)" : "white",
              color: mode === "file" ? "white" : "var(--text, #111827)",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Archivo
          </button>
        </div>

        {mode === "canvas" ? (
          <SignatureCanvas
            disabled={!canInteract}
            onSave={(dataUrl) => {
              setSigPreview((p) => ({ ...p, [roleName]: dataUrl }));
              saveCanvasSignature(roleName, dataUrl);
            }}
          />
        ) : (
          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, color: "var(--muted, #6b7280)", fontWeight: 700 }}>Imagen de firma</div>
            <input
              type="file"
              accept="image/*"
              disabled={!canInteract}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadSignature(roleName, f);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>

      {sigPreview[roleName] ? (
        <div style={{ marginTop: 10 }}>
          <img
            alt={`firma ${roleName}`}
            src={sigPreview[roleName]}
            style={{ maxWidth: "100%", border: "1px solid var(--border, #E5E7EB)", borderRadius: 12 }}
          />
        </div>
      ) : null}

      {!enabled ? (
        <div style={{ marginTop: 10, fontSize: 12, color: "var(--muted2, #9ca3af)" }}>
          No disponible para tu rol actual ({ROLE || "—"}).
        </div>
      ) : null}
    </div>
  );
}

function getRole(row) {
  const r = row?.role ?? row?.Role ?? row?.type ?? row?.kind ?? row?.name ?? row?.payload?.role ?? "";
  return String(r || "").toLowerCase().trim();
}

function isRoleCaptured(signs, role) {
  const r = String(role || "").toLowerCase().trim();
  return (Array.isArray(signs) ? signs : []).some((x) => getRole(x) === r);
}

function roleUpper(role) {
  return String(role || "").toUpperCase().trim();
}

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function isoNow() {
  // Local timestamp with offset (matches laptop time)
  const d = new Date();
  const pad = (n, w = 2) => String(Math.floor(Math.abs(n))).padStart(w, "0");
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  const mss = pad(d.getMilliseconds(), 3);

  const offMin = -d.getTimezoneOffset(); // e.g. -360 for UTC-6 => offMin = 360? actually getTimezoneOffset is minutes behind UTC (positive if behind)
  const sign = offMin >= 0 ? "+" : "-";
  const offAbs = Math.abs(offMin);
  const offH = pad(offAbs / 60);
  const offM = pad(offAbs % 60);

  return `${yyyy}-${MM}-${dd}T${hh}:${mm}:${ss}.${mss}${sign}${offH}:${offM}`;
}

// ====== Catálogos v1 (frontend) ======
// SaaS multiempresa: en v1 los dejamos locales.
// En v2 los movemos a backend /api/catalogs por company.
const MEDICATIONS = [
  { code: "ASA", name: "Aspirina" },
  { code: "NTG", name: "Nitroglicerina" },
  { code: "O2", name: "Oxígeno" },
  { code: "DEX", name: "Dextrosa" },
  { code: "ADREN", name: "Adrenalina" },
  { code: "NAL", name: "Naloxona" },
  { code: "DIAZ", name: "Diazepam" },
];

const PROCEDURES = [
  { code: "O2", name: "Oxigenoterapia" },
  { code: "IV", name: "Canalización IV" },
  { code: "IMMO", name: "Inmovilización" },
  { code: "AIRWAY", name: "Manejo de vía aérea" },
  { code: "CPR", name: "RCP" },
  { code: "BLEED", name: "Control de hemorragia" },
];

const INJURY_TYPES = [
  { value: "contusion", label: "Contusión" },
  { value: "herida", label: "Herida" },
  { value: "fractura", label: "Fractura" },
  { value: "quemadura", label: "Quemadura" },
  { value: "laceracion", label: "Laceración" },
  { value: "esguince", label: "Esguince" },
  { value: "otra", label: "Otra" },
];

const TRIAGE = [
  { value: "", label: "—" },
  { value: "verde", label: "Verde" },
  { value: "amarillo", label: "Amarillo" },
  { value: "rojo", label: "Rojo" },
  { value: "negro", label: "Negro" },
];

function triageColor(t) {
  const s = String(t || "").toLowerCase();
  if (s === "verde") return "#16a34a";
  if (s === "amarillo") return "#ca8a04";
  if (s === "rojo") return "#dc2626";
  if (s === "negro") return "var(--text, #111827)";
  return "var(--muted, #6b7280)";
}

// ====== BodyMap (detallado sin exagerar) ======
const BODY_REGIONS = {
  front: [
    { id: "head_f", label: "Cabeza", x: 46, y: 6, w: 8, h: 10 },
    { id: "neck_f", label: "Cuello", x: 47, y: 17, w: 6, h: 5 },
    { id: "chest_f", label: "Tórax", x: 42, y: 23, w: 16, h: 14 },
    { id: "abdomen_f", label: "Abdomen", x: 42, y: 38, w: 16, h: 13 },
    { id: "pelvis_f", label: "Pelvis", x: 43, y: 52, w: 14, h: 10 },

    { id: "arm_l_u_f", label: "Brazo Izq (sup)", x: 34, y: 25, w: 7, h: 14 },
    { id: "arm_l_l_f", label: "Brazo Izq (inf)", x: 33, y: 40, w: 7, h: 14 },
    { id: "hand_l_f", label: "Mano Izq", x: 32, y: 55, w: 7, h: 8 },

    { id: "arm_r_u_f", label: "Brazo Der (sup)", x: 59, y: 25, w: 7, h: 14 },
    { id: "arm_r_l_f", label: "Brazo Der (inf)", x: 60, y: 40, w: 7, h: 14 },
    { id: "hand_r_f", label: "Mano Der", x: 61, y: 55, w: 7, h: 8 },

    { id: "thigh_l_f", label: "Muslo Izq", x: 44, y: 63, w: 6, h: 15 },
    { id: "leg_l_f", label: "Pierna Izq", x: 44, y: 79, w: 6, h: 16 },
    { id: "foot_l_f", label: "Pie Izq", x: 43, y: 96, w: 7, h: 6 },

    { id: "thigh_r_f", label: "Muslo Der", x: 50, y: 63, w: 6, h: 15 },
    { id: "leg_r_f", label: "Pierna Der", x: 50, y: 79, w: 6, h: 16 },
    { id: "foot_r_f", label: "Pie Der", x: 50, y: 96, w: 7, h: 6 },
  ],
  back: [
    { id: "head_b", label: "Cabeza", x: 46, y: 6, w: 8, h: 10 },
    { id: "neck_b", label: "Cuello", x: 47, y: 17, w: 6, h: 5 },
    { id: "upper_back_b", label: "Espalda alta", x: 42, y: 23, w: 16, h: 16 },
    { id: "lower_back_b", label: "Espalda baja", x: 42, y: 40, w: 16, h: 15 },
    { id: "glutes_b", label: "Glúteos", x: 43, y: 56, w: 14, h: 9 },

    { id: "arm_l_u_b", label: "Brazo Izq (sup)", x: 34, y: 25, w: 7, h: 14 },
    { id: "arm_l_l_b", label: "Brazo Izq (inf)", x: 33, y: 40, w: 7, h: 14 },
    { id: "hand_l_b", label: "Mano Izq", x: 32, y: 55, w: 7, h: 8 },

    { id: "arm_r_u_b", label: "Brazo Der (sup)", x: 59, y: 25, w: 7, h: 14 },
    { id: "arm_r_l_b", label: "Brazo Der (inf)", x: 60, y: 40, w: 7, h: 14 },
    { id: "hand_r_b", label: "Mano Der", x: 61, y: 55, w: 7, h: 8 },

    { id: "thigh_l_b", label: "Muslo Izq", x: 44, y: 66, w: 6, h: 15 },
    { id: "leg_l_b", label: "Pierna Izq", x: 44, y: 82, w: 6, h: 16 },
    { id: "foot_l_b", label: "Pie Izq", x: 43, y: 96, w: 7, h: 6 },

    { id: "thigh_r_b", label: "Muslo Der", x: 50, y: 66, w: 6, h: 15 },
    { id: "leg_r_b", label: "Pierna Der", x: 50, y: 82, w: 6, h: 16 },
    { id: "foot_r_b", label: "Pie Der", x: 50, y: 96, w: 7, h: 6 },
  ],
};

function eventTitle(ev) {
  const t = String(ev?.type || "").toLowerCase();
  if (t === "vitals") return "Signos vitales / Evaluación";
  if (t === "med") return "Medicamento";
  if (t === "procedure") {
    if (ev?.data?.kind === "injury") return "Lesión (Mapa corporal)";
    return "Procedimiento";
  }
  if (t === "note") return "Nota clínica";
  if (t === "milestone") return "Hito";
  if (t === "status") return "Estatus";
  return t || "Evento";
}

function prettyJson(obj) {
  try {
    return JSON.stringify(obj ?? {}, null, 2);
  } catch {
    return String(obj);
  }
}

export default function FrapWorkspace() {
  const { frapId } = useParams();
  const nav = useNavigate();
  const { token, companyId, userId, user, role } = useAuthStore();

  const ROLE = useMemo(() => roleUpper(role), [role]);
  const isAdmin = ROLE === "ADMIN";
  const isDispatch = ROLE === "DISPATCH" || isAdmin;
  const isUnit = ROLE === "UNIT";
  const isDoctor = ROLE === "DOCTOR" || ROLE === "RECEIVER_MD";
  const isParamedic = ROLE === "PARAMEDIC";

  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [frap, setFrap] = useState(null);

  // Compat: si GET /fraps/{id} no trae locked_at/hash_final, guardamos el lock aquí
  const [lockInfo, setLockInfo] = useState({ locked_at: null, hash_final: "" });

  // Form (service)
  const [serviceType, setServiceType] = useState("");
  const [location, setLocation] = useState("");
  const [motive, setMotive] = useState("");
  const [requestedBy, setRequestedBy] = useState("");
  const [priority, setPriority] = useState("");

  // Patient / Transport (sections)
  const [patient, setPatient] = useState({
    full_name: "",
    age: "",
    sex: "M",
    id_type: "",
    id_value: "",
    address: "",
    allergies: "",
    conditions: "",
    meds_home: "",
    pregnancy: "",
    responsible_name: "",
    responsible_relationship: "",
    responsible_phone: "",
  });

  const [transport, setTransport] = useState({
    destination_hospital_name: "",
    destination_hospital_id: "",
    receiving_name: "",
    receiving_service: "",
    handoff_summary: "",
    outcome: "",
  });

  // Signatures
  const [signs, setSigns] = useState([]);
  const [sigNames, setSigNames] = useState({
    responsable: "",
    tripulacion: "",
    receptor: "",
  });
  const [sigPreview, setSigPreview] = useState({
    responsable: "",
    tripulacion: "",
    receptor: "",
  });

  // Clinical forms
  const [avpu, setAvpu] = useState("A");
  const [gcsO, setGcsO] = useState(4);
  const [gcsV, setGcsV] = useState(5);
  const [gcsM, setGcsM] = useState(6);

  const gcsTotal = useMemo(() => Number(gcsO) + Number(gcsV) + Number(gcsM), [gcsO, gcsV, gcsM]);

  const [vitals, setVitals] = useState({
    sbp: "",
    dbp: "",
    hr: "",
    rr: "",
    spo2: "",
    temp: "",
    glucose: "",
    pain: "",
  });

  const [sample, setSample] = useState({
    symptoms: "",
    allergies: "",
    meds: "",
    past: "",
    lastIntake: "",
    events: "",
  });

  const [diagnosis, setDiagnosis] = useState({
    impression: "",
    triage: "",
  });

  // Meds/procedures
  const [medForm, setMedForm] = useState({
    code: "",
    dose: "",
    route: "IV",
    notes: "",
  });

  const [procForm, setProcForm] = useState({
    code: "",
    notes: "",
  });

  // Injuries / Body map
  const [bodyView, setBodyView] = useState("front"); // front|back
  const [injuryModal, setInjuryModal] = useState({
    open: false,
    regionId: "",
    regionLabel: "",
  });
  const [injuryForm, setInjuryForm] = useState({
    injury_type: "contusion",
    severity: "2",
    notes: "",
  });

  // Timeline
  const [events, setEvents] = useState([]);
  const [timelineOpen, setTimelineOpen] = useState(true);

  // UI safety flags
  const [pdfOpenedAt, setPdfOpenedAt] = useState(null);

  // lockedAt/hashFinal “compat”
  const lockedAt = frap?.locked_at || lockInfo.locked_at || null;
  const hashFinal = frap?.hash_final || lockInfo.hash_final || "";
  const serviceId = frap?.service_id || "";

  const canLoad = useMemo(() => !!token && !!frapId, [token, frapId]);
  const disabled = busy || saving;

  // Permisos operativos (UI gating)
  const canEdit = isDispatch && !lockedAt;

  // Clínico: PARAMEDIC (y DISPATCH/ADMIN si lo quieres habilitar) — recomendado:
  const canClinicalWrite = (isParamedic || isDispatch || isAdmin) && !lockedAt;

  const canSignResponsableTrip = (isDispatch || isAdmin || isParamedic) && !lockedAt;
  const canSignReceptor = (isAdmin || isDoctor) && !lockedAt;

  // Lock/PDF/finish (en tu backend, lock lo permite PARAMEDIC; DISPATCH dio Forbidden en tu prueba)
  const canLock = (isParamedic || isAdmin) && !lockedAt;
  const canOpenPdf = !!lockedAt;
  const canFinishService = isDispatch && !!serviceId;

  async function loadSignaturesSafe() {
    try {
      const rows = await api.frapSignaturesList({
        frapId,
        token,
        companyId: companyId || undefined,
        userId: userId || undefined,
      });

      let arr = rows;
      if (!Array.isArray(arr)) {
        if (Array.isArray(rows?.value)) arr = rows.value;
        else if (Array.isArray(rows?.items)) arr = rows.items;
        else if (Array.isArray(rows?.data)) arr = rows.data;
        else arr = [];
      }

      setSigns(arr);
    } catch (e) {
      console.warn("signatures list failed", e);
    }
  }

  async function loadEventsSafe() {
    try {
      const rows = await api.frapEventsList({
        frapId,
        token,
        companyId: companyId || undefined,
        userId: userId || undefined,
      });

      const sorted = (Array.isArray(rows) ? rows : [])
        .slice()
        .sort((a, b) => String(a?.ts || "").localeCompare(String(b?.ts || "")));

      setEvents(sorted);
    } catch (e) {
      console.warn("events list failed", e);
    }
  }

  async function load() {
    if (!canLoad) return;
    setErr("");
    setBusy(true);
    try {
      const f = await api.frapGet({
        frapId,
        token,
        companyId: companyId || undefined,
        userId: userId || undefined,
      });

      setFrap(f);

      const svc = f?.data?.service || {};
      setServiceType(svc.service_type || "");
      setLocation(svc.location || "");
      setMotive(svc.motive || "");
      setRequestedBy(svc.requested_by || "");
      setPriority(svc.priority != null ? String(svc.priority) : "");

      // Patient/Transport (sections)
      const psec = (f?.data?.patient && typeof f.data.patient === "object") ? f.data.patient : {};
      setPatient((prev) => ({
        ...prev,
        full_name: psec.full_name ?? "",
        age: psec.age != null ? String(psec.age) : "",
        sex: psec.sex ?? prev.sex ?? "M",
        id_type: psec.id_type ?? "",
        id_value: psec.id_value ?? "",
        address: psec.address ?? "",
        allergies: Array.isArray(psec.allergies) ? psec.allergies.join(", ") : (psec.allergies ?? ""),
        conditions: Array.isArray(psec.conditions) ? psec.conditions.join(", ") : (psec.conditions ?? ""),
        meds_home: Array.isArray(psec.meds_home) ? psec.meds_home.join(", ") : (psec.meds_home ?? ""),
        pregnancy: psec.pregnancy ?? "",
        responsible_name: psec?.responsible?.name ?? "",
        responsible_relationship: psec?.responsible?.relationship ?? "",
        responsible_phone: psec?.responsible?.phone ?? "",
      }));

      const tsec = (f?.data?.transport && typeof f.data.transport === "object") ? f.data.transport : {};
      setTransport((prev) => ({
        ...prev,
        destination_hospital_name: tsec?.destination?.hospital_name ?? "",
        destination_hospital_id: tsec?.destination?.hospital_id ?? "",
        receiving_name: tsec?.receiving?.name ?? "",
        receiving_service: tsec?.receiving?.service ?? "",
        handoff_summary: tsec?.handoff_summary ?? "",
        outcome: tsec?.outcome ?? "",
      }));

      if (f?.locked_at || f?.hash_final) {
        setLockInfo({
          locked_at: f?.locked_at || null,
          hash_final: f?.hash_final || "",
        });
      }

      await loadSignaturesSafe();
      await loadEventsSafe();
    } catch (e) {
      console.error(e);
      setErr(normalizeErr(e) || "Error cargando FRAP");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, frapId, companyId, userId]);

  async function saveServiceSection() {
    if (!frapId) return;
    if (!isDispatch) {
      setErr("No autorizado: este usuario no puede editar el FRAP.");
      return;
    }
    if (lockedAt) {
      setErr("FRAP está bloqueado; no se puede editar.");
      return;
    }

    setErr("");
    setSaving(true);
    try {
      const p = priority === "" ? null : Number(priority);
      const payload = {
        service_type: serviceType,
        location,
        motive,
        requested_by: requestedBy,
        priority: p == null || Number.isNaN(p) ? (priority === "" ? null : priority) : p,
      };

      const updated = await api.frapPatchServiceSection({
        frapId,
        payload,
        token,
        companyId: companyId || undefined,
        userId: userId || undefined,
      });

      setFrap(updated);
    } catch (e) {
      console.error(e);
      setErr(normalizeErr(e) || "Error guardando sección");
    } finally {
      setSaving(false);
    }
  }


  function csvToList(s) {
    const raw = String(s || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    return raw.length ? raw : null;
  }

  async function savePatientSection() {
    if (!frapId) return;
    if (!canClinicalWrite && !isDispatch && !isAdmin) {
      setErr("No autorizado: no puedes editar sección Paciente.");
      return;
    }
    if (lockedAt) {
      setErr("FRAP está bloqueado; no se puede editar.");
      return;
    }

    setErr("");
    setSaving(true);
    try {
      const payload = {
        full_name: (patient.full_name || "").trim() || null,
        age: patient.age === "" ? null : Number(patient.age),
        sex: (patient.sex || "").trim() || null,
        id_type: (patient.id_type || "").trim() || null,
        id_value: (patient.id_value || "").trim() || null,
        address: (patient.address || "").trim() || null,
        allergies: csvToList(patient.allergies),
        conditions: csvToList(patient.conditions),
        // Backend expects meds_home as free text string (not list)
        meds_home: (patient.meds_home || "").trim() || null,
        pregnancy: (patient.pregnancy || "").trim() || null,
        responsible:
          (patient.responsible_name || patient.responsible_phone)
            ? {
                name: (patient.responsible_name || "").trim() || null,
                phone: (patient.responsible_phone || "").trim() || null,
              }
            : null,
      };

      const updated = await api.frapPatchPatientSection({
        frapId,
        payload,
        token,
        companyId: companyId || undefined,
        userId: userId || undefined,
      });

      setFrap(updated);
    } catch (e) {
      console.error(e);
      setErr(normalizeErr(e) || "Error guardando Paciente");
    } finally {
      setSaving(false);
    }
  }

  async function saveTransportSection() {
    if (!frapId) return;
    if (!canClinicalWrite && !isDispatch && !isAdmin) {
      setErr("No autorizado: no puedes editar sección Entrega.");
      return;
    }
    if (lockedAt) {
      setErr("FRAP está bloqueado; no se puede editar.");
      return;
    }

    setErr("");
    setSaving(true);
    try {
      const payload = {
        destination:
          (transport.destination_hospital_name || transport.destination_hospital_id)
            ? {
                hospital_name: (transport.destination_hospital_name || "").trim() || null,
                hospital_id: (transport.destination_hospital_id || "").trim() || null,
              }
            : null,
        receiving:
          (transport.receiving_name || transport.receiving_service)
            ? {
                name: (transport.receiving_name || "").trim() || null,
                service: (transport.receiving_service || "").trim() || null,
              }
            : null,
        handoff_summary: (transport.handoff_summary || "").trim() || null,
        outcome: (transport.outcome || "").trim() || null,
      };

      const updated = await api.frapPatchTransportSection({
        frapId,
        payload,
        token,
        companyId: companyId || undefined,
        userId: userId || undefined,
      });

      setFrap(updated);
    } catch (e) {
      console.error(e);
      setErr(normalizeErr(e) || "Error guardando Entrega");
    } finally {
      setSaving(false);
    }
  }

  async function uploadSignature(roleName, file) {
    if (!frapId) return;
    if (!file) return;
    if (lockedAt) {
      setErr("FRAP está bloqueado; no se puede firmar.");
      return;
    }

    const r = String(roleName || "").toLowerCase().trim();
    if (!["responsable", "tripulacion", "receptor"].includes(r)) {
      setErr(`Role inválido: ${roleName}`);
      return;
    }

    if ((r === "responsable" || r === "tripulacion") && !canSignResponsableTrip) {
      setErr("No autorizado para firmar responsable/tripulación.");
      return;
    }
    if (r === "receptor" && !canSignReceptor) {
      setErr("No autorizado para firmar receptor (requiere DOCTOR/RECEIVER_MD/ADMIN).");
      return;
    }

    setErr("");
    setSaving(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const b64 = dataUrlToBase64(dataUrl);

      await api.frapSign({
        frapId,
        role: r,
        payload: {
          signer_name: (sigNames[r] || "").trim() || null,
          image_base64: b64,
          device_id: "frontdesk3-web",
          signed_at: isoNow(),
        },
        token,
        companyId: companyId || undefined,
        userId: userId || undefined,
      });

      setSigPreview((p) => ({ ...p, [r]: dataUrl }));
      await loadSignaturesSafe();
    } catch (e) {
      console.error(e);
      setErr(normalizeErr(e) || "Error guardando firma");
    } finally {
      setSaving(false);
    }
  }
  async function saveCanvasSignature(roleName, dataUrl) {
    if (!frapId) return;
    if (!dataUrl) return;
    if (lockedAt) {
      setErr("FRAP está bloqueado; no se puede firmar.");
      return;
    }

    const r = String(roleName || "").toLowerCase().trim();
    if (!["responsable", "tripulacion", "receptor"].includes(r)) {
      setErr(`Role inválido: ${roleName}`);
      return;
    }

    setErr("");
    setSaving(true);
    try {
      const b64 = dataUrlToBase64(dataUrl);

      await api.frapSign({
        frapId,
        role: r,
        payload: {
          signer_name: (sigNames[r] || "").trim() || null,
          image_base64: b64,
          device_id: "frontdesk3-web",
          signed_at: isoNow(),
        },
        token,
        companyId: companyId || undefined,
        userId: userId || undefined,
      });

      await loadSignaturesSafe();
    } catch (e) {
      console.error(e);
      setErr(normalizeErr(e) || "Error guardando firma (canvas)");
    } finally {
      setSaving(false);
    }
  }



  const sigOkResponsable = isRoleCaptured(signs, "responsable");
  const sigOkTripulacion = isRoleCaptured(signs, "tripulacion");
  const sigOkReceptor = isRoleCaptured(signs, "receptor");
  const allSigsOk = sigOkResponsable && sigOkTripulacion && sigOkReceptor;

  async function lockFrap() {
    if (!frapId) return;
    if (lockedAt) return;

    if (!canLock) {
      setErr("No autorizado: en tu backend actual el Lock lo permite PARAMEDIC/ADMIN (DISPATCH da Forbidden).");
      return;
    }
    if (!allSigsOk) {
      setErr("Faltan firmas: responsable + tripulación + receptor.");
      return;
    }

    const ok = window.confirm("¿Bloquear FRAP? Esta acción es irreversible (solo lectura).");
    if (!ok) return;

    setErr("");
    setSaving(true);
    try {
      const out = await api.frapLock({
        frapId,
        token,
        companyId: companyId || undefined,
        userId: userId || undefined,
      });

      setLockInfo({
        locked_at: out?.locked_at || isoNow(),
        hash_final: out?.hash_final || "",
      });

      setFrap((prev) =>
        prev
          ? {
              ...prev,
              locked_at: out?.locked_at || prev.locked_at,
              hash_final: out?.hash_final || prev.hash_final,
            }
          : prev
      );

      await loadSignaturesSafe();
      await loadEventsSafe();

      // eslint-disable-next-line no-alert
      alert(`FRAP bloqueado ✅\nHash: ${out?.hash_final || ""}`);
    } catch (e) {
      console.error(e);
      setErr(normalizeErr(e) || "Error bloqueando FRAP");
    } finally {
      setSaving(false);
    }
  }

  async function openPdf() {
    if (!frapId) return;

    setErr("");
    setSaving(true);
    try {
      const res = await fetch(`/api/fraps/${frapId}/pdf`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          ...(companyId ? { "X-Company-Id": companyId } : {}),
          ...(userId ? { "X-User-Id": userId } : {}),
        },
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`PDF HTTP ${res.status} ${txt ? `— ${txt}` : ""}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setPdfOpenedAt(isoNow());
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      console.error(e);
      setErr(normalizeErr(e) || "Error abriendo PDF");
    } finally {
      setSaving(false);
    }
  }

  async function finishService() {
    if (!serviceId) {
      setErr("Este FRAP no tiene service_id ligado.");
      return;
    }
    if (!isDispatch) {
      setErr("No autorizado: solo DISPATCH/ADMIN puede cerrar el servicio.");
      return;
    }
    if (!lockedAt) {
      setErr("Primero bloquea el FRAP (Lock) antes de cerrar el servicio.");
      return;
    }

    const ok = window.confirm("¿Cerrar servicio y marcarlo como FINISHED? (irreversible en operación)");
    if (!ok) return;

    setErr("");
    setSaving(true);
    try {
      await api.serviceUpdateStatus({
        serviceId,
        status: "finished",
        token,
        companyId: companyId || undefined,
        userId: userId || undefined,
      });

      // eslint-disable-next-line no-alert
      alert("Servicio marcado como FINISHED ✅");
      nav("/dispatch");
    } catch (e) {
      console.error(e);
      setErr(normalizeErr(e) || "Error cerrando servicio");
    } finally {
      setSaving(false);
    }
  }

  // ===== Clinical event helpers =====
  async function addEvent(type, data) {
    if (!frapId) return;
    if (lockedAt) {
      setErr("FRAP está bloqueado; no se puede registrar clínico.");
      return;
    }
    if (!canClinicalWrite) {
      setErr("No autorizado para registrar clínico (requiere PARAMEDIC o DISPATCH/ADMIN).");
      return;
    }

    setErr("");
    setSaving(true);
    try {
      await api.frapEventCreate({
        frapId,
        type,
        ts: isoNow(),
        data,
        token,
        companyId: companyId || undefined,
        userId: userId || undefined,
      });
      await loadEventsSafe();
    } catch (e) {
      console.error(e);
      setErr(normalizeErr(e) || "Error creando evento clínico");
    } finally {
      setSaving(false);
    }
  }

  async function saveVitalsSnapshot() {
    const payload = {
      avpu: String(avpu || "A").toUpperCase(),
      glasgow: {
        ocular: Number(gcsO),
        verbal: Number(gcsV),
        motora: Number(gcsM),
        total: gcsTotal,
      },
      vitals: {
        sbp: safeNum(vitals.sbp),
        dbp: safeNum(vitals.dbp),
        hr: safeNum(vitals.hr),
        rr: safeNum(vitals.rr),
        spo2: safeNum(vitals.spo2),
        temp: safeNum(vitals.temp),
        glucose: safeNum(vitals.glucose),
        pain: safeNum(vitals.pain),
      },
    };

    await addEvent("vitals", payload);
  }

  async function saveSampleNote() {
    const payload = {
      kind: "sample",
      sample: {
        symptoms: sample.symptoms || "",
        allergies: sample.allergies || "",
        medications: sample.meds || "",
        past: sample.past || "",
        last_intake: sample.lastIntake || "",
        events: sample.events || "",
      },
      diagnosis: {
        impression: diagnosis.impression || "",
        triage: (diagnosis.triage || "").toLowerCase() || null,
      },
    };
    await addEvent("note", payload);
  }

  async function addMedication() {
    const m = MEDICATIONS.find((x) => x.code === medForm.code);
    if (!m) {
      setErr("Selecciona un medicamento");
      return;
    }
    await addEvent("med", {
      code: m.code,
      name: m.name,
      dose: medForm.dose || "",
      route: medForm.route || "",
      notes: medForm.notes || "",
    });

    setMedForm({ code: "", dose: "", route: "IV", notes: "" });
  }

  async function addProcedure() {
    const p = PROCEDURES.find((x) => x.code === procForm.code);
    if (!p) {
      setErr("Selecciona un procedimiento");
      return;
    }
    await addEvent("procedure", {
      kind: "procedure",
      code: p.code,
      name: p.name,
      notes: procForm.notes || "",
    });

    setProcForm({ code: "", notes: "" });
  }

  function openInjury(region) {
    setInjuryModal({ open: true, regionId: region.id, regionLabel: region.label });
    setInjuryForm({ injury_type: "contusion", severity: "2", notes: "" });
  }

  async function saveInjury() {
    if (!injuryModal.regionId) return;

    await addEvent("procedure", {
      kind: "injury",
      view: bodyView,
      region_id: injuryModal.regionId,
      region_label: injuryModal.regionLabel,
      injury_type: injuryForm.injury_type,
      severity: Number(injuryForm.severity),
      notes: injuryForm.notes || "",
    });

    setInjuryModal({ open: false, regionId: "", regionLabel: "" });
  }

  const medOptions = [{ value: "", label: "—" }].concat(MEDICATIONS.map((m) => ({ value: m.code, label: `${m.name} (${m.code})` })));
  const procOptions = [{ value: "", label: "—" }].concat(PROCEDURES.map((p) => ({ value: p.code, label: `${p.name} (${p.code})` })));

  return (
    <div style={{ padding: 16, maxWidth: 1040, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 18 }}>FRAP</div>
          <div style={{ color: "var(--muted, #6b7280)", fontSize: 13 }}>
            Usuario: {user || "—"} · Rol: {ROLE || "—"} · FRAP: {frapId || "—"}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => nav("/dispatch")}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid var(--borderStrong, #D1D5DB)",
              background: "white",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            ← Volver
          </button>

          <button
            onClick={load}
            disabled={disabled}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid var(--borderStrong, #D1D5DB)",
              background: disabled ? "var(--surface, #F3F4F6)" : "white",
              fontWeight: 900,
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "Cargando…" : "Refrescar"}
          </button>
        </div>
      </div>

      {err ? (
        <div style={{ marginTop: 12, color: "#b91c1c", whiteSpace: "pre-wrap" }}>
          {err}
        </div>
      ) : null}

      <div style={{ marginTop: 14, border: "1px solid var(--border, #E5E7EB)", borderRadius: 16, padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <div style={{ fontWeight: 900 }}>
            Folio: <span style={{ fontWeight: 800 }}>{frap?.folio || "—"}</span>
          </div>

          <div style={{ fontSize: 12, color: "var(--muted, #6b7280)" }}>
            {lockedAt ? `LOCKED · ${String(lockedAt)}` : "DESBLOQUEADO"}
          </div>
        </div>

        <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {serviceId ? <Badge>service_id: {serviceId}</Badge> : <Badge>service_id: —</Badge>}
          {hashFinal ? <Badge>hash_final: {String(hashFinal).slice(0, 16)}…</Badge> : <Badge>hash_final: —</Badge>}
          {pdfOpenedAt ? <Badge>pdf_opened: {new Date(pdfOpenedAt).toLocaleString()}</Badge> : <Badge>pdf_opened: —</Badge>}
          <Badge>events: {events.length}</Badge>
        </div>

        {/* SERVICE SECTION */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Sección: Servicio 🧾</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Input label="service_type" value={serviceType} onChange={setServiceType} placeholder="emergency / traslado / etc" />
            <Input label="priority" type="number" value={priority} onChange={setPriority} placeholder="1..5" />
            <Input label="location" value={location} onChange={setLocation} placeholder="Dirección / referencia" />
            <Input label="motive" value={motive} onChange={setMotive} placeholder="Motivo" />
            <div style={{ gridColumn: "1 / -1" }}>
              <Input label="requested_by" value={requestedBy} onChange={setRequestedBy} placeholder="Quién solicita" />
            </div>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={saveServiceSection}
              disabled={disabled || !canEdit}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid var(--primary, #047857)",
                background: disabled || !canEdit ? "var(--surface, #F3F4F6)" : "var(--primary, #047857)",
                color: disabled || !canEdit ? "var(--text, #111827)" : "#fff",
                fontWeight: 900,
                cursor: disabled || !canEdit ? "not-allowed" : "pointer",
              }}
            >
              {lockedAt ? "Bloqueado (solo lectura)" : saving ? "Guardando…" : "Guardar sección"}
            </button>

            {!isDispatch ? (
              <div style={{ fontSize: 12, color: "var(--muted, #6b7280)", alignSelf: "center" }}>
                Solo DISPATCH/ADMIN puede editar la sección Servicio.
              </div>
            ) : null}
          </div>
        </div>


        {/* PATIENT + ENTREGA */}
        <div style={{ marginTop: 16, borderTop: "1px solid var(--surface, #F3F4F6)", paddingTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div style={{ fontWeight: 900 }}>Sección: Paciente + Entrega 🧑‍⚕️🚑</div>
            <div style={{ fontSize: 12, color: lockedAt ? "#6b7280" : "#065f46", fontWeight: 900 }}>
              {lockedAt ? "Bloqueado" : "Editable"}
            </div>
          </div>

          {/* Paciente */}
          <div style={{ marginTop: 10, border: "1px solid var(--border, #E5E7EB)", borderRadius: 16, padding: 12 }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Paciente</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Input label="Nombre completo" value={patient.full_name} onChange={(v) => setPatient((s) => ({ ...s, full_name: v }))} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Input label="Edad" type="number" value={patient.age} onChange={(v) => setPatient((s) => ({ ...s, age: v }))} />
                <Select
                  label="Sexo"
                  value={patient.sex}
                  onChange={(v) => setPatient((s) => ({ ...s, sex: v }))}
                  options={[
                    { value: "M", label: "M" },
                    { value: "F", label: "F" },
                    { value: "O", label: "O" },
                    { value: "", label: "—" },
                  ]}
                />
              </div>

              <Input label="ID tipo (INE/Pasaporte/etc)" value={patient.id_type} onChange={(v) => setPatient((s) => ({ ...s, id_type: v }))} />
              <Input label="ID valor" value={patient.id_value} onChange={(v) => setPatient((s) => ({ ...s, id_value: v }))} />

              <div style={{ gridColumn: "1 / -1" }}>
                <Input label="Domicilio" value={patient.address} onChange={(v) => setPatient((s) => ({ ...s, address: v }))} />
              </div>

              <Textarea label="Alergias (separar por coma)" value={patient.allergies} onChange={(v) => setPatient((s) => ({ ...s, allergies: v }))} rows={2} />
              <Textarea label="Padecimientos / antecedentes (coma)" value={patient.conditions} onChange={(v) => setPatient((s) => ({ ...s, conditions: v }))} rows={2} />
              <Textarea label="Medicamentos habituales (coma)" value={patient.meds_home} onChange={(v) => setPatient((s) => ({ ...s, meds_home: v }))} rows={2} />
              <Input label="Embarazo (texto libre)" value={patient.pregnancy} onChange={(v) => setPatient((s) => ({ ...s, pregnancy: v }))} />

              <Input label="Responsable: nombre" value={patient.responsible_name} onChange={(v) => setPatient((s) => ({ ...s, responsible_name: v }))} />
              <Input label="Responsable: parentesco" value={patient.responsible_relationship} onChange={(v) => setPatient((s) => ({ ...s, responsible_relationship: v }))} />
              <Input label="Responsable: teléfono" value={patient.responsible_phone} onChange={(v) => setPatient((s) => ({ ...s, responsible_phone: v }))} />
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                onClick={savePatientSection}
                disabled={disabled || lockedAt}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid var(--primary, #047857)",
                  background: disabled || lockedAt ? "var(--surface, #F3F4F6)" : "var(--primary, #047857)",
                  color: disabled || lockedAt ? "var(--text, #111827)" : "#fff",
                  fontWeight: 900,
                  cursor: disabled || lockedAt ? "not-allowed" : "pointer",
                }}
              >
                {lockedAt ? "Bloqueado (solo lectura)" : saving ? "Guardando…" : "Guardar paciente"}
              </button>
            </div>
          </div>

          {/* Entrega / Recepción */}
          <div style={{ marginTop: 10, border: "1px solid var(--border, #E5E7EB)", borderRadius: 16, padding: 12 }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Entrega / Recepción</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Input
                label="Destino: hospital_name"
                value={transport.destination_hospital_name}
                onChange={(v) => setTransport((s) => ({ ...s, destination_hospital_name: v }))}
              />
              <Input
                label="Destino: hospital_id (opcional)"
                value={transport.destination_hospital_id}
                onChange={(v) => setTransport((s) => ({ ...s, destination_hospital_id: v }))}
              />
              <Input label="Receptor: nombre" value={transport.receiving_name} onChange={(v) => setTransport((s) => ({ ...s, receiving_name: v }))} />
              <Input label="Receptor: servicio" value={transport.receiving_service} onChange={(v) => setTransport((s) => ({ ...s, receiving_service: v }))} />
              <div style={{ gridColumn: "1 / -1" }}>
                <Textarea label="Resumen de entrega" value={transport.handoff_summary} onChange={(v) => setTransport((s) => ({ ...s, handoff_summary: v }))} rows={3} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <Input label="Resultado / outcome" value={transport.outcome} onChange={(v) => setTransport((s) => ({ ...s, outcome: v }))} />
              </div>
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                onClick={saveTransportSection}
                disabled={disabled || lockedAt}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid var(--primary, #047857)",
                  background: disabled || lockedAt ? "var(--surface, #F3F4F6)" : "var(--primary, #047857)",
                  color: disabled || lockedAt ? "var(--text, #111827)" : "#fff",
                  fontWeight: 900,
                  cursor: disabled || lockedAt ? "not-allowed" : "pointer",
                }}
              >
                {lockedAt ? "Bloqueado (solo lectura)" : saving ? "Guardando…" : "Guardar entrega"}
              </button>
            </div>
          </div>
        </div>

        {/* CLINICAL */}
        <div style={{ marginTop: 16, borderTop: "1px solid var(--surface, #F3F4F6)", paddingTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div style={{ fontWeight: 900 }}>Sección: Clínico (eventos) 🩺</div>
            <div style={{ fontSize: 12, color: canClinicalWrite ? "#065f46" : "var(--muted, #6b7280)", fontWeight: 900 }}>
              {lockedAt ? "Bloqueado" : canClinicalWrite ? "Editable" : "Sin permiso"}
            </div>
          </div>

          {/* AVPU + GCS */}
          <div style={{ marginTop: 10, border: "1px solid var(--border, #E5E7EB)", borderRadius: 16, padding: 12 }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Evaluación neurológica</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, color: "var(--muted, #6b7280)", fontWeight: 700 }}>AVPU</div>
                <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                  {["A", "V", "P", "U"].map((x) => (
                    <button
                      key={x}
                      onClick={() => setAvpu(x)}
                      disabled={!canClinicalWrite || disabled}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 12,
                        border: "1px solid var(--borderStrong, #D1D5DB)",
                        background: avpu === x ? "var(--primary, #047857)" : "white",
                        color: avpu === x ? "#fff" : "var(--text, #111827)",
                        fontWeight: 900,
                        cursor: !canClinicalWrite || disabled ? "not-allowed" : "pointer",
                      }}
                    >
                      {x}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: "var(--muted, #6b7280)", fontWeight: 700 }}>Glasgow (total automático)</div>
                <div style={{ marginTop: 8, display: "grid", gap: 10 }}>
                  <Input label="Ocular (1-4)" type="number" value={gcsO} onChange={(v) => setGcsO(Math.max(1, Math.min(4, Number(v || 1))))} />
                  <Input label="Verbal (1-5)" type="number" value={gcsV} onChange={(v) => setGcsV(Math.max(1, Math.min(5, Number(v || 1))))} />
                  <Input label="Motora (1-6)" type="number" value={gcsM} onChange={(v) => setGcsM(Math.max(1, Math.min(6, Number(v || 1))))} />
                  <div style={{ fontSize: 13, fontWeight: 900 }}>
                    Total: <span style={{ color: "var(--text, #111827)" }}>{gcsTotal}</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12, color: "var(--muted, #6b7280)", marginBottom: 6 }}>
                Esto guarda un snapshot en el timeline (type: <b>vitals</b>).
              </div>
              <button
                onClick={saveVitalsSnapshot}
                disabled={!canClinicalWrite || disabled}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid var(--primary, #047857)",
                  background: !canClinicalWrite || disabled ? "var(--surface, #F3F4F6)" : "var(--primary, #047857)",
                  color: !canClinicalWrite || disabled ? "var(--text, #111827)" : "#fff",
                  fontWeight: 900,
                  cursor: !canClinicalWrite || disabled ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Guardando…" : "Guardar evaluación + signos vitales"}
              </button>
            </div>
          </div>

          {/* Vitals numeric */}
          <div style={{ marginTop: 10, border: "1px solid var(--border, #E5E7EB)", borderRadius: 16, padding: 12 }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Signos vitales</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              <Input label="TA Sistólica (mmHg)" value={vitals.sbp} onChange={(v) => setVitals((s) => ({ ...s, sbp: v }))} />
              <Input label="TA Diastólica (mmHg)" value={vitals.dbp} onChange={(v) => setVitals((s) => ({ ...s, dbp: v }))} />
              <Input label="FC (lpm)" value={vitals.hr} onChange={(v) => setVitals((s) => ({ ...s, hr: v }))} />
              <Input label="FR (rpm)" value={vitals.rr} onChange={(v) => setVitals((s) => ({ ...s, rr: v }))} />
              <Input label="SpO2 (%)" value={vitals.spo2} onChange={(v) => setVitals((s) => ({ ...s, spo2: v }))} />
              <Input label="Temp (°C)" value={vitals.temp} onChange={(v) => setVitals((s) => ({ ...s, temp: v }))} />
              <Input label="Glucosa (mg/dL)" value={vitals.glucose} onChange={(v) => setVitals((s) => ({ ...s, glucose: v }))} />
              <Input label="Dolor (0-10)" value={vitals.pain} onChange={(v) => setVitals((s) => ({ ...s, pain: v }))} />
            </div>
          </div>

          {/* SAMPLE + Diagnosis */}
          <div style={{ marginTop: 10, border: "1px solid var(--border, #E5E7EB)", borderRadius: 16, padding: 12 }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>SAMPLE + Impresión diagnóstica</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Textarea label="S - Síntomas" value={sample.symptoms} onChange={(v) => setSample((s) => ({ ...s, symptoms: v }))} />
              <Textarea label="A - Alergias" value={sample.allergies} onChange={(v) => setSample((s) => ({ ...s, allergies: v }))} />
              <Textarea label="M - Medicamentos" value={sample.meds} onChange={(v) => setSample((s) => ({ ...s, meds: v }))} />
              <Textarea label="P - Padecimientos previos" value={sample.past} onChange={(v) => setSample((s) => ({ ...s, past: v }))} />
              <Textarea label="L - Última ingesta" value={sample.lastIntake} onChange={(v) => setSample((s) => ({ ...s, lastIntake: v }))} />
              <Textarea label="E - Eventos relacionados" value={sample.events} onChange={(v) => setSample((s) => ({ ...s, events: v }))} />
              <Textarea
                label="Impresión diagnóstica (corta)"
                value={diagnosis.impression}
                onChange={(v) => setDiagnosis((s) => ({ ...s, impression: v }))}
              />
              <div style={{ display: "grid", gap: 10 }}>
                <Select
                  label="Triage"
                  value={diagnosis.triage}
                  onChange={(v) => setDiagnosis((s) => ({ ...s, triage: v }))}
                  options={TRIAGE}
                />
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 12, color: "var(--muted, #6b7280)", fontWeight: 700 }}>Visual</div>
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 999,
                      background: triageColor(diagnosis.triage),
                      border: "1px solid var(--border, #E5E7EB)",
                    }}
                  />
                  <div style={{ fontSize: 12, color: "var(--muted, #6b7280)" }}>{(diagnosis.triage || "—").toUpperCase()}</div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12, color: "var(--muted, #6b7280)", marginBottom: 6 }}>
                Esto guarda una nota estructurada en el timeline (type: <b>note</b>).
              </div>
              <button
                onClick={saveSampleNote}
                disabled={!canClinicalWrite || disabled}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid var(--primary, #047857)",
                  background: !canClinicalWrite || disabled ? "var(--surface, #F3F4F6)" : "var(--primary, #047857)",
                  color: !canClinicalWrite || disabled ? "var(--text, #111827)" : "#fff",
                  fontWeight: 900,
                  cursor: !canClinicalWrite || disabled ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Guardando…" : "Guardar SAMPLE + triage"}
              </button>
            </div>
          </div>

          {/* Medications */}
          <div style={{ marginTop: 10, border: "1px solid var(--border, #E5E7EB)", borderRadius: 16, padding: 12 }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Medicamentos</div>

            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: 10 }}>
              <Select label="Medicamento" value={medForm.code} onChange={(v) => setMedForm((s) => ({ ...s, code: v }))} options={medOptions} />
              <Input label="Dosis" value={medForm.dose} onChange={(v) => setMedForm((s) => ({ ...s, dose: v }))} placeholder="Ej: 300mg / 1 amp" />
              <Select
                label="Vía"
                value={medForm.route}
                onChange={(v) => setMedForm((s) => ({ ...s, route: v }))}
                options={[
                  { value: "IV", label: "IV" },
                  { value: "IM", label: "IM" },
                  { value: "VO", label: "VO" },
                  { value: "SC", label: "SC" },
                  { value: "INH", label: "INH" },
                  { value: "OTRA", label: "OTRA" },
                ]}
              />
              <div style={{ gridColumn: "1 / -1" }}>
                <Textarea label="Notas" value={medForm.notes} onChange={(v) => setMedForm((s) => ({ ...s, notes: v }))} rows={2} />
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <button
                onClick={addMedication}
                disabled={!canClinicalWrite || disabled}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid var(--primary, #047857)",
                  background: !canClinicalWrite || disabled ? "var(--surface, #F3F4F6)" : "var(--primary, #047857)",
                  color: !canClinicalWrite || disabled ? "var(--primary, #047857)" : "#fff",
                  fontWeight: 900,
                  cursor: !canClinicalWrite || disabled ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Guardando…" : "Agregar medicamento"}
              </button>
            </div>
          </div>

          {/* Procedures */}
          <div style={{ marginTop: 10, border: "1px solid var(--border, #E5E7EB)", borderRadius: 16, padding: 12 }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Procedimientos</div>

            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 10 }}>
              <Select label="Procedimiento" value={procForm.code} onChange={(v) => setProcForm((s) => ({ ...s, code: v }))} options={procOptions} />
              <Textarea label="Notas" value={procForm.notes} onChange={(v) => setProcForm((s) => ({ ...s, notes: v }))} rows={2} />
            </div>

            <div style={{ marginTop: 10 }}>
              <button
                onClick={addProcedure}
                disabled={!canClinicalWrite || disabled}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid var(--secondary, #2563EB)",
                  background: !canClinicalWrite || disabled ? "var(--surface, #F3F4F6)" : "var(--secondary, #2563EB)",
                  color: !canClinicalWrite || disabled ? "var(--secondary, #2563EB)" : "#fff",
                  fontWeight: 900,
                  cursor: !canClinicalWrite || disabled ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Guardando…" : "Agregar procedimiento"}
              </button>
            </div>
          </div>

          {/* Body Map */}
          <div style={{ marginTop: 10, border: "1px solid var(--border, #E5E7EB)", borderRadius: 16, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div style={{ fontWeight: 900 }}>Mapa corporal (lesiones)</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setBodyView("front")}
                  disabled={disabled}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 12,
                    border: "1px solid var(--borderStrong, #D1D5DB)",
                    background: bodyView === "front" ? "var(--primary, #047857)" : "white",
                    color: bodyView === "front" ? "#fff" : "var(--text, #111827)",
                    fontWeight: 900,
                    cursor: disabled ? "not-allowed" : "pointer",
                  }}
                >
                  Frontal
                </button>
                <button
                  onClick={() => setBodyView("back")}
                  disabled={disabled}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 12,
                    border: "1px solid var(--borderStrong, #D1D5DB)",
                    background: bodyView === "back" ? "var(--primary, #047857)" : "white",
                    color: bodyView === "back" ? "#fff" : "var(--text, #111827)",
                    fontWeight: 900,
                    cursor: disabled ? "not-allowed" : "pointer",
                  }}
                >
                  Posterior
                </button>
              </div>
            </div>

            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "start" }}>
              <div style={{ border: "1px solid var(--surface, #F3F4F6)", borderRadius: 16, padding: 10 }}>
                <svg viewBox="0 0 100 105" width="100%" style={{ display: "block" }}>
                  {/* Silueta simple */}
                  <rect x="40" y="5" width="20" height="95" rx="10" fill="var(--surface, #F3F4F6)" stroke="var(--border, #E5E7EB)" />
                  {(BODY_REGIONS[bodyView] || []).map((r) => (
                    <rect
                      key={r.id}
                      x={r.x}
                      y={r.y}
                      width={r.w}
                      height={r.h}
                      rx="2"
                      fill="#ffffff"
                      stroke="var(--muted2, #9ca3af)"
                      style={{ cursor: lockedAt || !canClinicalWrite ? "not-allowed" : "pointer" }}
                      onClick={() => {
                        if (lockedAt || !canClinicalWrite) return;
                        openInjury(r);
                      }}
                    />
                  ))}
                </svg>
                <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted, #6b7280)" }}>
                  Tap en una región para registrar lesión (se guarda como <b>procedure</b> con <b>data.kind="injury"</b>).
                </div>
              </div>

              <div style={{ border: "1px solid var(--surface, #F3F4F6)", borderRadius: 16, padding: 10 }}>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Últimas lesiones (timeline)</div>
                <div className="ga-page" style={{ display: "grid", gap: 12, padding: 16, background: "var(--bg, #F9FAFB)", minHeight: "100vh" }}>
                  {events
                    .filter((e) => String(e?.type || "").toLowerCase() === "procedure" && e?.data?.kind === "injury")
                    .slice(-6)
                    .reverse()
                    .map((e) => (
                      <div key={e.id} style={{ border: "1px solid var(--border, #E5E7EB)", borderRadius: 12, padding: 10 }}>
                        <div style={{ fontSize: 12, color: "var(--muted, #6b7280)" }}>{new Date(e.ts).toLocaleString()}</div>
                        <div style={{ fontWeight: 900 }}>
                          {e.data?.region_label} · {String(e.data?.injury_type || "").toUpperCase()} · Sev {e.data?.severity}
                        </div>
                        {e.data?.notes ? <div style={{ marginTop: 4, fontSize: 12, color: "#374151" }}>{e.data?.notes}</div> : null}
                      </div>
                    ))}
                  {events.filter((e) => String(e?.type || "").toLowerCase() === "procedure" && e?.data?.kind === "injury").length === 0 ? (
                    <div style={{ fontSize: 12, color: "var(--muted, #6b7280)" }}>— Aún no hay lesiones registradas.</div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Injury modal */}
            {injuryModal.open ? (
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(0,0,0,0.35)",
                  display: "grid",
                  placeItems: "center",
                  padding: 16,
                  zIndex: 50,
                }}
                onClick={() => setInjuryModal({ open: false, regionId: "", regionLabel: "" })}
              >
                <div
                  style={{ width: "min(640px, 100%)", background: "white", borderRadius: 16, border: "1px solid var(--border, #E5E7EB)", padding: 14 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                    <div style={{ fontWeight: 900 }}>Lesión · {injuryModal.regionLabel}</div>
                    <button
                      onClick={() => setInjuryModal({ open: false, regionId: "", regionLabel: "" })}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 12,
                        border: "1px solid var(--borderStrong, #D1D5DB)",
                        background: "white",
                        fontWeight: 900,
                        cursor: "pointer",
                      }}
                    >
                      Cerrar
                    </button>
                  </div>

                  <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <Select
                      label="Tipo"
                      value={injuryForm.injury_type}
                      onChange={(v) => setInjuryForm((s) => ({ ...s, injury_type: v }))}
                      options={INJURY_TYPES}
                    />
                    <Select
                      label="Severidad"
                      value={injuryForm.severity}
                      onChange={(v) => setInjuryForm((s) => ({ ...s, severity: v }))}
                      options={[
                        { value: "1", label: "1 - Leve" },
                        { value: "2", label: "2 - Moderada" },
                        { value: "3", label: "3 - Severa" },
                        { value: "4", label: "4 - Crítica" },
                      ]}
                    />
                    <div style={{ gridColumn: "1 / -1" }}>
                      <Textarea label="Notas" value={injuryForm.notes} onChange={(v) => setInjuryForm((s) => ({ ...s, notes: v }))} rows={3} />
                    </div>
                  </div>

                  <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                    <button
                      onClick={saveInjury}
                      disabled={!canClinicalWrite || disabled}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid var(--primary, #047857)",
                        background: !canClinicalWrite || disabled ? "var(--surface, #F3F4F6)" : "var(--primary, #047857)",
                        color: !canClinicalWrite || disabled ? "var(--text, #111827)" : "#fff",
                        fontWeight: 900,
                        cursor: !canClinicalWrite || disabled ? "not-allowed" : "pointer",
                      }}
                    >
                      {saving ? "Guardando…" : "Guardar lesión"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {!canClinicalWrite ? (
            <div style={{ marginTop: 10, fontSize: 12, color: "var(--muted, #6b7280)" }}>
              Nota: para SaaS multiempresa, el rol recomendado para capturar clínico es <b>PARAMEDIC</b>. DISPATCH queda para operación.
            </div>
          ) : null}
        </div>

        {/* SIGNATURES */}
        <div style={{ marginTop: 16, borderTop: "1px solid var(--surface, #F3F4F6)", paddingTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
            <div style={{ fontWeight: 900 }}>Firmas ✍️</div>
            <div style={{ fontSize: 12, color: allSigsOk ? "#065f46" : "var(--muted, #6b7280)", fontWeight: 900 }}>
              {allSigsOk ? "✅ Completo" : "Pendiente"}
            </div>
          </div>

          <div style={{ marginTop: 10, display: "grid", gap: 12 }}>
            <SigCard
              roleName="responsable"
              title="Responsable / Paciente"
              note="Permitido: ADMIN o PARAMEDIC (y DISPATCH si backend lo permite)."
              enabled={canSignResponsableTrip}
              lockedAt={lockedAt}
              disabled={disabled}
              ROLE={ROLE}
              signs={signs}
              sigNames={sigNames}
              setSigNames={setSigNames}
              sigPreview={sigPreview}
              setSigPreview={setSigPreview}
              uploadSignature={uploadSignature}
              saveCanvasSignature={saveCanvasSignature}
            />
            <SigCard
              roleName="tripulacion"
              title="Tripulación"
              note="Permitido: ADMIN o PARAMEDIC (y DISPATCH si backend lo permite)."
              enabled={canSignResponsableTrip}
              lockedAt={lockedAt}
              disabled={disabled}
              ROLE={ROLE}
              signs={signs}
              sigNames={sigNames}
              setSigNames={setSigNames}
              sigPreview={sigPreview}
              setSigPreview={setSigPreview}
              uploadSignature={uploadSignature}
              saveCanvasSignature={saveCanvasSignature}
            />
            <SigCard
              roleName="receptor"
              title="Receptor (Hospital)"
              note="Permitido: ADMIN o DOCTOR o RECEIVER_MD"
              enabled={canSignReceptor}
              lockedAt={lockedAt}
              disabled={disabled}
              ROLE={ROLE}
              signs={signs}
              sigNames={sigNames}
              setSigNames={setSigNames}
              sigPreview={sigPreview}
              setSigPreview={setSigPreview}
              uploadSignature={uploadSignature}
              saveCanvasSignature={saveCanvasSignature}
            />
          </div>

          {lockedAt ? (
            <div style={{ marginTop: 10, fontSize: 12, color: "var(--muted, #6b7280)" }}>
              FRAP bloqueado: las firmas ya no pueden modificarse.
            </div>
          ) : null}
        </div>

        {/* TIMELINE */}
        <div style={{ marginTop: 16, borderTop: "1px solid var(--surface, #F3F4F6)", paddingTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
            <div style={{ fontWeight: 900 }}>Timeline clínico 🕒</div>
            <button
              onClick={() => setTimelineOpen((s) => !s)}
              style={{
                padding: "8px 10px",
                borderRadius: 12,
                border: "1px solid var(--borderStrong, #D1D5DB)",
                background: "white",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              {timelineOpen ? "Ocultar" : "Mostrar"}
            </button>
          </div>

          {timelineOpen ? (
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              {events.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--muted, #6b7280)" }}>— Aún no hay eventos clínicos.</div>
              ) : (
                <>
                  {events
                    .slice()
                    .reverse()
                    .map((ev) => {
                      const fe = formatEvent(ev);
                      return (
                        <div
                          key={ev.id}
                          style={{
                            border: "1px solid var(--border, #E5E7EB)",
                            borderRadius: 14,
                            padding: 12,
                            background: "var(--card, #ffffff)",
                            boxShadow: "var(--shadow-sm, 0 1px 2px rgba(16,24,40,0.06))",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
                            <div style={{ fontWeight: 900, display: "flex", alignItems: "center", gap: 8 }}>
                              <span aria-hidden="true">{fe.icon}</span>
                              <span>{fe.title}</span>
                            </div>
                            <div style={{ fontSize: 12, color: "var(--muted, #6b7280)", whiteSpace: "nowrap" }}>{fe.when}</div>
                          </div>

                          <div style={{ marginTop: 8, fontSize: 13, color: "var(--text, #111827)" }}>
                            {fe.lines.map((ln, i) => (
                              <div key={i} style={{ lineHeight: 1.35 }}>
                                {ln}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </>
              )}
            </div>
          ) : null}
        </div>

        {/* LOCK + PDF + FINISH */}
        <div style={{ marginTop: 16, borderTop: "1px solid var(--surface, #F3F4F6)", paddingTop: 12 }}>
          <div style={{ marginBottom: 10, fontSize: 12, color: "var(--muted, #6b7280)" }}>
            Operación recomendada: Clínico (events) → Firmas ✍️ → Lock → PDF → Cerrar servicio (finished).
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={lockFrap}
              disabled={disabled || !canLock || !allSigsOk}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid var(--primary, #047857)",
                background: disabled || !canLock || !allSigsOk ? "var(--surface, #F3F4F6)" : "var(--primary, #047857)",
                color: disabled || !canLock || !allSigsOk ? "var(--primary, #047857)" : "#fff",
                fontWeight: 900,
                cursor: disabled || !canLock || !allSigsOk ? "not-allowed" : "pointer",
              }}
              title={!allSigsOk ? "Faltan firmas" : !canLock ? "Lock requiere PARAMEDIC/ADMIN" : ""}
            >
              {lockedAt ? "Ya bloqueado" : saving ? "Bloqueando…" : "Lock"}
            </button>

            <button
              onClick={openPdf}
              disabled={disabled || !canOpenPdf}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid var(--secondary, #2563EB)",
                background: disabled || !canOpenPdf ? "var(--surface, #F3F4F6)" : "var(--secondary, #2563EB)",
                color: disabled || !canOpenPdf ? "var(--secondary, #2563EB)" : "#fff",
                fontWeight: 900,
                cursor: disabled || !canOpenPdf ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Abriendo…" : "PDF (locked)"}
            </button>

            <button
              onClick={finishService}
              disabled={disabled || !canFinishService || !lockedAt}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid var(--primary, #047857)",
                background: disabled || !canFinishService || !lockedAt ? "var(--surface, #F3F4F6)" : "var(--primary, #047857)",
                color: disabled || !canFinishService || !lockedAt ? "var(--text, #111827)" : "#fff",
                fontWeight: 900,
                cursor: disabled || !canFinishService || !lockedAt ? "not-allowed" : "pointer",
              }}
              title={!lockedAt ? "Requiere Lock primero" : ""}
            >
              {saving ? "Cerrando…" : "Cerrar servicio (finished)"}
            </button>

            {isUnit ? (
              <div style={{ fontSize: 12, color: "var(--muted, #6b7280)", alignSelf: "center" }}>
                Modo unidad: no puedes bloquear/terminar.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}