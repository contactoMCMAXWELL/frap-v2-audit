import React, { useEffect, useMemo, useState } from "react";
import { httpApi } from "../lib/http";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import CompanySelector from "../components/CompanySelector";
import { Link } from "react-router-dom";
import { formatDeviceDateTime } from "../utils/datetime";

function normalizeListShape(res) {
  if (Array.isArray(res)) return { value: res, Count: res.length };
  if (res && Array.isArray(res.value)) {
    return { value: res.value, Count: res.Count ?? res.value.length };
  }
  return { value: [], Count: 0 };
}

function decodeJwtPayload(token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length !== 3) return {};
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4 || 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return {};
  }
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
        {label}
      </div>
      <input
        type={type}
        value={value ?? ""}
        placeholder={placeholder || ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          outline: "none",
          background: disabled ? "#f3f4f6" : "white",
          boxSizing: "border-box",
        }}
      />
    </label>
  );
}

function TextArea({ label, value, onChange, placeholder, rows = 3 }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
        {label}
      </div>
      <textarea
        rows={rows}
        value={value ?? ""}
        placeholder={placeholder || ""}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          outline: "none",
          background: "white",
          boxSizing: "border-box",
          resize: "vertical",
        }}
      />
    </label>
  );
}

function TopNav() {
  const role = useAuthStore((s) => s.role);
  const r = String(role || "").toUpperCase();
  const isSuper = r === "SUPERADMIN";
  const isAdmin = r === "ADMIN" || isSuper;

  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <Link to="/dispatch" style={{ fontWeight: 900 }}>
        Dispatch
      </Link>
      {isAdmin ? (
        <Link to="/admin/company/units" style={{ fontWeight: 900 }}>
          Unidades
        </Link>
      ) : null}
      {isAdmin ? (
        <Link to="/admin/company/users" style={{ fontWeight: 900 }}>
          Usuarios
        </Link>
      ) : null}
      {isSuper ? (
        <Link to="/admin/companies" style={{ fontWeight: 900 }}>
          Empresas
        </Link>
      ) : null}
    </div>
  );
}

