// src/lib/http.js
const API_BASE = import.meta.env.VITE_API_BASE || "/api";

function joinUrl(base, path) {
  if (!base) return path;
  if (!path) return base;

  const b = base.endsWith("/") ? base.slice(0, -1) : base;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

async function parseBody(res) {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return await res.json();
  return await res.text();
}

export class HttpError extends Error {
  constructor(message, { status, url, body } = {}) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.url = url;
    this.body = body;
  }
}

function buildHeaders({ token, companyId, userId, extraHeaders } = {}) {
  const h = { ...(extraHeaders || {}) };

  // Nota: si body es string (form-urlencoded), api.js debe setear Content-Type,
  // o el caller puede pasarlo en headers.
  if (!("Content-Type" in h) && !("content-type" in h)) {
    h["Content-Type"] = "application/json";
  }

  if (token) h["Authorization"] = `Bearer ${token}`;
  if (companyId) h["X-Company-Id"] = companyId;
  if (userId) h["X-User-Id"] = userId;

  return h;
}

/**
 * httpApi(path, opts)
 * - Siempre pega al backend vía proxy /api
 * - Soporta body como objeto (JSON.stringify) o string (se manda tal cual)
 */
export async function httpApi(path, opts = {}) {
  const url = joinUrl(API_BASE, path);

  const init = {
    method: opts.method || "GET",
    headers: buildHeaders({
      token: opts.token,
      companyId: opts.companyId,
      userId: opts.userId,
      extraHeaders: opts.headers,
    }),
  };

  if (opts.body !== undefined) {
    if (typeof opts.body === "string") {
      // Si body es string, NO forzamos JSON. El caller debe poner Content-Type correcto.
      delete init.headers["Content-Type"];
      init.body = opts.body;
    } else {
      init.body = JSON.stringify(opts.body);
    }
  }

  const res = await fetch(url, init);
  const body = await parseBody(res);

  if (!res.ok) {
    const msg = `HTTP ${res.status} ${init.method} ${url}`;
    throw new HttpError(msg, { status: res.status, url, body });
  }
  return body;
}