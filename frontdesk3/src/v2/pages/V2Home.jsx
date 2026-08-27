import React from "react";
import { Link } from "react-router-dom";

function normalizeRole(role) {
  return String(role || "").trim().toUpperCase();
}

function roleConfig(role) {
  const r = normalizeRole(role);

  if (["SUPERADMIN", "ADMIN"].includes(r)) {
    return {
      title: r === "SUPERADMIN" ? "Flujo por perfil: Superadmin" : "Flujo por perfil: Admin",
      intro:
        "Tu perfil administra operación, empresa, usuarios, catálogos y control general. También puedes supervisar clínica, costos y trazabilidad.",
      sections: [
        {
          title: "Operación",
          items: [
            { label: "Dispatch", to: "/v2/intakes" },
            { label: "Nuevo servicio", to: "/v2/intakes/nuevo" },
          ],
        },
        {
          title: "Administración",
          items: [
            { label: "Resumen administrativo", to: "/v2/admin" },
            { label: "Dashboard admin/financiero", to: "/v2/admin/dashboard" },
            { label: "Empresa", to: "/v2/admin/empresa" },
            { label: "Usuarios", to: "/v2/admin/usuarios" },
            { label: "Roles y permisos", to: "/v2/admin/roles" },
            { label: "Unidades", to: "/v2/admin/unidades" },
            { label: "Hospitales", to: "/v2/admin/hospitales" },
            { label: "Medicamentos", to: "/v2/admin/medicamentos" },
            { label: "Procedimientos", to: "/v2/admin/procedimientos" },
            { label: "Insumos", to: "/v2/admin/insumos" },
            { label: "Licencias", to: "/v2/licencias" },
          ],
        },
      ],
      canDo: [
        "Crear servicios",
        "Asignar y reasignar unidades",
        "Editar clínica",
        "Editar negativa y traslado-entrega",
        "Editar costos y resultado económico",
        "Firmar como respaldo administrativo",
        "Hacer lock FRAP",
      ],
      cannotDo: [],
    };
  }

  if (r === "DISPATCH") {
    return {
      title: "Flujo por perfil: Dispatch",
      intro:
        "Tu perfil opera cabina. Se concentra en intake, asignación de unidad, estados operativos y seguimiento del servicio.",
      sections: [
        {
          title: "Operación",
          items: [
            { label: "Dispatch", to: "/v2/intakes" },
            { label: "Nuevo servicio", to: "/v2/intakes/nuevo" },
          ],
        },
      ],
      canDo: [
        "Crear servicio",
        "Editar intake",
        "Asignar unidad",
        "Reasignar unidad",
        "Cambiar estatus operativo",
        "Consultar timeline",
        "Consultar costos en lectura limitada",
      ],
      cannotDo: [
        "Editar FRAP clínico",
        "Editar signos vitales",
        "Editar procedimientos y medicamentos clínicos",
        "Editar trauma",
        "Editar negativa",
        "Editar traslado y entrega",
        "Firmar",
        "Hacer lock FRAP",
      ],
    };
  }

  if (r === "PARAMEDIC") {
    return {
      title: "Flujo por perfil: Paramédico",
      intro:
        "Tu perfil trabaja la parte clínica y médico-legal prehospitalaria del expediente.",
      sections: [
        {
          title: "Servicios y expediente",
          items: [{ label: "Servicios / expediente", to: "/v2/intakes" }],
        },
      ],
      canDo: [
        "Editar FRAP clínico",
        "Capturar signos vitales",
        "Registrar procedimientos",
        "Registrar medicamentos",
        "Registrar trauma",
        "Capturar negativa de atención/traslado",
        "Capturar traslado y entrega",
        "Registrar insumos del servicio",
        "Firmar responsable / tripulación",
        "Hacer lock clínico si aplica",
      ],
      cannotDo: [
        "Crear servicio",
        "Asignar unidad",
        "Cambiar estatus operativo de cabina",
        "Editar costos y resultado económico",
        "Administrar usuarios o catálogos",
        "Firmar receptor",
      ],
    };
  }

  if (["DOCTOR", "RECEIVER_MD"].includes(r)) {
    return {
      title: "Flujo por perfil: Médico / Receptor",
      intro:
        "Tu perfil consulta el expediente, valida la recepción clínica y participa en la firma del receptor.",
      sections: [
        {
          title: "Consulta clínica",
          items: [{ label: "Servicios / expediente", to: "/v2/intakes" }],
        },
      ],
      canDo: [
        "Consultar expediente clínico",
        "Consultar traslado y entrega",
        "Firmar receptor",
      ],
      cannotDo: [
        "Crear servicio",
        "Asignar unidad",
        "Cambiar estatus operativo",
        "Editar clínica prehospitalaria libremente",
        "Editar costos",
        "Hacer lock general",
      ],
    };
  }

  if (r === "AUDITOR") {
    return {
      title: "Flujo por perfil: Auditor",
      intro:
        "Tu perfil se centra en la lectura, revisión y trazabilidad del expediente y la operación.",
      sections: [
        {
          title: "Consulta",
          items: [
            { label: "Servicios / expediente", to: "/v2/intakes" },
            { label: "Licencias", to: "/v2/licencias" },
            { label: "Roles y permisos", to: "/v2/admin/roles" },
          ],
        },
      ],
      canDo: [
        "Consultar timeline",
        "Consultar expediente",
        "Consultar costos y resultado económico",
        "Consultar firmas",
        "Consultar PDF final",
      ],
      cannotDo: [
        "Crear servicio",
        "Editar clínica",
        "Asignar unidad",
        "Cambiar estatus",
        "Firmar",
        "Hacer lock",
        "Administrar catálogos o usuarios",
      ],
    };
  }

  return {
    title: "Flujo por perfil",
    intro: "Accede a los módulos permitidos según tu perfil.",
    sections: [
      {
        title: "Acceso principal",
        items: [{ label: "Servicios", to: "/v2/intakes" }],
      },
    ],
    canDo: [],
    cannotDo: [],
  };
}

