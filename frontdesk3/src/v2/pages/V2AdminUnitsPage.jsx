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

export default function V2AdminUnitsPage({ session }) {
  const role = useAuthStore((s) => s.role);
  const companyName = useAuthStore((s) => s.companyName);
  const companyCode = useAuthStore((s) => s.companyCode);
  const isSuper = String(role || "").toUpperCase() === "SUPERADMIN";

  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    unit_code: "",
    type: "",
    plate: "",
    active: true,
  });

  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState({
    unit_code: "",
    type: "",
    plate: "",
    active: true,
  });


  if (isSuper && !session?.companyId) {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 18 }}>Unidades</div>
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
      const data = await v2AdminApi.unitsAdminList({
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
      });
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.body?.detail || e?.message || "No se pudieron cargar unidades");
    } finally {
      setBusy(false);
    }
  }

  async function createItem() {
    if (!form.unit_code.trim()) return setError("Falta código de unidad");
    setSaving(true);
    setError("");
    try {
      await v2AdminApi.unitsAdminCreate({
        payload: {
          unit_code: form.unit_code.trim(),
          type: form.type.trim(),
          plate: form.plate.trim(),
          active: !!form.active,
        },
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
      });

      setForm({
        unit_code: "",
        type: "",
        plate: "",
        active: true,
      });

      await load();
    } catch (e) {
      setError(e?.body?.detail || e?.message || "No se pudo crear unidad");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(row) {
    setEditingId(row.id);
    setEditForm({
      unit_code: row.unit_code || "",
      type: row.type || "",
      plate: row.plate || "",
      active: !!row.active,
    });
    setError("");
  }

  function cancelEdit() {
    setEditingId("");
    setEditForm({
      unit_code: "",
      type: "",
      plate: "",
      active: true,
    });
  }

  async function saveEdit(unitId) {
    if (!editForm.unit_code.trim()) return setError("Falta código de unidad");
    setError("");
    try {
      await v2AdminApi.unitsAdminPatch({
        unitId,
        payload: {
          unit_code: editForm.unit_code.trim(),
          type: editForm.type.trim(),
          plate: editForm.plate.trim(),
          active: !!editForm.active,
        },
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
      });
      cancelEdit();
      await load();
    } catch (e) {
      setError(e?.body?.detail || e?.message || "No se pudo actualizar unidad");
    }
  }

  async function toggleActive(row) {
    setError("");
    try {
      await v2AdminApi.unitsAdminPatch({
        unitId: row.id,
        payload: {
          active: !row.active,
        },
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
      });
      await load();
    } catch (e) {
      setError(e?.body?.detail || e?.message || "No se pudo actualizar unidad");
    }
  }

  useEffect(() => {
    load();
  }, [session?.companyId]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gap: 10 }}>
        <div>
          <h2 style={{ margin: "0 0 6px 0" }}>Unidades</h2>
          <div style={{ color: "#6b7280" }}>
            Administración de unidades V2 por empresa.
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
        <div style={{ fontWeight: 800, marginBottom: 12 }}>Crear unidad</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 160px", gap: 10 }}>
          <input
            style={inputStyle}
            placeholder="Código unidad"
            value={form.unit_code}
            onChange={(e) => setForm({ ...form, unit_code: e.target.value })}
          />
          <input
            style={inputStyle}
            placeholder="Tipo"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          />
          <input
            style={inputStyle}
            placeholder="Placa"
            value={form.plate}
            onChange={(e) => setForm({ ...form, plate: e.target.value })}
          />
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
            }}
          >
            {saving ? "Guardando..." : "Crear"}
          </button>
        </div>

        <label style={{ display: "inline-flex", gap: 8, alignItems: "center", marginTop: 10 }}>
          <input
            type="checkbox"
            checked={!!form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
          />
          Activa
        </label>
      </div>

      <div style={card}>
        <div style={{ fontWeight: 800, marginBottom: 12 }}>
          Unidades registradas ({items.length})
        </div>

        {busy ? (
          <div>Cargando...</div>
        ) : !items.length ? (
          <div style={{ color: "#6b7280" }}>No hay unidades registradas.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  <th style={th}>Código</th>
                  <th style={th}>Tipo</th>
                  <th style={th}>Estatus</th>
                  <th style={th}>Placa</th>
                  <th style={th}>Activa</th>
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
                            value={editForm.unit_code}
                            onChange={(e) => setEditForm({ ...editForm, unit_code: e.target.value })}
                          />
                        ) : (
                          row.unit_code
                        )}
                      </td>

                      <td style={td}>
                        {editing ? (
                          <input
                            style={inputStyle}
                            value={editForm.type}
                            onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                          />
                        ) : (
                          row.type || ""
                        )}
                      </td>

                      <td style={td}>{row.status || "available"}</td>

                      <td style={td}>
                        {editing ? (
                          <input
                            style={inputStyle}
                            value={editForm.plate}
                            onChange={(e) => setEditForm({ ...editForm, plate: e.target.value })}
                          />
                        ) : (
                          row.plate || ""
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