import React, { useEffect, useMemo, useState } from "react";
import { v2Api } from "../api/v2";

const cardStyle = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 20,
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
};

const sectionTitleStyle = {
  marginTop: 0,
  marginBottom: 14,
  fontSize: 28,
  fontWeight: 800,
  color: "#0f172a",
};

const blockTitleStyle = {
  marginTop: 0,
  marginBottom: 8,
  fontSize: 18,
  fontWeight: 800,
  color: "#111827",
};

const blockSubtitleStyle = {
  margin: 0,
  fontSize: 13,
  color: "#6b7280",
};

const fieldStyle = {
  display: "grid",
  gap: 6,
};

const labelStyle = {
  fontSize: 13,
  fontWeight: 700,
  color: "#374151",
};

const inputStyle = {
  width: "100%",
  minHeight: 44,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  boxSizing: "border-box",
  font: "inherit",
  background: "#fff",
  outline: "none",
};

const textareaStyle = {
  ...inputStyle,
  minHeight: 92,
  resize: "vertical",
};

const helpStyle = {
  fontSize: 12,
  color: "#6b7280",
};

const grid2 = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 14,
};

const grid4 = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
};

const bodyMapLayout = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
  gap: 18,
  alignItems: "start",
};

const injuriesTableStyle = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
};

const thtd = {
  borderBottom: "1px solid #e5e7eb",
  padding: "10px 12px",
  textAlign: "left",
  verticalAlign: "top",
  fontSize: 14,
};

const panelStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 16,
  background: "#fafafa",
  display: "grid",
  gap: 14,
};

const svgCardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 16,
  background: "#fff",
  display: "grid",
  gap: 10,
};

const regionLegendStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const countBadge = (count) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 28,
  height: 28,
  padding: "0 10px",
  borderRadius: 999,
  background: "#eff6ff",
  color: "#1d4ed8",
  fontSize: 13,
  fontWeight: 800,
  border: "1px solid #bfdbfe",
});

const BODY_REGIONS_ANTERIOR = [
  { key: "head", label: "Cabeza" },
  { key: "face", label: "Cara" },
  { key: "neck", label: "Cuello" },
  { key: "chest", label: "Tórax" },
  { key: "abdomen", label: "Abdomen" },
  { key: "pelvis", label: "Pelvis" },
  { key: "left_shoulder", label: "Hombro izquierdo" },
  { key: "right_shoulder", label: "Hombro derecho" },
  { key: "left_arm", label: "Brazo izquierdo" },
  { key: "right_arm", label: "Brazo derecho" },
  { key: "left_hand", label: "Mano izquierda" },
  { key: "right_hand", label: "Mano derecha" },
  { key: "left_leg", label: "Pierna izquierda" },
  { key: "right_leg", label: "Pierna derecha" },
  { key: "left_foot", label: "Pie izquierdo" },
  { key: "right_foot", label: "Pie derecho" },
];

const BODY_REGIONS_POSTERIOR = [
  { key: "occipital", label: "Occipital" },
  { key: "posterior_neck", label: "Cuello posterior" },
  { key: "upper_back", label: "Espalda alta" },
  { key: "lower_back", label: "Espalda baja" },
  { key: "gluteal", label: "Glúteos" },
  { key: "left_shoulder_back", label: "Hombro izquierdo posterior" },
  { key: "right_shoulder_back", label: "Hombro derecho posterior" },
  { key: "left_arm_back", label: "Brazo izquierdo posterior" },
  { key: "right_arm_back", label: "Brazo derecho posterior" },
  { key: "left_hand_back", label: "Mano izquierda posterior" },
  { key: "right_hand_back", label: "Mano derecha posterior" },
  { key: "left_leg_back", label: "Pierna izquierda posterior" },
  { key: "right_leg_back", label: "Pierna derecha posterior" },
  { key: "left_foot_back", label: "Pie izquierdo posterior" },
  { key: "right_foot_back", label: "Pie derecho posterior" },
];

