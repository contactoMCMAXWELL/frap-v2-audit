import React, { useEffect, useMemo, useState } from "react";
import { httpApi } from "../lib/http";
import { useAuthStore } from "../store/authStore";
import CompanySelector from "../components/CompanySelector";
import { Link } from "react-router-dom";
import { formatDeviceDateTime } from "../utils/datetime";

function normalizeListShape(res) {
  if (Array.isArray(res)) return { value: res, Count: res.length };
  if (res && Array.isArray(res.value)) {
    return { value: res.value, Count: res.Count ?? res.value.length };
  }
  return { value: [], Count: 0 };
}

function TopNav() {
  const role = useAuthStore((s) => s.role);
  const r = String(role || "").toUpperCase();
  const isSuper = r === "SUPERADMIN";
  const isAdmin = r === "ADMIN" || isSuper;

  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <Link to="/dispatch" style={{ fontWeight: 900 }}>
        Dispatch
      </Link>
      {isAdmin ? (
        <Link to="/admin/company/units" style={{ fontWeight: 900 }}>
          Unidades
        </Link>
      ) : null}
      {isAdmin ? (
        <Link to="/admin/company/users" style={{ fontWeight: 900 }}>
          Usuarios
        </Link>
      ) : null}
      {isSuper ? (
        <Link to="/admin/companies" style={{ fontWeight: 900 }}>
          Empresas
        </Link>
      ) : null}
    </div>
  );
}

function Input({ label, value, onChange, placeholder }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
        {label}
      </div>
      <input
        value={value ?? ""}
        placeholder={placeholder || ""}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          outline: "none",
          background: "white",
          boxSizing: "border-box",
        }}
      />
    </label>
  );
}

