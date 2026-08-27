
export function parseDateLike(value) {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function pad(value, size = 2) {
  return String(Math.trunc(Math.abs(value))).padStart(size, "0");
}

export function formatDeviceDateTime(value, { withSeconds = true, fallback = "—" } = {}) {
  const date = parseDateLike(value);
  if (!date) return value ? String(value) : fallback;

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    ...(withSeconds ? { second: "2-digit" } : {}),
  }).format(date);
}

export function formatDeviceDate(value, { fallback = "—" } = {}) {
  const date = parseDateLike(value);
  if (!date) return value ? String(value) : fallback;

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function toDatetimeLocalValue(value) {
  const date = parseDateLike(value);
  if (!date) return "";

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hour = pad(date.getHours());
  const minute = pad(date.getMinutes());

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export function localInputToIso(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function localIsoNow() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  const mss = pad(d.getMilliseconds(), 3);

  const offMin = -d.getTimezoneOffset();
  const sign = offMin >= 0 ? "+" : "-";
  const offAbs = Math.abs(offMin);
  const offH = pad(Math.floor(offAbs / 60));
  const offM = pad(offAbs % 60);

  return `${yyyy}-${MM}-${dd}T${hh}:${mm}:${ss}.${mss}${sign}${offH}:${offM}`;
}
