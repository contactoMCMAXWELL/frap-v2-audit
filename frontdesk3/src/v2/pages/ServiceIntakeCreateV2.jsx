import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  formatDeviceDateTime,
  localInputToIso,
} from "../../utils/datetime";
import { v2Api } from "../api/v2";
import { geocodeAddress } from "../utils/maps";

const emptyLocation = (role, sequence = 1) => ({
  location_role: role,
  place_type: "",
  name: "",
  address_text: "",
  reference: "",
  lat: "",
  lng: "",
  sequence,
  active: true,
});

const initialState = {
  capture_mode: "realtime",
  occurred_at: "",
  retrospective_reason: "",

  service_type: "",
  service_subtype: "",
  priority_operational: 1,
  priority_clinical: "routine",

  call_source: "",
  caller_name: "",
  caller_phone: "",

  patient_count_estimated: 1,
  scene_risk: "unknown",
  destination_suggested: "",
  payer_type: "private",
  notes: "",

  operation_mode: "scene",
  parent_intake_id: "",
  billing_scope: "",

  standby_event_name: "",
  standby_starts_at: "",
  standby_ends_at: "",
  standby_billing_mode: "included",
};

function normalizeList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.value)) return data.value;
  return [];
}

function locationHasContent(location) {
  return Boolean(
    String(location?.name || "").trim() ||
      String(location?.address_text || "").trim() ||
      String(location?.lat || "").trim() ||
      String(location?.lng || "").trim()
  );
}

function buildLocationPayload(location) {
  return {
    location_role: location.location_role,
    place_type: String(location.place_type || "").trim() || null,
    name: String(location.name || "").trim(),
    address_text: String(location.address_text || "").trim(),
    reference: String(location.reference || "").trim(),
    lat:
      String(location.lat || "").trim() === ""
        ? null
        : Number(location.lat),
    lng:
      String(location.lng || "").trim() === ""
        ? null
        : Number(location.lng),
    location_source: String(location.location_source || "unknown").trim() || "unknown",
    sequence: Number(location.sequence || 1),
    active: location.active !== false,
  };
}

