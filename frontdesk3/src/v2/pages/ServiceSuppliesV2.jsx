import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { v2Api } from "../api/v2";
import { v2AdminApi } from "../api/admin";

const initialForm = {
  supply_id: "",
  quantity: 1,
  unit_cost: "",
  lot_number: "",
  notes: "",
};

export default function ServiceSuppliesV2({ session, onDataChanged }) {
  const { intakeId } = useParams();

  const [items, setItems] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedSupply = useMemo(
    () => catalog.find((x) => x.id === form.supply_id) || null,
    [catalog, form.supply_id]
  );

  const estimatedTotal = useMemo(() => {
    const qty = Number(form.quantity || 0);
    const cost = Number(form.unit_cost || 0);
    return qty * cost;
  }, [form.quantity, form.unit_cost]);

  const load = async () => {
    try {
      setLoading(true);
      setError("");

      const [usageData, catalogData] = await Promise.all([
        v2Api.serviceSuppliesList({
          intakeId,
          token: session?.token,
          companyId: session?.companyId,
          userId: session?.userId,
        }),
        v2AdminApi.suppliesList({
          token: session?.token,
          companyId: session?.companyId,
          userId: session?.userId,
        }),
      ]);

      setItems(Array.isArray(usageData) ? usageData : []);
      setCatalog(Array.isArray(catalogData) ? catalogData : []);
    } catch (e) {
      setError(e?.message || "No se pudieron cargar los insumos del servicio");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (intakeId) load();
  }, [intakeId, session?.companyId]);

  useEffect(() => {
    if (!selectedSupply) return;

    setForm((prev) => ({
      ...prev,
      unit_cost:
        prev.unit_cost === "" || prev.unit_cost === 0
          ? selectedSupply.default_unit_cost ?? ""
          : prev.unit_cost,
    }));
  }, [selectedSupply]);

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    if (!form.supply_id) {
      setError("Selecciona un insumo del catálogo.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await v2Api.serviceSuppliesCreate({
        payload: {
          intake_id: intakeId,
          supply_id: form.supply_id,
          quantity: Number(form.quantity || 0),
          unit_cost:
            form.unit_cost === "" ? null : Number(form.unit_cost || 0),
          lot_number: form.lot_number || "",
          notes: form.notes || "",
        },
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
      });

      setForm(initialForm);
      await load();
      if (typeof onDataChanged === "function") {
        await onDataChanged();
      }
    } catch (e2) {
      setError(e2?.message || "No se pudo agregar el insumo");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={cardStyle}>
      <h3 style={{ marginTop: 0 }}>Insumos del servicio</h3>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginBottom: 18 }}>
        <div style={fieldStyle}>
          <div style={labelText}>Insumo del catálogo</div>
          <select
            style={controlStyle}
            value={form.supply_id}
            onChange={(e) => onChange("supply_id", e.target.value)}
          >
            <option value="">Selecciona un insumo</option>
            {catalog.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </div>

        <div style={grid2}>
          <div style={fieldStyle}>
            <div style={labelText}>Cantidad</div>
            <input
              style={controlStyle}
              type="number"
              step="0.01"
              value={form.quantity}
              onChange={(e) => onChange("quantity", e.target.value)}
            />
          </div>

          <div style={fieldStyle}>
            <div style={labelText}>Costo unitario</div>
            <input
              style={controlStyle}
              type="number"
              step="0.01"
              value={form.unit_cost}
              onChange={(e) => onChange("unit_cost", e.target.value)}
            />
          </div>
        </div>

        <div style={fieldStyle}>
          <div style={labelText}>Lote / referencia</div>
          <input
            style={controlStyle}
            value={form.lot_number}
            onChange={(e) => onChange("lot_number", e.target.value)}
          />
        </div>

        <div style={fieldStyle}>
          <div style={labelText}>Notas</div>
          <textarea
            style={textAreaStyle}
            rows={3}
            value={form.notes}
            onChange={(e) => onChange("notes", e.target.value)}
          />
        </div>

        <div style={summaryBoxStyle}>
          <div><strong>Unidad:</strong> {selectedSupply?.unit_label || "-"}</div>
          <div><strong>Total estimado:</strong> {estimatedTotal.toFixed(2)}</div>
        </div>

        <div>
          <button type="submit" disabled={saving}>
            {saving ? "Guardando..." : "Agregar insumo"}
          </button>
        </div>
      </form>

      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {loading && <p style={{ color: "#6b7280" }}>Cargando insumos...</p>}

      {!loading && !items.length && (
        <p style={{ color: "#6b7280" }}>Aún no hay insumos registrados.</p>
      )}

      {!!items.length && (
        <div style={{ display: "grid", gap: 10 }}>
          {items.map((row) => (
            <div key={row.id} style={itemStyle}>
              <strong>{row.supply_name || row.supply_id}</strong>
              <div><strong>Cantidad:</strong> {row.quantity}</div>
              <div><strong>Unidad:</strong> {row.unit_label || "-"}</div>
              <div><strong>Costo unitario:</strong> {Number(row.unit_cost || 0).toFixed(2)}</div>
              <div><strong>Costo total:</strong> {Number(row.total_cost || 0).toFixed(2)}</div>
              {row.lot_number && <div><strong>Lote:</strong> {row.lot_number}</div>}
              {row.notes && <div><strong>Notas:</strong> {row.notes}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const cardStyle = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 18,
};

const itemStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: 12,
  background: "#fafafa",
};

const fieldStyle = {
  display: "grid",
  gap: 6,
};

const labelText = {
  fontSize: 14,
  fontWeight: 700,
  color: "#111827",
};

const controlStyle = {
  width: "100%",
  minHeight: 40,
  padding: "8px 10px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  boxSizing: "border-box",
  font: "inherit",
  background: "#fff",
};

const textAreaStyle = {
  ...controlStyle,
  minHeight: 96,
  resize: "vertical",
};

const grid2 = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 12,
};

const summaryBoxStyle = {
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: 12,
  display: "grid",
  gap: 6,
};