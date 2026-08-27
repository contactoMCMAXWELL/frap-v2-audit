import React, { useEffect, useMemo, useRef, useState } from "react";
import FrapWhatsappShareModal from "./FrapWhatsappShareModal";

const API_BASE = "/api/v2";

const SIGNATURE_ROLE_META = {
  operator: {
    title: "Paramédico / Admin",
    defaultRoleLabel: "PARAMEDIC",
    canvasLabel: "Firma de operador",
    requiresRelation: false,
  },
  receiver: {
    title: "Receptor hospitalario",
    defaultRoleLabel: "DOCTOR",
    canvasLabel: "Firma de receptor",
    requiresRelation: false,
  },
  patient: {
    title: "Paciente / Responsable",
    defaultRoleLabel: "Paciente",
    canvasLabel: "Firma de paciente / responsable",
    requiresRelation: true,
  },
};

function buildSessionHeaders(session) {
  const token = session?.access_token || session?.token || "";
  const companyId = session?.company_id || session?.companyId || "";
  const userId = session?.user_id || session?.userId || "";

  return {
    Authorization: `Bearer ${token}`,
    "X-Company-Id": companyId,
    "X-User-Id": userId,
  };
}

async function readError(res) {
  const contentType = res.headers.get("content-type") || "";
  try {
    if (contentType.includes("application/json")) {
      const data = await res.json();
      if (typeof data?.detail === "string") return data.detail;
      if (data?.detail) return JSON.stringify(data.detail);
      return JSON.stringify(data);
    }
    return await res.text();
  } catch {
    return `HTTP ${res.status}`;
  }
}

async function apiGet(path, session) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: buildSessionHeaders(session),
  });

  if (!res.ok) {
    throw new Error(await readError(res));
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return await res.json();
  }
  return await res.text();
}

async function apiPut(path, session, payload) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers: {
      ...buildSessionHeaders(session),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await readError(res));
  }

  return await res.json();
}

async function apiGetBlob(path, session) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: buildSessionHeaders(session),
  });

  if (!res.ok) {
    throw new Error(await readError(res));
  }

  return await res.blob();
}

function SignatureCanvas({ value, onChange, label }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const width = canvas.offsetWidth || 520;
    const height = 170;

    canvas.width = width * ratio;
    canvas.height = height * ratio;

    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111827";

    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
      };
      img.src = value;
    }
  }, [value]);

  const getPoint = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    if ("touches" in event && event.touches.length > 0) {
      return {
        x: event.touches[0].clientX - rect.left,
        y: event.touches[0].clientY - rect.top,
      };
    }

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const start = (event) => {
    event.preventDefault();
    drawingRef.current = true;
    lastPointRef.current = getPoint(event);
  };

  const move = (event) => {
    if (!drawingRef.current) return;
    event.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const current = getPoint(event);
    const previous = lastPointRef.current;

    if (!previous) {
      lastPointRef.current = current;
      return;
    }

    ctx.beginPath();
    ctx.moveTo(previous.x, previous.y);
    ctx.lineTo(current.x, current.y);
    ctx.stroke();

    lastPointRef.current = current;
  };

  const end = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;

    const canvas = canvasRef.current;
    onChange(canvas.toDataURL("image/png"));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const width = canvas.offsetWidth || 520;
    const height = 170;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    onChange("");
  };

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: "#475569" }}>
        {label}
      </div>
      <div
        style={{
          border: "1px dashed #cbd5e1",
          borderRadius: 12,
          background: "#fff",
          overflow: "hidden",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: "100%",
            height: 170,
            display: "block",
            touchAction: "none",
            cursor: "crosshair",
            background: "#fff",
          }}
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
        />
      </div>
      <div style={{ marginTop: 8 }}>
        <button type="button" onClick={clear}>
          Limpiar firma
        </button>
      </div>
    </div>
  );
}

