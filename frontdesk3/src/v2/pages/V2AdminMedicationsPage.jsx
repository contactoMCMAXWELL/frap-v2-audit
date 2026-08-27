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

export default function V2AdminMedicationsPage({ session }) {
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
    presentation: "",
    concentration: "",
    route: "",
    default_dose: "",
    notes: "",
    active: true,
  });

  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState({
    name: "",
    presentation: "",
    concentration: "",
    route: "",
    default_dose: "",
    notes: "",
    active: true,
  });


  if (isSuper && !session?.companyId) {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 18 }}>Medicamentos</div>
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
      const data = await v2AdminApi.medicationsList({
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
      });
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.body?.detail || e?.message || "No se pudieron cargar medicamentos");
    } finally {
      setBusy(false);
    }
  }

  async function createItem() {
    if (!form.name.trim()) return setError("Falta nombre del medicamento");

    setSaving(true);
    setError("");
    try {
      await v2AdminApi.medicationsCreate({
        payload: {
          name: form.name.trim(),
          presentation: form.presentation.trim(),
          concentration: form.concentration.trim(),
          route: form.route.trim(),
          default_dose: form.default_dose.trim(),
          notes: form.notes.trim(),
          active: !!form.active,
        },
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
      });

      setForm({
        name: "",
        presentation: "",
        concentration: "",
        route: "",
        default_dose: "",
        notes: "",
        active: true,
      });

      await load();
    } catch (e) {
      setError(e?.body?.detail || e?.message || "No se pudo crear medicamento");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(row) {
    setEditingId(row.id);
    setEditForm({
      name: row.name || "",
      presentation: row.presentation || "",
      concentration: row.concentration || "",
      route: row.route || "",
      default_dose: row.default_dose || "",
      notes: row.notes || "",
      active: !!row.active,
    });
    setError("");
  }

  function cancelEdit() {
    setEditingId("");
    setEditForm({
      name: "",
      presentation: "",
      concentration: "",
      route: "",
      default_dose: "",
      notes: "",
      active: true,
    });
  }

  async function saveEdit(medicationId) {
    if (!editForm.name.trim()) return setError("Falta nombre del medicamento");

    setError("");
    try {
      await v2AdminApi.medicationsPatch({
        medicationId,
        payload: {
          name: editForm.name.trim(),
          presentation: editForm.presentation.trim(),
          concentration: editForm.concentration.trim(),
          route: editForm.route.trim(),
          default_dose: editForm.default_dose.trim(),
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
      setError(e?.body?.detail || e?.message || "No se pudo actualizar medicamento");
    }
  }

  async function toggleActive(row) {
    setError("");
    try {
      await v2AdminApi.medicationsPatch({
        medicationId: row.id,
        payload: {
          active: !row.active,
        },
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
      });
      await load();
    } catch (e) {
      setError(e?.body?.detail || e?.message || "No se pudo actualizar medicamento");
    }
  }

  useEffect(() => {
    load();
  }, [session?.companyId]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gap: 10 }}>
        <div>
          <h2 style={{ margin: "0 0 6px 0" }}>Medicamentos</h2>
          <div style={{ color: "#6b7280" }}>
            Administración de medicamentos V2 por empresa.
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
        <div style={{ fontWeight: 800, marginBottom: 12 }}>Crear medicamento</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <input
            style={inputStyle}
            placeholder="Nombre"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            style={inputStyle}
            placeholder="Presentación"
            value={form.presentation}
            onChange={(e) => setForm({ ...form, presentation: e.target.value })}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 10 }}>
          <input
            style={inputStyle}
            placeholder="Concentración"
            value={form.concentration}
            onChange={(e) => setForm({ ...form, concentration: e.target.value })}
          />
          <input
            style={inputStyle}
            placeholder="Vía"
            value={form.route}
            onChange={(e) => setForm({ ...form, route: e.target.value })}
          />
          <input
            style={inputStyle}
            placeholder="Dosis por defecto"
            value={form.default_dose}
            onChange={(e) => setForm({ ...form, default_dose: e.target.value })}
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
          Medicamentos registrados ({items.length})
        </div>

        {busy ? (
          <div>Cargando...</div>
        ) : !items.length ? (
          <div style={{ color: "#6b7280" }}>No hay medicamentos registrados.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  <th style={th}>Nombre</th>
                  <th style={th}>Presentación</th>
                  <th style={th}>Concentración</th>
                  <th style={th}>Vía</th>
                  <th style={th}>Dosis default</th>
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
                            value={editForm.presentation}
                            onChange={(e) =>
                              setEditForm({ ...editForm, presentation: e.target.value })
                            }
                          />
                        ) : (
                          row.presentation || ""
                        )}
                      </td>

                      <td style={td}>
                        {editing ? (
                          <input
                            style={inputStyle}
                            value={editForm.concentration}
                            onChange={(e) =>
                              setEditForm({ ...editForm, concentration: e.target.value })
                            }
                          />
                        ) : (
                          row.concentration || ""
                        )}
                      </td>

                      <td style={td}>
                        {editing ? (
                          <input
                            style={inputStyle}
                            value={editForm.route}
                            onChange={(e) => setEditForm({ ...editForm, route: e.target.value })}
                          />
                        ) : (
                          row.route || ""
                        )}
                      </td>

                      <td style={td}>
                        {editing ? (
                          <input
                            style={inputStyle}
                            value={editForm.default_dose}
                            onChange={(e) =>
                              setEditForm({ ...editForm, default_dose: e.target.value })
                            }
                          />
                        ) : (
                          row.default_dose || ""
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