function SectionCard({ title, items }) {
  return (
    <div style={cardStyle}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <div style={{ display: "grid", gap: 10 }}>
        {items.map((item) => (
          <Link key={item.to + item.label} to={item.to} style={linkStyle}>
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function ListCard({ title, items, tone = "ok" }) {
  const toneStyle =
    tone === "warn"
      ? { background: "#fff7ed", border: "#fed7aa", color: "#9a3412" }
      : { background: "#ecfdf5", border: "#a7f3d0", color: "#065f46" };

  return (
    <div
      style={{
        ...cardStyle,
        background: toneStyle.background,
        borderColor: toneStyle.border,
      }}
    >
      <h3 style={{ marginTop: 0, color: toneStyle.color }}>{title}</h3>
      <ul style={{ margin: 0, paddingLeft: 18, color: "#374151", lineHeight: 1.7 }}>
        {items.map((item, idx) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default function V2Home({ session }) {
  const cfg = roleConfig(session?.role);

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginTop: 0 }}>{cfg.title}</h2>
      <p style={{ color: "#4b5563", maxWidth: 920 }}>{cfg.intro}</p>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 24 }}>
        {cfg.sections.map((section) => (
          <SectionCard key={section.title} title={section.title} items={section.items} />
        ))}

        {!!cfg.canDo.length && <ListCard title="Tu perfil sí puede" items={cfg.canDo} />}
        {!!cfg.cannotDo.length && (
          <ListCard title="Tu perfil no debe hacer" items={cfg.cannotDo} tone="warn" />
        )}
      </div>
    </div>
  );
}

const cardStyle = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 20,
  width: 360,
  boxSizing: "border-box",
};

const linkStyle = {
  display: "block",
  padding: "10px 12px",
  borderRadius: 10,
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  textDecoration: "none",
  color: "#111827",
  fontWeight: 700,
};