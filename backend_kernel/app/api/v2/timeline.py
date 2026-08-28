from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_company_id, get_current_user, get_db
from app.models.company_supply import CompanySupply
from app.models.frap_handoff_v2 import FrapHandoffV2
from app.models.frap_medication_v2 import FrapMedicationV2
from app.models.frap_procedure_v2 import FrapProcedureV2
from app.models.frap_refusal_v2 import FrapRefusalV2
from app.models.frap_trauma_v2 import FrapTraumaV2
from app.models.frap_vital_sign_v2 import FrapVitalSignV2
from app.models.medication_catalog import MedicationCatalog
from app.models.procedure_catalog import ProcedureCatalog
from app.models.service_dispatch_event_v2 import ServiceDispatchEventV2
from app.models.service_intake_v2 import ServiceIntakeV2
from app.models.service_supply_usage import ServiceSupplyUsage
from app.models.unit import Unit

router = APIRouter(prefix="/v2/timeline", tags=["v2-timeline"])

CATEGORY_LABELS = {
    "dispatch": "Operación",
    "clinical": "Clínico",
    "logistics": "Logística",
    "legal": "Legal",
}

OPERATIONAL_EVENT_LABELS = {
    "service_created": "Servicio creado",
    "unit_assigned": "Unidad asignada",
    "unit_reassigned": "Unidad reasignada",
    "unit_en_route": "Unidad en ruta",
    "unit_on_scene": "Unidad en escena",
    "patient_contact": "Contacto con paciente",
    "transport_started": "Inicio de traslado",
    "hospital_arrival": "Llegada a hospital",
    "service_closed": "Servicio cerrado",
}

CLINICAL_DISPATCH_EVENT_LABELS = {
    "clinical.assessment_updated": "Evaluación clínica actualizada",
    "clinical.body_map_updated": "Lesiones corporales actualizadas",
    "clinical.pediatrics_updated": "Evaluación pediátrica actualizada",
    "clinical.cardio_updated": "Evaluación cardiovascular actualizada",
    "clinical.pregnancy_updated": "Evaluación obstétrica actualizada",
}

BODY_MAP_REGION_LABELS = {
    "head": "Cabeza",
    "face": "Cara",
    "neck": "Cuello",
    "chest": "Tórax",
    "abdomen": "Abdomen",
    "pelvis": "Pelvis",
    "back": "Espalda",
    "left_shoulder": "Hombro izquierdo",
    "right_shoulder": "Hombro derecho",
    "left_arm": "Brazo izquierdo",
    "right_arm": "Brazo derecho",
    "left_hand": "Mano izquierda",
    "right_hand": "Mano derecha",
    "left_leg": "Pierna izquierda",
    "right_leg": "Pierna derecha",
    "left_foot": "Pie izquierdo",
    "right_foot": "Pie derecho",
    "occipital": "Occipital",
    "posterior_neck": "Cuello posterior",
    "upper_back": "Espalda alta",
    "lower_back": "Espalda baja",
    "gluteal": "Glúteos",
    "left_shoulder_back": "Hombro izquierdo posterior",
    "right_shoulder_back": "Hombro derecho posterior",
    "left_arm_back": "Brazo izquierdo posterior",
    "right_arm_back": "Brazo derecho posterior",
    "left_hand_back": "Mano izquierda posterior",
    "right_hand_back": "Mano derecha posterior",
    "left_leg_back": "Pierna izquierda posterior",
    "right_leg_back": "Pierna derecha posterior",
    "left_foot_back": "Pie izquierdo posterior",
    "right_foot_back": "Pie derecho posterior",
}

PEDIATRICS_PAT_LABELS = {
    "stable": "Estable",
    "respiratory_distress": "Dificultad respiratoria",
    "respiratory_failure": "Falla respiratoria",
    "shock": "Choque",
    "cns_metabolic_disorder": "Alteración SNC/metabólica",
    "cardiopulmonary_failure": "Falla cardiopulmonar",
}

OPERATIONAL_EVENT_TYPES = set(OPERATIONAL_EVENT_LABELS.keys())
CLINICAL_DISPATCH_EVENT_TYPES = set(CLINICAL_DISPATCH_EVENT_LABELS.keys())

