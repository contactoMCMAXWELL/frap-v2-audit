import React, { useEffect, useMemo, useState } from "react";
import { v2Api } from "../api/v2";

function isLicenseActiveStatus(status) {
  const normalized = String(status || "").toLowerCase();
  return ["active", "trial", "grace"].includes(normalized);
}

function buildHeaders(session) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session?.token || ""}`,
    "X-Company-Id": session?.companyId || "",
    "X-User-Id": session?.userId || "",
  };
}

function toDateInputValue(value) {
  if (!value) return "";
  const text = String(value);
  if (text.length >= 10) return text.slice(0, 10);
  return "";
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

function formatDateOnly(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString();
}

export default function CompanyLicenses({ session }) {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const current = useMemo(() => {
    if (Array.isArray(items) && items.length) return items[0];
    return null;
  }, [items]);

  const [form, setForm] = useState({
    plan_code: "TRIAL",
    status: "trial",
    starts_at: "",
    ends_at: "",
    max_users: 5,
    max_units: 2,
    max_services_month: 100,
    grace_days: 7,
    notes: "",
    features_json: {
      gps_map: false,
      supplies: false,
      audit_plus: false,
      financials: false,
      branded_pdf: false,
      whatsapp_share: false,
      frap_clinical_v2: false,
    },
  });

  const isSuperadmin =
    String(session?.role || session?.user?.role || "").toUpperCase() ===
    "SUPERADMIN";

  const syncForm = (row) => {
    const features = row?.features_json || {};
    setForm({
      plan_code: row?.plan_code || "TRIAL",
      status: row?.status || "trial",
      starts_at: toDateInputValue(row?.starts_at),
      ends_at: toDateInputValue(row?.ends_at),
      max_users: row?.max_users ?? 5,
      max_units: row?.max_units ?? 2,
      max_services_month: row?.max_services_month ?? 100,
      grace_days: row?.grace_days ?? 7,
      notes: row?.notes || "",
      features_json: {
        gps_map: !!features.gps_map,
        supplies: !!features.supplies,
        audit_plus: !!features.audit_plus,
        financials: !!features.financials,
        branded_pdf: !!features.branded_pdf,
        whatsapp_share: !!features.whatsapp_share,
        frap_clinical_v2: !!features.frap_clinical_v2,
      },
    });
  };

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      setSaveMsg("");

      const [licensesData, summaryRes] = await Promise.all([
        v2Api.companyLicensesList({
          token: session?.token,
          companyId: session?.companyId,
          userId: session?.userId,
        }),
        fetch("/api/v2/company-licenses/summary/current", {
          method: "GET",
          headers: buildHeaders(session),
        }).then(async (r) => {
          if (!r.ok) {
            const txt = await r.text();
            throw new Error(txt || "No se pudo cargar resumen");
          }
          return r.json();
        }),
      ]);

      const rows = Array.isArray(licensesData) ? licensesData : [];
      setItems(rows);
      setSummary(summaryRes);

      if (rows[0]) {
        syncForm(rows[0]);
      }
    } catch (e) {
      setError(e?.message || "No se pudo cargar licencias");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [session?.companyId]);

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const setFeature = (name, value) => {
    setForm((prev) => ({
      ...prev,
      features_json: {
        ...prev.features_json,
        [name]: value,
      },
    }));
  };

  const save = async () => {
    try {
      setSaving(true);
      setError("");
      setSaveMsg("");

      const payload = {
        plan_code: form.plan_code,
        status: form.status,
        starts_at: form.starts_at ? `${form.starts_at}T00:00:00Z` : null,
        ends_at: form.ends_at ? `${form.ends_at}T23:59:59Z` : null,
        max_users: Number(form.max_users),
        max_units: Number(form.max_units),
        max_services_month: Number(form.max_services_month),
        grace_days: Number(form.grace_days),
        notes: form.notes,
        features_json: form.features_json,
      };

      const res = await fetch("/api/v2/company-licenses/current", {
        method: "PUT",
        headers: buildHeaders(session),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "No se pudo guardar licencia");
      }

      setSaveMsg("Licencia guardada");
      await load();
    } catch (e) {
      setError(e?.message || "No se pudo guardar licencia");
    } finally {
      setSaving(false);
    }
  };

  const effectiveStatus = String(summary?.effective_status || current?.status || "")
    .toLowerCase();

  const activeBadge = isLicenseActiveStatus(effectiveStatus);

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Licenciamiento por empresa</h2>

      <p style={{ color: "#6b7280" }}>
        Control comercial y operativo de funciones habilitadas.
      </p>

      {loading && <p>Cargando licencias...</p>}
      {error && <p style={{ color: "crimson", whiteSpace: "pre-wrap" }}>{error}</p>}
      {saveMsg && <p style={{ color: "#065f46" }}>{saveMsg}</p>}

      {!loading && current && (
        <div style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h3 style={{ margin: 0 }}>{current.plan_code}</h3>
              <div style={{ marginTop: 6, color: "#6b7280" }}>
                Estado comercial: {current.status}
              </div>
              <div style={{ marginTop: 4, color: "#6b7280" }}>
                Estado efectivo: {summary?.effective_status || current.status}
              </div>
            </div>

            <div style={activeBadge ? chipActive : chipInactive}>
              {activeBadge ? "Activa" : "Inactiva"}
            </div>
          </div>

          <div style={summaryGrid}>
            <div style={miniCard}>
              <strong>Usuarios</strong>
              <div>Límite: {summary?.license?.max_users ?? current.max_users}</div>
              <div>Uso: {Number(summary?.usage?.users_percent || 0).toFixed(1)}%</div>
            </div>

            <div style={miniCard}>
              <strong>Unidades</strong>
              <div>Límite: {summary?.license?.max_units ?? current.max_units}</div>
              <div>Uso: {Number(summary?.usage?.units_percent || 0).toFixed(1)}%</div>
            </div>

            <div style={miniCard}>
              <strong>Servicios del mes</strong>
              <div>
                Límite:{" "}
                {summary?.license?.max_services_month ?? current.max_services_month}
              </div>
              <div>
                Uso: {Number(summary?.usage?.services_percent || 0).toFixed(1)}%
              </div>
            </div>
          </div>

          <div style={summaryGrid}>
            <div style={miniCard}>
              <strong>Inicio</strong>
              <div>{formatDateOnly(summary?.starts_at || current?.starts_at)}</div>
            </div>

            <div style={miniCard}>
              <strong>Fin</strong>
              <div>{formatDateOnly(summary?.ends_at || current?.ends_at)}</div>
            </div>

            <div style={miniCard}>
              <strong>Fin de gracia</strong>
              <div>{formatDateOnly(summary?.grace_until)}</div>
            </div>
          </div>

          <div style={summaryGrid}>
            <div style={miniCard}>
              <strong>Días restantes</strong>
              <div>
                {summary?.days_remaining === null || summary?.days_remaining === undefined
                  ? "—"
                  : summary.days_remaining}
              </div>
            </div>

            <div style={miniCard}>
              <strong>Expirada</strong>
              <div>{summary?.is_expired ? "Sí" : "No"}</div>
            </div>

            <div style={miniCard}>
              <strong>En gracia</strong>
              <div>{summary?.in_grace ? "Sí" : "No"}</div>
            </div>
          </div>

          {!!summary?.warnings?.length && (
            <div style={{ marginTop: 16 }}>
              <strong>Alertas:</strong>
              <ul style={{ marginTop: 8 }}>
                {summary.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {!loading && !current && (
        <div style={emptyBox}>
          <p style={{ margin: 0 }}>No hay licencias registradas.</p>
        </div>
      )}

      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Configuración de licencia</h3>

        {!isSuperadmin && (
          <p style={{ color: "#6b7280" }}>
            Solo lectura. Solo SUPERADMIN puede editar.
          </p>
        )}

        <div style={formGrid}>
          <label style={fieldStyle}>
            <span>Plan</span>
            <select
              value={form.plan_code}
              onChange={(e) => setField("plan_code", e.target.value)}
              disabled={!isSuperadmin || saving}
            >
              <option value="TRIAL">TRIAL</option>
              <option value="BASIC">BASIC</option>
              <option value="PROFESSIONAL">PROFESSIONAL</option>
              <option value="ENTERPRISE">ENTERPRISE</option>
            </select>
          </label>

          <label style={fieldStyle}>
            <span>Estado</span>
            <select
              value={form.status}
              onChange={(e) => setField("status", e.target.value)}
              disabled={!isSuperadmin || saving}
            >
              <option value="trial">trial</option>
              <option value="active">active</option>
              <option value="grace">grace</option>
              <option value="suspended">suspended</option>
              <option value="expired">expired</option>
              <option value="cancelled">cancelled</option>
            </select>
          </label>

          <label style={fieldStyle}>
            <span>Usuarios máximos</span>
            <input
              type="number"
              value={form.max_users}
              onChange={(e) => setField("max_users", e.target.value)}
              disabled={!isSuperadmin || saving}
            />
          </label>

          <label style={fieldStyle}>
            <span>Inicio licencia</span>
            <input
              type="date"
              value={form.starts_at}
              onChange={(e) => setField("starts_at", e.target.value)}
              disabled={!isSuperadmin || saving}
            />
          </label>

          <label style={fieldStyle}>
            <span>Fin licencia</span>
            <input
              type="date"
              value={form.ends_at}
              onChange={(e) => setField("ends_at", e.target.value)}
              disabled={!isSuperadmin || saving}
            />
          </label>

          <label style={fieldStyle}>
            <span>Días de gracia</span>
            <input
              type="number"
              value={form.grace_days}
              onChange={(e) => setField("grace_days", e.target.value)}
              disabled={!isSuperadmin || saving}
            />
          </label>

          <label style={fieldStyle}>
            <span>Unidades máximas</span>
            <input
              type="number"
              value={form.max_units}
              onChange={(e) => setField("max_units", e.target.value)}
              disabled={!isSuperadmin || saving}
            />
          </label>

          <label style={fieldStyle}>
            <span>Servicios por mes</span>
            <input
              type="number"
              value={form.max_services_month}
              onChange={(e) => setField("max_services_month", e.target.value)}
              disabled={!isSuperadmin || saving}
            />
          </label>
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={{ ...fieldStyle, maxWidth: "100%" }}>
            <span>Notas</span>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              disabled={!isSuperadmin || saving}
            />
          </label>
        </div>

        <div style={{ marginTop: 16 }}>
          <strong>Funciones habilitadas</strong>

          <div style={checksGrid}>
            {Object.entries(form.features_json).map(([key, value]) => (
              <label key={key} style={checkStyle}>
                <input
                  type="checkbox"
                  checked={!!value}
                  onChange={(e) => setFeature(key, e.target.checked)}
                  disabled={!isSuperadmin || saving}
                />
                <span>{key}</span>
              </label>
            ))}
          </div>
        </div>

        {isSuperadmin && (
          <div style={{ marginTop: 16 }}>
            <button onClick={save} disabled={saving}>
              {saving ? "Guardando..." : "Guardar licencia"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const cardStyle = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 18,
  marginBottom: 16,
};

const emptyBox = {
  background: "#fff",
  border: "1px dashed #d1d5db",
  borderRadius: 12,
  padding: 20,
};

const miniCard = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 12,
};

const summaryGrid = {
  marginTop: 16,
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(180px, 1fr))",
  gap: 12,
};

const formGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(180px, 1fr))",
  gap: 12,
  marginTop: 12,
};

const fieldStyle = {
  display: "grid",
  gap: 6,
};

const checksGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(180px, 1fr))",
  gap: 10,
  marginTop: 10,
};

const checkStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const chipBase = {
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 600,
  height: "fit-content",
};

const chipActive = {
  ...chipBase,
  background: "#ecfdf5",
  color: "#065f46",
};

const chipInactive = {
  ...chipBase,
  background: "#f3f4f6",
  color: "#374151",
};