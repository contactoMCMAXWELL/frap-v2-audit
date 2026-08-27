import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { v2Api } from "../api/v2";

const initialForm = {
  crew_cost: 0,
  unit_cost: 0,
  fuel_cost: 0,
  other_cost: 0,
  sale_price: 0,
  payer_type: "private",
  billing_status: "draft",
  notes: "",
  active: true,
};

export default function ServiceFinancialsV2({ session }) {
  const { intakeId } = useParams();

  const [form, setForm] = useState(initialForm);
  const [supplies, setSupplies] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError("");

      const [financialData, suppliesData] = await Promise.all([
        v2Api.serviceFinancialGet({
          intakeId,
          token: session?.token,
          companyId: session?.companyId,
          userId: session?.userId,
        }).catch((e) => {
          if (String(e?.message || "").includes("404")) return null;
          throw e;
        }),
        v2Api.serviceSuppliesList({
          intakeId,
          token: session?.token,
          companyId: session?.companyId,
          userId: session?.userId,
        }).catch(() => []),
      ]);

      setSupplies(Array.isArray(suppliesData) ? suppliesData : []);

      if (financialData) {
        setForm({
          crew_cost: Number(financialData?.crew_cost || 0),
          unit_cost: Number(financialData?.unit_cost || 0),
          fuel_cost: Number(financialData?.fuel_cost || 0),
          other_cost: Number(financialData?.other_cost || 0),
          sale_price: Number(financialData?.sale_price || 0),
          payer_type: financialData?.payer_type || "private",
          billing_status: financialData?.billing_status || "draft",
          notes: financialData?.notes || "",
          active: financialData?.active ?? true,
        });
      } else {
        setForm(initialForm);
      }
    } catch (e) {
      setError(e?.message || "No se pudo cargar la información financiera");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (intakeId) load();
  }, [intakeId]);

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const suppliesCost = useMemo(() => {
    return supplies.reduce((acc, row) => acc + Number(row.total_cost || 0), 0);
  }, [supplies]);

  const subtotalWithoutSupplies = useMemo(() => {
    return (
      Number(form.crew_cost || 0) +
      Number(form.unit_cost || 0) +
      Number(form.fuel_cost || 0) +
      Number(form.other_cost || 0)
    );
  }, [form]);

  const totalCost = useMemo(() => {
    return subtotalWithoutSupplies + suppliesCost;
  }, [subtotalWithoutSupplies, suppliesCost]);

  const marginAmount = useMemo(() => {
    return Number(form.sale_price || 0) - totalCost;
  }, [form.sale_price, totalCost]);

  const marginPercent = useMemo(() => {
    const sale = Number(form.sale_price || 0);
    if (!sale) return 0;
    return (marginAmount / sale) * 100;
  }, [form.sale_price, marginAmount]);

  const onSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      await v2Api.serviceFinancialUpsert({
        payload: {
          intake_id: intakeId,
          crew_cost: Number(form.crew_cost || 0),
          unit_cost: Number(form.unit_cost || 0),
          fuel_cost: Number(form.fuel_cost || 0),
          other_cost: Number(form.other_cost || 0),
          sale_price: Number(form.sale_price || 0),
          payer_type: form.payer_type,
          billing_status: form.billing_status,
          notes: form.notes || "",
          active: !!form.active,
        },
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
      });

      await load();
    } catch (e2) {
      setError(e2?.message || "No se pudo guardar la información financiera");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={cardStyle}>
      <h3 style={{ marginTop: 0 }}>Costos y resultado económico</h3>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <label style={{ ...labelStyle, flex: 1 }}>
            Costo de tripulación
            <input
              type="number"
              step="0.01"
              value={form.crew_cost}
              onChange={(e) => onChange("crew_cost", e.target.value)}
            />
          </label>

          <label style={{ ...labelStyle, flex: 1 }}>
            Costo de unidad
            <input
              type="number"
              step="0.01"
              value={form.unit_cost}
              onChange={(e) => onChange("unit_cost", e.target.value)}
            />
          </label>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <label style={{ ...labelStyle, flex: 1 }}>
            Combustible / kilometraje
            <input
              type="number"
              step="0.01"
              value={form.fuel_cost}
              onChange={(e) => onChange("fuel_cost", e.target.value)}
            />
          </label>

          <label style={{ ...labelStyle, flex: 1 }}>
            Otros costos
            <input
              type="number"
              step="0.01"
              value={form.other_cost}
              onChange={(e) => onChange("other_cost", e.target.value)}
            />
          </label>
        </div>

        <label style={labelStyle}>
          Precio de venta
          <input
            type="number"
            step="0.01"
            value={form.sale_price}
            onChange={(e) => onChange("sale_price", e.target.value)}
          />
        </label>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <label style={{ ...labelStyle, flex: 1 }}>
            Tipo de pagador
            <select value={form.payer_type} onChange={(e) => onChange("payer_type", e.target.value)}>
              <option value="private">Particular</option>
              <option value="insurance">Aseguradora</option>
              <option value="contract">Convenio</option>
              <option value="public">Público</option>
            </select>
          </label>

          <label style={{ ...labelStyle, flex: 1 }}>
            Estado de facturación
            <select value={form.billing_status} onChange={(e) => onChange("billing_status", e.target.value)}>
              <option value="draft">Borrador</option>
              <option value="quoted">Cotizado</option>
              <option value="billed">Facturado</option>
              <option value="paid">Pagado</option>
            </select>
          </label>
        </div>

        <label style={labelStyle}>
          Notas financieras
          <textarea
            rows={4}
            value={form.notes}
            onChange={(e) => onChange("notes", e.target.value)}
          />
        </label>

        <div style={summaryBoxStyle}>
          <div><strong>Subtotal sin insumos:</strong> {subtotalWithoutSupplies.toFixed(2)}</div>
          <div><strong>Costo de insumos:</strong> {suppliesCost.toFixed(2)}</div>
          <div><strong>Costo total:</strong> {totalCost.toFixed(2)}</div>
          <div><strong>Precio de venta:</strong> {Number(form.sale_price || 0).toFixed(2)}</div>
          <div><strong>Margen estimado:</strong> {marginAmount.toFixed(2)}</div>
          <div><strong>Margen %:</strong> {marginPercent.toFixed(2)}%</div>
          <div>
            <strong>Resultado:</strong>{" "}
            {marginAmount >= 0 ? "Servicio rentable" : "Servicio no rentable"}
          </div>
        </div>

        <div>
          <button type="submit" disabled={saving}>
            {saving ? "Guardando..." : "Guardar costos"}
          </button>
        </div>
      </form>

      {loading && <p style={{ color: "#6b7280" }}>Cargando información financiera...</p>}
      {error && <p style={{ color: "crimson" }}>{error}</p>}
    </div>
  );
}

const cardStyle = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 18,
};

const labelStyle = {
  display: "grid",
  gap: 6,
};

const summaryBoxStyle = {
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: 12,
  display: "grid",
  gap: 6,
};