import React from "react";
import { Link } from "react-router-dom";

export default function V2AdminLayout({ children }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "100vh" }}>
      
      <aside style={{
        borderRight: "1px solid #e5e7eb",
        padding: 16,
        background: "#fafafa"
      }}>
        <div style={{ fontWeight: 900, marginBottom: 20 }}>
          ADMIN V2
        </div>

        <nav style={{ display: "grid", gap: 10 }}>
          <Link to="/v2/admin/supplies">Insumos</Link>
          <Link to="/v2/admin/hospitals">Hospitales</Link>
          <Link to="/v2/admin/medications">Medicamentos</Link>
          <Link to="/v2/admin/procedures">Procedimientos</Link>
        </nav>
      </aside>

      <main style={{ padding: 20 }}>
        {children}
      </main>

    </div>
  );
}