const INJURY_TYPES = [
  { value: "contusion", label: "Contusión" },
  { value: "abrasion", label: "Abrasión" },
  { value: "laceration", label: "Laceración" },
  { value: "puncture", label: "Punción" },
  { value: "burn", label: "Quemadura" },
  { value: "fracture", label: "Fractura" },
  { value: "deformity", label: "Deformidad" },
  { value: "swelling", label: "Inflamación" },
  { value: "bleeding", label: "Sangrado" },
  { value: "other", label: "Otra" },
];

const SEVERITY_OPTIONS = [
  { value: "minor", label: "Leve" },
  { value: "moderate", label: "Moderada" },
  { value: "severe", label: "Severa" },
];

const VIEW_LABELS = {
  anterior: "Anterior",
  posterior: "Posterior",
};

function emptyForm() {
  return {
    status: "draft",
    anterior_regions: [],
    posterior_regions: [],
    injuries: [],
    summary: "",
    notes: "",
  };
}

function emptyInjury() {
  return {
    view: "anterior",
    region: "",
    type: "",
    severity: "",
    notes: "",
  };
}

function isNotFoundError(error) {
  const status =
    error?.status ??
    error?.response?.status ??
    error?.response?.statusCode ??
    error?.cause?.status;

  if (status === 404) return true;

  const text =
    error?.message ||
    error?.detail ||
    error?.response?.data?.detail ||
    error?.cause?.message ||
    "";

  return String(text).toLowerCase().includes("body map not found");
}

function toggleInList(list, value) {
  if (list.includes(value)) {
    return list.filter((item) => item !== value);
  }
  return [...list, value];
}

function regionFill(active) {
  return active ? "#93c5fd" : "#f3f4f6";
}

function regionStroke(active) {
  return active ? "#2563eb" : "#94a3b8";
}

function RegionPill({ label }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        borderRadius: 999,
        background: "#eff6ff",
        color: "#1d4ed8",
        border: "1px solid #bfdbfe",
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {label}
    </span>
  );
}

function SummaryChips({ anterior, posterior, injuries }) {
  const items = [
    { label: "Anterior", value: anterior?.length || 0 },
    { label: "Posterior", value: posterior?.length || 0 },
    { label: "Lesiones", value: injuries?.length || 0 },
  ];

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {items.map((item) => (
        <div
          key={item.label}
          style={{
            border: "1px solid #dbeafe",
            background: "#eff6ff",
            color: "#1d4ed8",
            borderRadius: 999,
            padding: "8px 12px",
            fontSize: 13,
            fontWeight: 800,
          }}
        >
          {item.label}: {item.value}
        </div>
      ))}
    </div>
  );
}

function shapeProps(part, active, disabled, onToggle) {
  return {
    key: part.key,
    onClick: disabled ? undefined : () => onToggle(part.key),
    style: { cursor: disabled ? "not-allowed" : "pointer" },
    fill: regionFill(active),
    stroke: regionStroke(active),
    strokeWidth: active ? 2.4 : 1.7,
  };
}

function DrawPart({ part, active, disabled, onToggle }) {
  const common = shapeProps(part, active, disabled, onToggle);

  if (part.shape === "circle") {
    return <circle {...common} cx={part.cx} cy={part.cy} r={part.r} />;
  }

  if (part.shape === "ellipse") {
    return (
      <ellipse
        {...common}
        cx={part.cx}
        cy={part.cy}
        rx={part.rx}
        ry={part.ry}
      />
    );
  }

  if (part.shape === "path") {
    return <path {...common} d={part.d} />;
  }

  return (
    <rect
      {...common}
      x={part.x}
      y={part.y}
      width={part.width}
      height={part.height}
      rx={part.rx || 0}
    />
  );
}

