// src/pages/UsersAdmin.jsx
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

export default function UsersAdmin() {
  const { token, companyId, companyName, companyCode, userId, role } = useAuthStore();

  if (!token) return <div style={{ padding: 16 }}>No autenticado.</div>;

  const r = String(role || "").toUpperCase();
  const isSuper = r === "SUPERADMIN";
  const isAdmin = r === "ADMIN" || isSuper;

  if (!isAdmin) {
    return <div style={{ padding: 16, color: "#b91c1c" }}>Acceso denegado (requiere ADMIN o SUPERADMIN).</div>;
  }

  // ✅ Roles disponibles en UI (incluye DOCTOR y AUDITOR)
  // Nota: SUPERADMIN normalmente NO se crea desde aquí (es cuenta plataforma).
  const ROLE_OPTIONS = useMemo(() => ([
    { value: "ADMIN", label: "ADMIN" },
    { value: "DISPATCH", label: "DISPATCH" },
    { value: "PARAMEDIC", label: "PARAMEDIC" },
    { value: "UNIT", label: "UNIT" },
    { value: "DOCTOR", label: "DOCTOR" },
    { value: "AUDITOR", label: "AUDITOR" },
  ]), []);

  // SUPERADMIN debe elegir empresa antes de operar
  if (isSuper && !companyId) {
    return (
      <div style={{ padding: 16, maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>Admin · Usuarios</div>
        <div style={{ marginTop: 10 }}>
          <TopNav />
        </div>
        <div style={{ marginTop: 16 }}>
          <CompanySelector />
        </div>
        <div style={{ marginTop: 10, color: "#6b7280" }}>
          Selecciona una empresa para administrar sus usuarios.
        </div>
      </div>
    );
  }

  const [busy, setBusy] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [err, setErr] = useState("");

  const [list, setList] = useState({ value: [], Count: 0 });

  // Form create
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleNew, setRoleNew] = useState("ADMIN");
  const [name, setName] = useState("");
  const [active, setActive] = useState(true);

  // Filters
  const [q, setQ] = useState("");

  const canLoad = useMemo(() => !!token && !!companyId, [token, companyId]);

  async function load() {
    if (!canLoad) return;
    setErr("");
    setBusy(true);
    try {
      const res = await httpApi(`/admin/users?company_id=${encodeURIComponent(companyId)}`, {
        method: "GET",
        token,
        companyId: companyId || undefined,
        userId: userId || undefined,
      });
      setList(normalizeListShape(res));
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Error cargando usuarios");
    } finally {
      setBusy(false);
    }
  }

  async function createUser() {
    setErr("");

    const e = email.trim().toLowerCase();
    const p = password;
    const n = name.trim();

    if (!companyId) return setErr("Falta companyId (selecciona empresa)");
    if (!e) return setErr("Falta email");
    if (!p || p.length < 6) return setErr("Falta password (mínimo 6 chars)");
    if (!roleNew) return setErr("Falta role");
    if (!n) return setErr("Falta name");

    // defensa extra: asegurar que el role existe en la lista
    const roleUpper = String(roleNew || "").toUpperCase();
    const allowed = new Set(ROLE_OPTIONS.map((x) => x.value));
    if (!allowed.has(roleUpper)) return setErr(`Role inválido: ${roleUpper}`);

    setMutating(true);
    try {
      // ✅ compat: back suele exigir company_id en body cuando es SUPERADMIN
      const body = {
        email: e,
        password: p,
        role: roleUpper,
        name: n,
        active: !!active,
        company_id: companyId,
      };

      await httpApi(`/admin/users`, {
        method: "POST",
        token,
        companyId: companyId || undefined,
        userId: userId || undefined,
        body,
      });

      setEmail("");
      setPassword("");
      setRoleNew("ADMIN");
      setName("");
      setActive(true);

      await load();
      alert("Usuario creado ✅");
    } catch (e2) {
      console.error(e2);
      const msg =
        e2?.detail
          ? JSON.stringify(e2.detail, null, 2)
          : e2?.message || "Error creando usuario";
      setErr(msg);
    } finally {
      setMutating(false);
    }
  }

  async function toggleActive(u) {
    setErr("");
    setMutating(true);
    try {
      await httpApi(`/admin/users/${encodeURIComponent(u.id)}`, {
        method: "PATCH",
        token,
        companyId: companyId || undefined,
        userId: userId || undefined,
        body: { active: !u.active },
      });
      await load();
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Error actualizando usuario");
    } finally {
      setMutating(false);
    }
  }

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return list.value || [];
    return (list.value || []).filter((u) => {
      const hay = [u.email, u.name, u.role, u.id].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(t);
    });
  }, [list, q]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, companyId, userId]);

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 18 }}>Admin · Usuarios</div>
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
          Crear usuario (empresa activa)
        </div>

        <div style={{ padding: 12, display: "grid", gridTemplateColumns: "1fr 1fr 180px 1fr 120px", gap: 10 }}>
          <Input label="email" value={email} onChange={setEmail} placeholder="admin.empdemo2@example.com" />
          <Input label="password" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
          <Select
            label="role"
            value={roleNew}
            onChange={setRoleNew}
            options={ROLE_OPTIONS}
          />
          <Input label="name" value={name} onChange={setName} placeholder="Adm Emp Demo2" />

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>active</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", height: 42 }}>
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
              <span style={{ fontSize: 13, fontWeight: 800 }}>{active ? "Sí" : "No"}</span>
            </div>
          </label>
        </div>

        <div style={{ padding: 12, borderTop: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <Input label="Buscar" value={q} onChange={setQ} placeholder="email / nombre / role / id…" />
          <button
            onClick={createUser}
            disabled={mutating}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #111827",
              background: mutating ? "#f3f4f6" : "#111827",
              color: mutating ? "#111827" : "#fff",
              fontWeight: 900,
              cursor: mutating ? "not-allowed" : "pointer",
              width: 160,
              height: 44,
              alignSelf: "end",
            }}
          >
            {mutating ? "Guardando…" : "Crear"}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 14, border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: 12, borderBottom: "1px solid #e5e7eb", background: "#fff", fontWeight: 900 }}>
          Usuarios ({filtered.length}{list.Count !== filtered.length ? ` / ${list.Count}` : ""})
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e5e7eb" }}>Email</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e5e7eb" }}>Name</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e5e7eb" }}>Role</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e5e7eb" }}>Active</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e5e7eb" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td style={{ padding: 10, borderBottom: "1px solid #f3f4f6", fontWeight: 900 }}>{u.email}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f3f4f6" }}>{u.name || "—"}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f3f4f6" }}>{u.role}</td>
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

              {!filtered.length ? (
                <tr>
                  <td colSpan="5" style={{ padding: 12, color: "#6b7280" }}>
                    Sin usuarios.
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