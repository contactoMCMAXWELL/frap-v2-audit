import React, { useState } from "react";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";

function extractErrorMessage(e) {
  // api.http suele lanzar Error(message). A veces trae e.body.detail
  if (!e) return "Error en login";

  const body = e.body;
  if (body?.detail) {
    if (typeof body.detail === "string") return body.detail;
    try {
      return JSON.stringify(body.detail);
    } catch {
      return String(body.detail);
    }
  }

  // Si es un Error normal, usa message
  if (e.message) return e.message;

  // Último recurso
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

export default function AuthPanel() {
  const setAuth = useAuthStore((s) => s.setAuth);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    const userInput = username.trim();
    if (!userInput) return setErr("Usuario requerido.");
    if (!password) return setErr("Password requerido.");

    setBusy(true);
    try {
      const res = await api.authLogin({ username: userInput, password });

      const token = res?.access_token || "";
      if (!token) {
        console.log("Login response:", res);
        throw new Error("Login OK pero no se encontró access_token.");
      }

      // Backend ya regresa estos campos (confirmado):
      // role: "DISPATCH" | "UNIT" | "ADMIN" ...
      const companyId = res?.company_id || "";
      const userId = res?.user_id || "";
      const name = res?.name || userInput;
      const role = res?.role || "";

      setAuth({
        token,
        companyId,
        userId,
        user: name,
        role,
      });
    } catch (e2) {
      console.error(e2);
      setErr(extractErrorMessage(e2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <form onSubmit={onSubmit} style={{ width: 420, border: "1px solid #e5e7eb", borderRadius: 16, padding: 16 }}>
        <div style={{ fontWeight: 800, fontSize: 20 }}>FRAP Ambulancias – Frontdesk3</div>
        <div style={{ marginTop: 6, color: "#6b7280", fontSize: 13 }}>Acceso</div>

        <div style={{ marginTop: 14 }}>
          <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Usuario</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="paramedic@amb.mx"
            autoComplete="username"
            style={{ width: "100%", padding: 10, borderRadius: 12, border: "1px solid #d1d5db" }}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Password</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            type="password"
            autoComplete="current-password"
            style={{ width: "100%", padding: 10, borderRadius: 12, border: "1px solid #d1d5db" }}
          />
        </div>

        {err ? (
          <div style={{ marginTop: 12, color: "#b91c1c", fontSize: 13, whiteSpace: "pre-wrap" }}>{err}</div>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          style={{
            marginTop: 14,
            width: "100%",
            padding: 12,
            borderRadius: 12,
            border: "1px solid #111827",
            background: busy ? "#f3f4f6" : "#111827",
            color: busy ? "#111827" : "#fff",
            fontWeight: 800,
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          {busy ? "Entrando…" : "Entrar"}
        </button>

        <div style={{ marginTop: 10, fontSize: 12, color: "#6b7280" }}>
          Tip: si ves <b>Not authenticated</b> en Dispatch, revisa que el login esté guardando el token correctamente.
        </div>
      </form>
    </div>
  );
}