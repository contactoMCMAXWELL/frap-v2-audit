import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { v2Api } from "../api/v2";

function normalizeList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.value)) return data.value;
  return [];
}

function formatDate(value) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

export default function EventParticipantProtectionList({ session }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await v2Api.serviceIntakeList({
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
      });

      setItems(normalizeList(data));
    } catch (e) {
      setError(
        e?.message ||
          "No fue posible cargar los eventos disponibles."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [
    session?.token,
    session?.companyId,
    session?.userId,
  ]);

  const events = useMemo(() => {
    const q = search.trim().toLowerCase();

    return items
      .filter((item) => {
        const operationMode = String(
          item?.operation_mode || ""
        )
          .trim()
          .toLowerCase();

        return operationMode === "standby" && item?.active !== false;
      })
      .filter((item) => {
        if (!q) return true;

        const haystack = [
          item?.standby_event_name,
          item?.incident_number,
          item?.service_type,
          item?.service_subtype,
          item?.caller_name,
          item?.notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      })
      .sort((a, b) => {
        const aDate = a?.standby_starts_at
          ? new Date(a.standby_starts_at).getTime()
          : 0;

        const bDate = b?.standby_starts_at
          ? new Date(b.standby_starts_at).getTime()
          : 0;

        return bDate - aDate;
      });
  }, [items, search]);

  return (
    <div>
      <div style={headerStyle}>
        <div>
          <h2 style={{ margin: 0 }}>
            Protección de Participantes
          </h2>

          <div style={subtitleStyle}>
            Selecciona la guardia o evento para consultar y atender
            a sus participantes registrados.
          </div>
        </div>

        <button
          type="button"
          onClick={load}
          disabled={loading}
        >
          {loading ? "Cargando..." : "Recargar"}
        </button>
      </div>

      <div style={searchCardStyle}>
        <label style={labelStyle}>
          Buscar evento
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nombre del evento, folio o tipo de servicio"
          />
        </label>
      </div>

      {error && (
        <p style={errorStyle}>
          {error}
        </p>
      )}

      {!loading && !error && events.length === 0 && (
        <div style={emptyStyle}>
          No hay guardias o eventos activos disponibles.
        </div>
      )}

      <div style={gridStyle}>
        {events.map((event) => {
          const name =
            event?.standby_event_name ||
            event?.service_subtype ||
            event?.service_type ||
            "Evento sin nombre";

          return (
            <div key={event.id} style={cardStyle}>
              <div style={eventNameStyle}>
                {name}
              </div>

              <div style={metaStyle}>
                <strong>Folio:</strong>{" "}
                {event?.incident_number || "—"}
              </div>

              <div style={metaStyle}>
                <strong>Inicio:</strong>{" "}
                {formatDate(event?.standby_starts_at)}
              </div>

              <div style={metaStyle}>
                <strong>Fin:</strong>{" "}
                {formatDate(event?.standby_ends_at)}
              </div>

              <div style={{ marginTop: 16 }}>
                <Link
                  to={`/v2/intakes/${event.id}/proteccion-participantes`}
                >
                  <button type="button">
                    Abrir protección
                  </button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  flexWrap: "wrap",
  marginBottom: 18,
};

const subtitleStyle = {
  marginTop: 6,
  color: "#6b7280",
  fontSize: 14,
};

const searchCardStyle = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 16,
  marginBottom: 18,
};

const labelStyle = {
  display: "grid",
  gap: 8,
  fontWeight: 700,
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 16,
};

const cardStyle = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 18,
};

const eventNameStyle = {
  fontSize: 18,
  fontWeight: 900,
  marginBottom: 12,
};

const metaStyle = {
  fontSize: 14,
  color: "#374151",
  marginTop: 7,
};

const errorStyle = {
  color: "crimson",
  whiteSpace: "pre-wrap",
};

const emptyStyle = {
  padding: 24,
  background: "#ffffff",
  border: "1px dashed #d1d5db",
  borderRadius: 14,
  color: "#6b7280",
};