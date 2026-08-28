import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { v2Api } from "../api/v2";
import { v2AdminApi } from "../api/admin";
import { localInputToIso } from "../../utils/datetime";

const initialForm = {
  performed_at: "",
  procedure_name: "",
  status: "performed",
  body_site: "",
  successful: true,
  notes: "",
};

export default function ProceduresV2({
  session,
  onDataChanged,
  readOnly = false,
  isRetrospective = false,
}) {
  const { intakeId } = useParams();
  const [items, setItems] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [selectedCatalogId, setSelectedCatalogId] = useState("");
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError("");

      const [data, catalogData] = await Promise.all([
        v2Api.frapProceduresList({
          intakeId,
          token: session?.token,
          companyId: session?.companyId,
          userId: session?.userId,
        }),
        v2AdminApi.proceduresCatalogList({
          token: session?.token,
          companyId: session?.companyId,
          userId: session?.userId,
        }),
      ]);

      setItems(Array.isArray(data) ? data : []);
      setCatalog(Array.isArray(catalogData) ? catalogData : []);
    } catch (e) {
      setError(e?.message || "No se pudieron cargar los procedimientos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (intakeId) load();
  }, [intakeId, session?.companyId]);

  const selectedCatalogItem = useMemo(
    () => catalog.find((x) => x.id === selectedCatalogId) || null,
    [catalog, selectedCatalogId]
  );

  useEffect(() => {
    if (!selectedCatalogItem) return;

    setForm((prev) => ({
      ...prev,
      procedure_name: selectedCatalogItem.name || prev.procedure_name,
      notes: prev.notes || selectedCatalogItem.notes || "",
    }));
  }, [selectedCatalogItem]);

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (readOnly || !intakeId) return;

    if (!form.procedure_name.trim()) {
      setError("Captura o selecciona el procedimiento.");
      return;
    }

    if (isRetrospective && !form.performed_at) {
      setError("Captura la fecha y hora declarada del procedimiento.");
      return;
    }

    const performedAtIso = isRetrospective
      ? localInputToIso(form.performed_at)
      : null;

    if (isRetrospective && !performedAtIso) {
      setError("La fecha y hora declarada del procedimiento no es válida.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await v2Api.frapProcedureCreate({
        payload: {
          intake_id: intakeId,
          ...(isRetrospective ? { performed_at: performedAtIso } : {}),
          procedure_name: form.procedure_name,
          status: form.status,
          body_site: form.body_site,
          successful: !!form.successful,
          notes: form.notes,
        },
        token: session?.token,
        companyId: session?.companyId,
        userId: session?.userId,
      });

      setForm(initialForm);
      setSelectedCatalogId("");
      await load();
      if (typeof onDataChanged === "function") {
        await onDataChanged();
      }
    } catch (e2) {
      setError(e2?.message || "No se pudo guardar el procedimiento");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={cardStyle}>
      <h3 style={{ marginTop: 0 }}>Procedimientos realizados</h3>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginBottom: 18 }}>
        <fieldset
          disabled={readOnly}
          style={{ border: 0, padding: 0, margin: 0, minWidth: 0, display: "grid", gap: 12 }}
        >
          {isRetrospective ? (
            <div style={fieldStyle}>
              <div style={labelText}>Fecha y hora declarada del procedimiento</div>
              <input
                style={controlStyle}
                type="datetime-local"
                value={form.performed_at}
                onChange={(e) => onChange("performed_at", e.target.value)}
              />
            </div>
          ) : null}

        <div style={fieldStyle}>
          <div style={labelText}>Procedimiento del catálogo</div>
          <select
            style={controlStyle}
            value={selectedCatalogId}
            onChange={(e) => setSelectedCatalogId(e.target.value)}
          >
            <option value="">Selecciona un procedimiento</option>
            {catalog.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </div>

        {selectedCatalogItem ? (
          <div style={hintBoxStyle}>
            <div>
              <strong>Categoría:</strong> {selectedCatalogItem.category || "-"}
            </div>
            <div>
              <strong>Notas base:</strong> {selectedCatalogItem.notes || "-"}
            </div>
          </div>
        ) : null}

        <div style={grid2}>
          <div style={fieldStyle}>
            <div style={labelText}>Procedimiento</div>
            <input
              style={controlStyle}
              value={form.procedure_name}
              onChange={(e) => onChange("procedure_name", e.target.value)}
            />
          </div>

          <div style={fieldStyle}>
            <div style={labelText}>Estatus</div>
            <select
              style={controlStyle}
              value={form.status}
              onChange={(e) => onChange("status", e.target.value)}
            >
              <option value="performed">Realizado</option>
              <option value="attempted">Intentado</option>
              <option value="indicated">Indicado</option>
            </select>
          </div>
        </div>

        <div style={grid2}>
          <div style={fieldStyle}>
            <div style={labelText}>Sitio anatómico</div>
            <input
              style={controlStyle}
              value={form.body_site}
              onChange={(e) => onChange("body_site", e.target.value)}
            />
          </div>

          <div style={fieldStyle}>
            <div style={labelText}>Resultado</div>
            <label style={{ display: "flex", gap: 8, alignItems: "center", minHeight: 40 }}>
              <input
                type="checkbox"
                checked={!!form.successful}
                onChange={(e) => onChange("successful", e.target.checked)}
              />
              Exitoso
            </label>
          </div>
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

        <div>
          <button type="submit" disabled={saving}>
            {saving ? "Guardando..." : "Agregar procedimiento"}
          </button>
        </div>
        </fieldset>
      </form>

      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {loading && <p style={{ color: "#6b7280" }}>Cargando procedimientos...</p>}

      {!loading && !items.length && (
        <p style={{ color: "#6b7280" }}>Aún no hay procedimientos registrados.</p>
      )}

      {!!items.length && (
        <div style={{ display: "grid", gap: 10 }}>
          {items.map((row) => (
            <div key={row.id} style={itemStyle}>
              <strong>{row.procedure_name}</strong>
              <div><strong>Estatus:</strong> {row.status || "-"}</div>
              <div><strong>Sitio:</strong> {row.body_site || "-"}</div>
              <div><strong>Exitoso:</strong> {row.successful ? "Sí" : "No"}</div>
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

const hintBoxStyle = {
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: 12,
  display: "grid",
  gap: 4,
};