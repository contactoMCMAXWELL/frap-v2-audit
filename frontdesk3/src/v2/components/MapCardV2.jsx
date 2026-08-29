import React from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  googleMapsUrl,
  hasCoordinates,
  toFloat,
  wazeUrl,
} from "../utils/maps";

function FitPoints({ points }) {
  const map = useMap();

  React.useEffect(() => {
    const coords = points
      .filter((point) => hasCoordinates(point.lat, point.lng))
      .map((point) => [toFloat(point.lat), toFloat(point.lng)]);

    if (!coords.length) return;

    if (coords.length === 1) {
      map.setView(coords[0], 15);
      return;
    }

    map.fitBounds(coords, {
      padding: [40, 40],
    });
  }, [map, points]);

  return null;
}

export default function MapCardV2({
  title = "Ubicación del servicio",
  lat,
  lng,
  label = "Servicio",
  points,
}) {
  const normalizedPoints = React.useMemo(() => {
    if (Array.isArray(points) && points.length) {
      return points
        .filter((point) => hasCoordinates(point?.lat, point?.lng))
        .map((point, index) => ({
          id: point?.id || `${index}-${point?.lat}-${point?.lng}`,
          lat: toFloat(point.lat),
          lng: toFloat(point.lng),
          label: point?.label || `Ubicación ${index + 1}`,
          role: point?.role || "",
        }));
    }

    if (hasCoordinates(lat, lng)) {
      return [
        {
          id: "single",
          lat: toFloat(lat),
          lng: toFloat(lng),
          label,
          role: "",
        },
      ];
    }

    return [];
  }, [points, lat, lng, label]);

  if (!normalizedPoints.length) {
    return (
      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 16,
        }}
      >
        <h3 style={{ marginTop: 0 }}>{title}</h3>
        <p style={{ marginBottom: 0, color: "#6b7280" }}>
          Este registro aún no tiene coordenadas geográficas.
        </p>
      </div>
    );
  }

  const firstPoint = normalizedPoints[0];

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h3 style={{ margin: 0 }}>{title}</h3>

        {normalizedPoints.length === 1 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a
              href={googleMapsUrl(
                firstPoint.lat,
                firstPoint.lng,
                firstPoint.label
              )}
              target="_blank"
              rel="noreferrer"
              style={{ textDecoration: "none" }}
            >
              <button type="button">Abrir en Google Maps</button>
            </a>

            <a
              href={wazeUrl(firstPoint.lat, firstPoint.lng)}
              target="_blank"
              rel="noreferrer"
              style={{ textDecoration: "none" }}
            >
              <button type="button">Abrir en Waze</button>
            </a>
          </div>
        )}
      </div>

      {normalizedPoints.length > 1 && (
        <div
          style={{
            display: "grid",
            gap: 8,
            marginBottom: 12,
          }}
        >
          {normalizedPoints.map((point) => (
            <div
              key={point.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <div>
                <strong>{point.label}</strong>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <a
                  href={googleMapsUrl(point.lat, point.lng, point.label)}
                  target="_blank"
                  rel="noreferrer"
                  style={{ textDecoration: "none" }}
                >
                  <button type="button">Google Maps</button>
                </a>

                <a
                  href={wazeUrl(point.lat, point.lng)}
                  target="_blank"
                  rel="noreferrer"
                  style={{ textDecoration: "none" }}
                >
                  <button type="button">Waze</button>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ height: 360, overflow: "hidden", borderRadius: 10 }}>
        <MapContainer
          center={[firstPoint.lat, firstPoint.lng]}
          zoom={15}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FitPoints points={normalizedPoints} />

          {normalizedPoints.map((point) => (
            <Marker
              key={point.id}
              position={[point.lat, point.lng]}
            >
              <Popup>{point.label}</Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div
        style={{
          marginTop: 12,
          display: "grid",
          gap: 4,
          fontSize: 13,
          color: "#6b7280",
        }}
      >
        {normalizedPoints.map((point) => (
          <div key={`coords-${point.id}`}>
            {point.label}: {point.lat} | {point.lng}
          </div>
        ))}
      </div>
    </div>
  );
}
