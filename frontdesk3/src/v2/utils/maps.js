export function toFloat(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function hasCoordinates(lat, lng) {
  return toFloat(lat) !== null && toFloat(lng) !== null;
}

export function googleMapsUrl(lat, lng, label = "") {
  const q = label ? `${lat},${lng} (${label})` : `${lat},${lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function googleMapsAddressUrl(address) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    address || ""
  )}`;
}

export function wazeUrl(lat, lng) {
  return `https://waze.com/ul?ll=${encodeURIComponent(
    `${lat},${lng}`
  )}&navigate=yes`;
}

const geocodeCache = new Map();

export async function geocodeAddress(address) {
  const normalized = String(address || "").trim();

  if (!normalized) return null;

  const cacheKey = normalized.toLowerCase();

  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }

  const url =
    "https://nominatim.openstreetmap.org/search" +
    `?format=jsonv2&limit=1&q=${encodeURIComponent(normalized)}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      geocodeCache.set(cacheKey, null);
      return null;
    }

    const rows = await response.json();
    const first = Array.isArray(rows) ? rows[0] : null;

    if (!first) {
      geocodeCache.set(cacheKey, null);
      return null;
    }

    const lat = toFloat(first.lat);
    const lng = toFloat(first.lon);

    if (!hasCoordinates(lat, lng)) {
      geocodeCache.set(cacheKey, null);
      return null;
    }

    const result = {
      lat,
      lng,
      displayName: first.display_name || normalized,
      source: "geocoded",
    };

    geocodeCache.set(cacheKey, result);
    return result;
  } catch {
    geocodeCache.set(cacheKey, null);
    return null;
  }
}
