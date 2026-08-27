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

export default function V2AdminSuppliesPage({ session }) {
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
    category: "general",
    unit_label: "pieza",
    sku: "",
    default_unit_cost: "",
    notes: "",
    active: true,
  });

  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState({
    name: "",
    category: "general",
    unit_label: "pieza",
    sku: "",
    default_unit_cost: "",
    notes: "",
    active: true,
  });


  if (isSuper && !session?.companyId) {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 18 }}>Insumos</div>
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
      const data = await v2AdminApi.suppliesList({
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
      });
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.body?.detail || e?.message || "No se pudieron cargar insumos");
    } finally {
      setBusy(false);
    }
  }

  async function createItem() {
    if (!form.name.trim()) return setError("Falta nombre del insumo");

    setSaving(true);
    setError("");
    try {
      await v2AdminApi.suppliesCreate({
        payload: {
          name: form.name.trim(),
          category: form.category.trim() || "general",
          unit_label: form.unit_label.trim() || "pieza",
          sku: form.sku.trim(),
          default_unit_cost: Number(form.default_unit_cost || 0),
          notes: form.notes.trim(),
          active: !!form.active,
        },
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
      });

      setForm({
        name: "",
        category: "general",
        unit_label: "pieza",
        sku: "",
        default_unit_cost: "",
        notes: "",
        active: true,
      });

      await load();
    } catch (e) {
      setError(e?.body?.detail || e?.message || "No se pudo crear insumo");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(row) {
    setEditingId(row.id);
    setEditForm({
      name: row.name || "",
      category: row.category || "general",
      unit_label: row.unit_label || "pieza",
      sku: row.sku || "",
      default_unit_cost: row.default_unit_cost ?? "",
      notes: row.notes || "",
      active: !!row.active,
    });
    setError("");
  }

  function cancelEdit() {
    setEditingId("");
    setEditForm({
      name: "",
      category: "general",
      unit_label: "pieza",
      sku: "",
      default_unit_cost: "",
      notes: "",
      active: true,
    });
  }

  async function saveEdit(supplyId) {
    if (!editForm.name.trim()) return setError("Falta nombre del insumo");

    setError("");
    try {
      await v2AdminApi.suppliesPatch({
        supplyId,
        payload: {
          name: editForm.name.trim(),
          category: editForm.category.trim() || "general",
          unit_label: editForm.unit_label.trim() || "pieza",
          sku: editForm.sku.trim(),
          default_unit_cost: Number(editForm.default_unit_cost || 0),
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
      setError(e?.body?.detail || e?.message || "No se pudo actualizar insumo");
    }
  }

  async function toggleActive(row) {
    setError("");
    try {
      await v2AdminApi.suppliesPatch({
        supplyId: row.id,
        payload: {
          active: !row.active,
        },
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
      });
      await load();
    } catch (e) {
      setError(e?.body?.detail || e?.message || "No se pudo actualizar insumo");
    }
  }

  useEffect(() => {
    load();
  }, [session?.companyId]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gap: 10 }}>
        <div>
          <h2 style={{ margin: "0 0 6px 0" }}>Insumos</h2>
          <div style={{ color: "#6b7280" }}>
            Administración de insumos V2 por empresa.
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
        <div style={{ fontWeight: 800, marginBottom: 12 }}>Crear insumo</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <input
            style={inputStyle}
            placeholder="Nombre"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            style={inputStyle}
            placeholder="Categoría"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
          <input
            style={inputStyle}
            placeholder="Unidad"
            value={form.unit_label}
            onChange={(e) => setForm({ ...form, unit_label: e.target.value })}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
          <input
            style={inputStyle}
            placeholder="SKU"
            value={form.sku}
            onChange={(e) => setForm({ ...form, sku: e.target.value })}
          />
          <input
            style={inputStyle}
            placeholder="Costo unitario"
            type="number"
            step="0.01"
            value={form.default_unit_cost}
            onChange={(e) => setForm({ ...form, default_unit_cost: e.target.value })}
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
          Insumos registrados ({items.length})
        </div>

        {busy ? (
          <div>Cargando...</div>
        ) : !items.length ? (
          <div style={{ color: "#6b7280" }}>No hay insumos registrados.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  <th style={th}>Nombre</th>
                  <th style={th}>Categoría</th>
                  <th style={th}>Unidad</th>
                  <th style={th}>SKU</th>
                  <th style={th}>Costo</th>
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
                            value={editForm.category}
                            onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                          />
                        ) : (
                          row.category || ""
                        )}
                      </td>

                      <td style={td}>
                        {editing ? (
                          <input
                            style={inputStyle}
                            value={editForm.unit_label}
                            onChange={(e) => setEditForm({ ...editForm, unit_label: e.target.value })}
                          />
                        ) : (
                          row.unit_label || ""
                        )}
                      </td>

                      <td style={td}>
                        {editing ? (
                          <input
                            style={inputStyle}
                            value={editForm.sku}
                            onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })}
                          />
                        ) : (
                          row.sku || ""
                        )}
                      </td>

                      <td style={td}>
                        {editing ? (
                          <input
                            style={inputStyle}
                            type="number"
                            step="0.01"
                            value={editForm.default_unit_cost}
                            onChange={(e) =>
                              setEditForm({ ...editForm, default_unit_cost: e.target.value })
                            }
                          />
                        ) : (
                          row.default_unit_cost ?? 0
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