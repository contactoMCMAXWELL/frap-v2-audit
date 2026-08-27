import React, { useEffect, useMemo, useState } from "react";
import { v2Api } from "../api/v2";
import { useAuthStore } from "../../store/authStore";

function getDefaultRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 29);
  const format = (value) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  return { startDate: format(start), endDate: format(end) };
}

function currency(value) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(value || 0));
}

function toneStyle(tone) {
  if (tone === "ok") return { borderColor: "#bbf7d0", background: "#f0fdf4" };
  if (tone === "warn") return { borderColor: "#fed7aa", background: "#fff7ed" };
  return { borderColor: "#e5e7eb", background: "#ffffff" };
}

function KpiCard({ item }) {
  return (
    <div style={{ ...cardStyle, ...toneStyle(item?.tone) }}>
      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>{item?.label}</div>
      <div style={{ fontSize: 28, fontWeight: 800 }}>{item?.formatted || item?.value || 0}</div>
      {item?.hint ? <div style={{ marginTop: 8, color: "#4b5563", fontSize: 12 }}>{item.hint}</div> : null}
    </div>
  );
}

function SectionCard({ title, subtitle, children }) {
  return (
    <section style={sectionStyle}>
      <div style={{ marginBottom: 14 }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        {subtitle ? <div style={{ color: "#6b7280", marginTop: 4 }}>{subtitle}</div> : null}
      </div>
      {children}
    </section>
  );
}

function SimpleTable({ rows, columns, emptyLabel = "Sin datos" }) {
  if (!rows?.length) {
    return <div style={{ color: "#6b7280" }}>{emptyLabel}</div>;
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} style={thStyle}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row?.label || row?.date || "row"}-${index}`}>
              {columns.map((column) => (
                <td key={column.key} style={tdStyle}>
                  {typeof column.render === "function" ? column.render(row) : row?.[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MiniBars({ rows, formatter = (value) => value }) {
  const max = Math.max(...(rows || []).map((item) => Number(item?.value || 0)), 0);
  if (!rows?.length) return <div style={{ color: "#6b7280" }}>Sin datos</div>;
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {rows.map((item) => {
        const value = Number(item?.value || 0);
        const width = max > 0 ? Math.max((value / max) * 100, 6) : 6;
        return (
          <div key={item.label}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 4 }}>
              <span>{item.label}</span>
              <strong>{formatter(value)}</strong>
            </div>
            <div style={{ height: 10, background: "#eef2ff", borderRadius: 999 }}>
              <div style={{ height: 10, width: `${width}%`, borderRadius: 999, background: "#c7d2fe" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function V2AdminDashboardPage({ session }) {
  const role = useAuthStore((s) => s.role);
  const normalizedRole = String(role || "").toUpperCase();
  const canAdmin = normalizedRole === "ADMIN" || normalizedRole === "SUPERADMIN";
  const [filters, setFilters] = useState(getDefaultRange);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);
  const [financial, setFinancial] = useState(null);
  const [operations, setOperations] = useState(null);
  const [clinical, setClinical] = useState(null);
  const [documental, setDocumental] = useState(null);
  const [timeseries, setTimeseries] = useState(null);

  const requestArgs = useMemo(() => ({
    startDate: filters.startDate,
    endDate: filters.endDate,
    token: session?.token,
    companyId: session?.companyId,
    userId: session?.userId,
  }), [filters.startDate, filters.endDate, session?.token, session?.companyId, session?.userId]);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const [summaryData, operationsData, clinicalData, documentalData, financialData, timeseriesData] = await Promise.all([
        v2Api.adminDashboardSummary(requestArgs),
        v2Api.adminDashboardOperations(requestArgs),
        v2Api.adminDashboardClinical(requestArgs),
        v2Api.adminDashboardDocumental(requestArgs),
        v2Api.adminDashboardFinancial(requestArgs),
        v2Api.adminDashboardTimeseries(requestArgs),
      ]);
      setSummary(summaryData);
      setOperations(operationsData);
      setClinical(clinicalData);
      setDocumental(documentalData);
      setFinancial(financialData);
      setTimeseries(timeseriesData);
    } catch (e) {
      setError(e?.message || "No se pudo cargar el tablero");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canAdmin && session?.token && session?.companyId) {
      load();
    }
  }, [canAdmin, session?.token, session?.companyId, filters.startDate, filters.endDate]);

  if (!canAdmin) {
    return <div style={{ color: "#b91c1c", fontWeight: 700 }}>Acceso denegado. Esta sección requiere ADMIN o SUPERADMIN.</div>;
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <section style={sectionStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0 }}>Tablero administrativo y financiero</h2>
            <p style={{ margin: "6px 0 0", color: "#6b7280" }}>
              Capa ejecutiva de solo lectura. No toca clínica, timeline ni PDF.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
            <label style={labelStyle}>Inicio<input type="date" value={filters.startDate} onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))} /></label>
            <label style={labelStyle}>Fin<input type="date" value={filters.endDate} onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))} /></label>
            <button onClick={load} disabled={loading} style={buttonStyle}>{loading ? "Cargando..." : "Actualizar"}</button>
          </div>
        </div>
      </section>

      {error ? <div style={{ ...sectionStyle, color: "#b91c1c" }}>{error}</div> : null}

      <div style={kpiGridStyle}>
        {(summary?.kpis || []).map((item) => <KpiCard key={item.key} item={item} />)}
      </div>

      <div style={twoColGridStyle}>
        <SectionCard title="Resumen financiero" subtitle="Totales directos para dirección y administración.">
          <div style={kpiGridStyle}>
            {(financial?.totals || []).map((item) => <KpiCard key={item.key} item={item} />)}
          </div>
        </SectionCard>

        <SectionCard title="Control documental" subtitle="Cierre firmado y listo para documento médico-legal.">
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <div style={smallStatStyle}><div style={smallStatLabel}>Listos para PDF</div><div style={smallStatValue}>{documental?.ready_for_pdf || 0}</div></div>
            <div style={smallStatStyle}><div style={smallStatLabel}>Pendientes</div><div style={smallStatValue}>{documental?.pending_for_pdf || 0}</div></div>
            <div style={smallStatStyle}><div style={smallStatLabel}>Inconsistencias</div><div style={smallStatValue}>{documental?.with_inconsistency || 0}</div></div>
          </div>
          <div style={{ marginTop: 16 }}>
            <MiniBars rows={documental?.missing_signatures_breakdown || []} formatter={(value) => value} />
          </div>
        </SectionCard>
      </div>

      <div style={twoColGridStyle}>
        <SectionCard title="Servicios por tipo" subtitle="Qué está moviendo la operación.">
          <MiniBars rows={operations?.services_by_type || []} formatter={(value) => value} />
        </SectionCard>

        <SectionCard title="Cierre clínico" subtitle="Distribución real del cierre operativo-clínico.">
          <MiniBars rows={clinical?.closure_breakdown || []} formatter={(value) => value} />
        </SectionCard>
      </div>

      <div style={twoColGridStyle}>
        <SectionCard title="Facturación por estatus" subtitle="Dónde está el dinero y qué falta cobrar.">
          <SimpleTable
            rows={financial?.by_billing_status || []}
            columns={[
              { key: "label", label: "Estatus" },
              { key: "count", label: "Servicios" },
              { key: "amount", label: "Valor", render: (row) => currency(row.amount) },
              { key: "extra", label: "Margen", render: (row) => currency(row.extra) },
            ]}
          />
        </SectionCard>

        <SectionCard title="Pagadores" subtitle="Distribución de ingresos por tipo de pagador.">
          <SimpleTable
            rows={financial?.by_payer_type || []}
            columns={[
              { key: "label", label: "Pagador" },
              { key: "count", label: "Servicios" },
              { key: "amount", label: "Valor", render: (row) => currency(row.amount) },
              { key: "extra", label: "Margen", render: (row) => currency(row.extra) },
            ]}
          />
        </SectionCard>
      </div>

      <div style={twoColGridStyle}>
        <SectionCard title="Unidades con mayor movimiento" subtitle="Top por servicios atendidos y valor económico.">
          <SimpleTable
            rows={financial?.by_unit || []}
            columns={[
              { key: "label", label: "Unidad" },
              { key: "count", label: "Servicios" },
              { key: "amount", label: "Valor", render: (row) => currency(row.amount) },
              { key: "extra", label: "Margen", render: (row) => currency(row.extra) },
            ]}
          />
        </SectionCard>

        <SectionCard title="Destinos / hospitales" subtitle="Dónde termina la operación con mayor frecuencia.">
          <SimpleTable
            rows={operations?.top_destinations || []}
            columns={[
              { key: "label", label: "Destino" },
              { key: "count", label: "Servicios" },
              { key: "amount", label: "Valor asociado", render: (row) => currency(row.amount) },
            ]}
          />
        </SectionCard>
      </div>

      <div style={twoColGridStyle}>
        <SectionCard title="Procedimientos más frecuentes" subtitle="Indicador clínico útil para abastecimiento y capacitación.">
          <SimpleTable rows={clinical?.top_procedures || []} columns={[{ key: "label", label: "Procedimiento" }, { key: "count", label: "Frecuencia" }]} />
        </SectionCard>
        <SectionCard title="Medicamentos más usados" subtitle="Indicador clínico útil para compras y control.">
          <SimpleTable rows={clinical?.top_medications || []} columns={[{ key: "label", label: "Medicamento" }, { key: "count", label: "Frecuencia" }]} />
        </SectionCard>
      </div>

      <SectionCard title="Serie diaria" subtitle="Tendencia simple y ejecutiva del periodo seleccionado.">
        <SimpleTable
          rows={timeseries?.points || []}
          columns={[
            { key: "date", label: "Fecha" },
            { key: "services", label: "Servicios" },
            { key: "sale_price", label: "Valor vendido", render: (row) => currency(row.sale_price) },
            { key: "total_cost", label: "Costo", render: (row) => currency(row.total_cost) },
            { key: "margin_amount", label: "Margen", render: (row) => currency(row.margin_amount) },
            { key: "ready_for_pdf", label: "Listos PDF" },
            { key: "paid", label: "Pagados" },
          ]}
        />
      </SectionCard>
    </div>
  );
}

const sectionStyle = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 18,
};

const cardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 16,
};

const kpiGridStyle = {
  display: "grid",
  gap: 14,
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
};

const twoColGridStyle = {
  display: "grid",
  gap: 18,
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
};

const labelStyle = {
  display: "grid",
  gap: 6,
  fontSize: 13,
  color: "#374151",
};

const buttonStyle = {
  height: 40,
  border: "1px solid #d1d5db",
  borderRadius: 10,
  padding: "0 14px",
  background: "#111827",
  color: "#fff",
  cursor: "pointer",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
};

const thStyle = {
  textAlign: "left",
  padding: "10px 12px",
  borderBottom: "1px solid #e5e7eb",
  color: "#6b7280",
  fontWeight: 700,
};

const tdStyle = {
  padding: "10px 12px",
  borderBottom: "1px solid #f3f4f6",
};

const smallStatStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 14,
  background: "#f9fafb",
};

const smallStatLabel = {
  fontSize: 12,
  color: "#6b7280",
  marginBottom: 6,
};

const smallStatValue = {
  fontSize: 28,
  fontWeight: 800,
};
