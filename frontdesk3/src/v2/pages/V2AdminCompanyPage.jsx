import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { v2AdminApi } from "../api/admin";
import CompanyPdfConfigPage from "./CompanyPdfConfigPage";
import CompanySelector from "../../components/CompanySelector";

const card = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 16,
};

const grid3 = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: 12,
};

const grid2 = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
};

const field = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const label = {
  fontSize: 13,
  fontWeight: 700,
  color: "#374151",
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  outline: "none",
  boxSizing: "border-box",
};

const buttonPrimary = {
  borderRadius: 10,
  border: "1px solid #111827",
  background: "#111827",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
  padding: "10px 14px",
};

function emptyCompanyForm() {
  return {
    name: "",
    code: "",
    legal_name: "",
    rfc: "",
    address: "",
    city: "",
    state: "",
    country: "Mexico",
    phone: "",
    email: "",
    website: "",
    medical_director: "",
    license_number: "",
    logo_url: "",
    active: true,
  };
}

function safeValue(value, fallback = "") {
  return value ?? fallback;
}

function CompanyField({ title, value, onChange, type = "text" }) {
  return (
    <div style={field}>
      <div style={label}>{title}</div>
      <input
        type={type}
        style={inputStyle}
        value={safeValue(value)}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export default function V2AdminCompanyPage({ session }) {
  const navigate = useNavigate();
  const authCompanyName = useAuthStore((s) => s.companyName);
  const authCompanyCode = useAuthStore((s) => s.companyCode);
  const setCompanyContext = useAuthStore((s) => s.setCompanyContext);

  const role = String(session?.role || "").toUpperCase();
  const isSuper = role === "SUPERADMIN";
  const canManagePdfConfig = role === "SUPERADMIN" || role === "ADMIN";

  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(
    session?.companyId || ""
  );

  const [form, setForm] = useState(emptyCompanyForm());
  const [createForm, setCreateForm] = useState(emptyCompanyForm());

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setCreateField(key, value) {
    setCreateForm((prev) => ({ ...prev, [key]: value }));
  }

  function fillForm(data) {
    setForm({
      name: safeValue(data?.name),
      code: safeValue(data?.code),
      legal_name: safeValue(data?.legal_name),
      rfc: safeValue(data?.rfc),
      address: safeValue(data?.address),
      city: safeValue(data?.city),
      state: safeValue(data?.state),
      country: safeValue(data?.country, "Mexico") || "Mexico",
      phone: safeValue(data?.phone),
      email: safeValue(data?.email),
      website: safeValue(data?.website),
      medical_director: safeValue(data?.medical_director),
      license_number: safeValue(data?.license_number),
      logo_url: safeValue(data?.logo_url),
      active: data?.active ?? true,
    });
  }

  async function loadCompanies() {
    const list = await v2AdminApi.companiesList({
      token: session?.token,
      companyId: session?.companyId,
      userId: session?.userId,
    });
    const safeList = Array.isArray(list) ? list : [];
    setCompanies(safeList);
    return safeList;
  }

  async function loadCompanyById(companyIdTarget) {
    if (!companyIdTarget) return;
    const data = await v2AdminApi.companyGet({
      companyIdTarget,
      token: session?.token,
      companyId: session?.companyId,
      userId: session?.userId,
    });
    fillForm(data);
  }

  async function load() {
    if (!isSuper) {
      setLoaded(true);
      return;
    }

    setBusy(true);
    setError("");

    try {
      const list = await loadCompanies();
      let targetId = selectedCompanyId || session?.companyId || "";

      if (!targetId && list.length > 0) {
        targetId = list[0].id;
      }

      setSelectedCompanyId(targetId);

      if (targetId) {
        await loadCompanyById(targetId);
      }

      setLoaded(true);
    } catch (e) {
      setError(e?.body?.detail || e?.message || "No se pudo cargar empresas");
      setLoaded(true);
    } finally {
      setBusy(false);
    }
  }

  async function onChangeSelectedCompany(nextId) {
    setSelectedCompanyId(nextId);
    if (!nextId) return;

    const current = companies.find((x) => x.id === nextId);
    if (isSuper) {
      setCompanyContext({
        companyId: nextId,
        companyName: current?.name || "",
        companyCode: current?.code || "",
        companyLogoUrl: current?.logo_url || "",
      });
    }

    setBusy(true);
    setError("");
    try {
      await loadCompanyById(nextId);
    } catch (e) {
      setError(e?.body?.detail || e?.message || "No se pudo cargar empresa");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!isSuper) return;
    if (!selectedCompanyId) {
      setError("No hay empresa seleccionada");
      return;
    }
    if (!form.name.trim()) {
      setError("Falta nombre");
      return;
    }
    if (!form.code.trim()) {
      setError("Falta código");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const data = await v2AdminApi.companyPatch({
        companyIdTarget: selectedCompanyId,
        payload: {
          name: form.name.trim(),
          code: form.code.trim(),
          legal_name: form.legal_name.trim(),
          rfc: form.rfc.trim(),
          address: form.address.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          country: form.country.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          website: form.website.trim(),
          medical_director: form.medical_director.trim(),
          license_number: form.license_number.trim(),
          logo_url: form.logo_url.trim(),
          active: !!form.active,
        },
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
      });

      fillForm(data);
      await loadCompanies();
    } catch (e) {
      setError(e?.body?.detail || e?.message || "No se pudo guardar empresa");
    } finally {
      setSaving(false);
    }
  }

  async function createCompany() {
    if (!isSuper) return;
    if (!createForm.name.trim()) {
      setError("Falta nombre de la nueva empresa");
      return;
    }
    if (!createForm.code.trim()) {
      setError("Falta código de la nueva empresa");
      return;
    }

    setCreating(true);
    setError("");

    try {
      const data = await v2AdminApi.companyCreate({
        payload: {
          name: createForm.name.trim(),
          code: createForm.code.trim(),
          legal_name: createForm.legal_name.trim(),
          rfc: createForm.rfc.trim(),
          address: createForm.address.trim(),
          city: createForm.city.trim(),
          state: createForm.state.trim(),
          country: createForm.country.trim(),
          phone: createForm.phone.trim(),
          email: createForm.email.trim(),
          website: createForm.website.trim(),
          medical_director: createForm.medical_director.trim(),
          license_number: createForm.license_number.trim(),
          logo_url: createForm.logo_url.trim(),
          active: !!createForm.active,
        },
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
      });

      await loadCompanies();
      const newCompanyId = data?.id || "";
      setSelectedCompanyId(newCompanyId);
      fillForm(data);
      setCreateForm(emptyCompanyForm());

      setCompanyContext({
        companyId: newCompanyId,
        companyName: data?.name || "",
        companyCode: data?.code || "",
        companyLogoUrl: data?.logo_url || "",
      });

      navigate("/v2/admin/usuarios");
    } catch (e) {
      setError(e?.body?.detail || e?.message || "No se pudo crear empresa");
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => {
    load();
  }, [session?.companyId, isSuper]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gap: 10 }}>
        <div>
          <h2 style={{ margin: "0 0 6px 0" }}>Empresa</h2>
          <div style={{ color: "#6b7280" }}>
            Branding y datos generales de la empresa activa.
          </div>
        </div>

        {isSuper ? <CompanySelector /> : null}

        {isSuper && session?.companyName ? (
          <div style={{ color: "#111827", fontWeight: 700 }}>
            Empresa activa: {session.companyName}
            {session?.companyCode ? ` (${session.companyCode})` : ""}
          </div>
        ) : null}
      </div>

      {error ? (
        <div style={{ color: "#b91c1c", whiteSpace: "pre-wrap" }}>{error}</div>
      ) : null}

      {!isSuper ? (
        <div style={card}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Vista actual</div>
          <div>
            <strong>Empresa:</strong> {authCompanyName || session?.companyId || "-"}
          </div>
          <div style={{ marginTop: 8 }}>
            <strong>Código:</strong> {authCompanyCode || "-"}
          </div>
          <div style={{ marginTop: 12, color: "#6b7280" }}>
            La edición y creación de empresas está protegida para SUPERADMIN por backend.
          </div>
        </div>
      ) : null}

      {isSuper ? (
        <>
          <div style={card}>
            <div style={{ fontWeight: 800, marginBottom: 12 }}>
              Crear nueva empresa
            </div>

            <div style={grid3}>
              <CompanyField
                title="Nombre comercial"
                value={createForm.name}
                onChange={(v) => setCreateField("name", v)}
              />
              <CompanyField
                title="Código"
                value={createForm.code}
                onChange={(v) => setCreateField("code", v)}
              />
              <CompanyField
                title="RFC"
                value={createForm.rfc}
                onChange={(v) => setCreateField("rfc", v)}
              />
            </div>

            <div style={{ ...grid2, marginTop: 10 }}>
              <CompanyField
                title="Razón social"
                value={createForm.legal_name}
                onChange={(v) => setCreateField("legal_name", v)}
              />
              <CompanyField
                title="Director médico"
                value={createForm.medical_director}
                onChange={(v) => setCreateField("medical_director", v)}
              />
            </div>

            <div style={{ ...grid3, marginTop: 10 }}>
              <CompanyField
                title="Dirección"
                value={createForm.address}
                onChange={(v) => setCreateField("address", v)}
              />
              <CompanyField
                title="Ciudad"
                value={createForm.city}
                onChange={(v) => setCreateField("city", v)}
              />
              <CompanyField
                title="Estado"
                value={createForm.state}
                onChange={(v) => setCreateField("state", v)}
              />
            </div>

            <div style={{ ...grid3, marginTop: 10 }}>
              <CompanyField
                title="País"
                value={createForm.country}
                onChange={(v) => setCreateField("country", v)}
              />
              <CompanyField
                title="Teléfono"
                value={createForm.phone}
                onChange={(v) => setCreateField("phone", v)}
              />
              <CompanyField
                title="Email"
                value={createForm.email}
                onChange={(v) => setCreateField("email", v)}
              />
            </div>

            <div style={{ ...grid3, marginTop: 10 }}>
              <CompanyField
                title="Sitio web"
                value={createForm.website}
                onChange={(v) => setCreateField("website", v)}
              />
              <CompanyField
                title="Licencia sanitaria"
                value={createForm.license_number}
                onChange={(v) => setCreateField("license_number", v)}
              />
              <CompanyField
                title="Logo URL"
                value={createForm.logo_url}
                onChange={(v) => setCreateField("logo_url", v)}
              />
            </div>

            <div
              style={{
                marginTop: 12,
                display: "flex",
                gap: 12,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <label
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  fontWeight: 700,
                }}
              >
                <input
                  type="checkbox"
                  checked={createForm.active}
                  onChange={(e) => setCreateField("active", e.target.checked)}
                />
                Activa
              </label>

              <button
                onClick={createCompany}
                disabled={creating}
                style={{ ...buttonPrimary, opacity: creating ? 0.7 : 1 }}
              >
                {creating ? "Creando..." : "Crear empresa"}
              </button>
            </div>
          </div>

          <div style={card}>
            <div style={{ fontWeight: 800, marginBottom: 12 }}>
              Editar empresa
            </div>

            <div style={{ marginBottom: 12 }}>
              <select
                style={inputStyle}
                value={selectedCompanyId}
                onChange={(e) => onChangeSelectedCompany(e.target.value)}
              >
                <option value="">Selecciona empresa</option>
                {companies.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.code})
                  </option>
                ))}
              </select>
            </div>

            {!loaded && busy ? (
              <div>Cargando...</div>
            ) : (
              <>
                <div style={grid3}>
                  <CompanyField
                    title="Nombre comercial"
                    value={form.name}
                    onChange={(v) => setField("name", v)}
                  />
                  <CompanyField
                    title="Código"
                    value={form.code}
                    onChange={(v) => setField("code", v)}
                  />
                  <CompanyField
                    title="RFC"
                    value={form.rfc}
                    onChange={(v) => setField("rfc", v)}
                  />
                </div>

                <div style={{ ...grid2, marginTop: 10 }}>
                  <CompanyField
                    title="Razón social"
                    value={form.legal_name}
                    onChange={(v) => setField("legal_name", v)}
                  />
                  <CompanyField
                    title="Director médico"
                    value={form.medical_director}
                    onChange={(v) => setField("medical_director", v)}
                  />
                </div>

                <div style={{ ...grid3, marginTop: 10 }}>
                  <CompanyField
                    title="Dirección"
                    value={form.address}
                    onChange={(v) => setField("address", v)}
                  />
                  <CompanyField
                    title="Ciudad"
                    value={form.city}
                    onChange={(v) => setField("city", v)}
                  />
                  <CompanyField
                    title="Estado"
                    value={form.state}
                    onChange={(v) => setField("state", v)}
                  />
                </div>

                <div style={{ ...grid3, marginTop: 10 }}>
                  <CompanyField
                    title="País"
                    value={form.country}
                    onChange={(v) => setField("country", v)}
                  />
                  <CompanyField
                    title="Teléfono"
                    value={form.phone}
                    onChange={(v) => setField("phone", v)}
                  />
                  <CompanyField
                    title="Email"
                    value={form.email}
                    onChange={(v) => setField("email", v)}
                  />
                </div>

                <div style={{ ...grid3, marginTop: 10 }}>
                  <CompanyField
                    title="Sitio web"
                    value={form.website}
                    onChange={(v) => setField("website", v)}
                  />
                  <CompanyField
                    title="Licencia sanitaria"
                    value={form.license_number}
                    onChange={(v) => setField("license_number", v)}
                  />
                  <CompanyField
                    title="Logo URL"
                    value={form.logo_url}
                    onChange={(v) => setField("logo_url", v)}
                  />
                </div>

                <div
                  style={{
                    marginTop: 12,
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      fontWeight: 700,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) => setField("active", e.target.checked)}
                    />
                    Activa
                  </label>

                  <button
                    onClick={save}
                    disabled={saving || !selectedCompanyId}
                    style={{
                      ...buttonPrimary,
                      opacity: saving || !selectedCompanyId ? 0.7 : 1,
                      cursor:
                        saving || !selectedCompanyId ? "not-allowed" : "pointer",
                    }}
                  >
                    {saving ? "Guardando..." : "Guardar empresa"}
                  </button>
                </div>

                {form.logo_url ? (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>
                      Vista logo
                    </div>
                    <img
                      src={form.logo_url}
                      alt="logo"
                      style={{
                        maxHeight: 90,
                        maxWidth: 240,
                        objectFit: "contain",
                        border: "1px solid #e5e7eb",
                        borderRadius: 10,
                        background: "#fff",
                        padding: 8,
                      }}
                    />
                  </div>
                ) : null}
              </>
            )}
          </div>
        </>
      ) : null}

      {canManagePdfConfig ? (
        <CompanyPdfConfigPage session={session} />
      ) : null}
    </div>
  );
}