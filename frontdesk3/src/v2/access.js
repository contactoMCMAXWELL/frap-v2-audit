export const ROLE_HOME = {
  SUPERADMIN: "/v2",
  ADMIN: "/v2",
  DISPATCH: "/v2/intakes",
  PARAMEDIC: "/v2",
  DOCTOR: "/v2",
  RECEIVER_MD: "/v2",
  AUDITOR: "/v2",
};

export function normalizeRole(role) {
  return String(role || "").trim().toUpperCase();
}

export function getDefaultPathByRole(role) {
  return ROLE_HOME[normalizeRole(role)] || "/v2";
}

export function hasAnyRole(role, allowed = []) {
  const current = normalizeRole(role);
  return allowed.map(normalizeRole).includes(current);
}

export function getMenuForRole(role) {
  const r = normalizeRole(role);
  const isAdmin = ["SUPERADMIN", "ADMIN"].includes(r);
  const isDispatch = ["SUPERADMIN", "ADMIN", "DISPATCH"].includes(r);
  const isClinical = ["SUPERADMIN", "ADMIN", "PARAMEDIC", "DOCTOR", "RECEIVER_MD", "AUDITOR"].includes(r);
  const canAudit = ["SUPERADMIN", "ADMIN", "AUDITOR"].includes(r);

  return [
    {
      title: "Inicio",
      items: [{ to: "/v2", label: "Panel" }],
    },
    isDispatch
      ? {
          title: "Operación",
          items: [
            { to: "/v2/intakes", label: "Dispatch" },
            { to: "/v2/intakes/nuevo", label: "Nuevo servicio" },
          ],
        }
      : null,
    isAdmin
      ? {
          title: "Administración",
          items: [
            { to: "/v2/admin", label: "Resumen" },
            { to: "/v2/admin/dashboard", label: "Dashboard" },
            { to: "/v2/admin/empresa", label: "Empresa" },
            { to: "/v2/admin/usuarios", label: "Usuarios" },
            { to: "/v2/admin/roles", label: "Roles y permisos" },
            { to: "/v2/admin/unidades", label: "Unidades" },
            { to: "/v2/admin/hospitales", label: "Hospitales" },
            { to: "/v2/admin/medicamentos", label: "Medicamentos" },
            { to: "/v2/admin/procedimientos", label: "Procedimientos" },
            { to: "/v2/admin/insumos", label: "Insumos" },
            { to: "/v2/licencias", label: "Licencias" },
          ],
        }
      : null,
    isClinical
      ? {
          title: "Clínico y legal",
          items: [{ to: "/v2", label: "Flujo por perfil" }],
        }
      : null,
    canAudit
      ? {
          title: "Control",
          items: [{ to: "/v2", label: "Auditoría y expediente" }],
        }
      : null,
  ].filter(Boolean);
}