async function fileToDataUrl(file) {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function CompaniesAdmin() {
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.role);
  const activeCompanyId = useAuthStore((s) => s.companyId);
  const user = useAuthStore((s) => s.user);
  const authUserId = useAuthStore((s) => s.userId);

  const tokenPayload = decodeJwtPayload(token);
  const fallbackUserId = tokenPayload?.sub || tokenPayload?.user_id || "";

  const userId =
    authUserId ||
    user?.user_id ||
    user?.id ||
    fallbackUserId ||
    "";

  const companyId =
    activeCompanyId ||
    user?.company_id ||
    user?.companyId ||
    tokenPayload?.company_id ||
    "";

  const r = String(role || "").toUpperCase();
  const isSuper = r === "SUPERADMIN";

  const [busy, setBusy] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [savingSelected, setSavingSelected] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");

  const [list, setList] = useState({ value: [], Count: 0 });
  const [selectedCompanyId, setSelectedCompanyId] = useState("");

  const [form, setForm] = useState({
    name: "",
    code: "",
    legal_name: "",
    city: "",
    state: "",
    country: "Mexico",
    email: "",
    website: "",
    medical_director: "",
    license_number: "",
    rfc: "",
    address: "",
    phone: "",
    logo_url: "",
    active: true,
  });

  if (!token) return <div style={{ padding: 16 }}>No autenticado.</div>;

  if (!isSuper) {
    return (
      <div style={{ padding: 16, color: "#b91c1c" }}>
        Acceso denegado (requiere SUPERADMIN).
      </div>
    );
  }

  async function load() {
    setErr("");
    setBusy(true);
    try {
      if (!userId) {
        throw new Error("No se pudo resolver userId de la sesión actual.");
      }

      const res = await api.adminCompaniesList({
        token,
        companyId,
        userId,
      });

      const normalized = normalizeListShape(res);
      setList(normalized);

      const preferredId =
        selectedCompanyId || activeCompanyId || normalized.value?.[0]?.id || "";
      if (preferredId) {
        setSelectedCompanyId(String(preferredId));
      }
    } catch (e) {
      setErr(
        e?.body ? JSON.stringify(e.body, null, 2) : e?.message || "Error cargando empresas"
      );
    } finally {
      setBusy(false);
    }
  }

  async function loadSelected(companyIdTarget) {
    if (!companyIdTarget) return;
    setErr("");
    try {
      if (!userId) {
        throw new Error("No se pudo resolver userId de la sesión actual.");
      }

      const data = await httpApi(`/admin/companies/${encodeURIComponent(companyIdTarget)}`, {
        method: "GET",
        token,
        companyId,
        userId,
      });

      setForm({
        name: data?.name || "",
        code: data?.code || "",
        legal_name: data?.legal_name || "",
        city: data?.city || "",
        state: data?.state || "",
        country: data?.country || "Mexico",
        email: data?.email || "",
        website: data?.website || "",
        medical_director: data?.medical_director || "",
        license_number: data?.license_number || "",
        rfc: data?.rfc || "",
        address: data?.address || "",
        phone: data?.phone || "",
        logo_url: data?.logo_url || "",
        active: data?.active ?? true,
      });
    } catch (e) {
      setErr(
        e?.body ? JSON.stringify(e.body, null, 2) : e?.message || "Error cargando empresa"
      );
    }
  }

  async function createCompany() {
    setErr("");

    if (!form.name.trim()) return setErr("Falta nombre visible");
    if (!form.code.trim()) return setErr("Falta código");
    if (!userId) return setErr("No se pudo resolver userId de la sesión actual.");

    setMutating(true);
    try {
      await api.adminCompanyCreate({
        payload: {
          name: form.name.trim(),
          code: form.code.trim(),
          legal_name: form.legal_name.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          country: form.country.trim() || "Mexico",
          email: form.email.trim(),
          website: form.website.trim(),
          medical_director: form.medical_director.trim(),
          license_number: form.license_number.trim(),
          rfc: form.rfc.trim(),
          address: form.address.trim(),
          phone: form.phone.trim(),
          logo_url: form.logo_url || "",
          active: !!form.active,
        },
        token,
        companyId,
        userId,
      });

      await load();

      setForm({
        name: "",
        code: "",
        legal_name: "",
        city: "",
        state: "",
        country: "Mexico",
        email: "",
        website: "",
        medical_director: "",
        license_number: "",
        rfc: "",
        address: "",
        phone: "",
        logo_url: "",
        active: true,
      });

      alert("Empresa creada ✅");
    } catch (e) {
      setErr(
        e?.body ? JSON.stringify(e.body, null, 2) : e?.message || "Error creando empresa"
      );
    } finally {
      setMutating(false);
    }
  }

  async function saveSelectedCompany() {
    if (!selectedCompanyId) return;
    setErr("");
    if (!userId) return setErr("No se pudo resolver userId de la sesión actual.");

    setSavingSelected(true);
    try {
      await httpApi(`/admin/companies/${encodeURIComponent(selectedCompanyId)}`, {
        method: "PATCH",
        token,
        companyId,
        userId,
        body: {
          name: form.name.trim(),
          code: form.code.trim(),
          legal_name: form.legal_name.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          country: form.country.trim() || "Mexico",
          email: form.email.trim(),
          website: form.website.trim(),
          medical_director: form.medical_director.trim(),
          license_number: form.license_number.trim(),
          rfc: form.rfc.trim(),
          address: form.address.trim(),
          phone: form.phone.trim(),
          logo_url: form.logo_url || "",
          active: !!form.active,
        },
      });

      await load();
      await loadSelected(selectedCompanyId);
      alert("Empresa actualizada ✅");
    } catch (e) {
      setErr(
        e?.body ? JSON.stringify(e.body, null, 2) : e?.message || "Error actualizando empresa"
      );
    } finally {
      setSavingSelected(false);
    }
  }

  async function onLogoSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await fileToDataUrl(file);
      setForm((prev) => ({ ...prev, logo_url: dataUrl }));
    } catch {
      setErr("No se pudo cargar el logo");
    }
  }

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return list.value || [];
    return (list.value || []).filter((c) => {
      const hay = [c.id, c.name, c.code, c.legal_name, c.rfc, c.email]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(t);
    });
  }, [list, q]);

  useEffect(() => {
    load();
  }, [token, companyId, userId]);

  useEffect(() => {
    if (selectedCompanyId) {
      loadSelected(selectedCompanyId);
    }
  }, [selectedCompanyId]);

  return (
    <div style={{ padding: 16, maxWidth: 1280, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "flex-start",
        }}
      >
        <div>
          <div style={{ fontWeight: 900, fontSize: 18 }}>
            SUPERADMIN · Empresas
          </div>
          <div style={{ marginTop: 8 }}>
            <TopNav />
          </div>
          <div style={{ marginTop: 10, color: "#6b7280", fontSize: 13 }}>
            Alta y edición completa de empresa.
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
            userId sesión: {userId || "(vacío)"} 
          </div>
        </div>

        <div style={{ display: "grid", gap: 10, justifyItems: "end" }}>
          <CompanySelector />
          <button
            onClick={load}
            disabled={busy || mutating || savingSelected}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #d1d5db",
              cursor:
                busy || mutating || savingSelected ? "not-allowed" : "pointer",
              background:
                busy || mutating || savingSelected ? "#f3f4f6" : "white",
              fontWeight: 800,
              width: 160,
            }}
          >
            {busy ? "Cargando…" : "Recargar"}
          </button>
        </div>
      </div>

      {err ? (
        <div
          style={{
            marginTop: 12,
            color: "#b91c1c",
            whiteSpace: "pre-wrap",
          }}
        >
          {err}
        </div>
      ) : null}

      <div
        style={{
          marginTop: 14,
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: 12,
            borderBottom: "1px solid #e5e7eb",
            background: "#f9fafb",
            fontWeight: 900,
          }}
        >
          Crear empresa
        </div>

        <div style={{ padding: 12, display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Input
              label="Nombre visible"
              value={form.name}
              onChange={(v) => setForm((p) => ({ ...p, name: v }))}
            />
            <Input
              label="Código"
              value={form.code}
              onChange={(v) => setForm((p) => ({ ...p, code: v }))}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Input
              label="Razón social"
              value={form.legal_name}
              onChange={(v) => setForm((p) => ({ ...p, legal_name: v }))}
            />
            <Input
              label="RFC"
              value={form.rfc}
              onChange={(v) => setForm((p) => ({ ...p, rfc: v }))}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Input
              label="Director médico"
              value={form.medical_director}
              onChange={(v) => setForm((p) => ({ ...p, medical_director: v }))}
            />
            <Input
              label="Número de licencia"
              value={form.license_number}
              onChange={(v) => setForm((p) => ({ ...p, license_number: v }))}
            />
          </div>

          <TextArea
            label="Dirección"
            value={form.address}
            onChange={(v) => setForm((p) => ({ ...p, address: v }))}
            rows={3}
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <Input
              label="Ciudad"
              value={form.city}
              onChange={(v) => setForm((p) => ({ ...p, city: v }))}
            />
            <Input
              label="Estado"
              value={form.state}
              onChange={(v) => setForm((p) => ({ ...p, state: v }))}
            />
            <Input
              label="País"
              value={form.country}
              onChange={(v) => setForm((p) => ({ ...p, country: v }))}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <Input
              label="Teléfono"
              value={form.phone}
              onChange={(v) => setForm((p) => ({ ...p, phone: v }))}
            />
            <Input
              label="Email"
              value={form.email}
              onChange={(v) => setForm((p) => ({ ...p, email: v }))}
            />
            <Input
              label="Website"
              value={form.website}
              onChange={(v) => setForm((p) => ({ ...p, website: v }))}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Input
              label="Logo URL"
              value={form.logo_url}
              onChange={(v) => setForm((p) => ({ ...p, logo_url: v }))}
            />

            <label style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
                Cargar logo
              </div>
              <input type="file" accept="image/*" onChange={onLogoSelected} />
            </label>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
            <input
              type="checkbox"
              checked={!!form.active}
              onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
            />
            Empresa activa
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={createCompany}
              disabled={mutating}
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                border: "none",
                background: "#111827",
                color: "white",
                fontWeight: 900,
                cursor: mutating ? "not-allowed" : "pointer",
                opacity: mutating ? 0.7 : 1,
              }}
            >
              {mutating ? "Creando…" : "Crear empresa"}
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: 12,
            borderBottom: "1px solid #e5e7eb",
            background: "#f9fafb",
            fontWeight: 900,
          }}
        >
          Empresas ({list.Count})
        </div>

        <div style={{ padding: 12, display: "grid", gap: 12 }}>
          <Input
            label="Buscar"
            value={q}
            onChange={setQ}
            placeholder="id / name / code / RFC / email..."
          />

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Name", "Code", "Legal name", "RFC", "Active", "Created", "ID"].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "10px 8px",
                        borderBottom: "1px solid #e5e7eb",
                        fontSize: 12,
                        color: "#6b7280",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedCompanyId(String(c.id))}
                    style={{
                      cursor: "pointer",
                      background: String(selectedCompanyId) === String(c.id) ? "#eff6ff" : "white",
                    }}
                  >
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f3f4f6" }}>
                      {c.name || ""}
                    </td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f3f4f6" }}>
                      {c.code || ""}
                    </td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f3f4f6" }}>
                      {c.legal_name || ""}
                    </td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f3f4f6" }}>
                      {c.rfc || ""}
                    </td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f3f4f6" }}>
                      {c.active ? "Sí" : "No"}
                    </td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f3f4f6" }}>
                      {formatDeviceDateTime(c.created_at, { fallback: "" })}
                    </td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f3f4f6" }}>
                      {c.id || ""}
                    </td>
                  </tr>
                ))}
                {!filtered.length ? (
                  <tr>
                    <td
                      colSpan={7}
                      style={{ padding: 14, color: "#6b7280", textAlign: "center" }}
                    >
                      Sin empresas.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {selectedCompanyId ? (
            <div
              style={{
                marginTop: 10,
                borderTop: "1px solid #e5e7eb",
                paddingTop: 12,
                display: "grid",
                gap: 12,
              }}
            >
              <div style={{ fontWeight: 900 }}>Editar empresa seleccionada</div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Input
                  label="Nombre visible"
                  value={form.name}
                  onChange={(v) => setForm((p) => ({ ...p, name: v }))}
                />
                <Input
                  label="Código"
                  value={form.code}
                  onChange={(v) => setForm((p) => ({ ...p, code: v }))}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Input
                  label="Razón social"
                  value={form.legal_name}
                  onChange={(v) => setForm((p) => ({ ...p, legal_name: v }))}
                />
                <Input
                  label="RFC"
                  value={form.rfc}
                  onChange={(v) => setForm((p) => ({ ...p, rfc: v }))}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Input
                  label="Director médico"
                  value={form.medical_director}
                  onChange={(v) => setForm((p) => ({ ...p, medical_director: v }))}
                />
                <Input
                  label="Número de licencia"
                  value={form.license_number}
                  onChange={(v) => setForm((p) => ({ ...p, license_number: v }))}
                />
              </div>

              <TextArea
                label="Dirección"
                value={form.address}
                onChange={(v) => setForm((p) => ({ ...p, address: v }))}
                rows={3}
              />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <Input
                  label="Ciudad"
                  value={form.city}
                  onChange={(v) => setForm((p) => ({ ...p, city: v }))}
                />
                <Input
                  label="Estado"
                  value={form.state}
                  onChange={(v) => setForm((p) => ({ ...p, state: v }))}
                />
                <Input
                  label="País"
                  value={form.country}
                  onChange={(v) => setForm((p) => ({ ...p, country: v }))}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <Input
                  label="Teléfono"
                  value={form.phone}
                  onChange={(v) => setForm((p) => ({ ...p, phone: v }))}
                />
                <Input
                  label="Email"
                  value={form.email}
                  onChange={(v) => setForm((p) => ({ ...p, email: v }))}
                />
                <Input
                  label="Website"
                  value={form.website}
                  onChange={(v) => setForm((p) => ({ ...p, website: v }))}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Input
                  label="Logo URL"
                  value={form.logo_url}
                  onChange={(v) => setForm((p) => ({ ...p, logo_url: v }))}
                />

                <label style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
                    Cargar logo
                  </div>
                  <input type="file" accept="image/*" onChange={onLogoSelected} />
                </label>
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
                <input
                  type="checkbox"
                  checked={!!form.active}
                  onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
                />
                Empresa activa
              </label>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={saveSelectedCompany}
                  disabled={savingSelected}
                  style={{
                    padding: "12px 16px",
                    borderRadius: 12,
                    border: "none",
                    background: "#111827",
                    color: "white",
                    fontWeight: 900,
                    cursor: savingSelected ? "not-allowed" : "pointer",
                    opacity: savingSelected ? 0.7 : 1,
                  }}
                >
                  {savingSelected ? "Guardando…" : "Guardar cambios"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}