export default function ServiceIntakeCreateV2({ session }) {
  const navigate = useNavigate();

  const [form, setForm] = useState(initialState);

  const [sceneLocation, setSceneLocation] = useState(
    emptyLocation("scene", 1)
  );

  const [originLocation, setOriginLocation] = useState(
    emptyLocation("origin", 1)
  );

  const [destinationLocation, setDestinationLocation] = useState(
    emptyLocation("destination", 2)
  );

  const [standbyLocation, setStandbyLocation] = useState(
    emptyLocation("standby", 1)
  );

  const [standbyParents, setStandbyParents] = useState([]);
  const [loadingStandbys, setLoadingStandbys] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [geoLoadingKey, setGeoLoadingKey] = useState("");

  const normalizedRole = String(session?.role || "")
    .trim()
    .toUpperCase();

  const canCreateRetrospective =
    normalizedRole === "ADMIN" ||
    normalizedRole === "SUPERADMIN";

  const isRetrospective =
    canCreateRetrospective &&
    form.capture_mode === "retrospective";

  const isStandby = form.operation_mode === "standby";

  const selectedParent = useMemo(
    () =>
      standbyParents.find(
        (item) => String(item.id) === String(form.parent_intake_id)
      ) || null,
    [standbyParents, form.parent_intake_id]
  );

  useEffect(() => {
    let mounted = true;

    const loadStandbys = async () => {
      try {
        setLoadingStandbys(true);

        const data = await v2Api.serviceIntakeList({
          token: session?.token,
          companyId: session?.companyId,
          userId: session?.userId,
        });

        if (!mounted) return;

        const rows = normalizeList(data);

        const referenceTime =
          isRetrospective && form.occurred_at
            ? new Date(form.occurred_at).getTime()
            : Date.now();

        const standbys = rows
          .filter((item) => {
            const isStandby =
              String(item?.operation_mode || "")
                .trim()
                .toLowerCase() === "standby";

            return isStandby && item?.active !== false;
          })
          .sort((a, b) => {
            const aStart = a?.standby_starts_at
              ? new Date(a.standby_starts_at).getTime()
              : Number.MAX_SAFE_INTEGER;

            const bStart = b?.standby_starts_at
              ? new Date(b.standby_starts_at).getTime()
              : Number.MAX_SAFE_INTEGER;

            const aDistance = Number.isFinite(aStart)
              ? Math.abs(aStart - referenceTime)
              : Number.MAX_SAFE_INTEGER;

            const bDistance = Number.isFinite(bStart)
              ? Math.abs(bStart - referenceTime)
              : Number.MAX_SAFE_INTEGER;

            return aDistance - bDistance;
          });

        setStandbyParents(standbys);
      } catch {
        if (mounted) {
          setStandbyParents([]);
        }
      } finally {
        if (mounted) {
          setLoadingStandbys(false);
        }
      }
    };

    loadStandbys();

    return () => {
      mounted = false;
    };
  }, [
    session?.token,
    session?.companyId,
    session?.userId,
    isRetrospective,
    form.occurred_at,
  ]);

  const onChange = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const onOperationModeChange = (value) => {
    setForm((prev) => ({
      ...prev,
      operation_mode: value,
      parent_intake_id:
        value === "standby"
          ? ""
          : prev.parent_intake_id,
      billing_scope:
        value === "standby"
          ? ""
          : prev.billing_scope,
    }));
  };

  const useMyLocation = (locationKey, setter) => {
    if (!navigator.geolocation) {
      setError("Este navegador no soporta geolocalización.");
      return;
    }

    setGeoLoadingKey(locationKey);
    setError("");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setter((prev) => ({
          ...prev,
          lat: String(pos.coords.latitude),
          lng: String(pos.coords.longitude),
          location_source: "device_gps",
        }));
        setGeoLoadingKey("");
      },
      () => {
        setError("No fue posible obtener la ubicación actual.");
        setGeoLoadingKey("");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  };

  const validateLocation = (location, label) => {
    if (!locationHasContent(location)) {
      return `${label}: captura nombre, dirección o coordenadas.`;
    }

    const hasLat = String(location.lat || "").trim() !== "";
    const hasLng = String(location.lng || "").trim() !== "";

    if (hasLat !== hasLng) {
      return `${label}: latitud y longitud deben capturarse juntas.`;
    }

    if (hasLat) {
      const lat = Number(location.lat);
      const lng = Number(location.lng);

      if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        return `${label}: latitud inválida.`;
      }

      if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
        return `${label}: longitud inválida.`;
      }
    }

    return "";
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      if (isRetrospective && !form.occurred_at) {
        setError(
          "La fecha y hora del servicio son obligatorias para una captura retrospectiva."
        );
        return;
      }

      if (!String(form.service_type || "").trim()) {
        setError("El tipo de servicio es obligatorio.");
        return;
      }

      let locations = [];

      if (form.operation_mode === "scene") {
        const locationError = validateLocation(
          sceneLocation,
          "Ubicación en escena"
        );

        if (locationError) {
          setError(locationError);
          return;
        }

        locations = [buildLocationPayload(sceneLocation)];
      }

      if (form.operation_mode === "transfer") {
        const originError = validateLocation(
          originLocation,
          "Origen del traslado"
        );

        if (originError) {
          setError(originError);
          return;
        }

        const destinationError = validateLocation(
          destinationLocation,
          "Destino del traslado"
        );

        if (destinationError) {
          setError(destinationError);
          return;
        }

        locations = [
          buildLocationPayload(originLocation),
          buildLocationPayload(destinationLocation),
        ];
      }

      if (form.operation_mode === "standby") {
        if (!String(form.standby_event_name || "").trim()) {
          setError(
            "El nombre del evento o cobertura es obligatorio para una guardia."
          );
          return;
        }

        if (!form.standby_starts_at || !form.standby_ends_at) {
          setError(
            "El inicio y fin de la guardia son obligatorios."
          );
          return;
        }

        const startsAtIso =
          localInputToIso(form.standby_starts_at);

        const endsAtIso =
          localInputToIso(form.standby_ends_at);

        if (!startsAtIso || !endsAtIso) {
          setError(
            "La fecha u hora de la guardia no son válidas."
          );
          return;
        }

        if (
          new Date(endsAtIso).getTime() <
          new Date(startsAtIso).getTime()
        ) {
          setError(
            "El fin de la guardia no puede ser anterior al inicio."
          );
          return;
        }

        const locationError = validateLocation(
          standbyLocation,
          "Ubicación de guardia"
        );

        if (locationError) {
          setError(locationError);
          return;
        }

        locations = [buildLocationPayload(standbyLocation)];
      }

      if (
        form.parent_intake_id &&
        form.operation_mode === "standby"
      ) {
        setError(
          "Una guardia no puede ser evento hijo de otra guardia."
        );
        return;
      }

      if (
        form.parent_intake_id &&
        selectedParent?.standby_billing_mode === "mixed" &&
        !form.billing_scope
      ) {
        setError(
          "Selecciona si este evento está incluido en la guardia o genera cargo adicional."
        );
        return;
      }

      const payload = {
        service_type: String(form.service_type || "").trim(),
        service_subtype: String(form.service_subtype || "").trim(),
        priority_operational: Number(form.priority_operational || 1),
        priority_clinical: form.priority_clinical || "routine",
        call_source: String(form.call_source || "").trim(),
        caller_name: String(form.caller_name || "").trim(),
        caller_phone: String(form.caller_phone || "").trim(),
        patient_count_estimated: Number(
          form.patient_count_estimated || 1
        ),
        scene_risk: form.scene_risk || "unknown",
        destination_suggested: String(
          form.destination_suggested || ""
        ).trim(),
        payer_type: form.payer_type || "private",
        notes: String(form.notes || "").trim(),
        active: true,
        capture_mode: isRetrospective
          ? "retrospective"
          : "realtime",
        operation_mode: form.operation_mode,
        locations,
      };

      if (isRetrospective) {
        const occurredAtIso =
          localInputToIso(form.occurred_at);

        if (!occurredAtIso) {
          setError(
            "La fecha y hora del servicio no son válidas."
          );
          return;
        }

        payload.occurred_at = occurredAtIso;

        const reason = String(
          form.retrospective_reason || ""
        ).trim();

        if (reason) {
          payload.retrospective_reason = reason;
        }
      }

      if (form.operation_mode === "standby") {
        payload.standby_event_name =
          String(form.standby_event_name || "").trim();

        payload.standby_starts_at =
          localInputToIso(form.standby_starts_at);

        payload.standby_ends_at =
          localInputToIso(form.standby_ends_at);

        payload.standby_billing_mode =
          form.standby_billing_mode;
      }

      if (
        form.operation_mode !== "standby" &&
        form.parent_intake_id
      ) {
        payload.parent_intake_id =
          form.parent_intake_id;

        if (
          String(form.billing_scope || "").trim()
        ) {
          payload.billing_scope =
            String(form.billing_scope).trim();
        }
      }

      const created =
        await v2Api.serviceIntakeCreate({
          payload,
          token: session?.token,
          companyId: session?.companyId,
          userId: session?.userId,
        });

      navigate(
        `/v2/intakes/${created.id}/timeline`
      );
    } catch (e2) {
      setError(
        e2?.message ||
          "No se pudo guardar el servicio"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 960 }}>
      <h2 style={{ marginTop: 0 }}>
        Nuevo servicio V2
      </h2>

      <p style={{ color: "#6b7280" }}>
        Captura operativa del servicio, traslado o guardia.
      </p>

      <form
        onSubmit={onSubmit}
        style={{ ...formStyle, paddingBottom: 96 }}
      >
        {canCreateRetrospective && (
          <section style={sectionStyle}>
            <h3 style={{ marginTop: 0 }}>
              Modalidad de captura
            </h3>

            <label style={labelStyle}>
              Tipo de captura
              <select
                value={form.capture_mode}
                onChange={(e) =>
                  onChange("capture_mode", e.target.value)
                }
              >
                <option value="realtime">
                  En tiempo real
                </option>
                <option value="retrospective">
                  Retrospectiva
                </option>
              </select>
            </label>

            {isRetrospective && (
              <>
                <div style={warningStyle}>
                  Esta modalidad documenta posteriormente un
                  servicio ya ocurrido. La fecha y hora declaradas
                  corresponderán al momento real del servicio; el
                  sistema conservará por separado la fecha de registro.
                </div>

                <label style={labelStyle}>
                  Fecha y hora del servicio
                  <input
                    type="datetime-local"
                    value={form.occurred_at}
                    onChange={(e) =>
                      onChange("occurred_at", e.target.value)
                    }
                    required
                  />
                </label>

                <label style={labelStyle}>
                  Motivo de captura retrospectiva
                  <textarea
                    rows={3}
                    value={form.retrospective_reason}
                    onChange={(e) =>
                      onChange(
                        "retrospective_reason",
                        e.target.value
                      )
                    }
                    placeholder="Motivo u observación administrativa opcional"
                  />
                </label>
              </>
            )}
          </section>
        )}

        <section style={sectionStyle}>
          <h3 style={{ marginTop: 0 }}>
            Modalidad operativa
          </h3>

          <label style={labelStyle}>
            Tipo de operación
            <select
              value={form.operation_mode}
              onChange={(e) =>
                onOperationModeChange(e.target.value)
              }
            >
              <option value="scene">
                Atención en sitio
              </option>
              <option value="transfer">
                Traslado
              </option>
              <option value="standby">
                Guardia / cobertura
              </option>
            </select>
          </label>

          {!isStandby && (
            <>
              <label style={labelStyle}>
                Guardia relacionada
                <select
                  value={form.parent_intake_id}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      parent_intake_id: e.target.value,
                      billing_scope: "",
                    }))
                  }
                  disabled={loadingStandbys}
                >
                  <option value="">
                    Servicio independiente
                  </option>

                  {standbyParents.map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {(item.standby_event_name ||
                        item.service_type ||
                        "Guardia") +
                        " · " +
                        formatDeviceDateTime(
                          item.standby_starts_at,
                          {
                            withSeconds: false,
                            fallback: "inicio no definido",
                          }
                        ) +
                        " → " +
                        formatDeviceDateTime(
                          item.standby_ends_at,
                          {
                            withSeconds: false,
                            fallback: "fin no definido",
                          }
                        )}
                    </option>
                  ))}
                </select>
              </label>

              {selectedParent && (
                <div style={infoStyle}>
                  <div>
                    <strong>Guardia:</strong>{" "}
                    {selectedParent.standby_event_name ||
                      "Sin nombre"}
                  </div>
                  <div>
                    <strong>Modalidad comercial:</strong>{" "}
                    {selectedParent.standby_billing_mode ||
                      "No definida"}
                  </div>
                </div>
              )}

              {selectedParent?.standby_billing_mode ===
                "mixed" && (
                <label style={labelStyle}>
                  Tratamiento comercial del evento
                  <select
                    value={form.billing_scope}
                    onChange={(e) =>
                      onChange(
                        "billing_scope",
                        e.target.value
                      )
                    }
                  >
                    <option value="">
                      Selecciona una opción
                    </option>
                    <option value="included_in_standby">
                      Incluido en la guardia
                    </option>
                    <option value="additional_charge">
                      Cargo adicional
                    </option>
                  </select>
                </label>
              )}

              {selectedParent?.standby_billing_mode ===
                "included" && (
                <div style={infoStyle}>
                  Este evento se registrará comercialmente
                  como incluido en la guardia.
                </div>
              )}

              {selectedParent?.standby_billing_mode ===
                "additional" && (
                <div style={infoStyle}>
                  Este evento se registrará comercialmente
                  como cargo adicional.
                </div>
              )}
            </>
          )}
        </section>

        <section style={sectionStyle}>
          <h3>Datos generales</h3>

          <label style={labelStyle}>
            Tipo de servicio
            <input
              value={form.service_type}
              onChange={(e) =>
                onChange("service_type", e.target.value)
              }
            />
          </label>

          <label style={labelStyle}>
            Subtipo
            <input
              value={form.service_subtype}
              onChange={(e) =>
                onChange("service_subtype", e.target.value)
              }
            />
          </label>

          <label style={labelStyle}>
            Prioridad operativa
            <input
              type="number"
              value={form.priority_operational}
              onChange={(e) =>
                onChange(
                  "priority_operational",
                  e.target.value
                )
              }
            />
          </label>

          <label style={labelStyle}>
            Prioridad clínica
            <select
              value={form.priority_clinical}
              onChange={(e) =>
                onChange(
                  "priority_clinical",
                  e.target.value
                )
              }
            >
              <option value="routine">
                Rutinaria
              </option>
              <option value="urgent">
                Urgente
              </option>
              <option value="critical">
                Crítica
              </option>
            </select>
          </label>
        </section>

        <section style={sectionStyle}>
          <h3>Solicitante</h3>

          <label style={labelStyle}>
            Origen de la llamada
            <input
              value={form.call_source}
              onChange={(e) =>
                onChange("call_source", e.target.value)
              }
            />
          </label>

          <label style={labelStyle}>
            Nombre del solicitante
            <input
              value={form.caller_name}
              onChange={(e) =>
                onChange("caller_name", e.target.value)
              }
            />
          </label>

          <label style={labelStyle}>
            Teléfono
            <input
              value={form.caller_phone}
              onChange={(e) =>
                onChange("caller_phone", e.target.value)
              }
            />
          </label>
        </section>

        {form.operation_mode === "scene" && (
          <LocationSection
            title="Ubicación en escena"
            location={sceneLocation}
            setLocation={setSceneLocation}
            geoKey="scene"
            geoLoadingKey={geoLoadingKey}
            onUseMyLocation={useMyLocation}
          />
        )}

        {form.operation_mode === "transfer" && (
          <>
            <LocationSection
              title="Origen del traslado"
              location={originLocation}
              setLocation={setOriginLocation}
              geoKey="origin"
              geoLoadingKey={geoLoadingKey}
              onUseMyLocation={useMyLocation}
            />

            <LocationSection
              title="Destino del traslado"
              location={destinationLocation}
              setLocation={setDestinationLocation}
              geoKey="destination"
              geoLoadingKey={geoLoadingKey}
              onUseMyLocation={useMyLocation}
            />
          </>
        )}

        {form.operation_mode === "standby" && (
          <>
            <section style={sectionStyle}>
              <h3>Datos de guardia / cobertura</h3>

              <label style={labelStyle}>
                Nombre del evento o cobertura
                <input
                  value={form.standby_event_name}
                  onChange={(e) =>
                    onChange(
                      "standby_event_name",
                      e.target.value
                    )
                  }
                  placeholder="Ej. Cobertura concierto, evento deportivo..."
                />
              </label>

              <div style={twoColumnStyle}>
                <label style={labelStyle}>
                  Inicio
                  <input
                    type="datetime-local"
                    value={form.standby_starts_at}
                    onChange={(e) =>
                      onChange(
                        "standby_starts_at",
                        e.target.value
                      )
                    }
                  />
                </label>

                <label style={labelStyle}>
                  Fin
                  <input
                    type="datetime-local"
                    value={form.standby_ends_at}
                    onChange={(e) =>
                      onChange(
                        "standby_ends_at",
                        e.target.value
                      )
                    }
                  />
                </label>
              </div>

              <label style={labelStyle}>
                Modalidad comercial
                <select
                  value={form.standby_billing_mode}
                  onChange={(e) =>
                    onChange(
                      "standby_billing_mode",
                      e.target.value
                    )
                  }
                >
                  <option value="included">
                    Eventos incluidos
                  </option>
                  <option value="additional">
                    Eventos con cargo adicional
                  </option>
                  <option value="mixed">
                    Mixta
                  </option>
                </select>
              </label>
            </section>

            <LocationSection
              title="Ubicación de la guardia"
              location={standbyLocation}
              setLocation={setStandbyLocation}
              geoKey="standby"
              geoLoadingKey={geoLoadingKey}
              onUseMyLocation={useMyLocation}
            />
          </>
        )}

        <section style={sectionStyle}>
          <h3>Contexto del servicio</h3>

          <label style={labelStyle}>
            Pacientes estimados
            <input
              type="number"
              value={form.patient_count_estimated}
              onChange={(e) =>
                onChange(
                  "patient_count_estimated",
                  e.target.value
                )
              }
            />
          </label>

          <label style={labelStyle}>
            Riesgo en escena
            <select
              value={form.scene_risk}
              onChange={(e) =>
                onChange("scene_risk", e.target.value)
              }
            >
              <option value="unknown">
                No determinado
              </option>
              <option value="low">
                Bajo
              </option>
              <option value="medium">
                Medio
              </option>
              <option value="high">
                Alto
              </option>
            </select>
          </label>

          <label style={labelStyle}>
            Hospital sugerido
            <input
              value={form.destination_suggested}
              onChange={(e) =>
                onChange(
                  "destination_suggested",
                  e.target.value
                )
              }
            />
            <span style={helperText}>
              Campo clínico/operativo sugerido. No sustituye el
              destino real de un traslado.
            </span>
          </label>

          <label style={labelStyle}>
            Tipo de pagador
            <select
              value={form.payer_type}
              onChange={(e) =>
                onChange("payer_type", e.target.value)
              }
            >
              <option value="private">
                Particular
              </option>
              <option value="insurance">
                Aseguradora
              </option>
              <option value="contract">
                Convenio
              </option>
              <option value="public">
                Público
              </option>
            </select>
          </label>
        </section>

        <section style={sectionStyle}>
          <h3>Observaciones</h3>
          <label style={labelStyle}>
            Notas
            <textarea
              rows={5}
              value={form.notes}
              onChange={(e) =>
                onChange("notes", e.target.value)
              }
            />
          </label>
        </section>

        {error && (
          <p
            style={{
              color: "crimson",
              whiteSpace: "pre-wrap",
            }}
          >
            {error}
          </p>
        )}

        <div style={stickyFooterStyle}>
          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Guardando..."
              : "Guardar servicio"}
          </button>
        </div>
      </form>
    </div>
  );
}