function SilhouetteAnterior({ selected, onToggle, disabled }) {
  const parts = [
    { key: "head", shape: "circle", cx: 110, cy: 28, r: 18 },
    { key: "face", shape: "ellipse", cx: 110, cy: 48, rx: 13, ry: 10 },
    { key: "neck", shape: "rect", x: 102, y: 60, width: 16, height: 12, rx: 6 },
    {
      key: "left_shoulder",
      shape: "path",
      d: "M70 78 Q74 68 88 72 L92 92 Q76 98 66 90 Z",
    },
    {
      key: "right_shoulder",
      shape: "path",
      d: "M130 72 Q144 68 150 78 L154 90 Q144 98 128 92 Z",
    },
    {
      key: "chest",
      shape: "path",
      d: "M90 74 Q110 68 130 74 L134 116 Q110 124 86 116 Z",
    },
    {
      key: "abdomen",
      shape: "path",
      d: "M88 118 Q110 112 132 118 L128 154 Q110 160 92 154 Z",
    },
    {
      key: "pelvis",
      shape: "path",
      d: "M90 156 Q110 148 130 156 L126 182 Q110 188 94 182 Z",
    },
    {
      key: "left_arm",
      shape: "path",
      d: "M64 92 Q74 88 82 96 L76 164 Q66 170 56 162 L58 104 Z",
    },
    {
      key: "right_arm",
      shape: "path",
      d: "M138 96 Q146 88 156 92 L162 104 L164 162 Q154 170 144 164 Z",
    },
    { key: "left_hand", shape: "ellipse", cx: 66, cy: 178, rx: 12, ry: 11 },
    { key: "right_hand", shape: "ellipse", cx: 154, cy: 178, rx: 12, ry: 11 },
    {
      key: "left_leg",
      shape: "path",
      d: "M96 184 Q104 180 110 184 L106 282 Q96 286 88 282 L90 194 Z",
    },
    {
      key: "right_leg",
      shape: "path",
      d: "M110 184 Q116 180 124 184 L130 282 Q122 286 112 282 L114 194 Z",
    },
    { key: "left_foot", shape: "ellipse", cx: 96, cy: 294, rx: 16, ry: 7 },
    { key: "right_foot", shape: "ellipse", cx: 124, cy: 294, rx: 16, ry: 7 },
  ];

  return (
    <svg
      viewBox="0 0 220 310"
      style={{
        width: "100%",
        maxWidth: 300,
        margin: "0 auto",
        display: "block",
      }}
    >
      {parts.map((part) => (
        <DrawPart
          key={part.key}
          part={part}
          active={selected.includes(part.key)}
          disabled={disabled}
          onToggle={onToggle}
        />
      ))}
    </svg>
  );
}

function SilhouettePosterior({ selected, onToggle, disabled }) {
  const parts = [
    { key: "occipital", shape: "circle", cx: 110, cy: 28, r: 18 },
    { key: "posterior_neck", shape: "rect", x: 102, y: 58, width: 16, height: 14, rx: 6 },
    {
      key: "left_shoulder_back",
      shape: "path",
      d: "M70 78 Q76 68 88 72 L92 92 Q78 98 66 90 Z",
    },
    {
      key: "right_shoulder_back",
      shape: "path",
      d: "M130 72 Q144 68 150 78 L154 90 Q142 98 128 92 Z",
    },
    {
      key: "upper_back",
      shape: "path",
      d: "M88 74 Q110 68 132 74 L136 118 Q110 124 84 118 Z",
    },
    {
      key: "lower_back",
      shape: "path",
      d: "M90 120 Q110 114 130 120 L128 152 Q110 158 92 152 Z",
    },
    {
      key: "gluteal",
      shape: "path",
      d: "M90 154 Q110 148 130 154 L126 184 Q110 190 94 184 Z",
    },
    {
      key: "left_arm_back",
      shape: "path",
      d: "M64 92 Q74 88 82 96 L76 164 Q66 170 56 162 L58 104 Z",
    },
    {
      key: "right_arm_back",
      shape: "path",
      d: "M138 96 Q146 88 156 92 L162 104 L164 162 Q154 170 144 164 Z",
    },
    { key: "left_hand_back", shape: "ellipse", cx: 66, cy: 178, rx: 12, ry: 11 },
    { key: "right_hand_back", shape: "ellipse", cx: 154, cy: 178, rx: 12, ry: 11 },
    {
      key: "left_leg_back",
      shape: "path",
      d: "M96 186 Q104 182 110 186 L106 282 Q96 286 88 282 L90 196 Z",
    },
    {
      key: "right_leg_back",
      shape: "path",
      d: "M110 186 Q116 182 124 186 L130 282 Q122 286 112 282 L114 196 Z",
    },
    { key: "left_foot_back", shape: "ellipse", cx: 96, cy: 294, rx: 16, ry: 7 },
    { key: "right_foot_back", shape: "ellipse", cx: 124, cy: 294, rx: 16, ry: 7 },
  ];

  return (
    <svg
      viewBox="0 0 220 310"
      style={{
        width: "100%",
        maxWidth: 300,
        margin: "0 auto",
        display: "block",
      }}
    >
      {parts.map((part) => (
        <DrawPart
          key={part.key}
          part={part}
          active={selected.includes(part.key)}
          disabled={disabled}
          onToggle={onToggle}
        />
      ))}
    </svg>
  );
}