export default function UnitsAdmin() {
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.role);
  const companyId = useAuthStore((s) => s.companyId);
  const companyName = useAuthStore((s) => s.companyName);
  const companyCode = useAuthStore((s) => s.companyCode);

  if (!token) return <div style={{ padding: 16 }}>No autenticado.</div>;

  const r = String(role || "").toUpperCase();
  const isSuper = r === "SUPERADMIN";
  const isAdmin = r === "ADMIN" || isSuper;

  if (!isAdmin) {
    return (
      <div style={{ padding: 16, color: "#b91c1c" }}>
        Acceso denegado (requiere ADMIN o SUPERADMIN).
      </div>
    );
  }

  const [busy, setBusy] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");

  const [list, setList] = useState({ value: [], Count: 0 });

  const [form, setForm] = useState({
    code: "",
    plate: "",
    type: "",
    active: true,
  });

  async function load() {
    if (!companyId) return;

    setErr("");
    setBusy(true);
    try {
      const res = await httpApi("/units/", {
        method: "GET",
        token,
        companyId,
      });
      setList(normalizeListShape(res));
    } catch (e) {
      setErr(
        e?.body ? JSON.stringify(e.body, null, 2) : e?.message || "Error cargando unidades"
      );
    } finally {
      setBusy(false);
    }
  }

  async function createUnit() {
    if (!companyId) return setErr("No hay empresa activa seleccionada");
    if (!form.code.trim()) return setErr("Falta clave de unidad");

    setErr("");
    setMutating(true);

    try {
      await httpApi("/units/", {
        method: "POST",
        token,
        companyId,
        body: {
          code: form.code.trim(),
          plate: form.plate.trim(),
          type: form.type.trim(),
          active: !!form.active,
        },
      });

      setForm({
        code: "",
        plate: "",
        type: "",
        active: true,
      });

      await load();
    } catch (e) {
      setErr(
        e?.body ? JSON.stringify(e.body, null, 2) : e?.message || "Error creando unidad"
      );
    } finally {
      setMutating(false);
    }
  }

  useEffect(() => {
    load();
  }, [companyId]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return list.value || [];
    return (list.value || []).filter((u) => {
      const hay = [u.id, u.code, u.plate, u.type]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(t);
    });
  }, [list, q]);

  return (
    <div style={{ padding: 16, maxWidth: 1180, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontWeight: 900, fontSize: 18 }}>
            Administración · Unidades
          </div>
          <div style={{ marginTop: 8 }}>
            <TopNav />
          </div>
          <div style={{ marginTop: 10, color: "#6b7280", fontSize: 13 }}>
            Unidades de la empresa activa.
          </div>
          <div style={{ marginTop: 6, color: "#374151", fontSize: 13 }}>
            Empresa:{" "}
            {companyName
              ? `${companyName}${companyCode ? ` (${companyCode})` : ""}`
              : companyId || "sin contexto"}
          </div>
        </div>

        <div style={{ display: "grid", gap: 10, justifyItems: "end" }}>
          {isSuper ? <CompanySelector /> : null}

          <button
            onClick={load}
            disabled={busy || mutating}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #d1d5db",
              cursor: busy || mutating ? "not-allowed" : "pointer",
              background: busy || mutating ? "#f3f4f6" : "white",
              fontWeight: 800,
              width: 160,
            }}
          >
            {busy ? "Cargando…" : "Recargar"}
          </button>
        </div>
      </div>

      {err ? (
        <div
          style={{
            marginTop: 12,
            color: "#b91c1c",
            whiteSpace: "pre-wrap",
          }}
        >
          {err}
        </div>
      ) : null}

      <div
        style={{
          marginTop: 14,
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: 12,
            borderBottom: "1px solid #e5e7eb",
            background: "#f9fafb",
            fontWeight: 900,
          }}
        >
          Crear unidad
        </div>

        <div style={{ padding: 12, display: "grid", gap: 12, maxWidth: 640 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Input
              label="Clave de unidad"
              value={form.code}
              onChange={(v) => setForm((p) => ({ ...p, code: v }))}
              placeholder="U-01 / A-12 / MX-AMB-03"
            />
            <Input
              label="Placas"
              value={form.plate}
              onChange={(v) => setForm((p) => ({ ...p, plate: v }))}
              placeholder="ABC-123-X"
            />
          </div>

          <Input
            label="Tipo"
            value={form.type}
            onChange={(v) => setForm((p) => ({ ...p, type: v }))}
            placeholder="BLS / ALS / TRASLADO / RESCATE"
          />

          <label
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              fontWeight: 800,
            }}
          >
            <input
              type="checkbox"
              checked={!!form.active}
              onChange={(e) =>
                setForm((p) => ({ ...p, active: e.target.checked }))
              }
            />
            Unidad activa
          </label>
        </div>

        <div
          style={{
            padding: 12,
            borderTop: "1px solid #f3f4f6",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={createUnit}
            disabled={mutating}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #111827",
              background: mutating ? "#f3f4f6" : "#111827",
              color: mutating ? "#111827" : "#fff",
              fontWeight: 900,
              cursor: mutating ? "not-allowed" : "pointer",
              width: 180,
            }}
          >
            {mutating ? "Guardando…" : "Crear unidad"}
          </button>
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: 12,
            borderBottom: "1px solid #e5e7eb",
            background: "#fff",
            fontWeight: 900,
          }}
        >
          Unidades ({filtered.length}
          {list.Count !== filtered.length ? ` / ${list.Count}` : ""})
        </div>

        <div style={{ padding: 12, borderBottom: "1px solid #f3f4f6" }}>
          <Input
            label="Buscar"
            value={q}
            onChange={setQ}
            placeholder="id / código / placas / tipo…"
          />
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={th}>Código</th>
                <th style={th}>Placas</th>
                <th style={th}>Tipo</th>
                <th style={th}>Activo</th>
                <th style={th}>Creado</th>
                <th style={th}>ID</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td style={{ ...td, fontWeight: 900 }}>
                    {u.code || u.unit_code || ""}
                  </td>
                  <td style={td}>{u.plate || ""}</td>
                  <td style={td}>{u.type || ""}</td>
                  <td style={td}>{u.active ? "Sí" : "No"}</td>
                  <td style={td}>{formatDeviceDateTime(u.created_at)}</td>
                  <td style={{ ...td, fontFamily: "monospace" }}>
                    {String(u.id).slice(0, 8)}…
                  </td>
                </tr>
              ))}

              {!filtered.length ? (
                <tr>
                  <td colSpan="6" style={{ padding: 12, color: "#6b7280" }}>
                    Sin unidades.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const th = {
  textAlign: "left",
  padding: 10,
  borderBottom: "1px solid #e5e7eb",
};

const td = {
  padding: 10,
  borderBottom: "1px solid #f3f4f6",
};