function SignatureCard({
  session,
  intakeId,
  roleKey,
  existingSignature,
  onSaved,
}) {
  const meta = SIGNATURE_ROLE_META[roleKey];

  const [signerName, setSignerName] = useState(existingSignature?.signer_name || "");
  const [signerRole, setSignerRole] = useState(
    existingSignature?.signer_role || meta.defaultRoleLabel
  );
  const [signerRelation, setSignerRelation] = useState(
    existingSignature?.signer_relation || (roleKey === "patient" ? "Paciente" : "")
  );
  const [refusedToSign, setRefusedToSign] = useState(
    Boolean(existingSignature?.refused_to_sign)
  );
  const [refusalReason, setRefusalReason] = useState(
    existingSignature?.refusal_reason || ""
  );
  const [signatureImage, setSignatureImage] = useState(existingSignature?.image_base64 || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setSignerName(existingSignature?.signer_name || "");
    setSignerRole(existingSignature?.signer_role || meta.defaultRoleLabel);
    setSignerRelation(
      existingSignature?.signer_relation || (roleKey === "patient" ? "Paciente" : "")
    );
    setRefusedToSign(Boolean(existingSignature?.refused_to_sign));
    setRefusalReason(existingSignature?.refusal_reason || "");
    setSignatureImage(existingSignature?.image_base64 || "");
  }, [existingSignature, meta.defaultRoleLabel, roleKey]);

  const saveSignature = async () => {
    try {
      setSaving(true);
      setMessage("");

      const payload = {
        intake_id: intakeId,
        signature_role: roleKey,
        signer_name: signerName,
        signer_role: signerRole,
        signer_relation: roleKey === "patient" ? signerRelation : "",
        image_base64: roleKey === "patient" && refusedToSign ? null : signatureImage,
        refused_to_sign: roleKey === "patient" ? refusedToSign : false,
        refusal_reason: roleKey === "patient" && refusedToSign ? refusalReason : "",
        meta_json: {},
      };

      await apiPut("/frap-signatures/", session, payload);
      setMessage("Firma guardada correctamente");
      await onSaved();
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const signedAt =
    existingSignature?.signed_at_display ||
    existingSignature?.signed_at ||
    "";

  return (
    <div
      style={{
        border: "1px solid #cbd5e1",
        borderRadius: 18,
        padding: 18,
        background: "#f8fafc",
      }}
    >
      <div
        style={{
          fontSize: 16,
          fontWeight: 800,
          color: "#475569",
          marginBottom: 14,
          textTransform: "uppercase",
        }}
      >
        {meta.title}
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <label>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Nombre</div>
          <input
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            style={inputStyle}
          />
        </label>

        <label>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Rol / Cargo</div>
          <input
            value={signerRole}
            onChange={(e) => setSignerRole(e.target.value)}
            style={inputStyle}
          />
        </label>

        {meta.requiresRelation && (
          <label>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Relación</div>
            <input
              value={signerRelation}
              onChange={(e) => setSignerRelation(e.target.value)}
              style={inputStyle}
            />
          </label>
        )}

        {roleKey === "patient" && (
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={refusedToSign}
              onChange={(e) => setRefusedToSign(e.target.checked)}
            />
            <span>Paciente / responsable se niega a firmar</span>
          </label>
        )}

        {roleKey === "patient" && refusedToSign ? (
          <label>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Motivo</div>
            <textarea
              value={refusalReason}
              onChange={(e) => setRefusalReason(e.target.value)}
              rows={3}
              style={textareaStyle}
            />
          </label>
        ) : (
          <SignatureCanvas
            value={signatureImage}
            onChange={setSignatureImage}
            label={meta.canvasLabel}
          />
        )}

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" onClick={saveSignature} disabled={saving}>
            {saving ? "Guardando..." : "Guardar firma"}
          </button>

          {signedAt ? (
            <span style={{ color: "#475569", fontSize: 13 }}>
              Último registro: {signedAt}
            </span>
          ) : null}
        </div>

        {message ? (
          <div
            style={{
              fontSize: 13,
              color: message.startsWith("Error") ? "#b91c1c" : "#166534",
            }}
          >
            {message}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function FrapSignaturesPdfPanel({ session, intakeId }) {
  const [signatures, setSignatures] = useState([]);
  const [validation, setValidation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busyPdf, setBusyPdf] = useState(false);
  const [error, setError] = useState("");
  const [showWhatsappModal, setShowWhatsappModal] = useState(false);

  const signaturesByRole = useMemo(() => {
    const map = {};
    for (const row of signatures) {
      map[row.signature_role] = row;
    }
    return map;
  }, [signatures]);

  const refreshAll = async () => {
    if (!intakeId || !(session?.access_token || session?.token)) return;

    try {
      setLoading(true);
      setError("");

      const [signaturesRes, validationRes] = await Promise.all([
        apiGet(`/frap-signatures/${intakeId}`, session),
        apiGet(`/frap-signatures/${intakeId}/validation`, session),
      ]);

      setSignatures(Array.isArray(signaturesRes) ? signaturesRes : []);
      setValidation(validationRes || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intakeId]);

  const openPdfPreview = async () => {
    try {
      setBusyPdf(true);
      setError("");
      const blob = await apiGetBlob(`/frap-pdf/${intakeId}/render`, session);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyPdf(false);
    }
  };

  const downloadPdf = async () => {
    try {
      setBusyPdf(true);
      setError("");
      const blob = await apiGetBlob(`/frap-pdf/${intakeId}/render`, session);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `frap_medico_legal_${intakeId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyPdf(false);
    }
  };

  const openHtmlPreview = async () => {
    try {
      setBusyPdf(true);
      setError("");
      const html = await apiGet(`/frap-pdf/${intakeId}/html`, session);
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyPdf(false);
    }
  };

  const ready = Boolean(validation?.is_ready_for_pdf);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div
        style={{
          border: "1px solid #bfdbfe",
          background: "#eff6ff",
          borderRadius: 18,
          padding: 18,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>
          Firmas y PDF médico-legal
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <span
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              fontWeight: 700,
              background: ready ? "#dcfce7" : "#fef3c7",
              color: ready ? "#166534" : "#92400e",
            }}
          >
            {ready ? "Listo para PDF" : "Pendiente de validación"}
          </span>

          {validation?.case_type ? (
            <span
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                fontWeight: 700,
                background: "#e2e8f0",
                color: "#0f172a",
              }}
            >
              Cierre: {validation.case_type}
            </span>
          ) : null}
        </div>

        {validation?.missing_signature_roles?.length ? (
          <div style={{ color: "#92400e", marginBottom: 10 }}>
            Faltan firmas: {validation.missing_signature_roles.join(", ")}
          </div>
        ) : null}

        {validation?.inconsistency ? (
          <div style={{ color: "#b91c1c", marginBottom: 10 }}>
            Inconsistencia: {validation.inconsistency}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={refreshAll} disabled={loading}>
            {loading ? "Actualizando..." : "Actualizar estado"}
          </button>

          <button type="button" onClick={openHtmlPreview} disabled={busyPdf}>
            Vista previa HTML
          </button>

          <button type="button" onClick={openPdfPreview} disabled={!ready || busyPdf}>
            Abrir PDF
          </button>

          <button type="button" onClick={downloadPdf} disabled={!ready || busyPdf}>
            Descargar PDF
          </button>
          <button
            type="button"
            onClick={() => setShowWhatsappModal(true)}
            disabled={!ready || busyPdf}
            style={{
              background: ready ? "#dcfce7" : undefined,
              borderColor: ready ? "#86efac" : undefined,
            }}
          >
            Compartir por WhatsApp
          </button>
        </div>

        <div
          style={{
            marginTop: 12,
            padding: 12,
            border: "1px dashed #bfdbfe",
            borderRadius: 12,
            background: "#ffffff",
            color: "#334155",
            fontSize: 13,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Entrega asistida por WhatsApp</div>
          <div>Prepara un mensaje en WhatsApp y adjunta manualmente el PDF descargado.</div>
        </div>

        {error ? (
          <div style={{ color: "#b91c1c", marginTop: 12, whiteSpace: "pre-wrap" }}>
            {error}
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 16,
        }}
      >
        <SignatureCard
          session={session}
          intakeId={intakeId}
          roleKey="operator"
          existingSignature={signaturesByRole.operator}
          onSaved={refreshAll}
        />

        <SignatureCard
          session={session}
          intakeId={intakeId}
          roleKey="receiver"
          existingSignature={signaturesByRole.receiver}
          onSaved={refreshAll}
        />

        <SignatureCard
          session={session}
          intakeId={intakeId}
          roleKey="patient"
          existingSignature={signaturesByRole.patient}
          onSaved={refreshAll}
        />
      </div>
      <FrapWhatsappShareModal
        open={showWhatsappModal}
        onClose={() => setShowWhatsappModal(false)}
        intakeId={intakeId}
        ready={ready}
      />
    </div>
  );
}

const inputStyle = {
  width: "100%",
  minHeight: 40,
  padding: "8px 10px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  boxSizing: "border-box",
  font: "inherit",
  background: "#fff",
};

const textareaStyle = {
  ...inputStyle,
  minHeight: 96,
  resize: "vertical",
};
