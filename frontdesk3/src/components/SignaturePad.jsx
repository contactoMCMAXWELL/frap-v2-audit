import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * SignaturePad (no deps)
 * - Mouse + Touch + Pen (Pointer events)
 * - White background, black ink
 * - Exports PNG dataURL via onSave(dataUrl)
 */
export default function SignaturePad({
  height = 180,
  width = 520,
  disabled = false,
  initialDataUrl = "",
  onSave,
  onChange,
}) {
  const canvasRef = useRef(null);
  const [dirty, setDirty] = useState(false);
  const [isDown, setIsDown] = useState(false);

  const size = useMemo(() => ({ width, height }), [width, height]);

  function ctx2d() {
    const c = canvasRef.current;
    if (!c) return null;
    const ctx = c.getContext("2d");
    return ctx;
  }

  function paintWhite() {
    const c = canvasRef.current;
    const ctx = ctx2d();
    if (!c || !ctx) return;
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.restore();
  }

  function setupInk() {
    const ctx = ctx2d();
    if (!ctx) return;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2.2;
  }

  function drawInitial(dataUrl) {
    const c = canvasRef.current;
    const ctx = ctx2d();
    if (!c || !ctx) return;
    paintWhite();
    setupInk();
    if (!dataUrl) return;

    const img = new Image();
    img.onload = () => {
      // Fit image into canvas preserving aspect ratio
      const iw = img.width || 1;
      const ih = img.height || 1;
      const cw = c.width;
      const ch = c.height;
      const scale = Math.min(cw / iw, ch / ih);
      const w = iw * scale;
      const h = ih * scale;
      const x = (cw - w) / 2;
      const y = (ch - h) / 2;
      ctx.drawImage(img, x, y, w, h);
    };
    img.src = dataUrl;
  }

  useEffect(() => {
    drawInitial(initialDataUrl || "");
    setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDataUrl, size.width, size.height]);

  function getPos(e) {
    const c = canvasRef.current;
    if (!c) return { x: 0, y: 0 };
    const rect = c.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches?.[0]?.clientX ?? 0);
    const clientY = e.clientY ?? (e.touches?.[0]?.clientY ?? 0);
    // handle CSS scaling
    const sx = c.width / rect.width;
    const sy = c.height / rect.height;
    return {
      x: (clientX - rect.left) * sx,
      y: (clientY - rect.top) * sy,
    };
  }

  function beginStroke(e) {
    if (disabled) return;
    const c = canvasRef.current;
    const ctx = ctx2d();
    if (!c || !ctx) return;

    // capture pointer so we keep receiving events
    try {
      if (e.pointerId != null) c.setPointerCapture(e.pointerId);
    } catch {}

    setupInk();
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDown(true);
    setDirty(true);
    onChange?.(true);
  }

  function moveStroke(e) {
    if (disabled || !isDown) return;
    const ctx = ctx2d();
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function endStroke() {
    if (!isDown) return;
    setIsDown(false);
  }

  function clear() {
    if (disabled) return;
    paintWhite();
    setupInk();
    setDirty(false);
    onChange?.(false);
  }

  function save() {
    if (disabled) return;
    if (!dirty) return;
    const c = canvasRef.current;
    if (!c) return;
    const dataUrl = c.toDataURL("image/png");
    onSave?.(dataUrl);
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff", overflow: "hidden" }}>
        <canvas
          ref={canvasRef}
          width={size.width}
          height={size.height}
          style={{
            width: "100%",
            height: size.height,
            display: "block",
            touchAction: "none",
            cursor: disabled ? "not-allowed" : "crosshair",
          }}
          onPointerDown={beginStroke}
          onPointerMove={moveStroke}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          onPointerLeave={endStroke}
        />
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={clear}
          disabled={disabled}
          style={{
            padding: "8px 10px",
            borderRadius: 12,
            border: "1px solid #d1d5db",
            background: disabled ? "#f3f4f6" : "white",
            fontWeight: 900,
            cursor: disabled ? "not-allowed" : "pointer",
          }}
        >
          Limpiar
        </button>

        <button
          type="button"
          onClick={save}
          disabled={disabled || !dirty}
          style={{
            padding: "8px 10px",
            borderRadius: 12,
            border: "1px solid #111827",
            background: disabled || !dirty ? "#f3f4f6" : "#111827",
            color: disabled || !dirty ? "#111827" : "#fff",
            fontWeight: 900,
            cursor: disabled || !dirty ? "not-allowed" : "pointer",
          }}
        >
          Guardar firma
        </button>

        <div style={{ fontSize: 12, color: "#6b7280", alignSelf: "center" }}>
          {disabled ? "Deshabilitado" : dirty ? "Listo para guardar" : "Firma aquí"}
        </div>
      </div>
    </div>
  );
}
