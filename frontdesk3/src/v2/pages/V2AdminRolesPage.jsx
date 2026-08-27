import React, { useEffect, useMemo, useState } from "react";
import { v2AdminApi } from "../api/admin";

const card = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 16,
};

const tableWrap = {
  overflowX: "auto",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
};

const thStyle = {
  textAlign: "left",
  padding: "10px 12px",
  borderBottom: "1px solid #e5e7eb",
  background: "#f9fafb",
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "10px 12px",
  borderBottom: "1px solid #e5e7eb",
  verticalAlign: "top",
};

function Mark({ ok }) {
  return (
    <span
      style={{
        display: "inline-block",
        minWidth: 18,
        textAlign: "center",
        fontWeight: 900,
        color: ok ? "#065f46" : "#991b1b",
      }}
    >
      {ok ? "✓" : "—"}
    </span>
  );
}

export default function V2AdminRolesPage({ session }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [matrix, setMatrix] = useState(null);

  async function load() {
    setBusy(true);
    setError("");
    try {
      const data = await v2AdminApi.rolesMatrix({
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
      });
      setMatrix(data || null);
    } catch (e) {
      setError(e?.body?.detail || e?.message || "No se pudieron cargar roles");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, [session?.companyId]);

  const roles = useMemo(() => matrix?.roles || [], [matrix]);
  const permissions = useMemo(() => matrix?.permissions || [], [matrix]);
  const labels = useMemo(() => matrix?.role_labels || {}, [matrix]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div>
        <h2 style={{ margin: "0 0 6px 0" }}>Roles y permisos</h2>
        <div style={{ color: "#6b7280" }}>
          Matriz fija de permisos operativos y médico-legales.
        </div>
      </div>

      {error ? <div style={{ color: "#b91c1c" }}>{error}</div> : null}

      <div style={card}>
        {busy ? (
          <div>Cargando...</div>
        ) : (
          <div style={tableWrap}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Acción</th>
                  {roles.map((role) => (
                    <th key={role} style={thStyle}>
                      {labels[role] || role}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permissions.map((perm) => (
                  <tr key={perm.key}>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{perm.label}</td>
                    {roles.map((role) => {
                      const ok = Array.isArray(perm.roles) && perm.roles.includes(role);
                      return (
                        <td key={role} style={tdStyle}>
                          <Mark ok={ok} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={card}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Enforcement actual</div>
        <div style={{ color: "#374151", lineHeight: 1.5 }}>
          Esta matriz ya controla la asignación de roles al crear o editar usuarios.
          Las firmas del PDF legal se siguen validando en backend así:
          responsable/tripulación = ADMIN y PARAMEDIC, receptor = ADMIN, DOCTOR y RECEIVER_MD,
          lock FRAP = ADMIN y PARAMEDIC.
        </div>
      </div>
    </div>
  );
}