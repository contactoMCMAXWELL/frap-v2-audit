import React from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import CompanySelector from "../../components/CompanySelector";

const cardStyle = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 20,
  width: 280,
};

export default function V2AdminHome() {
  const role = useAuthStore((s) => s.role);
  const r = String(role || "").toUpperCase();
  const canAdmin = r === "ADMIN" || r === "SUPERADMIN";
  const isSuper = r === "SUPERADMIN";
  const companyName = useAuthStore((s) => s.companyName);
  const companyCode = useAuthStore((s) => s.companyCode);

  if (!canAdmin) {
    return (
      <div style={{ color: "#b91c1c", fontWeight: 700 }}>
        Acceso denegado. Esta sección requiere ADMIN o SUPERADMIN.
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gap: 10 }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 6 }}>Administración V2</h2>
          <p style={{ color: "#4b5563", margin: 0 }}>
            Catálogos base de la operación por empresa.
          </p>
        </div>

        {isSuper ? <CompanySelector /> : null}

        {isSuper && companyName ? (
          <div style={{ color: "#111827", fontWeight: 700 }}>
            Empresa activa: {companyName}
            {companyCode ? ` (${companyCode})` : ""}
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {isSuper ? (
          <div style={cardStyle}>
            <h3 style={{ marginTop: 0 }}>Empresas</h3>
            <p>Solo SUPERADMIN crea y administra empresas.</p>
            <Link to="/v2/admin/empresa">Abrir empresas</Link>
          </div>
        ) : null}

        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Roles</h3>
          <p>Lista fija del sistema, no catálogo libre.</p>
          <Link to="/v2/admin/roles">Ver roles</Link>
        </div>

        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Usuarios</h3>
          <p>Usuarios de la empresa seleccionada.</p>
          <Link to="/v2/admin/usuarios">Abrir usuarios</Link>
        </div>

        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Hospitales</h3>
          <p>Catálogo hospitalario de la empresa seleccionada.</p>
          <Link to="/v2/admin/hospitales">Abrir hospitales</Link>
        </div>

        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Medicamentos</h3>
          <p>Catálogo de medicamentos de la empresa seleccionada.</p>
          <Link to="/v2/admin/medicamentos">Abrir medicamentos</Link>
        </div>

        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Procedimientos</h3>
          <p>Catálogo de procedimientos de la empresa seleccionada.</p>
          <Link to="/v2/admin/procedimientos">Abrir procedimientos</Link>
        </div>
        
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Insumos</h3>
          <p>Catálogo de insumos de la empresa seleccionada.</p>
          <Link to="/v2/admin/insumos">Abrir insumos</Link>
        </div>

        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Unidades</h3>
          <p>Unidades de la empresa seleccionada.</p>
          <Link to="/v2/admin/unidades">Abrir unidades</Link>
        </div>
      </div>
    </div>
  );
}