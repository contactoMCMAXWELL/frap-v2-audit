import React, { useEffect, useMemo, useState } from "react";

const RECIPIENT_OPTIONS = [
  { value: "paciente", label: "Paciente" },
  { value: "familiar", label: "Familiar" },
  { value: "hospital", label: "Hospital" },
  { value: "empresa", label: "Empresa" },
  { value: "aseguradora", label: "Aseguradora" },
];

function normalizePhone(value) {
  const digits = String(value || "").replace(/\D+/g, "");
  if (!digits) return "";
  if (digits.startsWith("52") && digits.length >= 12) return digits;
  if (digits.length === 10) return `52${digits}`;
  return digits;
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "readonly");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

export default function FrapWhatsappShareModal({ open, onClose, intakeId, ready }) {
  const [recipientName, setRecipientName] = useState("");
  const [recipientType, setRecipientType] = useState("familiar");
  const [phone, setPhone] = useState("");
  const [includePrivacy, setIncludePrivacy] = useState(true);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!open) setFeedback("");
  }, [open]);

  const normalizedPhone = useMemo(() => normalizePhone(phone), [phone]);

  const message = useMemo(() => {
    const who = recipientName?.trim() ? ` a ${recipientName.trim()}` : "";
    const recipientLabel = RECIPIENT_OPTIONS.find((x) => x.value === recipientType)?.label || recipientType;
    const intro = `Se comparte${who} el PDF del registro prehospitalario correspondiente al folio ${intakeId}.`;
    const typeLine = `Destinatario: ${recipientLabel}.`;
    const privacy = includePrivacy
      ? "Documento de uso informativo, operativo y administrativo. Contiene datos sensibles y debe tratarse de forma confidencial."
      : "Documento de uso informativo, operativo y administrativo.";
    const attach = "Adjuntar manualmente el archivo PDF descargado desde el sistema.";
    return [intro, typeLine, privacy, attach].join("\n");
  }, [recipientName, recipientType, includePrivacy, intakeId]);

  if (!open) return null;

  const canSend = Boolean(ready && normalizedPhone && intakeId);

  const handleCopy = async () => {
    try {
      await copyText(message);
      setFeedback("Mensaje copiado.");
    } catch {
      setFeedback("No se pudo copiar el mensaje.");
    }
  };

  const handleOpenWhatsapp = () => {
    if (!canSend) {
      setFeedback("Captura un teléfono válido para abrir WhatsApp.");
      return;
    }
    const url = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setFeedback("WhatsApp abierto en una nueva pestaña.");
  };

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true">
      <div style={modalStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>Compartir por WhatsApp</div>
            <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>
              Prepara el mensaje y adjunta manualmente el PDF descargado.
            </div>
          </div>
          <button type="button" onClick={onClose}>Cerrar</button>
        </div>

        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          <label>
            <div style={labelStyle}>Destinatario</div>
            <input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} style={inputStyle} placeholder="Nombre opcional" />
          </label>

          <label>
            <div style={labelStyle}>Tipo de destinatario</div>
            <select value={recipientType} onChange={(e) => setRecipientType(e.target.value)} style={inputStyle}>
              {RECIPIENT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label>
            <div style={labelStyle}>Teléfono WhatsApp</div>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} placeholder="Ej. 7221234567" />
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
              Se normaliza a formato México con prefijo 52 cuando capturas 10 dígitos.
            </div>
          </label>

          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={includePrivacy} onChange={(e) => setIncludePrivacy(e.target.checked)} />
            <span>Incluir aviso de confidencialidad</span>
          </label>

          <label>
            <div style={labelStyle}>Mensaje</div>
            <textarea value={message} readOnly rows={7} style={{ ...inputStyle, minHeight: 150, resize: "vertical" }} />
          </label>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" onClick={handleCopy}>Copiar mensaje</button>
            <button type="button" onClick={handleOpenWhatsapp} disabled={!canSend}>Abrir WhatsApp</button>
            <button type="button" onClick={onClose}>Cancelar</button>
          </div>

          {feedback ? <div style={{ fontSize: 13, color: "#166534" }}>{feedback}</div> : null}
        </div>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.42)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  zIndex: 2000,
};

const modalStyle = {
  width: "100%",
  maxWidth: 640,
  background: "#fff",
  borderRadius: 16,
  padding: 18,
  boxShadow: "0 20px 60px rgba(15, 23, 42, 0.25)",
};

const labelStyle = {
  fontSize: 13,
  fontWeight: 700,
  marginBottom: 4,
};

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
