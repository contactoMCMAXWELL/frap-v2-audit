import React from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { googleMapsUrl, hasCoordinates, toFloat, wazeUrl } from "../utils/maps";

export default function MapCardV2({
  title = "Ubicación del servicio",
  lat,
  lng,
  label = "Servicio",
}) {
  const ok = hasCoordinates(lat, lng);
  const latNum = toFloat(lat);
  const lngNum = toFloat(lng);

  if (!ok) {
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

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a
            href={googleMapsUrl(latNum, lngNum, label)}
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: "none" }}
          >
            <button type="button">Abrir en Google Maps</button>
          </a>

          <a
            href={wazeUrl(latNum, lngNum)}
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: "none" }}
          >
            <button type="button">Abrir en Waze</button>
          </a>
        </div>
      </div>

      <div style={{ height: 360, overflow: "hidden", borderRadius: 10 }}>
        <MapContainer
          center={[latNum, lngNum]}
          zoom={15}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[latNum, lngNum]}>
            <Popup>{label}</Popup>
          </Marker>
        </MapContainer>
      </div>

      <div style={{ marginTop: 12, fontSize: 13, color: "#6b7280" }}>
        Latitud: {latNum} | Longitud: {lngNum}
      </div>
    </div>
  );
}