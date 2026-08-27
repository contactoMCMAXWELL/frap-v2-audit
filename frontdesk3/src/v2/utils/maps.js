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

export function wazeUrl(lat, lng) {
  return `https://waze.com/ul?ll=${encodeURIComponent(`${lat},${lng}`)}&navigate=yes`;
}