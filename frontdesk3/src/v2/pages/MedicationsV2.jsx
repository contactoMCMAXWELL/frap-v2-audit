import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { v2Api } from "../api/v2";
import { v2AdminApi } from "../api/admin";
import { localInputToIso } from "../../utils/datetime";

const initialForm = {
  administered_at: "",
  medication_name: "",
  dose: "",
  route: "",
  response: "",
  notes: "",
};

export default function MedicationsV2({
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
        v2Api.frapMedicationsList({
          intakeId,
          token: session?.token,
          companyId: session?.companyId,
          userId: session?.userId,
        }),
        v2AdminApi.medicationsCatalogList({
          token: session?.token,
          companyId: session?.companyId,
          userId: session?.userId,
        }),
      ]);

      setItems(Array.isArray(data) ? data : []);
      setCatalog(Array.isArray(catalogData) ? catalogData : []);
    } catch (e) {
      setError(e?.message || "No se pudieron cargar los medicamentos");
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
      medication_name: selectedCatalogItem.name || prev.medication_name,
      dose: prev.dose || selectedCatalogItem.default_dose || "",
      route: prev.route || selectedCatalogItem.route || "",
      notes:
        prev.notes ||
        [selectedCatalogItem.presentation, selectedCatalogItem.concentration]
          .filter(Boolean)
          .join(" · "),
    }));
  }, [selectedCatalogItem]);

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (readOnly || !intakeId) return;

    if (!form.medication_name.trim()) {
      setError("Captura o selecciona el medicamento.");
      return;
    }

    if (isRetrospective && !form.administered_at) {
      setError("Captura la fecha y hora declarada de la administración.");
      return;
    }

    const administeredAtIso = isRetrospective
      ? localInputToIso(form.administered_at)
      : null;

    if (isRetrospective && !administeredAtIso) {
      setError("La fecha y hora declarada de la administración no es válida.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await v2Api.frapMedicationCreate({
        payload: {
          intake_id: intakeId,
          ...(isRetrospective ? { administered_at: administeredAtIso } : {}),
          medication_name: form.medication_name,
          dose: form.dose,
          route: form.route,
          response: form.response,
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
      setError(e2?.message || "No se pudo guardar el medicamento");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={cardStyle}>
      <h3 style={{ marginTop: 0 }}>Medicamentos administrados</h3>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginBottom: 18 }}>
        <fieldset
          disabled={readOnly}
          style={{ border: 0, padding: 0, margin: 0, minWidth: 0, display: "grid", gap: 12 }}
        >
          {isRetrospective ? (
            <div style={fieldStyle}>
              <div style={labelText}>Fecha y hora declarada de administración</div>
              <input
                style={controlStyle}
                type="datetime-local"
                value={form.administered_at}
                onChange={(e) => onChange("administered_at", e.target.value)}
              />
            </div>
          ) : null}

        <div style={fieldStyle}>
          <div style={labelText}>Medicamento del catálogo</div>
          <select
            style={controlStyle}
            value={selectedCatalogId}
            onChange={(e) => setSelectedCatalogId(e.target.value)}
          >
            <option value="">Selecciona un medicamento</option>
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
              <strong>Presentación:</strong> {selectedCatalogItem.presentation || "-"}
            </div>
            <div>
              <strong>Concentración:</strong> {selectedCatalogItem.concentration || "-"}
            </div>
            <div>
              <strong>Vía sugerida:</strong> {selectedCatalogItem.route || "-"}
            </div>
            <div>
              <strong>Dosis default:</strong> {selectedCatalogItem.default_dose || "-"}
            </div>
          </div>
        ) : null}

        <div style={grid2}>
          <div style={fieldStyle}>
            <div style={labelText}>Medicamento</div>
            <input
              style={controlStyle}
              value={form.medication_name}
              onChange={(e) => onChange("medication_name", e.target.value)}
            />
          </div>

          <div style={fieldStyle}>
            <div style={labelText}>Dosis</div>
            <input
              style={controlStyle}
              value={form.dose}
              onChange={(e) => onChange("dose", e.target.value)}
            />
          </div>
        </div>

        <div style={grid2}>
          <div style={fieldStyle}>
            <div style={labelText}>Vía</div>
            <input
              style={controlStyle}
              value={form.route}
              onChange={(e) => onChange("route", e.target.value)}
            />
          </div>

          <div style={fieldStyle}>
            <div style={labelText}>Respuesta</div>
            <input
              style={controlStyle}
              value={form.response}
              onChange={(e) => onChange("response", e.target.value)}
            />
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
            {saving ? "Guardando..." : "Agregar medicamento"}
          </button>
        </div>
        </fieldset>
      </form>

      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {loading && <p style={{ color: "#6b7280" }}>Cargando medicamentos...</p>}

      {!loading && !items.length && (
        <p style={{ color: "#6b7280" }}>Aún no hay medicamentos registrados.</p>
      )}

      {!!items.length && (
        <div style={{ display: "grid", gap: 10 }}>
          {items.map((row) => (
            <div key={row.id} style={itemStyle}>
              <strong>{row.medication_name}</strong>
              <div><strong>Dosis:</strong> {row.dose || "-"}</div>
              <div><strong>Vía:</strong> {row.route || "-"}</div>
              <div><strong>Respuesta:</strong> {row.response || "-"}</div>
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