STATUS_TRANSLATIONS = {
    "performed": "Realizado",
    "pending": "Pendiente",
    "cancelled": "Cancelado",
    "completed": "Completado",
    "partial": "Parcial",
    "success": "Exitoso",
    "successful": "Exitoso",
    "failed": "No exitoso",
    "full": "Completa",
    "partial_refusal": "Parcial",
    "no": "No",
    "yes": "Sí",
    "true": "Sí",
    "false": "No",
    "unknown": "Desconocido",
    "routine": "Rutinario",
    "urgent": "Urgente",
    "active": "Activo",
    "inactive": "Inactivo",
    "intact": "Íntegra",
    "alert": "Alerta",
    "stable": "Estable",
    "critical": "Crítico",
    "moderate": "Moderado",
    "severe": "Severo",
    "mild": "Leve",
    "minor": "Menor",
    "major": "Mayor",
    "none": "Ninguno",
    "n/a": "No aplica",
    "na": "No aplica",
    "newborn": "Recién nacido",
    "neonate": "Neonato",
    "infant": "Lactante menor",
    "lactante": "Lactante",
    "toddler": "Preescolar menor",
    "preschool": "Preescolar",
    "school_age": "Escolar",
    "adolescent": "Adolescente",
    "grey": "Gris",
    "pink": "Rosado",
    "red": "Rojo",
    "purple": "Morado",
    "yellow": "Amarillo",
    "white": "Blanco",
    "blue": "Azul",
    "orange": "Naranja",
    "green": "Verde",
    "typical_angina": "Angina típica",
    "atypical_angina": "Angina atípica",
    "oppressive": "Opresivo",
    "pleuritic": "Pleurítico",
    "burning": "Urente",
    "stabbing": "Punzante",
    "absent": "Sin dolor",
    "sinus_rhythm": "Ritmo sinusal",
    "sinus_bradycardia": "Bradicardia sinusal",
    "sinus_tachycardia": "Taquicardia sinusal",
    "atrial_fibrillation": "Fibrilación auricular",
    "atrial_flutter": "Flutter auricular",
    "svt": "Taquicardia supraventricular",
    "vt": "Taquicardia ventricular",
    "vf": "Fibrilación ventricular",
    "pea": "Actividad eléctrica sin pulso",
    "asystole": "Asistolia",
    "bradycardia": "Bradicardia",
    "tachycardia": "Taquicardia",
    "extreme_tachycardia": "Taquicardia extrema",
    "hypertensive": "Hipertensiva",
    "hypotensive": "Hipotensiva",
    "shock_pattern": "Patrón de choque",
    "adequate": "Adecuada",
    "delayed": "Retardada",
    "poor": "Deficiente",
    "critical_perfusion": "Perfusión crítica",
    "i": "Killip I",
    "ii": "Killip II",
    "iii": "Killip III",
    "iv": "Killip IV",
    "cephalic": "Cefálica",
    "breech": "Pélvica",
    "transverse": "Transversa",
    "female": "Femenino",
    "male": "Masculino",
    "indeterminate": "Indeterminado",
    "hypertonic": "Hipertónico",
    "hypotonic": "Hipotónico",
    "normal": "Normal",
}


def _safe_text(value: Any) -> str:
    if value is None:
        return ""

    text = str(value).strip()
    if not text:
        return ""

    fixes = {
        "Ã¡": "á",
        "Ã©": "é",
        "Ã­": "í",
        "Ã³": "ó",
        "Ãº": "ú",
        "Ã": "Á",
        "Ã‰": "É",
        "Ã": "Í",
        "Ã“": "Ó",
        "Ãš": "Ú",
        "Ã±": "ñ",
        "Ã‘": "Ñ",
        "Â·": "·",
        "Â": "",
    }

    for bad, good in fixes.items():
        text = text.replace(bad, good)

    return text


def _safe_number(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, Decimal):
        if value == value.to_integral():
            return str(int(value))
        return format(value.normalize(), "f")
    text = str(value).strip()
    if text.endswith(".00"):
        return text[:-3]
    return text


def _compact_join(parts: list[str]) -> str:
    return " · ".join([p for p in (_safe_text(x) for x in parts) if p])


def _payload_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _sort_key(event: dict[str, Any]) -> tuple[str, str]:
    value = event.get("created_at")
    if isinstance(value, datetime):
        try:
            return (value.isoformat(), str(event.get("id") or ""))
        except Exception:
            return ("", str(event.get("id") or ""))
    return (_safe_text(value), str(event.get("id") or ""))


def _humanize_text(value: Any) -> str:
    text = _safe_text(value)
    if not text:
        return ""

    key = text.lower()
    if key in STATUS_TRANSLATIONS:
        return STATUS_TRANSLATIONS[key]

    if key in BODY_MAP_REGION_LABELS:
        return BODY_MAP_REGION_LABELS[key]

    if key in PEDIATRICS_PAT_LABELS:
        return PEDIATRICS_PAT_LABELS[key]

    if "_" in text:
        parts = [
            STATUS_TRANSLATIONS.get(
                part.lower(),
                BODY_MAP_REGION_LABELS.get(
                    part.lower(),
                    PEDIATRICS_PAT_LABELS.get(part.lower(), part),
                ),
            )
            for part in text.split("_")
            if part
        ]
        text = " ".join(parts)

    if text.isupper() and len(text) > 4:
        return text

    return text


def _detail_item(label: str, value: Any) -> dict[str, str] | None:
    text = _humanize_text(value)
    if not text:
        return None
    return {"label": label, "value": text}


