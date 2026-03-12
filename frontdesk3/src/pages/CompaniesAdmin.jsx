// src/pages/CompaniesAdmin.jsx
import React, { useEffect, useMemo, useState } from "react";
import { httpApi } from "../lib/http";
import { useAuthStore } from "../store/authStore";
import CompanySelector from "../components/CompanySelector";
import { Link } from "react-router-dom";

function normalizeListShape(res) {
  if (Array.isArray(res)) return { value: res, Count: res.length };
  if (res && Array.isArray(res.value)) return { value: res.value, Count: res.Count ?? res.value.length };
  return { value: [], Count: 0 };
}

function Input({ label, value, onChange, placeholder, type = "text", disabled = false }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>{label}</div>
      <input
        type={type}
        value={value ?? ""}
        placeholder={placeholder || ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          outline: "none",
          background: disabled ? "#f3f4f6" : "white",
        }}
      />
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

export default function CompaniesAdmin() {
  const { token, role } = useAuthStore();

  if (!token) return <div style={{ padding: 16 }}>No autenticado.</div>;

  const r = String(role || "").toUpperCase();
  const isSuper = r === "SUPERADMIN";

  if (!isSuper) {
    return <div style={{ padding: 16, color: "#b91c1c" }}>Acceso denegado (requiere SUPERADMIN).</div>;
  }

  const [busy, setBusy] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [err, setErr] = useState("");

  const [list, setList] = useState({ value: [], Count: 0 });

  // Form create (backend soporta SOLO name/code)
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  // Campos “futuros” (NO soportados por backend hoy)
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [logoBase64, setLogoBase64] = useState("");

  // Search
  const [q, setQ] = useState("");

  const canLoad = useMemo(() => !!token, [token]);

  async function load() {
    if (!canLoad) return;
    setErr("");
    setBusy(true);
    try {
      // GET /api/admin/companies
      const res = await httpApi(`/admin/companies`, {
        method: "GET",
        token,
      });
      setList(normalizeListShape(res));
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Error cargando empresas");
    } finally {
      setBusy(false);
    }
  }

  async function createCompany() {
    setErr("");

    const n = name.trim();
    const c = code.trim();

    if (!n || n.length < 2) return setErr("Falta name (mínimo 2 caracteres)");
    if (!c || c.length < 2) return setErr("Falta code (mínimo 2 caracteres)");

    // IMPORTANTE: backend CompanyCreate SOLO permite name/code
    const body = { name: n, code: c };

    setMutating(true);
    try {
      await httpApi(`/admin/companies`, {
        method: "POST",
        token,
        body,
        headers: { "Content-Type": "application/json" },
      });

      setName("");
      setCode("");

      // Limpiamos campos “futuros”
      setAddress("");
      setPhone("");
      setEmail("");
      setLogoBase64("");

      await load();
      alert("Empresa creada ✅ (name/code)");
    } catch (e) {
      console.error(e);
      const msg =
        e?.detail
          ? JSON.stringify(e.detail, null, 2)
          : e?.message || "Error creando empresa";
      setErr(msg);
    } finally {
      setMutating(false);
    }
  }

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return list.value || [];
    return (list.value || []).filter((c) => {
      const hay = [c.id, c.name, c.code].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(t);
    });
  }, [list, q]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 18 }}>SUPERADMIN · Empresas</div>
          <div style={{ marginTop: 8 }}>
            <TopNav />
          </div>
          <div style={{ marginTop: 10, color: "#6b7280", fontSize: 13 }}>
            Aquí creas tenants. Por ahora el backend solo acepta <b>name</b> y <b>code</b> en creación.
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
            {busy ? "Cargando…" : "Recargar"}
          </button>
        </div>
      </div>

      {err ? <div style={{ marginTop: 12, color: "#b91c1c", whiteSpace: "pre-wrap" }}>{err}</div> : null}

      {/* CREATE */}
      <div style={{ marginTop: 14, border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: 12, borderBottom: "1px solid #e5e7eb", background: "#f9fafb", fontWeight: 900 }}>
          Crear empresa (tenant)
        </div>

        <div style={{ padding: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Input label="name" value={name} onChange={setName} placeholder="Ambulancias Toluca" />
          <Input label="code (slug único)" value={code} onChange={setCode} placeholder="amb-toluca" />
        </div>

        {/* FUTUROS CAMPOS */}
        <div style={{ padding: 12, borderTop: "1px solid #f3f4f6", background: "#fff" }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Datos extra (pendiente backend)</div>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>
            Estos campos no se guardan porque <b>CompanyCreate</b> actualmente solo soporta <b>name</b> y <b>code</b>.
            Cuando agreguemos PATCH/UPDATE en backend, los habilitamos.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Input label="address" value={address} onChange={setAddress} placeholder="Calle, colonia, ciudad…" disabled />
            <Input label="phone" value={phone} onChange={setPhone} placeholder="722..." disabled />
            <Input label="email" value={email} onChange={setEmail} placeholder="contacto@empresa.com" disabled />
            <Input label="logo_base64" value={logoBase64} onChange={setLogoBase64} placeholder="base64..." disabled />
          </div>
        </div>

        <div style={{ padding: 12, borderTop: "1px solid #f3f4f6", display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={createCompany}
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
            {mutating ? "Guardando…" : "Crear empresa"}
          </button>
        </div>
      </div>

      {/* LIST */}
      <div style={{ marginTop: 14, border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: 12, borderBottom: "1px solid #e5e7eb", background: "#fff", fontWeight: 900 }}>
          Empresas ({filtered.length}{list.Count !== filtered.length ? ` / ${list.Count}` : ""})
        </div>

        <div style={{ padding: 12, borderBottom: "1px solid #f3f4f6" }}>
          <Input label="Buscar" value={q} onChange={setQ} placeholder="id / name / code…" />
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e5e7eb" }}>Name</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e5e7eb" }}>Code</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e5e7eb" }}>Active</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e5e7eb" }}>Created</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e5e7eb" }}>ID</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td style={{ padding: 10, borderBottom: "1px solid #f3f4f6", fontWeight: 900 }}>{c.name}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f3f4f6" }}>{c.code}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f3f4f6" }}>{c.active ? "Sí" : "No"}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f3f4f6" }}>{c.created_at || "—"}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f3f4f6", fontFamily: "monospace" }}>
                    {String(c.id).slice(0, 8)}…
                  </td>
                </tr>
              ))}

              {!filtered.length ? (
                <tr>
                  <td colSpan="5" style={{ padding: 12, color: "#6b7280" }}>
                    Sin empresas.
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