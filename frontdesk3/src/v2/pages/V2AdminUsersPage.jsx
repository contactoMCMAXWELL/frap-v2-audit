import React, { useEffect, useMemo, useState } from "react";
import { v2AdminApi } from "../api/admin";
import { useAuthStore } from "../../store/authStore";
import CompanySelector from "../../components/CompanySelector";

const card = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 16,
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  outline: "none",
  boxSizing: "border-box",
  background: "#fff",
};

const fieldStyle = {
  display: "grid",
  gap: 6,
};

const labelText = {
  fontSize: 14,
  fontWeight: 700,
  color: "#111827",
};

export default function V2AdminUsersPage({ session }) {
  const role = useAuthStore((s) => s.role);
  const companyName = useAuthStore((s) => s.companyName);
  const companyCode = useAuthStore((s) => s.companyCode);
  const r = String(role || "").toUpperCase();
  const isSuper = r === "SUPERADMIN";

  const [items, setItems] = useState([]);
  const [roleOptions, setRoleOptions] = useState([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [patchingId, setPatchingId] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    role: "PARAMEDIC",
    active: true,
  });

  if (isSuper && !session?.companyId) {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 18 }}>Usuarios</div>
        <CompanySelector />
        <div style={{ color: "#6b7280" }}>
          Selecciona una empresa para crear y administrar sus usuarios.
        </div>
      </div>
    );
  }

  async function load() {
    setBusy(true);
    setError("");
    try {
      const [usersData, rolesData] = await Promise.all([
        v2AdminApi.usersList({
          token: session?.token,
          companyId: session?.companyId,
          userId: session?.userId,
        }),
        v2AdminApi.rolesList({
          token: session?.token,
          companyId: session?.companyId,
          userId: session?.userId,
        }),
      ]);

      const roles = Array.isArray(rolesData) ? rolesData : [];
      setItems(Array.isArray(usersData) ? usersData : []);
      setRoleOptions(roles);

      if (roles.length && !roles.includes(form.role)) {
        setForm((prev) => ({ ...prev, role: roles[0] }));
      }
    } catch (e) {
      setError(e?.body?.detail || e?.message || "No se pudieron cargar usuarios");
    } finally {
      setBusy(false);
    }
  }

  async function createItem() {
    if (!form.email.trim()) return setError("Falta email");
    if (!form.password.trim()) return setError("Falta password");
    if (!form.name.trim()) return setError("Falta nombre");
    if (!form.role.trim()) return setError("Falta rol");

    setSaving(true);
    setError("");
    try {
      await v2AdminApi.usersCreate({
        payload: {
          email: form.email.trim().toLowerCase(),
          password: form.password,
          name: form.name.trim(),
          role: form.role,
          active: !!form.active,
          ...(isSuper && session?.companyId ? { company_id: session.companyId } : {}),
        },
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
      });

      setForm({
        email: "",
        password: "",
        name: "",
        role: roleOptions[0] || "PARAMEDIC",
        active: true,
      });

      await load();
    } catch (e) {
      setError(e?.body?.detail || e?.message || "No se pudo crear usuario");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(row) {
    setPatchingId(row.id);
    setError("");
    try {
      await v2AdminApi.usersPatch({
        userIdTarget: row.id,
        payload: { active: !row.active },
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
      });
      await load();
    } catch (e) {
      setError(e?.body?.detail || e?.message || "No se pudo actualizar usuario");
    } finally {
      setPatchingId("");
    }
  }

  useEffect(() => {
    load();
  }, [session?.companyId]);

  const rows = useMemo(() => (Array.isArray(items) ? items : []), [items]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gap: 10 }}>
        <div>
          <h2 style={{ margin: "0 0 6px 0" }}>Usuarios</h2>
          <div style={{ color: "#6b7280" }}>
            Todos los usuarios pertenecen a una sola empresa.
          </div>
        </div>

        {isSuper ? <CompanySelector /> : null}

        {isSuper && session?.companyName ? (
          <div style={{ color: "#111827", fontWeight: 700 }}>
            Empresa activa para usuarios: {session.companyName}
            {session?.companyCode ? ` (${session.companyCode})` : ""}
          </div>
        ) : null}
      </div>

      {error ? (
        <div style={{ color: "#b91c1c", whiteSpace: "pre-wrap" }}>{error}</div>
      ) : null}

      <div style={card}>
        <div style={{ fontWeight: 800, marginBottom: 12 }}>Crear usuario</div>

        <div style={{ display: "grid", gap: 10, maxWidth: 560 }}>
          <div style={fieldStyle}>
            <div style={labelText}>Nombre</div>
            <input
              style={inputStyle}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div style={fieldStyle}>
            <div style={labelText}>Email</div>
            <input
              style={inputStyle}
              value={form.email}
              onChange={(e) =>
                setForm({ ...form, email: e.target.value.toLowerCase() })
              }
            />
          </div>

          <div style={fieldStyle}>
            <div style={labelText}>Password</div>
            <input
              style={inputStyle}
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          <div style={fieldStyle}>
            <div style={labelText}>Rol</div>
            <select
              style={inputStyle}
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              {roleOptions.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>

          <label
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              fontWeight: 700,
              marginTop: 4,
            }}
          >
            <input
              type="checkbox"
              checked={!!form.active}
              onChange={(e) =>
                setForm({ ...form, active: e.target.checked })
              }
            />
            Usuario activo
          </label>

          <button
            onClick={createItem}
            disabled={saving}
            style={{
              borderRadius: 10,
              border: "1px solid #111827",
              background: saving ? "#e5e7eb" : "#111827",
              color: "#fff",
              fontWeight: 800,
              cursor: saving ? "not-allowed" : "pointer",
              padding: "10px 14px",
              width: 180,
            }}
          >
            {saving ? "Guardando..." : "Crear usuario"}
          </button>
        </div>
      </div>

      <div style={card}>
        <div style={{ fontWeight: 800, marginBottom: 12 }}>
          Usuarios registrados ({rows.length})
        </div>

        {busy ? (
          <div>Cargando...</div>
        ) : !rows.length ? (
          <div style={{ color: "#6b7280" }}>No hay usuarios registrados.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  <th style={th}>Email</th>
                  <th style={th}>Nombre</th>
                  <th style={th}>Rol</th>
                  <th style={th}>Activo</th>
                  <th style={th}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td style={td}>{row.email}</td>
                    <td style={td}>{row.name || ""}</td>
                    <td style={td}>{row.role || ""}</td>
                    <td style={td}>{row.active ? "Sí" : "No"}</td>
                    <td style={td}>
                      <button
                        onClick={() => toggleActive(row)}
                        disabled={patchingId === row.id}
                        style={{
                          borderRadius: 8,
                          border: "1px solid #d1d5db",
                          background: "#fff",
                          padding: "8px 10px",
                          cursor:
                            patchingId === row.id ? "not-allowed" : "pointer",
                          fontWeight: 700,
                        }}
                      >
                        {patchingId === row.id
                          ? "Actualizando..."
                          : row.active
                          ? "Desactivar"
                          : "Activar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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