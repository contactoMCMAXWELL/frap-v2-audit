import React, { useState } from "react";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";

function extractErrorMessage(e) {
  if (!e) return "Error en login";
  if (e.body?.detail) {
    return typeof e.body.detail === "string"
      ? e.body.detail
      : JSON.stringify(e.body.detail);
  }
  if (e.message) return e.message;
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
    if (!password) return setErr("Contraseña requerida.");

    setBusy(true);
    try {
      const res = await api.authLogin({ username: userInput, password });

      const token = res?.access_token || "";
      if (!token) {
        throw new Error("Login correcto pero no se encontró access_token.");
      }

      const companyId = res?.company_id || "";
      const userId = res?.user_id || "";
      const name = res?.name || userInput;
      const role = res?.role || "";

      const context = await api
        .authSessionContext({
          token,
          companyId,
          userId,
        })
        .catch(() => null);

      setAuth({
        token,
        companyId: context?.company?.id || companyId,
        companyName: context?.company?.name || "",
        companyCode: context?.company?.code || "",
        companyLogoUrl: context?.company?.logo_url || "",
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
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          width: 460,
          maxWidth: "100%",
          border: "1px solid #e5e7eb",
          borderRadius: 24,
          padding: 28,
          background: "#ffffff",
          boxShadow: "0 16px 50px rgba(15, 23, 42, 0.08)",
          display: "grid",
          gap: 14,
        }}
      >
        <div style={{ display: "grid", gap: 6 }}>
          <div
            style={{
              fontWeight: 900,
              fontSize: 28,
              color: "#111827",
              letterSpacing: 0.2,
            }}
          >
            AmbulanciaYA
          </div>
          <div style={{ color: "#4b5563", fontWeight: 700 }}>
            Propiedad MC MAXWELL SOFTWARE Y SERVICIOS
          </div>
          <div style={{ color: "#6b7280", fontSize: 14 }}>
            Plataforma operativa y clínica para atención prehospitalaria.
          </div>
        </div>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 800 }}>Usuario / Email</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            style={{
              padding: 12,
              borderRadius: 14,
              border: "1px solid #d1d5db",
              outline: "none",
            }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 800 }}>Contraseña</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            style={{
              padding: 12,
              borderRadius: 14,
              border: "1px solid #d1d5db",
              outline: "none",
            }}
          />
        </label>

        {err ? (
          <div style={{ color: "#b91c1c", fontSize: 13, whiteSpace: "pre-wrap" }}>
            {err}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          style={{
            marginTop: 6,
            width: "100%",
            padding: 14,
            borderRadius: 14,
            border: "1px solid #111827",
            background: busy ? "#e5e7eb" : "#111827",
            color: busy ? "#111827" : "#fff",
            fontWeight: 900,
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          {busy ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}