def _build_details(*pairs: tuple[str, Any]) -> list[dict[str, str]]:
    details: list[dict[str, str]] = []
    for label, value in pairs:
        item = _detail_item(label, value)
        if item:
            details.append(item)
    return details


def _push_event(
    sink: list[dict[str, Any]],
    *,
    event_id: str,
    category: str,
    event_type: str,
    title: str,
    subtitle: str = "",
    notes: str = "",
    created_at: datetime | None = None,
    unit_id: str | None = None,
    unit_code: str | None = None,
    event_payload: dict[str, Any] | None = None,
    detail_items: list[dict[str, str]] | None = None,
):
    sink.append(
        {
            "id": event_id,
            "category": category,
            "category_label": CATEGORY_LABELS.get(category, "Evento"),
            "event_type": event_type,
            "event_type_label": title or event_type,
            "title": title,
            "subtitle": subtitle or "",
            "notes": notes or "",
            "detail_items": detail_items or [],
            "unit_id": unit_id,
            "unit_code": unit_code,
            "created_at": created_at,
            "event_payload": event_payload or {},
        }
    )


@router.get("/intake/{intake_id}")
def get_intake_timeline(
    intake_id: uuid.UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    intake = (
        db.query(ServiceIntakeV2)
        .filter(
            ServiceIntakeV2.id == intake_id,
            ServiceIntakeV2.company_id == company_id,
        )
        .first()
    )
    if not intake:
        raise HTTPException(status_code=404, detail="Intake not found")

    events: list[dict[str, Any]] = []

    dispatch_rows = (
        db.query(ServiceDispatchEventV2)
        .filter(
            ServiceDispatchEventV2.company_id == company_id,
            ServiceDispatchEventV2.intake_id == intake_id,
        )
        .order_by(ServiceDispatchEventV2.created_at.asc())
        .all()
    )

    unit_ids = [r.unit_id for r in dispatch_rows if r.unit_id]
    unit_map = (
        {
            u.id: u
            for u in db.query(Unit)
            .filter(Unit.company_id == company_id, Unit.id.in_(unit_ids))
            .all()
        }
        if unit_ids
        else {}
    )

    for row in dispatch_rows:
        payload = _payload_dict(row.event_payload)
        unit = unit_map.get(row.unit_id) if row.unit_id else None
        unit_code = _safe_text(getattr(unit, "code", None)) or _safe_text(
            payload.get("unit_code")
        )

        if row.event_type in OPERATIONAL_EVENT_TYPES:
            subtitle = _compact_join(
                [
                    f"Unidad {unit_code}" if unit_code else "",
                    _safe_text(payload.get("destination")),
                    _safe_text(payload.get("hospital")),
                ]
            )
            details = _build_details(
                ("Unidad", unit_code),
                ("Observaciones", getattr(row, "notes", None)),
            )
            _push_event(
                events,
                event_id=str(row.id),
                category="dispatch",
                event_type=row.event_type,
                title=_safe_text(row.status_label)
                or OPERATIONAL_EVENT_LABELS.get(row.event_type)
                or "Evento operativo",
                subtitle=subtitle,
                notes=_safe_text(row.notes),
                created_at=row.occurred_at or row.created_at,
                unit_id=str(row.unit_id) if row.unit_id else None,
                unit_code=unit_code or None,
                event_payload=payload,
                detail_items=details,
            )
            continue

        if row.event_type in CLINICAL_DISPATCH_EVENT_TYPES:
            if row.event_type == "clinical.assessment_updated":
                subtitle = _safe_text(payload.get("summary")) or "Assessment V2"
                details = _build_details(
                    ("AVPU", payload.get("avpu")),
                    ("Glasgow total", payload.get("glasgow_total")),
                    ("Triage", payload.get("triage")),
                    ("Impresión primaria", payload.get("impression_primary")),
                    ("Impresión secundaria", payload.get("impression_secondary")),
                    ("S - Signos y síntomas", payload.get("sample_s")),
                    ("A - Alergias", payload.get("sample_a")),
                    ("M - Medicamentos", payload.get("sample_m")),
                    ("P - Padecimientos previos", payload.get("sample_p")),
                    ("L - Última ingesta", payload.get("sample_l")),
                    ("E - Eventos relacionados", payload.get("sample_e")),
                    ("Observaciones", getattr(row, "notes", None)),
                )
            elif row.event_type == "clinical.body_map_updated":
                anterior_regions = payload.get("anterior_regions") or []
                posterior_regions = payload.get("posterior_regions") or []
                injuries = payload.get("injuries") or []

                subtitle = (
                    _safe_text(payload.get("summary"))
                    or _compact_join(
                        [
                            f"Anterior {len(anterior_regions)}"
                            if anterior_regions
                            else "",
                            f"Posterior {len(posterior_regions)}"
                            if posterior_regions
                            else "",
                            f"Lesiones {len(injuries)}" if injuries else "",
                        ]
                    )
                    or "Body Map V2"
                )

                details = _build_details(
                    ("Estado", payload.get("status")),
                    (
                        "Regiones anteriores",
                        ", ".join([BODY_MAP_REGION_LABELS.get(str(x), _humanize_text(x)) for x in anterior_regions])
                        if anterior_regions
                        else None,
                    ),
                    (
                        "Regiones posteriores",
                        ", ".join([BODY_MAP_REGION_LABELS.get(str(x), _humanize_text(x)) for x in posterior_regions])
                        if posterior_regions
                        else None,
                    ),
                    ("Total de lesiones", len(injuries) if injuries else None),
                    ("Resumen", payload.get("summary")),
                    (
                        "Observaciones",
                        payload.get("notes") or getattr(row, "notes", None),
                    ),
                )
            elif row.event_type == "clinical.pediatrics_updated":
                fields = payload.get("fields") or {}
                estimated_age = " ".join(
                    [
                        x
                        for x in [
                            _safe_text(fields.get("estimated_age_value")),
                            _safe_text(fields.get("estimated_age_unit")),
                        ]
                        if x
                    ]
                )

                subtitle = _safe_text(payload.get("summary")) or _compact_join(
                    [
                        _humanize_text(fields.get("age_group")),
                        f"{_safe_text(fields.get('weight_kg'))} kg"
                        if _safe_text(fields.get("weight_kg"))
                        else "",
                        f"Broselow {_humanize_text(fields.get('broselow_color'))}"
                        if _safe_text(fields.get("broselow_color"))
                        else "",
                        _humanize_text(fields.get("pediatric_assessment_triangle")),
                    ]
                ) or "Pediatrics V2"

                details = _build_details(
                    ("Estado", payload.get("status")),
                    ("Grupo etario", fields.get("age_group")),
                    ("Edad estimada", estimated_age),
                    (
                        "Peso",
                        f"{_safe_text(fields.get('weight_kg'))} kg"
                        if _safe_text(fields.get("weight_kg"))
                        else None,
                    ),
                    ("Broselow", fields.get("broselow_color")),
                    ("Cuidador presente", "yes" if fields.get("caregiver_present") else "no"),
                    ("Cuidador", fields.get("caregiver_name")),
                    ("Triángulo de evaluación pediátrica", fields.get("pediatric_assessment_triangle")),
                    ("Apariencia", fields.get("appearance")),
                    ("Trabajo respiratorio", fields.get("work_of_breathing")),
                    ("Circulación a piel", fields.get("circulation_to_skin")),
                    (
                        "Relleno capilar",
                        f"{_safe_text(fields.get('capillary_refill_seconds'))} s"
                        if _safe_text(fields.get("capillary_refill_seconds"))
                        else None,
                    ),
                    (
                        "Glucosa",
                        f"{_safe_text(fields.get('blood_glucose_mg_dl'))} mg/dL"
                        if _safe_text(fields.get("blood_glucose_mg_dl"))
                        else None,
                    ),
                    ("FLACC", fields.get("pain_scale_flacc")),
                    ("Estado de inmunización", fields.get("immunization_status")),
                    ("Sospecha de maltrato", "yes" if fields.get("suspected_abuse") else "no"),
                    ("Control térmico", fields.get("temperature_control")),
                    (
                        "Observaciones",
                        fields.get("notes") or payload.get("notes") or getattr(row, "notes", None),
                    ),
                )
            elif row.event_type == "clinical.cardio_updated":
                fields = payload.get("fields") or {}

                subtitle = _safe_text(payload.get("summary")) or _compact_join(
                    [
                        _safe_text(fields.get("chief_complaint")),
                        _humanize_text(fields.get("chest_pain_type")),
                        _humanize_text(fields.get("detected_rhythm")),
                        "Sospecha de SCA" if fields.get("suspected_acute_coronary_syndrome") else "",
                        "Sospecha de STEMI" if fields.get("suspected_stemi") else "",
                        "Paro cardiaco" if fields.get("cardiac_arrest") else "",
                    ]
                ) or "Cardio V2"

                details = _build_details(
                    ("Estado", payload.get("status")),
                    ("Motivo principal", fields.get("chief_complaint")),
                    ("Tipo de dolor torácico", fields.get("chest_pain_type")),
                    ("Intensidad del dolor", fields.get("pain_severity")),
                    ("Inicio del síntoma", fields.get("symptom_onset")),
                    ("Irradiación", fields.get("pain_radiation")),
                    ("Disnea", "yes" if fields.get("dyspnea") else "no"),
                    ("Diaforesis", "yes" if fields.get("diaphoresis") else "no"),
                    ("Náusea o vómito", "yes" if fields.get("nausea_vomiting") else "no"),
                    ("Síncope", "yes" if fields.get("syncope") else "no"),
                    ("Edema", "yes" if fields.get("edema") else "no"),
                    ("Palpitaciones", "yes" if fields.get("palpitations") else "no"),
                    ("Ritmo detectado", fields.get("detected_rhythm")),
                    ("Frecuencia cardiaca interpretada", fields.get("interpreted_heart_rate")),
                    ("Signos de bajo gasto", fields.get("low_output_signs")),
                    ("Sospecha de SCA", "yes" if fields.get("suspected_acute_coronary_syndrome") else "no"),
                    ("Sospecha de STEMI", "yes" if fields.get("suspected_stemi") else "no"),
                    ("Paro cardiaco", "yes" if fields.get("cardiac_arrest") else "no"),
                    ("ROSC", "yes" if fields.get("rosc") else "no"),
                    ("Killip", fields.get("killip_class")),
                    ("ECG realizado", "yes" if fields.get("ecg_performed") else "no"),
                    ("Hallazgos ECG", fields.get("ecg_findings")),
                    ("Presión arterial interpretada", fields.get("interpreted_blood_pressure")),
                    ("Perfusión periférica", fields.get("peripheral_perfusion")),
                    ("Oxígeno administrado", "yes" if fields.get("oxygen_administered") else "no"),
                    ("Aspirina administrada", "yes" if fields.get("aspirin_administered") else "no"),
                    ("Nitroglicerina administrada", "yes" if fields.get("nitroglycerin_administered") else "no"),
                    ("Acceso IV/IO", "yes" if fields.get("iv_io_access") else "no"),
                    ("Monitor-desfibrilador", "yes" if fields.get("monitor_defibrillator") else "no"),
                    ("Desfibrilación", "yes" if fields.get("defibrillation_performed") else "no"),
                    ("Cardioversión", "yes" if fields.get("cardioversion_performed") else "no"),
                    ("Marcapasos transcutáneo", "yes" if fields.get("transcutaneous_pacing") else "no"),
                    ("RCP", "yes" if fields.get("cpr_performed") else "no"),
                    (
                        "Observaciones",
                        fields.get("notes") or payload.get("notes") or getattr(row, "notes", None),
                    ),
                )
            elif row.event_type == "clinical.pregnancy_updated":
                fields = payload.get("fields") or {}

                subtitle = _safe_text(payload.get("summary")) or _compact_join(
                    [
                        f"{_safe_text(fields.get('gestational_weeks'))} semanas"
                        if _safe_text(fields.get("gestational_weeks"))
                        else "",
                        f"Presentación {_humanize_text(fields.get('fetal_presentation'))}"
                        if _safe_text(fields.get("fetal_presentation"))
                        else "",
                        "Contracciones" if fields.get("contractions_present") else "",
                        "Sangrado vaginal" if fields.get("vaginal_bleeding") else "",
                        "Salida de líquido" if fields.get("fluid_leak") else "",
                        "Trabajo de parto" if fields.get("active_labor") else "",
                        "Parto atendido" if fields.get("delivery_performed") else "",
                    ]
                ) or "Pregnancy V2"

                details = _build_details(
                    ("Estado", payload.get("status")),
                    ("Embarazo confirmado", "yes" if fields.get("pregnancy_confirmed") else "no"),
                    ("Semanas de gestación", fields.get("gestational_weeks")),
                    ("Gestas", fields.get("gravida")),
                    ("Partos", fields.get("para")),
                    ("Abortos", fields.get("abortions")),
                    ("Cesáreas", fields.get("c_sections")),
                    ("FUM", fields.get("last_menstrual_period")),
                    ("Control prenatal", "yes" if fields.get("prenatal_control") else "no"),
                    ("Embarazo de alto riesgo", "yes" if fields.get("high_risk_pregnancy") else "no"),
                    ("Embarazo múltiple", "yes" if fields.get("multiple_pregnancy") else "no"),
                    ("Dolor abdominal", "yes" if fields.get("abdominal_pain") else "no"),
                    ("Sangrado vaginal", "yes" if fields.get("vaginal_bleeding") else "no"),
                    ("Salida de líquido", "yes" if fields.get("fluid_leak") else "no"),
                    ("Movimientos fetales", "yes" if fields.get("fetal_movements_present") else "no"),
                    ("Contracciones", "yes" if fields.get("contractions_present") else "no"),
                    ("Frecuencia de contracciones", fields.get("contraction_frequency")),
                    ("Duración de contracciones", fields.get("contraction_duration")),
                    ("Presentación fetal", fields.get("fetal_presentation")),
                    ("Coronamiento", "yes" if fields.get("crowning") else "no"),
                    ("Pujo", "yes" if fields.get("urge_to_push") else "no"),
                    ("Altura uterina", fields.get("uterine_height")),
                    ("Tono uterino", fields.get("uterine_tone")),
                    ("Frecuencia cardiaca fetal", fields.get("fetal_heart_rate")),
                    ("Sospecha de preeclampsia", "yes" if fields.get("suspected_preeclampsia") else "no"),
                    ("Sospecha de eclampsia", "yes" if fields.get("suspected_eclampsia") else "no"),
                    ("Trauma en embarazo", "yes" if fields.get("pregnancy_trauma") else "no"),
                    ("Trabajo de parto activo", "yes" if fields.get("active_labor") else "no"),
                    ("Parto atendido", "yes" if fields.get("delivery_performed") else "no"),
                    ("Hora de nacimiento", fields.get("birth_time")),
                    ("Sexo del recién nacido", fields.get("newborn_sex")),
                    ("APGAR 1 minuto", fields.get("apgar_1_min")),
                    ("APGAR 5 minutos", fields.get("apgar_5_min")),
                    ("Alumbramiento", "yes" if fields.get("placenta_delivered") else "no"),
                    ("Placenta íntegra", "yes" if fields.get("placenta_complete") else "no"),
                    ("Complicaciones maternas", fields.get("maternal_complications")),
                    ("Complicaciones neonatales", fields.get("neonatal_complications")),
                    ("Reanimación neonatal", "yes" if fields.get("neonatal_resuscitation") else "no"),
                    ("Oxígeno administrado", "yes" if fields.get("oxygen_administered") else "no"),
                    ("Acceso IV", "yes" if fields.get("iv_access") else "no"),
                    ("Control de hemorragia", "yes" if fields.get("hemorrhage_control") else "no"),
                    ("Pinzamiento de cordón", "yes" if fields.get("cord_clamping") else "no"),
                    ("Contacto piel a piel", "yes" if fields.get("skin_to_skin_contact") else "no"),
                    ("Abrigo térmico RN", "yes" if fields.get("newborn_thermal_care") else "no"),
                    ("Destino madre", fields.get("mother_destination")),
                    ("Destino RN", fields.get("newborn_destination")),
                    (
                        "Observaciones",
                        fields.get("notes") or payload.get("notes") or getattr(row, "notes", None),
                    ),
                )
            else:
                subtitle = _safe_text(payload.get("summary")) or "Evento clínico"
                details = _build_details(
                    ("Observaciones", getattr(row, "notes", None)),
                )

            _push_event(
                events,
                event_id=str(row.id),
                category="clinical",
                event_type=row.event_type,
                title=_safe_text(row.status_label)
                or CLINICAL_DISPATCH_EVENT_LABELS.get(row.event_type)
                or "Evento clínico",
                subtitle=subtitle,
                notes=_safe_text(row.notes),
                created_at=row.occurred_at or row.created_at,
                unit_id=str(row.unit_id) if row.unit_id else None,
                unit_code=unit_code or None,
                event_payload=payload,
                detail_items=details,
            )
            continue

    vital_rows = (
        db.query(FrapVitalSignV2)
        .filter(
            FrapVitalSignV2.company_id == company_id,
            FrapVitalSignV2.intake_id == intake_id,
        )
        .order_by(FrapVitalSignV2.created_at.asc())
        .all()
    )
    for row in vital_rows:
        measures = []
        if _safe_text(getattr(row, "blood_pressure", None)):
            measures.append(f"TA {_safe_text(row.blood_pressure)}")
        if _safe_text(getattr(row, "heart_rate", None)):
            measures.append(f"FC {_safe_text(row.heart_rate)}")
        if _safe_text(getattr(row, "respiratory_rate", None)):
            measures.append(f"FR {_safe_text(row.respiratory_rate)}")
        if _safe_text(getattr(row, "spo2", None)):
            measures.append(f"SpO2 {_safe_text(row.spo2)}")

        subtitle = _compact_join(
            [
                _humanize_text(getattr(row, "taken_at_label", None)),
                _compact_join(measures),
            ]
        )
        details = _build_details(
            ("Momento", getattr(row, "taken_at_label", None)),
            ("Temperatura", getattr(row, "temperature", None)),
            ("Glucosa", getattr(row, "glucose", None)),
            ("Escala de dolor", getattr(row, "pain_scale", None)),
            ("Pupilas", getattr(row, "pupils", None)),
            ("Observaciones", getattr(row, "notes", None)),
        )
        _push_event(
            events,
            event_id=f"vital-{row.id}",
            category="clinical",
            event_type="vital_sign_recorded",
            title="Signos vitales registrados",
            subtitle=subtitle,
            notes=_compact_join([_safe_text(getattr(row, "notes", None))]),
            created_at=row.taken_at or row.created_at,
            detail_items=details,
        )

    proc_rows = (
        db.query(FrapProcedureV2)
        .filter(
            FrapProcedureV2.company_id == company_id,
            FrapProcedureV2.intake_id == intake_id,
        )
        .order_by(FrapProcedureV2.created_at.asc())
        .all()
    )
    procedure_names = {
        _safe_text(getattr(r, "procedure_name", None))
        for r in proc_rows
        if _safe_text(getattr(r, "procedure_name", None))
    }
    proc_catalog_map = (
        {
            p.name: p
            for p in db.query(ProcedureCatalog)
            .filter(
                ProcedureCatalog.company_id == company_id,
                ProcedureCatalog.name.in_(procedure_names),
            )
            .all()
        }
        if procedure_names
        else {}
    )

    for row in proc_rows:
        procedure_name = _safe_text(getattr(row, "procedure_name", None)) or "Procedimiento"
        catalog = proc_catalog_map.get(procedure_name)
        subtitle = _compact_join(
            [
                _humanize_text(getattr(catalog, "category", None))
                if catalog
                else "",
                _humanize_text(getattr(row, "body_site", None)),
            ]
        )
        details = _build_details(
            ("Categoría", getattr(catalog, "category", None) if catalog else None),
            ("Sitio anatómico", getattr(row, "body_site", None)),
            ("Estado", getattr(row, "status", None)),
            (
                "Resultado",
                "Exitoso"
                if getattr(row, "successful", None) is True
                else "No exitoso"
                if getattr(row, "successful", None) is False
                else None,
            ),
            ("Observaciones", getattr(row, "notes", None)),
        )
        _push_event(
            events,
            event_id=f"procedure-{row.id}",
            category="clinical",
            event_type="procedure_recorded",
            title=procedure_name,
            subtitle=subtitle,
            notes=_safe_text(getattr(row, "notes", None)),
            created_at=row.performed_at or row.created_at,
            detail_items=details,
        )

    med_rows = (
        db.query(FrapMedicationV2)
        .filter(
            FrapMedicationV2.company_id == company_id,
            FrapMedicationV2.intake_id == intake_id,
        )
        .order_by(FrapMedicationV2.created_at.asc())
        .all()
    )
    medication_names = {
        _safe_text(getattr(r, "medication_name", None))
        for r in med_rows
        if _safe_text(getattr(r, "medication_name", None))
    }
    med_catalog_map = (
        {
            m.name: m
            for m in db.query(MedicationCatalog)
            .filter(
                MedicationCatalog.company_id == company_id,
                MedicationCatalog.name.in_(medication_names),
            )
            .all()
        }
        if medication_names
        else {}
    )

    for row in med_rows:
        medication_name = _safe_text(getattr(row, "medication_name", None)) or "Medicamento"
        catalog = med_catalog_map.get(medication_name)
        subtitle = _compact_join(
            [
                _humanize_text(getattr(row, "dose", None)),
                _safe_text(getattr(row, "route", None))
                or _safe_text(getattr(catalog, "route", None)),
            ]
        )
        details = _build_details(
            ("Dosis", getattr(row, "dose", None)),
            ("Vía", getattr(row, "route", None) or getattr(catalog, "route", None)),
            ("Respuesta", getattr(row, "response", None)),
            ("Observaciones", getattr(row, "notes", None)),
        )
        _push_event(
            events,
            event_id=f"med-{row.id}",
            category="clinical",
            event_type="medication_recorded",
            title=medication_name,
            subtitle=subtitle,
            notes=_safe_text(getattr(row, "notes", None)),
            created_at=row.administered_at or row.created_at,
            detail_items=details,
        )

    supply_rows = (
        db.query(ServiceSupplyUsage)
        .filter(
            ServiceSupplyUsage.company_id == company_id,
            ServiceSupplyUsage.intake_id == intake_id,
        )
        .order_by(ServiceSupplyUsage.created_at.asc())
        .all()
    )
    supply_ids = [r.supply_id for r in supply_rows if r.supply_id]
    supply_map = (
        {
            s.id: s
            for s in db.query(CompanySupply)
            .filter(
                CompanySupply.company_id == company_id,
                CompanySupply.id.in_(supply_ids),
            )
            .all()
        }
        if supply_ids
        else {}
    )

    for row in supply_rows:
        supply = supply_map.get(row.supply_id)
        title = _safe_text(getattr(supply, "name", None)) or "Insumo utilizado"
        subtitle = _compact_join(
            [
                f"Cantidad {_safe_number(getattr(row, 'quantity', None))}"
                if _safe_number(getattr(row, "quantity", None))
                else "",
                _safe_text(getattr(supply, "unit_label", None)),
            ]
        )
        details = _build_details(
            ("Cantidad", _safe_number(getattr(row, "quantity", None))),
            ("Unidad", getattr(supply, "unit_label", None)),
            ("Lote", getattr(row, "lot_number", None)),
            ("Costo total", _safe_number(getattr(row, "total_cost", None))),
            ("Observaciones", getattr(row, "notes", None)),
        )
        _push_event(
            events,
            event_id=f"supply-{row.id}",
            category="logistics",
            event_type="supply_recorded",
            title=title,
            subtitle=subtitle,
            notes=_safe_text(getattr(row, "notes", None)),
            created_at=row.created_at,
            detail_items=details,
        )

    trauma_rows = (
        db.query(FrapTraumaV2)
        .filter(
            FrapTraumaV2.company_id == company_id,
            FrapTraumaV2.intake_id == intake_id,
        )
        .order_by(FrapTraumaV2.created_at.asc())
        .all()
    )
    for row in trauma_rows:
        subtitle = _compact_join(
            [
                _humanize_text(getattr(row, "trauma_type", None)),
                _humanize_text(getattr(row, "mechanism", None))
                or _humanize_text(getattr(row, "mechanism_of_injury", None)),
                _humanize_text(getattr(row, "trauma_priority", None)),
            ]
        )
        details = _build_details(
            ("Tipo de trauma", getattr(row, "trauma_type", None)),
            ("Mecanismo", getattr(row, "mechanism", None) or getattr(row, "mechanism_of_injury", None)),
            ("Prioridad", getattr(row, "trauma_priority", None)),
            ("Cinemática", getattr(row, "kinematics", None)),
            ("Equipo de protección", getattr(row, "safety_equipment", None)),
            ("Regiones lesionadas", getattr(row, "injured_regions", None)),
            ("Deformidad", getattr(row, "deformity", None)),
            ("Heridas", getattr(row, "wounds", None)),
            ("Sangrado", getattr(row, "bleeding", None)),
            ("Quemaduras", getattr(row, "burns", None)),
            ("Inmovilización", getattr(row, "immobilization", None)),
            ("Observaciones", getattr(row, "notes", None)),
        )
        _push_event(
            events,
            event_id=f"trauma-{row.id}",
            category="clinical",
            event_type="trauma_recorded",
            title="Evaluación de trauma registrada",
            subtitle=subtitle,
            notes=_safe_text(getattr(row, "notes", None)),
            created_at=row.assessed_at or row.created_at,
            detail_items=details,
        )

    refusal_rows = (
        db.query(FrapRefusalV2)
        .filter(
            FrapRefusalV2.company_id == company_id,
            FrapRefusalV2.intake_id == intake_id,
        )
        .order_by(FrapRefusalV2.created_at.asc())
        .all()
    )
    for row in refusal_rows:
        subtitle = _compact_join(
            [
                _humanize_text(getattr(row, "refusal_type", None)),
                _humanize_text(getattr(row, "refusal_reason", None)),
            ]
        )
        details = _build_details(
            ("Tipo de negativa", getattr(row, "refusal_type", None)),
            ("Motivo", getattr(row, "refusal_reason", None)),
            ("Capacidad de decisión", getattr(row, "decision_capacity", None) or getattr(row, "patient_capacity", None)),
            ("Estado del paciente", getattr(row, "patient_condition_at_refusal", None)),
            ("Riesgos explicados", getattr(row, "risks_explained", None) or getattr(row, "risk_explained", None)),
            ("Recomendaciones aceptadas", getattr(row, "accepted_recommendations", None)),
            ("Indicaciones de retorno", getattr(row, "advised_return_precautions", None)),
            ("Testigo", getattr(row, "witness_name", None)),
            ("Observaciones", getattr(row, "notes", None)),
        )
        _push_event(
            events,
            event_id=f"refusal-{row.id}",
            category="legal",
            event_type="refusal_recorded",
            title="Negativa de atención registrada",
            subtitle=subtitle,
            notes=_safe_text(getattr(row, "notes", None)),
            created_at=row.refused_at or row.created_at,
            detail_items=details,
        )

    handoff_rows = (
        db.query(FrapHandoffV2)
        .filter(
            FrapHandoffV2.company_id == company_id,
            FrapHandoffV2.intake_id == intake_id,
        )
        .order_by(FrapHandoffV2.created_at.asc())
        .all()
    )
    for row in handoff_rows:
        event_time = getattr(row, "handoff_at", None) or row.created_at
        subtitle = _compact_join(
            [
                _humanize_text(getattr(row, "destination_hospital", None)),
                _humanize_text(getattr(row, "receiving_person_name", None)),
            ]
        )
        details = _build_details(
            ("Hospital destino", getattr(row, "destination_hospital", None)),
            ("Persona receptora", getattr(row, "receiving_person_name", None)),
            ("Cargo", getattr(row, "receiving_person_role", None)),
            ("Condición final del paciente", getattr(row, "patient_final_condition", None)),
            ("Resultado de entrega", getattr(row, "handoff_result", None)),
            ("Resumen de entrega", getattr(row, "handoff_summary", None)),
            ("Notas de continuidad", getattr(row, "continuity_notes", None)),
        )
        _push_event(
            events,
            event_id=f"handoff-{row.id}",
            category="clinical",
            event_type="handoff_completed",
            title="Traslado y entrega hospitalaria",
            subtitle=subtitle,
            notes=_safe_text(getattr(row, "handoff_summary", None)),
            created_at=event_time,
            detail_items=details,
        )

    events.sort(key=_sort_key, reverse=True)

    return {
        "intake_id": str(intake.id),
        "service_type": intake.service_type,
        "location_text": intake.location_text,
        "events": events,
    }