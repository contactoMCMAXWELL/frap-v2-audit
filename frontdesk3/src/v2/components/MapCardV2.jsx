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
  geocodeAddress,
  googleMapsAddressUrl,
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

function normalizeRawPoints({ points, lat, lng, label, address }) {
  if (Array.isArray(points) && points.length) {
    return points.map((point, index) => ({
      id: point?.id || `${index}-${point?.lat}-${point?.lng}`,
      lat: point?.lat,
      lng: point?.lng,
      label: point?.label || `Ubicación ${index + 1}`,
      role: point?.role || "",
      address: String(
        point?.address ||
          point?.address_text ||
          ""
      ).trim(),
    }));
  }

  return [
    {
      id: "single",
      lat,
      lng,
      label,
      role: "",
      address: String(address || "").trim(),
    },
  ];
}

export default function MapCardV2({
  title = "Ubicación del servicio",
  lat,
  lng,
  label = "Servicio",
  address = "",
  points,
}) {
  const rawPoints = React.useMemo(
    () => normalizeRawPoints({ points, lat, lng, label, address }),
    [points, lat, lng, label, address]
  );

  const [resolvedPoints, setResolvedPoints] = React.useState([]);
  const [resolving, setResolving] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    async function resolvePoints() {
      setResolving(true);

      const next = [];

      for (const point of rawPoints) {
        if (hasCoordinates(point.lat, point.lng)) {
          next.push({
            ...point,
            lat: toFloat(point.lat),
            lng: toFloat(point.lng),
            source: "stored",
          });
          continue;
        }

        if (point.address) {
          const result = await geocodeAddress(point.address);

          if (result) {
            next.push({
              ...point,
              lat: result.lat,
              lng: result.lng,
              source: "geocoded",
              geocodedDisplayName: result.displayName,
            });
            continue;
          }
        }

        next.push({
          ...point,
          lat: null,
          lng: null,
          source: "unresolved",
        });
      }

      if (!cancelled) {
        setResolvedPoints(next);
        setResolving(false);
      }
    }

    resolvePoints();

    return () => {
      cancelled = true;
    };
  }, [rawPoints]);

  const mappablePoints = resolvedPoints.filter((point) =>
    hasCoordinates(point.lat, point.lng)
  );

  if (!mappablePoints.length) {
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

        {resolving ? (
          <p style={{ marginBottom: 0, color: "#6b7280" }}>
            Buscando ubicación a partir de la dirección...
          </p>
        ) : (
          <>
            <p style={{ color: "#6b7280" }}>
              No fue posible obtener coordenadas para esta ubicación.
            </p>

            {resolvedPoints
              .filter((point) => point.address)
              .map((point) => (
                <div
                  key={point.id}
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <span>{point.address}</span>

                  <a
                    href={googleMapsAddressUrl(point.address)}
                    target="_blank"
                    rel="noreferrer"
                    style={{ textDecoration: "none" }}
                  >
                    <button type="button">
                      Buscar dirección en Google Maps
                    </button>
                  </a>
                </div>
              ))}
          </>
        )}
      </div>
    );
  }

  const firstPoint = mappablePoints[0];

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

        {resolving && (
          <div style={{ color: "#6b7280", fontSize: 13 }}>
            Resolviendo direcciones...
          </div>
        )}

        {mappablePoints.length === 1 && (
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

      {resolvedPoints.length > 1 && (
        <div
          style={{
            display: "grid",
            gap: 8,
            marginBottom: 12,
          }}
        >
          {resolvedPoints.map((point) => (
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
              <div style={{ display: "grid", gap: 2 }}>
                <strong>{point.label}</strong>

                {!!point.address && (
                  <span style={{ color: "#6b7280", fontSize: 13 }}>
                    {point.address}
                  </span>
                )}
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {hasCoordinates(point.lat, point.lng) ? (
                  <>
                    <a
                      href={googleMapsUrl(
                        point.lat,
                        point.lng,
                        point.label
                      )}
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
                  </>
                ) : point.address ? (
                  <a
                    href={googleMapsAddressUrl(point.address)}
                    target="_blank"
                    rel="noreferrer"
                    style={{ textDecoration: "none" }}
                  >
                    <button type="button">
                      Buscar en Google Maps
                    </button>
                  </a>
                ) : null}
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

          <FitPoints points={mappablePoints} />

          {mappablePoints.map((point) => (
            <Marker
              key={point.id}
              position={[point.lat, point.lng]}
            >
              <Popup>
                <div style={{ display: "grid", gap: 4 }}>
                  <strong>{point.label}</strong>
                  {!!point.address && <span>{point.address}</span>}
                  {point.source === "geocoded" && (
                    <span>Ubicación obtenida a partir de la dirección</span>
                  )}
                </div>
              </Popup>
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
        {mappablePoints.map((point) => (
          <div key={`coords-${point.id}`}>
            {point.label}: {point.lat} | {point.lng}
            {point.source === "geocoded"
              ? " · obtenidas desde dirección"
              : ""}
          </div>
        ))}
      </div>
    </div>
  );
}
