// src/pages/UnitsAdmin.jsx
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { httpApi } from "../lib/http";
import { useAuthStore } from "../store/authStore";
import CompanySelector from "../components/CompanySelector";
import { Link } from "react-router-dom";

function normalizeListShape(res) {
  if (Array.isArray(res)) return { value: res, Count: res.length };
  if (res && Array.isArray(res.value)) return { value: res.value, Count: res.Count ?? res.value.length };
  return { value: [], Count: 0 };
}

function Input({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>{label}</div>
      <input
        type={type}
        value={value ?? ""}
        placeholder={placeholder || ""}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          outline: "none",
        }}
      />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>{label}</div>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid #e5e7eb",
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

function TopNav() {
  const role = useAuthStore((s) => s.role);
  const r = String(role || "").toUpperCase();
  const isSuper = r === "SUPERADMIN";
  const isAdmin = r === "ADMIN" || isSuper;

  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <Link to="/dispatch" style={{ fontWeight: 900 }}>Dispatch</Link>
      {isAdmin ? <Link to="/admin/company/units" style={{ fontWeight: 900 }}>Unidades</Link> : null}
      {isAdmin ? <Link to="/admin/company/users" style={{ fontWeight: 900 }}>Usuarios</Link> : null}
      {isSuper ? <Link to="/admin/companies" style={{ fontWeight: 900 }}>Empresas</Link> : null}
    </div>
  );
}

export default function UnitsAdmin() {
  const { token, companyId, companyName, companyCode, userId, role } = useAuthStore();

  if (!token) return <div style={{ padding: 16 }}>No autenticado.</div>;

  const r = String(role || "").toUpperCase();
  const isSuper = r === "SUPERADMIN";
  const isAdmin = r === "ADMIN" || isSuper;

  if (!isAdmin) {
    return <div style={{ padding: 16, color: "#b91c1c" }}>Acceso denegado (requiere ADMIN o SUPERADMIN).</div>;
  }

  // SUPERADMIN debe elegir empresa activa antes de operar
  if (isSuper && !companyId) {
    return (
      <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>Admin · Unidades</div>
        <div style={{ marginTop: 10 }}>
          <TopNav />
        </div>
        <div style={{ marginTop: 16 }}>
          <CompanySelector />
        </div>
        <div style={{ marginTop: 10, color: "#6b7280" }}>
          Selecciona una empresa para administrar sus unidades.
        </div>
      </div>
    );
  }

  const [busy, setBusy] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [err, setErr] = useState("");

  const [list, setList] = useState({ value: [], Count: 0 });

  const [code, setCode] = useState("");
  const [plate, setPlate] = useState("");
  const [type, setType] = useState("C");
  const [active, setActive] = useState(true);

  const canLoad = useMemo(() => !!token && !!companyId, [token, companyId]);

  async function load() {
    if (!canLoad) return;
    setErr("");
    setBusy(true);
    try {
      const res = await httpApi("/units/", {
        method: "GET",
        token,
        companyId: companyId || undefined,
        userId: userId || undefined,
      });
      setList(normalizeListShape(res));
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Error cargando unidades");
    } finally {
      setBusy(false);
    }
  }

  async function createUnit() {
    setErr("");

    const c = code.trim();
    const p = plate.trim();
    if (!c) return setErr("Falta code");
    if (!p) return setErr("Falta plate");
    if (!type) return setErr("Falta type");

    setMutating(true);
    try {
      await httpApi("/units/", {
        method: "POST",
        token,
        companyId: companyId || undefined,
        userId: userId || undefined,
        body: { code: c, plate: p, type, active: !!active },
      });

      setCode("");
      setPlate("");
      setType("C");
      setActive(true);

      await load();
      // eslint-disable-next-line no-alert
      alert("Unidad creada ✅");
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Error creando unidad");
    } finally {
      setMutating(false);
    }
  }

  async function toggleActive(unit) {
    setErr("");
    setMutating(true);
    try {
      await httpApi(`/units/${unit.id}`, {
        method: "PATCH",
        token,
        companyId: companyId || undefined,
        userId: userId || undefined,
        body: { active: !unit.active },
      });
      await load();
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Error actualizando unidad");
    } finally {
      setMutating(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, companyId, userId]);

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 18 }}>Admin · Unidades</div>
          <div style={{ marginTop: 8 }}>
            <TopNav />
          </div>
          <div style={{ marginTop: 10, color: "#6b7280", fontSize: 13 }}>
            Empresa activa: {companyName ? `${companyName} (${companyCode || ""})` : companyId}
          </div>
        </div>

        <div style={{ display: "grid", gap: 10, justifyItems: "end" }}>
          <CompanySelector />

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
            {busy ? "Cargando…" : "Refrescar"}
          </button>
        </div>
      </div>

      {err ? <div style={{ marginTop: 12, color: "#b91c1c", whiteSpace: "pre-wrap" }}>{err}</div> : null}

      <div style={{ marginTop: 14, border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: 12, borderBottom: "1px solid #e5e7eb", background: "#f9fafb", fontWeight: 900 }}>
          Crear unidad (empresa activa)
        </div>

        <div style={{ padding: 12, display: "grid", gridTemplateColumns: "1fr 1fr 200px 120px", gap: 10 }}>
          <Input label="code" value={code} onChange={setCode} placeholder="TOL-AMB-01" />
          <Input label="plate" value={plate} onChange={setPlate} placeholder="ABC1234" />

          <Select
            label="type"
            value={type}
            onChange={setType}
            options={[
              { value: "B", label: "B" },
              { value: "C", label: "C" },
            ]}
          />

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>active</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", height: 42 }}>
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
              <span style={{ fontSize: 13, fontWeight: 800 }}>{active ? "Sí" : "No"}</span>
            </div>
          </label>
        </div>

        <div style={{ padding: 12, borderTop: "1px solid #f3f4f6", display: "flex", justifyContent: "flex-end" }}>
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
            }}
          >
            {mutating ? "Guardando…" : "Crear"}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 14, border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: 12, borderBottom: "1px solid #e5e7eb", background: "#fff", fontWeight: 900 }}>
          Unidades ({list.Count})
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e5e7eb" }}>Code</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e5e7eb" }}>Plate</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e5e7eb" }}>Type</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e5e7eb" }}>Active</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e5e7eb" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(list.value || []).map((u) => (
                <tr key={u.id}>
                  <td style={{ padding: 10, borderBottom: "1px solid #f3f4f6", fontWeight: 900 }}>{u.code}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f3f4f6" }}>{u.plate}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f3f4f6" }}>{u.type}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f3f4f6" }}>{u.active ? "Sí" : "No"}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f3f4f6" }}>
                    <button
                      onClick={() => toggleActive(u)}
                      disabled={mutating}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 12,
                        border: "1px solid #d1d5db",
                        background: "white",
                        fontWeight: 900,
                        cursor: mutating ? "not-allowed" : "pointer",
                        opacity: mutating ? 0.6 : 1,
                      }}
                    >
                      {u.active ? "Desactivar" : "Activar"}
                    </button>
                  </td>
                </tr>
              ))}
              {!list.value?.length ? (
                <tr>
                  <td colSpan="5" style={{ padding: 12, color: "#6b7280" }}>
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