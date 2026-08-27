import React, { useEffect, useState } from "react";
import { v2AdminApi } from "../api/admin";
import { useAuthStore } from "../../store/authStore";
import CompanySelector from "../../components/CompanySelector";

const card = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 16,
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  outline: "none",
};

export default function V2AdminHospitalsPage({ session }) {
  const role = useAuthStore((s) => s.role);
  const companyName = useAuthStore((s) => s.companyName);
  const companyCode = useAuthStore((s) => s.companyCode);
  const isSuper = String(role || "").toUpperCase() === "SUPERADMIN";

  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    level: "",
    address: "",
    phone: "",
    trauma_center: false,
    notes: "",
    active: true,
  });

  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState({
    name: "",
    level: "",
    address: "",
    phone: "",
    trauma_center: false,
    notes: "",
    active: true,
  });


  if (isSuper && !session?.companyId) {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 18 }}>Hospitales</div>
        <CompanySelector />
        <div style={{ color: "#6b7280" }}>
          Selecciona una empresa para administrar este catálogo.
        </div>
      </div>
    );
  }

  async function load() {
    setBusy(true);
    setError("");
    try {
      const data = await v2AdminApi.hospitalsList({
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
      });
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.body?.detail || e?.message || "No se pudieron cargar hospitales");
    } finally {
      setBusy(false);
    }
  }

  async function createItem() {
    if (!form.name.trim()) return setError("Falta nombre del hospital");

    setSaving(true);
    setError("");
    try {
      await v2AdminApi.hospitalsCreate({
        payload: {
          name: form.name.trim(),
          level: form.level.trim(),
          address: form.address.trim(),
          phone: form.phone.trim(),
          trauma_center: !!form.trauma_center,
          notes: form.notes.trim(),
          active: !!form.active,
        },
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
      });

      setForm({
        name: "",
        level: "",
        address: "",
        phone: "",
        trauma_center: false,
        notes: "",
        active: true,
      });

      await load();
    } catch (e) {
      setError(e?.body?.detail || e?.message || "No se pudo crear hospital");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(row) {
    setEditingId(row.id);
    setEditForm({
      name: row.name || "",
      level: row.level || "",
      address: row.address || "",
      phone: row.phone || "",
      trauma_center: !!row.trauma_center,
      notes: row.notes || "",
      active: !!row.active,
    });
    setError("");
  }

  function cancelEdit() {
    setEditingId("");
    setEditForm({
      name: "",
      level: "",
      address: "",
      phone: "",
      trauma_center: false,
      notes: "",
      active: true,
    });
  }

  async function saveEdit(hospitalId) {
    if (!editForm.name.trim()) return setError("Falta nombre del hospital");

    setError("");
    try {
      await v2AdminApi.hospitalsPatch({
        hospitalId,
        payload: {
          name: editForm.name.trim(),
          level: editForm.level.trim(),
          address: editForm.address.trim(),
          phone: editForm.phone.trim(),
          trauma_center: !!editForm.trauma_center,
          notes: editForm.notes.trim(),
          active: !!editForm.active,
        },
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
      });

      cancelEdit();
      await load();
    } catch (e) {
      setError(e?.body?.detail || e?.message || "No se pudo actualizar hospital");
    }
  }

  async function toggleActive(row) {
    setError("");
    try {
      await v2AdminApi.hospitalsPatch({
        hospitalId: row.id,
        payload: {
          active: !row.active,
        },
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
      });
      await load();
    } catch (e) {
      setError(e?.body?.detail || e?.message || "No se pudo actualizar hospital");
    }
  }

  useEffect(() => {
    load();
  }, [session?.companyId]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gap: 10 }}>
        <div>
          <h2 style={{ margin: "0 0 6px 0" }}>Hospitales</h2>
          <div style={{ color: "#6b7280" }}>
            Administración de hospitales V2 por empresa.
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

      {error ? <div style={{ color: "#b91c1c", whiteSpace: "pre-wrap" }}>{error}</div> : null}

      <div style={card}>
        <div style={{ fontWeight: 800, marginBottom: 12 }}>Crear hospital</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <input
            style={inputStyle}
            placeholder="Nombre"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            style={inputStyle}
            placeholder="Nivel"
            value={form.level}
            onChange={(e) => setForm({ ...form, level: e.target.value })}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
          <input
            style={inputStyle}
            placeholder="Dirección"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <input
            style={inputStyle}
            placeholder="Teléfono"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>

        <textarea
          style={{ ...inputStyle, marginTop: 10, minHeight: 90 }}
          placeholder="Notas"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />

        <div style={{ display: "flex", gap: 16, marginTop: 10, alignItems: "center" }}>
          <label style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={!!form.trauma_center}
              onChange={(e) => setForm({ ...form, trauma_center: e.target.checked })}
            />
            Trauma center
          </label>

          <label style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={!!form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            Activo
          </label>
        </div>

        <div style={{ marginTop: 12 }}>
          <button
            onClick={createItem}
            disabled={saving}
            style={{
              borderRadius: 10,
              border: "1px solid #111827",
              background: saving ? "#e5e7eb" : "#111827",
              color: "#fff",
              fontWeight: 800,
              cursor: saving ? "not-allowed" : "pointer",
              padding: "10px 16px",
            }}
          >
            {saving ? "Guardando..." : "Crear"}
          </button>
        </div>
      </div>

      <div style={card}>
        <div style={{ fontWeight: 800, marginBottom: 12 }}>
          Hospitales registrados ({items.length})
        </div>

        {busy ? (
          <div>Cargando...</div>
        ) : !items.length ? (
          <div style={{ color: "#6b7280" }}>No hay hospitales registrados.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  <th style={th}>Nombre</th>
                  <th style={th}>Nivel</th>
                  <th style={th}>Dirección</th>
                  <th style={th}>Teléfono</th>
                  <th style={th}>Trauma</th>
                  <th style={th}>Activo</th>
                  <th style={th}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
                  const editing = editingId === row.id;

                  return (
                    <tr key={row.id}>
                      <td style={td}>
                        {editing ? (
                          <input
                            style={inputStyle}
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          />
                        ) : (
                          row.name
                        )}
                      </td>

                      <td style={td}>
                        {editing ? (
                          <input
                            style={inputStyle}
                            value={editForm.level}
                            onChange={(e) => setEditForm({ ...editForm, level: e.target.value })}
                          />
                        ) : (
                          row.level || ""
                        )}
                      </td>

                      <td style={td}>
                        {editing ? (
                          <input
                            style={inputStyle}
                            value={editForm.address}
                            onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                          />
                        ) : (
                          row.address || ""
                        )}
                      </td>

                      <td style={td}>
                        {editing ? (
                          <input
                            style={inputStyle}
                            value={editForm.phone}
                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          />
                        ) : (
                          row.phone || ""
                        )}
                      </td>

                      <td style={td}>
                        {editing ? (
                          <label style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                            <input
                              type="checkbox"
                              checked={!!editForm.trauma_center}
                              onChange={(e) =>
                                setEditForm({ ...editForm, trauma_center: e.target.checked })
                              }
                            />
                            {editForm.trauma_center ? "Sí" : "No"}
                          </label>
                        ) : row.trauma_center ? (
                          "Sí"
                        ) : (
                          "No"
                        )}
                      </td>

                      <td style={td}>
                        {editing ? (
                          <label style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                            <input
                              type="checkbox"
                              checked={!!editForm.active}
                              onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
                            />
                            {editForm.active ? "Sí" : "No"}
                          </label>
                        ) : row.active ? (
                          "Sí"
                        ) : (
                          "No"
                        )}
                      </td>

                      <td style={td}>
                        {editing ? (
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => saveEdit(row.id)}>Guardar</button>
                            <button onClick={cancelEdit}>Cancelar</button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => startEdit(row)}>Editar</button>
                            <button onClick={() => toggleActive(row)}>
                              {row.active ? "Desactivar" : "Activar"}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const th = {
  textAlign: "left",
  padding: 10,
  borderBottom: "1px solid #e5e7eb",
};

const td = {
  padding: 10,
  borderBottom: "1px solid #f3f4f6",
  verticalAlign: "top",
};