function LocationSection({
  title,
  location,
  setLocation,
  geoKey,
  geoLoadingKey,
  onUseMyLocation,
}) {
  const onChange = (key, value, source = null) => {
    setLocation((prev) => ({
      ...prev,
      [key]: value,
      ...(source ? { location_source: source } : {}),
    }));

    if (source === "manual_coordinates") {
      setAddressMessage("");
    }
  };

  const geoLoading =
    geoLoadingKey === geoKey;

  const [addressLoading, setAddressLoading] = useState(false);
  const [addressMessage, setAddressMessage] = useState("");

  const hasCoordinates =
    String(location?.lat || "").trim() !== "" &&
    String(location?.lng || "").trim() !== "";

  const sourceLabel = (() => {
    const source = String(location?.location_source || "unknown").trim();

    if (source === "device_gps") {
      return "Coordenadas obtenidas por GPS del dispositivo";
    }

    if (source === "geocoded_address") {
      return "Coordenadas obtenidas desde la dirección";
    }

    if (source === "manual_coordinates") {
      return "Coordenadas capturadas manualmente";
    }

    return hasCoordinates
      ? "Origen de las coordenadas no identificado"
      : "";
  })();

  const locateAddressButtonLabel =
    hasCoordinates &&
    String(location?.address_text || "").trim() &&
    location?.location_source !== "geocoded_address"
      ? "Reemplazar con ubicación de la dirección"
      : "Ubicar dirección";

  const locateAddress = async () => {
    const address = String(location?.address_text || "").trim();

    if (!address) {
      setAddressMessage("Captura una dirección antes de ubicarla.");
      return;
    }

    try {
      setAddressLoading(true);
      setAddressMessage("");

      const result = await geocodeAddress(address);

      if (!result) {
        setAddressMessage(
          "No fue posible ubicar esta dirección. Puedes guardar el servicio o usar coordenadas manuales."
        );
        return;
      }

      setLocation((prev) => ({
        ...prev,
        lat: String(result.lat),
        lng: String(result.lng),
        location_source: "geocoded_address",
      }));

      setAddressMessage(
        "Dirección ubicada. Latitud y longitud actualizadas."
      );
    } catch {
      setAddressMessage(
        "No fue posible ubicar esta dirección. Puedes guardar el servicio o usar coordenadas manuales."
      );
    } finally {
      setAddressLoading(false);
    }
  };

  return (
    <section style={sectionStyle}>
      <h3>{title}</h3>

      <label style={labelStyle}>
        Nombre del lugar
        <input
          value={location.name}
          onChange={(e) =>
            onChange("name", e.target.value)
          }
          placeholder="Nombre del sitio, hospital, recinto..."
        />
      </label>

      <label style={labelStyle}>
        Tipo de lugar
        <select
          value={location.place_type}
          onChange={(e) =>
            onChange(
              "place_type",
              e.target.value
            )
          }
        >
          <option value="">
            No especificado
          </option>
          <option value="address">
            Domicilio
          </option>
          <option value="event">
            Evento
          </option>
          <option value="hospital">
            Hospital
          </option>
          <option value="clinic">
            Clínica
          </option>
          <option value="public_space">
            Espacio público
          </option>
          <option value="workplace">
            Centro de trabajo
          </option>
          <option value="other">
            Otro
          </option>
        </select>
      </label>

      <label style={labelStyle}>
        Dirección
        <input
          value={location.address_text}
          onChange={(e) =>
            onChange(
              "address_text",
              e.target.value
            )
          }
          placeholder="Calle, número, colonia, municipio..."
        />
      </label>

      <label style={labelStyle}>
        Referencia
        <input
          value={location.reference}
          onChange={(e) =>
            onChange(
              "reference",
              e.target.value
            )
          }
          placeholder="Acceso, puerta, punto de encuentro..."
        />
      </label>

      <div style={twoColumnStyle}>
        <label style={labelStyle}>
          Latitud
          <input
            value={location.lat}
            onChange={(e) =>
              onChange("lat", e.target.value, "manual_coordinates")
            }
          />
        </label>

        <label style={labelStyle}>
          Longitud
          <input
            value={location.lng}
            onChange={(e) =>
              onChange("lng", e.target.value, "manual_coordinates")
            }
          />
        </label>
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <button
          type="button"
          disabled={geoLoading || addressLoading}
          onClick={() =>
            onUseMyLocation(
              geoKey,
              setLocation
            )
          }
        >
          {geoLoading
            ? "Obteniendo ubicación..."
            : "Usar mi ubicación"}
        </button>

        <button
          type="button"
          disabled={
            geoLoading ||
            addressLoading ||
            !String(location?.address_text || "").trim()
          }
          onClick={locateAddress}
        >
          {addressLoading
            ? "Ubicando dirección..."
            : locateAddressButtonLabel}
        </button>
      </div>

      {!!sourceLabel && (
        <div
          style={{
            ...helperText,
            marginTop: 8,
            color: "#475569",
            fontWeight: 600,
          }}
        >
          {sourceLabel}
        </div>
      )}

      {!!addressMessage && (
        <div
          style={{
            ...helperText,
            color: addressMessage.startsWith("Dirección ubicada")
              ? "#047857"
              : "#92400e",
          }}
        >
          {addressMessage}
        </div>
      )}
    </section>
  );
}

const formStyle = {
  display: "grid",
  gap: 16,
};

const sectionStyle = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 18,
  display: "grid",
  gap: 12,
};

const labelStyle = {
  display: "grid",
  gap: 6,
};

const twoColumnStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
};

const warningStyle = {
  border: "1px solid #f59e0b",
  background: "#fffbeb",
  color: "#92400e",
  borderRadius: 10,
  padding: 12,
  lineHeight: 1.5,
};

const infoStyle = {
  border: "1px solid #dbeafe",
  background: "#eff6ff",
  color: "#1e3a8a",
  borderRadius: 10,
  padding: 12,
  lineHeight: 1.5,
};

const helperText = {
  color: "#6b7280",
  fontSize: 12,
};

const stickyFooterStyle = {
  position: "sticky",
  bottom: 12,
  display: "flex",
  gap: 12,
  paddingTop: 8,
  background:
    "linear-gradient(180deg, rgba(243,246,251,0) 0%, #f3f6fb 28px)",
};