function BodyPanel({
  title,
  subtitle,
  selected,
  disabled,
  children,
  regionMap,
}) {
  return (
    <div style={svgCardStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "grid", gap: 4 }}>
          <h4 style={blockTitleStyle}>{title}</h4>
          <p style={blockSubtitleStyle}>{subtitle}</p>
        </div>
        <div style={countBadge(selected.length)}>{selected.length}</div>
      </div>

      {children}

      <div style={regionLegendStyle}>
        {selected.length ? (
          selected.map((key) => (
            <RegionPill key={key} label={regionMap[key] || key} />
          ))
        ) : (
          <div style={helpStyle}>Sin regiones seleccionadas.</div>
        )}
      </div>
    </div>
  );
}

export default function FrapBodyMapV2({
  session,
  intakeId,
  readOnly = false,
  onSaved,
}) {
  const [form, setForm] = useState(emptyForm());
  const [injuryDraft, setInjuryDraft] = useState(emptyInjury());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    if (!intakeId) {
      setForm(emptyForm());
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const data = await v2Api.bodyMapGet({
        intakeId,
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
      });

      if (data) {
        setForm({
          status: data.status || "draft",
          anterior_regions: Array.isArray(data.anterior_regions)
            ? data.anterior_regions
            : [],
          posterior_regions: Array.isArray(data.posterior_regions)
            ? data.posterior_regions
            : [],
          injuries: Array.isArray(data.injuries) ? data.injuries : [],
          summary: data.summary || "",
          notes: data.notes || "",
        });
      } else {
        setForm(emptyForm());
      }
    } catch (e) {
      if (isNotFoundError(e)) {
        setForm(emptyForm());
        setError("");
      } else {
        setError(e?.message || "No se pudo cargar lesiones corporales.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [intakeId]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleAnterior(regionKey) {
    setForm((prev) => ({
      ...prev,
      anterior_regions: toggleInList(prev.anterior_regions || [], regionKey),
    }));
  }

  function togglePosterior(regionKey) {
    setForm((prev) => ({
      ...prev,
      posterior_regions: toggleInList(prev.posterior_regions || [], regionKey),
    }));
  }

  function addInjury() {
    if (!injuryDraft.region || !injuryDraft.type || !injuryDraft.severity) {
      setError("Completa región, tipo y severidad de la lesión.");
      return;
    }

    setError("");
    setForm((prev) => ({
      ...prev,
      injuries: [...(prev.injuries || []), { ...injuryDraft }],
    }));
    setInjuryDraft(emptyInjury());
  }

  function removeInjury(index) {
    setForm((prev) => ({
      ...prev,
      injuries: (prev.injuries || []).filter((_, i) => i !== index),
    }));
  }

  const regionOptions = useMemo(() => {
    const anterior = BODY_REGIONS_ANTERIOR.map((r) => ({
      value: r.key,
      label: `${r.label} (anterior)`,
    }));
    const posterior = BODY_REGIONS_POSTERIOR.map((r) => ({
      value: r.key,
      label: `${r.label} (posterior)`,
    }));
    return [...anterior, ...posterior];
  }, []);

  const anteriorMap = useMemo(
    () =>
      Object.fromEntries(BODY_REGIONS_ANTERIOR.map((r) => [r.key, r.label])),
    []
  );

  const posteriorMap = useMemo(
    () =>
      Object.fromEntries(BODY_REGIONS_POSTERIOR.map((r) => [r.key, r.label])),
    []
  );

  const injuryTypeMap = useMemo(
    () => Object.fromEntries(INJURY_TYPES.map((x) => [x.value, x.label])),
    []
  );

  const severityMap = useMemo(
    () => Object.fromEntries(SEVERITY_OPTIONS.map((x) => [x.value, x.label])),
    []
  );

  const allRegionMap = useMemo(
    () => ({ ...anteriorMap, ...posteriorMap }),
    [anteriorMap, posteriorMap]
  );

  async function save() {
    if (readOnly || !intakeId) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");

      await v2Api.bodyMapUpsert({
        intakeId,
        payload: {
          status: form.status || null,
          anterior_regions: form.anterior_regions || [],
          posterior_regions: form.posterior_regions || [],
          injuries: form.injuries || [],
          summary: form.summary || null,
          notes: form.notes || null,
        },
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
      });

      await load();

      if (typeof onSaved === "function") {
        await onSaved();
      }

      setMessage("Lesiones corporales guardadas correctamente.");
    } catch (e) {
      setError(e?.message || "No se pudo guardar lesiones corporales.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={cardStyle}>
      <h3 style={sectionTitleStyle}>Lesiones corporales / Body Map</h3>

      {loading ? <div style={helpStyle}>Cargando body map...</div> : null}
      {error ? (
        <div style={{ ...helpStyle, color: "#b91c1c" }}>{error}</div>
      ) : null}
      {message ? (
        <div style={{ ...helpStyle, color: "#166534" }}>{message}</div>
      ) : null}

      <div style={{ display: "grid", gap: 18 }}>
        <section style={panelStyle}>
          <div style={{ display: "grid", gap: 4 }}>
            <h4 style={blockTitleStyle}>Estado del registro</h4>
            <p style={blockSubtitleStyle}>
              Marca visualmente las regiones afectadas y documenta las lesiones.
            </p>
          </div>

          <div style={grid4}>
            <div style={fieldStyle}>
              <div style={labelStyle}>Estado</div>
              <select
                style={inputStyle}
                value={form.status}
                disabled={readOnly}
                onChange={(e) => updateField("status", e.target.value)}
              >
                <option value="draft">Borrador</option>
                <option value="completed">Completo</option>
                <option value="reviewed">Revisado</option>
              </select>
            </div>
          </div>

          <SummaryChips
            anterior={form.anterior_regions}
            posterior={form.posterior_regions}
            injuries={form.injuries}
          />
        </section>

        <section style={bodyMapLayout}>
          <BodyPanel
            title="Vista anterior"
            subtitle="Haz clic directamente sobre la silueta."
            selected={form.anterior_regions || []}
            disabled={readOnly}
            regionMap={anteriorMap}
          >
            <SilhouetteAnterior
              selected={form.anterior_regions || []}
              onToggle={toggleAnterior}
              disabled={readOnly}
            />
          </BodyPanel>

          <BodyPanel
            title="Vista posterior"
            subtitle="Haz clic directamente sobre la silueta."
            selected={form.posterior_regions || []}
            disabled={readOnly}
            regionMap={posteriorMap}
          >
            <SilhouettePosterior
              selected={form.posterior_regions || []}
              onToggle={togglePosterior}
              disabled={readOnly}
            />
          </BodyPanel>
        </section>

        <section style={panelStyle}>
          <div style={{ display: "grid", gap: 4 }}>
            <h4 style={blockTitleStyle}>Detalle de lesiones</h4>
            <p style={blockSubtitleStyle}>
              Registra cada lesión individual con región, tipo y severidad.
            </p>
          </div>

          {!readOnly && (
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 14,
                padding: 16,
                display: "grid",
                gap: 14,
                background: "#fff",
              }}
            >
              <div style={grid4}>
                <div style={fieldStyle}>
                  <div style={labelStyle}>Vista</div>
                  <select
                    style={inputStyle}
                    value={injuryDraft.view}
                    onChange={(e) =>
                      setInjuryDraft((prev) => ({
                        ...prev,
                        view: e.target.value,
                      }))
                    }
                  >
                    <option value="anterior">Anterior</option>
                    <option value="posterior">Posterior</option>
                  </select>
                </div>

                <div style={fieldStyle}>
                  <div style={labelStyle}>Región</div>
                  <select
                    style={inputStyle}
                    value={injuryDraft.region}
                    onChange={(e) =>
                      setInjuryDraft((prev) => ({
                        ...prev,
                        region: e.target.value,
                      }))
                    }
                  >
                    <option value="">Selecciona región</option>
                    {regionOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={fieldStyle}>
                  <div style={labelStyle}>Tipo de lesión</div>
                  <select
                    style={inputStyle}
                    value={injuryDraft.type}
                    onChange={(e) =>
                      setInjuryDraft((prev) => ({
                        ...prev,
                        type: e.target.value,
                      }))
                    }
                  >
                    <option value="">Selecciona tipo</option>
                    {INJURY_TYPES.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={fieldStyle}>
                  <div style={labelStyle}>Severidad</div>
                  <select
                    style={inputStyle}
                    value={injuryDraft.severity}
                    onChange={(e) =>
                      setInjuryDraft((prev) => ({
                        ...prev,
                        severity: e.target.value,
                      }))
                    }
                  >
                    <option value="">Selecciona severidad</option>
                    {SEVERITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={fieldStyle}>
                <div style={labelStyle}>Notas de la lesión</div>
                <textarea
                  style={textareaStyle}
                  value={injuryDraft.notes}
                  onChange={(e) =>
                    setInjuryDraft((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <button
                  type="button"
                  onClick={addInjury}
                  style={{
                    minHeight: 42,
                    padding: "10px 16px",
                    borderRadius: 10,
                    border: "1px solid #111827",
                    background: "#111827",
                    color: "#fff",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Agregar lesión
                </button>
              </div>
            </div>
          )}

          {!form.injuries?.length ? (
            <div style={helpStyle}>Aún no hay lesiones registradas.</div>
          ) : (
            <div
              style={{
                overflowX: "auto",
                border: "1px solid #e5e7eb",
                borderRadius: 14,
                background: "#fff",
              }}
            >
              <table style={injuriesTableStyle}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    <th style={thtd}>Vista</th>
                    <th style={thtd}>Región</th>
                    <th style={thtd}>Tipo</th>
                    <th style={thtd}>Severidad</th>
                    <th style={thtd}>Notas</th>
                    {!readOnly ? <th style={thtd}>Acción</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {(form.injuries || []).map((injury, index) => (
                    <tr key={`injury-${index}`}>
                      <td style={thtd}>{VIEW_LABELS[injury.view] || injury.view}</td>
                      <td style={thtd}>{allRegionMap[injury.region] || injury.region}</td>
                      <td style={thtd}>{injuryTypeMap[injury.type] || injury.type}</td>
                      <td style={thtd}>{severityMap[injury.severity] || injury.severity}</td>
                      <td style={thtd}>{injury.notes || ""}</td>
                      {!readOnly ? (
                        <td style={thtd}>
                          <button
                            type="button"
                            onClick={() => removeInjury(index)}
                            style={{
                              minHeight: 34,
                              padding: "6px 10px",
                              borderRadius: 8,
                              border: "1px solid #dc2626",
                              background: "#fff",
                              color: "#dc2626",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            Eliminar
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section style={panelStyle}>
          <div style={{ display: "grid", gap: 4 }}>
            <h4 style={blockTitleStyle}>Resumen clínico</h4>
            <p style={blockSubtitleStyle}>
              Resume el patrón de lesiones y las observaciones relevantes.
            </p>
          </div>

          <div style={grid2}>
            <div style={fieldStyle}>
              <div style={labelStyle}>Resumen</div>
              <textarea
                style={textareaStyle}
                value={form.summary}
                disabled={readOnly}
                onChange={(e) => updateField("summary", e.target.value)}
              />
            </div>

            <div style={fieldStyle}>
              <div style={labelStyle}>Observaciones</div>
              <textarea
                style={textareaStyle}
                value={form.notes}
                disabled={readOnly}
                onChange={(e) => updateField("notes", e.target.value)}
              />
            </div>
          </div>

          {!readOnly ? (
            <div>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                style={{
                  minHeight: 44,
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: "1px solid #111827",
                  background: saving ? "#e5e7eb" : "#111827",
                  color: saving ? "#111827" : "#fff",
                  fontWeight: 800,
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Guardando..." : "Guardar body map"}
              </button>
            </div>
          ) : (
            <div style={helpStyle}>
              Este perfil tiene acceso de consulta a lesiones corporales.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}