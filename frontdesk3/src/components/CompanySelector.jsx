// src/components/CompanySelector.jsx
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";

function normalizeListShape(res) {
  if (Array.isArray(res)) return { value: res, Count: res.length };
  if (res && Array.isArray(res.value)) return { value: res.value, Count: res.Count ?? res.value.length };
  return { value: [], Count: 0 };
}

export default function CompanySelector() {
  const { token, companyId, userId, role, setCompanyContext } = useAuthStore();

  const r = String(role || "").toUpperCase();
  const isSuper = r === "SUPERADMIN";

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [list, setList] = useState({ value: [], Count: 0 });

  async function loadCompanies() {
    if (!token || !isSuper) return;
    setErr("");
    setBusy(true);
    try {
      const res = await api.adminCompaniesList({ token, companyId, userId });
      setList(normalizeListShape(res));
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Error cargando empresas");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    loadCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isSuper]);

  const options = useMemo(() => {
    return (list.value || []).map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      label: `${c.name} (${c.code})`,
    }));
  }, [list]);

  if (!isSuper) return null;

  return (
    <div style={{ display: "grid", gap: 6, minWidth: 340 }}>
      <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 900 }}>
        Empresa activa (SUPERADMIN)
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <select
          value={companyId || ""}
          onChange={(e) => {
            const id = e.target.value;
            const c = options.find((x) => x.id === id);
            setCompanyContext({
              companyId: id,
              companyName: c?.name || "",
              companyCode: c?.code || "",
            });
          }}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            outline: "none",
            background: "white",
          }}
        >
          {!companyId ? <option value="">Selecciona empresa…</option> : null}
          {options.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>

        <button
          onClick={loadCompanies}
          disabled={busy}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid #d1d5db",
            background: busy ? "#f3f4f6" : "white",
            fontWeight: 900,
            cursor: busy ? "not-allowed" : "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {busy ? "..." : "Recargar"}
        </button>
      </div>

      {err ? <div style={{ color: "#b91c1c", fontSize: 12 }}>{err}</div> : null}
    </div>
  );
}