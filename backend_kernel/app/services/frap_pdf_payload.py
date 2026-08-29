from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from hashlib import sha256
from typing import Any
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.company_pdf_config import CompanyPdfConfig
from app.models.frap_assessment_v2 import FrapAssessmentV2
from app.models.frap_body_map_v2 import FrapBodyMapV2
from app.models.frap_cardio_v2 import FrapCardioV2
from app.models.frap_clinical_record_v2 import FrapClinicalRecordV2
from app.models.frap_handoff_v2 import FrapHandoffV2
from app.models.frap_medication_v2 import FrapMedicationV2
from app.models.frap_pediatrics_v2 import FrapPediatricsV2
from app.models.frap_pregnancy_v2 import FrapPregnancyV2
from app.models.frap_procedure_v2 import FrapProcedureV2
from app.models.frap_refusal_v2 import FrapRefusalV2
from app.models.frap_signature_v2 import FrapSignatureV2
from app.models.frap_trauma_v2 import FrapTraumaV2
from app.models.frap_vital_sign_v2 import FrapVitalSignV2
from app.models.service import Service
from app.models.service_dispatch_event_v2 import ServiceDispatchEventV2
from app.models.service_intake_v2 import ServiceIntakeV2
from app.models.service_location_v2 import ServiceLocationV2
from app.models.unit import Unit
from app.services.frap_case_resolution import validate_case_signatures

DEFAULT_TIMEZONE = "America/Mexico_City"
DEFAULT_PRIMARY_COLOR = "#0f4c81"
DEFAULT_ACCENT_COLOR = "#0f766e"
DEFAULT_SECTION_BG = "#eff6ff"
DEFAULT_SECTION_BORDER = "#dbeafe"
DEFAULT_TEXT_COLOR = "#1f2937"

DEFAULT_LEGAL_LEGEND = (
    "Este documento refleja la atención prehospitalaria realizada por personal autorizado "
    "con base en los hallazgos y acciones registrados durante el servicio. No sustituye la "
    "valoración médica hospitalaria posterior ni constituye diagnóstico definitivo."
)

DEFAULT_SIGNATURE_LEGEND = (
    "Las firmas asentadas en este documento corresponden a la aceptación, recepción o validación "
    "de la atención y/o entrega del paciente, según aplique al tipo de servicio."
)

DEFAULT_FOOTER_LEGEND = (
    "Documento generado por sistema FRAP V2. La reproducción parcial o alteración del contenido "
    "sin autorización puede invalidar su valor administrativo y operativo."
)

DEFAULT_PRIVACY_NOTICE = (
    "La información contenida en este documento puede incluir datos personales y datos sensibles, "
    "por lo que su tratamiento deberá realizarse conforme a la normativa aplicable de protección de datos."
)

DEFAULT_INSURANCE_LEGEND = (
    "La información contenida en este documento podrá utilizarse para fines administrativos, "
    "de auditoría, aseguramiento, reembolso o conciliación entre las partes autorizadas."
)

OPERATIONAL_EVENT_LABELS = {
    "unit_assigned": "Unidad asignada",
    "unit_reassigned": "Unidad reasignada",
    "unit_en_route": "Unidad en ruta",
    "unit_on_scene": "Unidad en escena",
    "standby_started": "Cobertura iniciada",
    "standby_finished": "Cobertura finalizada",
    "patient_contact": "Contacto con paciente",
    "transport_started": "Inicio de traslado",
    "hospital_arrival": "Llegada a hospital",
    "service_closed": "Servicio cerrado",
    "clinical.assessment_updated": "Evaluación clínica actualizada",
    "clinical.body_map_updated": "Lesiones corporales actualizadas",
    "clinical.pediatrics_updated": "Evaluación pediátrica actualizada",
    "clinical.cardio_updated": "Evaluación cardiovascular actualizada",
    "clinical.pregnancy_updated": "Evaluación obstétrica actualizada",
    "clinical.handoff_completed": "Entrega de paciente registrada",
    "clinical.refusal_recorded": "Negativa de atención registrada",
    "clinical.signature_updated": "Firma registrada",
    "operational.signature_updated": "Firma del responsable registrada",
    "clinical.trauma_updated": "Evaluación de trauma registrada",
    "clinical.procedure_updated": "Procedimiento realizado",
    "clinical.medication_updated": "Medicamento administrado",
}

IGNORED_SUMMARY_KEYS = {
    "id",
    "company_id",
    "intake_id",
    "created_at",
    "updated_at",
    "active",
    "meta_json",
}

SECTION_IGNORED_KEYS = {
    "id",
    "company_id",
    "intake_id",
    "created_at",
    "updated_at",
    "active",
    "meta_json",
}


DETAIL_LABELS = {
    "signer_name": "Nombre del firmante",
    "signer_role": "Rol del firmante",
    "signature_role": "Tipo de firma",
    "refused_to_sign": "Se negó a firmar",
    "procedure": "Procedimiento",
    "procedure_name": "Procedimiento",
    "body_site": "Sitio corporal",
    "successful": "Exitoso",
    "medication": "Medicamento",
    "medication_name": "Medicamento",
    "dose": "Dosis",
    "route": "Vía",
    "response": "Respuesta",
    "notes": "Notas",
    "estimated_age_value": "Edad estimada",
    "estimated_age_unit": "Unidad de edad",
    "weight_kg": "Peso (kg)",
    "chief_complaint": "Motivo principal",
    "broselow_color": "Color Broselow",
    "work_of_breathing": "Trabajo respiratorio",
    "chest_pain_type": "Tipo de dolor torácico",
    "pain_severity": "Severidad del dolor",
    "detected_rhythm": "Ritmo detectado",
    "suspected_acute_coronary_syndrome": "Sospecha de SCA",
    "interpreted_blood_pressure": "Presión arterial interpretada",
    "gestational_weeks": "Semanas de gestación",
    "contractions_present": "Contracciones",
    "contraction_frequency": "Frecuencia de contracciones",
    "fetal_presentation": "Presentación fetal",
    "active_labor": "Trabajo de parto activo",
    "destination_hospital": "Hospital destino",
    "receiving_person_name": "Nombre del receptor",
    "receiving_person_role": "Rol del receptor",
    "patient_final_condition": "Condición final del paciente",
    "handoff_result": "Resultado de entrega",
    "refusal_type": "Tipo de negativa",
    "refusal_reason": "Motivo de negativa",
    "decision_capacity": "Capacidad de decisión",
    "patient_condition_at_refusal": "Condición del paciente al rechazo",
}

DETAIL_VALUE_MAP = {
    "operator": "Paramédico / Admin",
    "receiver": "Receptor hospitalario",
    "patient": "Paciente / Responsable",
    "true": "Sí",
    "false": "No",
    "yes": "Sí",
    "no": "No",
    "private": "Privado",
    "public": "Público",
    "doctor": "Doctor",
}

FREE_TEXT_DETAIL_REPLACEMENTS = {
    "Assessment V2 guardado/actualizado": "Evaluación clínica guardada/actualizada",
    "Body Map V2 guardado/actualizado": "Mapa corporal guardado/actualizado",
    "Broselow pink": "Broselow rosa",
    "PAT respiratory_distress": "TEP dificultad respiratoria",
}


def _translate_detail_label(key: str) -> str:
    key = str(key or "").strip()
    return DETAIL_LABELS.get(key, key.replace("_", " ").strip().capitalize())


def _translate_detail_value(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "Sí" if value else "No"
    text = str(value).strip()
    if not text:
        return ""
    for src, dst in FREE_TEXT_DETAIL_REPLACEMENTS.items():
        text = text.replace(src, dst)
    return DETAIL_VALUE_MAP.get(text.lower(), text)



def _now_utc() -> datetime:
    return datetime.now(timezone.utc)



def _serialize(value: Any) -> Any:
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, Decimal):
        if value == value.to_integral():
            return int(value)
        return float(value)
    if isinstance(value, list):
        return [_serialize(v) for v in value]
    if isinstance(value, dict):
        return {str(k): _serialize(v) for k, v in value.items()}
    return value



def _row_to_dict(row: Any) -> dict[str, Any] | None:
    if not row:
        return None
    return {
        column.name: _serialize(getattr(row, column.name))
        for column in row.__table__.columns
    }



def _clean_dict(data: dict[str, Any] | None) -> dict[str, Any]:
    if not data:
        return {}
    return {
        k: v
        for k, v in data.items()
        if v not in (None, "", [], {})
    }



def _is_truthy_content(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, bool):
        return value
    if isinstance(value, (list, dict)):
        return len(value) > 0
    return bool(str(value).strip())



def _section_has_content(data: dict[str, Any] | None, ignored_keys: set[str] | None = None) -> bool:
    if not data:
        return False
    ignored = ignored_keys or set()
    for key, value in data.items():
        if key in ignored:
            continue
        if _is_truthy_content(value):
            return True
    return False



def _get_timezone_name(company_data: dict[str, Any], pdf_config: dict[str, Any]) -> str:
    tz_name = (
        pdf_config.get("timezone")
        or company_data.get("timezone")
        or company_data.get("time_zone")
        or DEFAULT_TIMEZONE
    )
    try:
        ZoneInfo(str(tz_name))
        return str(tz_name)
    except Exception:
        return DEFAULT_TIMEZONE



def _coerce_datetime(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        dt = value
    else:
        text = str(value).strip()
        if not text:
            return None
        if text.endswith("Z"):
            text = text[:-1] + "+00:00"
        try:
            dt = datetime.fromisoformat(text)
        except Exception:
            return None

    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt



def _local_dt_str(value: Any, timezone_name: str) -> str:
    dt = _coerce_datetime(value)
    if not dt:
        return ""
    try:
        local_dt = dt.astimezone(ZoneInfo(timezone_name))
    except Exception:
        local_dt = dt.astimezone(ZoneInfo(DEFAULT_TIMEZONE))
    return local_dt.strftime("%Y-%m-%d %H:%M:%S")



def _normalize_color(value: Any, fallback: str) -> str:
    text = str(value or "").strip()
    if not text:
        return fallback
    if len(text) == 7 and text.startswith("#"):
        return text
    return fallback



def _default_pdf_config(company_id: UUID) -> dict[str, Any]:
    return {
        "company_id": str(company_id),
        "include_legal_legend": True,
        "legal_legend_text": DEFAULT_LEGAL_LEGEND,
        "include_signature_legend": True,
        "signature_legend_text": DEFAULT_SIGNATURE_LEGEND,
        "include_footer_legend": True,
        "footer_legend_text": DEFAULT_FOOTER_LEGEND,
        "include_privacy_notice": False,
        "privacy_notice_text": DEFAULT_PRIVACY_NOTICE,
        "include_insurance_legend": False,
        "insurance_legend_text": DEFAULT_INSURANCE_LEGEND,
        "timezone": DEFAULT_TIMEZONE,
        "verification_base_url": "",
        "primary_color": DEFAULT_PRIMARY_COLOR,
        "accent_color": DEFAULT_ACCENT_COLOR,
        "section_bg_color": DEFAULT_SECTION_BG,
        "section_border_color": DEFAULT_SECTION_BORDER,
        "text_color": DEFAULT_TEXT_COLOR,
        "include_company_logo": True,
        "include_verification_block": True,
    }



def _build_branding(pdf_config: dict[str, Any]) -> dict[str, Any]:
    return {
        "primary_color": _normalize_color(pdf_config.get("primary_color"), DEFAULT_PRIMARY_COLOR),
        "accent_color": _normalize_color(pdf_config.get("accent_color"), DEFAULT_ACCENT_COLOR),
        "section_bg_color": _normalize_color(pdf_config.get("section_bg_color"), DEFAULT_SECTION_BG),
        "section_border_color": _normalize_color(pdf_config.get("section_border_color"), DEFAULT_SECTION_BORDER),
        "text_color": _normalize_color(pdf_config.get("text_color"), DEFAULT_TEXT_COLOR),
        "include_company_logo": bool(pdf_config.get("include_company_logo", True)),
        "include_verification_block": bool(pdf_config.get("include_verification_block", True)),
    }



def _build_legal_blocks(pdf_config: dict[str, Any]) -> list[dict[str, str]]:
    blocks: list[dict[str, str]] = []

    if pdf_config.get("include_legal_legend") and pdf_config.get("legal_legend_text"):
        blocks.append({
            "type": "legal",
            "title": "Leyenda legal",
            "text": pdf_config["legal_legend_text"],
        })

    if pdf_config.get("include_signature_legend") and pdf_config.get("signature_legend_text"):
        blocks.append({
            "type": "signature",
            "title": "Leyenda de firmas",
            "text": pdf_config["signature_legend_text"],
        })

    if pdf_config.get("include_privacy_notice") and pdf_config.get("privacy_notice_text"):
        blocks.append({
            "type": "privacy",
            "title": "Aviso de privacidad",
            "text": pdf_config["privacy_notice_text"],
        })

    if pdf_config.get("include_insurance_legend") and pdf_config.get("insurance_legend_text"):
        blocks.append({
            "type": "insurance",
            "title": "Uso administrativo / aseguramiento",
            "text": pdf_config["insurance_legend_text"],
        })

    if pdf_config.get("include_footer_legend") and pdf_config.get("footer_legend_text"):
        blocks.append({
            "type": "footer",
            "title": "Pie de documento",
            "text": pdf_config["footer_legend_text"],
        })

    return blocks



def _compact_detail_text(data: dict[str, Any], preferred_keys: list[str] | None = None, limit: int = 240) -> str:
    if not data:
        return ""

    keys = preferred_keys or list(data.keys())
    chunks: list[str] = []

    for key in keys:
        if key in IGNORED_SUMMARY_KEYS:
            continue
        value = data.get(key)
        if value in (None, "", [], {}):
            continue

        label = _translate_detail_label(key)
        if isinstance(value, list):
            rendered = ", ".join(_translate_detail_value(v) for v in value if str(v).strip())
        elif isinstance(value, dict):
            rendered = "; ".join(
                f"{_translate_detail_label(str(k))}: {_translate_detail_value(v)}"
                for k, v in value.items()
                if v not in (None, "", [], {})
            )
        else:
            rendered = _translate_detail_value(value)

        if rendered:
            chunks.append(f"{label}: {rendered}")

    text = "; ".join(chunks).strip()
    if len(text) > limit:
        return text[: limit - 3].rstrip() + "..."
    return text



def _timeline_detail_text(row: ServiceDispatchEventV2) -> str:
    payload = row.event_payload or {}
    event_type = str(row.event_type or "").strip()

    if event_type == "service_created":
        detail = _compact_detail_text(payload, ["service_type", "service_subtype", "location_text", "priority_clinical", "priority_operational"])
        return detail or "Servicio creado y registrado en el sistema."

    if event_type == "unit_assigned":
        detail = _compact_detail_text(payload, ["unit_name", "unit_code", "unit_id"])
        return detail or "Unidad asignada al servicio."

    if event_type == "unit_reassigned":
        detail = _compact_detail_text(payload, ["unit_name", "unit_code", "unit_id"])
        return detail or "Unidad reasignada al servicio."

    if event_type == "unit_en_route":
        detail = _compact_detail_text(payload, ["unit_name", "unit_code", "eta_minutes"])
        return detail or "Unidad en ruta hacia el sitio del incidente."

    if event_type == "unit_on_scene":
        detail = _compact_detail_text(payload, ["unit_name", "unit_code"])
        return detail or "Unidad arribó y quedó posicionada en el sitio."

    if event_type == "patient_contact":
        detail = _compact_detail_text(payload, ["contact_type", "patient_count_estimated"])
        return detail or "Se estableció contacto con el paciente."

    if event_type == "transport_started":
        detail = _compact_detail_text(payload, ["destination_hospital", "destination_name", "unit_name"])
        return detail or "Se inició el traslado del paciente."

    if event_type == "hospital_arrival":
        detail = _compact_detail_text(payload, ["destination_hospital", "destination_name", "receiving_person_name"])
        return detail or "Arribo al hospital receptor."

    if event_type == "service_closed":
        detail = _compact_detail_text(payload, ["closure_reason", "closure_type"])
        return detail or "Servicio cerrado."

    if event_type in {
        "clinical.signature_updated",
        "operational.signature_updated",
    }:
        return _compact_detail_text(
            payload,
            ["signer_name", "signer_role", "signature_role", "refused_to_sign"],
        )

    if event_type == "clinical.procedure_updated":
        return _compact_detail_text(payload, ["procedure", "procedure_name", "body_site", "successful", "notes"])

    if event_type == "clinical.medication_updated":
        return _compact_detail_text(payload, ["medication", "medication_name", "dose", "route", "response", "notes"])

    if event_type == "clinical.assessment_updated":
        summary = payload.get("summary")
        if summary:
            return f"Resumen: {summary}"
        detail = _compact_detail_text(payload, ["avpu", "glasgow_total", "triage", "impression_primary", "impression_secondary"])
        return detail or "Evaluación clínica guardada/actualizada"

    if event_type == "clinical.pediatrics_updated":
        summary = payload.get("summary")
        if summary:
            return f"Resumen: {summary}"
        return _compact_detail_text(payload, ["estimated_age_value", "estimated_age_unit", "weight_kg", "chief_complaint", "broselow_color", "work_of_breathing"])

    if event_type == "clinical.cardio_updated":
        summary = payload.get("summary")
        if summary:
            return f"Resumen: {summary}"
        detail = _compact_detail_text(payload, ["chest_pain_type", "pain_severity", "detected_rhythm", "suspected_acute_coronary_syndrome", "interpreted_blood_pressure"])
        return detail or "Evaluación cardiovascular actualizada."

    if event_type == "clinical.pregnancy_updated":
        summary = payload.get("summary")
        if summary:
            return f"Resumen: {summary}"
        return _compact_detail_text(payload, ["gestational_weeks", "contractions_present", "contraction_frequency", "fetal_presentation", "active_labor"])

    if event_type == "clinical.trauma_updated":
        summary = payload.get("summary")
        if summary:
            return f"Resumen: {summary}"
        detail = _compact_detail_text(payload, ["trauma_type", "mechanism", "trauma_priority", "injured_regions"])
        return detail or "Evaluación de trauma registrada."

    if event_type == "clinical.body_map_updated":
        summary = payload.get("summary")
        if summary:
            return f"Resumen: {summary}"
        detail = _compact_detail_text(payload, ["anterior_regions", "posterior_regions", "injuries", "notes"])
        return detail or "Mapa corporal guardado/actualizado"

    if event_type == "clinical.handoff_completed":
        detail = _compact_detail_text(payload, ["destination_hospital", "receiving_person_name", "receiving_person_role", "patient_final_condition", "handoff_result"])
        return detail or "Paciente entregado a unidad receptora."

    if event_type == "clinical.refusal_recorded":
        detail = _compact_detail_text(payload, ["refusal_type", "refusal_reason", "decision_capacity", "patient_condition_at_refusal"])
        return detail or "Negativa de atención registrada."

    if row.notes and str(row.notes).strip():
        return str(row.notes).strip()

    if payload:
        return _compact_detail_text(payload)

    return ""



def _timeline_item(row: ServiceDispatchEventV2, timezone_name: str) -> dict[str, Any]:
    payload = row.event_payload or {}
    event_time = row.occurred_at or row.created_at
    return {
        "id": str(row.id),
        "created_at": _serialize(event_time),
        "created_at_display": _local_dt_str(event_time, timezone_name),
        "occurred_at": _serialize(row.occurred_at),
        "recorded_at": _serialize(row.created_at),
        "recorded_at_display": _local_dt_str(row.created_at, timezone_name),
        "event_type": row.event_type,
        "label": OPERATIONAL_EVENT_LABELS.get(row.event_type, str(row.status_label or row.event_type or "").strip()),
        "status_label": _translate_detail_value(str(row.status_label or "").strip()),
        "notes": _translate_detail_value(str(row.notes or "").strip()),
        "payload": _serialize(payload),
        "detail_text": _timeline_detail_text(row),
    }



def _signature_sort_key(role: str) -> int:
    order = {
        "event_responsible": 1,
        "operator": 2,
        "receiver": 3,
        "patient": 4,
    }
    return order.get(str(role or "").lower(), 99)



def _section_nonempty_fields(data: dict[str, Any], ignored: set[str] | None = None) -> dict[str, Any]:
    ignored = ignored or set()
    return {k: v for k, v in (data or {}).items() if k not in ignored and v not in (None, "", [], {})}



def _apply_relevance_filter(section_key: str, data: dict[str, Any], context: dict[str, Any]) -> tuple[bool, str | None]:
    fields = _section_nonempty_fields(data, SECTION_IGNORED_KEYS)
    if not fields:
        return False, "sin contenido"

    patient = context.get("patient") or {}
    patient_age = str(patient.get("patient_age") or "").strip()
    patient_sex = str(patient.get("patient_sex") or "").strip().lower()
    chief = str((context.get("clinical_summary") or {}).get("chief_complaint") or "").lower()
    narrative = str((context.get("clinical_summary") or {}).get("narrative") or "").lower()

    if section_key == "pediatrics":
        pediatric_signals = [
            patient_age and patient_age.isdigit() and int(patient_age) <= 17,
            "pediatric" in chief,
            "pediatr" in narrative,
            bool(fields.get("broselow_color")),
            bool(fields.get("pediatric_assessment_triangle")),
            bool(fields.get("caregiver_present")),
            bool(fields.get("weight_kg")),
        ]
        included = any(pediatric_signals)
        return included, None if included else "bloque pediátrico no relevante"

    if section_key == "pregnancy":
        pregnancy_signals = [
            patient_sex in {"female", "femenino", "mujer"},
            bool(fields.get("pregnancy_confirmed")),
            bool(fields.get("gestational_weeks")),
            bool(fields.get("fetal_heart_rate")),
            bool(fields.get("contractions_present")),
            bool(fields.get("active_labor")),
            "embar" in chief,
            "gesta" in chief,
            "embar" in narrative,
            "gesta" in narrative,
            "obst" in narrative,
        ]
        included = any(pregnancy_signals)
        return included, None if included else "bloque obstétrico no relevante"

    if section_key == "cardio":
        cardio_signals = [
            bool(fields.get("chest_pain_type")),
            bool(fields.get("detected_rhythm")),
            bool(fields.get("ecg_findings")),
            bool(fields.get("suspected_acute_coronary_syndrome")),
            bool(fields.get("aspirin_administered")),
            bool(fields.get("nitroglycerin_administered")),
            "card" in chief,
            "pecho" in chief,
            "angina" in narrative,
            "card" in narrative,
        ]
        included = any(cardio_signals)
        return included, None if included else "bloque cardio no relevante"

    if section_key == "trauma":
        trauma_signals = [
            bool(fields.get("trauma_type")),
            bool(fields.get("mechanism")),
            bool(fields.get("injured_regions")),
            bool(fields.get("deformity")),
            bool(fields.get("wounds")),
            bool(fields.get("bleeding")),
            bool(fields.get("burns")),
            "trauma" in chief,
            "accidente" in chief,
            "golpe" in chief,
            "trauma" in narrative,
            "accidente" in narrative,
            "impacto" in narrative,
        ]
        included = any(trauma_signals)
        return included, None if included else "bloque trauma no relevante"

    if section_key == "body_map":
        body_map_signals = [
            bool(fields.get("anterior_regions")),
            bool(fields.get("posterior_regions")),
            bool(fields.get("injuries")),
            bool(fields.get("summary")),
        ]
        included = any(body_map_signals)
        return included, None if included else "mapa corporal no relevante"

    return True, None



def _build_verification_block(
    intake_id: UUID,
    company_id: UUID,
    case_type: str,
    ready_for_pdf: bool,
    timezone_name: str,
    generated_at: datetime,
    signatures_data: list[dict[str, Any]],
    pdf_config: dict[str, Any],
) -> dict[str, Any]:
    signature_names = [
        str(sig.get("signer_name") or "").strip()
        for sig in signatures_data
        if str(sig.get("signer_name") or "").strip()
    ]
    base_string = "|".join([
        str(company_id),
        str(intake_id),
        str(case_type),
        str(ready_for_pdf),
        timezone_name,
        generated_at.isoformat(),
        ",".join(signature_names),
    ])
    full_hash = sha256(base_string.encode("utf-8")).hexdigest()
    short_hash = full_hash[:16].upper()

    verification_base_url = str(pdf_config.get("verification_base_url") or "").strip()
    verification_url = ""
    if verification_base_url:
        sep = "&" if "?" in verification_base_url else "?"
        verification_url = f"{verification_base_url}{sep}intake_id={intake_id}&hash={short_hash}"

    qr_text = verification_url or f"FRAP|{intake_id}|{short_hash}"

    if case_type == "standby_operational":
        legal_legend = (
            "Este documento constituye un registro electrónico de la operación de una guardia, cobertura o evento de ambulancia. "
            "La información contenida refleja los datos operativos registrados durante el servicio y la firma del responsable o autoridad del evento. "
            "No constituye un registro de atención clínica ni acredita por sí mismo la prestación de atención médica a un paciente."
        )

        control_text = (
            "Esta constancia corresponde a un registro electrónico operativo generado por el sistema FRAP V2. "
            "Para efectos de control y trazabilidad, cuenta con identificador único y código de verificación que permiten validar su integridad dentro del sistema."
        )
    else:
        legal_legend = (
            "Este documento constituye un registro electrónico de atención médica prehospitalaria y forma parte del expediente operativo del servicio. "
            "La información contenida refleja los datos capturados durante la atención y las firmas registradas en el sistema. "
            "El presente documento no sustituye, por sí mismo, mecanismos de firma electrónica avanzada o certificación externa conforme a la legislación aplicable, "
            "pero puede ser utilizado como elemento de soporte documental, operativo y administrativo."
        )

        control_text = (
            "Este documento corresponde a un registro electrónico de atención prehospitalaria generado por el sistema FRAP. "
            "Para efectos de control y trazabilidad, cuenta con identificador único y código de verificación que permiten validar su integridad dentro del sistema."
        )

    return {
        "title": "VERIFICACIÓN Y CONTROL DOCUMENTAL",
        "hash_full": full_hash,
        "hash_short": short_hash,
        "verification_url": verification_url,
        "qr_text": qr_text,
        "document_id": str(intake_id),
        "generated_at_display": _local_dt_str(generated_at, timezone_name),
        "timezone_name": timezone_name,
        "control_text": control_text,
        "legal_legend": legal_legend,
        "qr_caption": "Validación digital: este documento puede ser verificado mediante el código QR o a través del sistema correspondiente.",
    }



def build_frap_pdf_payload(db: Session, company_id: UUID, intake_id: UUID) -> dict[str, Any]:
    intake = db.query(ServiceIntakeV2).filter(ServiceIntakeV2.company_id == company_id, ServiceIntakeV2.id == intake_id).first()
    if not intake:
        raise ValueError("Intake not found")

    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise ValueError("Company not found")

    pdf_config_row = db.query(CompanyPdfConfig).filter(CompanyPdfConfig.company_id == company_id).first()

    service = None
    unit = None
    if intake.service_id:
        service = db.query(Service).filter(Service.id == intake.service_id, Service.company_id == company_id).first()
        if service and service.unit_id:
            unit = db.query(Unit).filter(Unit.id == service.unit_id, Unit.company_id == company_id).first()

    if not unit:
        latest_unit_event = (
            db.query(ServiceDispatchEventV2)
            .filter(
                ServiceDispatchEventV2.company_id == company_id,
                ServiceDispatchEventV2.intake_id == intake_id,
                ServiceDispatchEventV2.unit_id.isnot(None),
            )
            .order_by(ServiceDispatchEventV2.created_at.desc())
            .first()
        )
        if latest_unit_event and latest_unit_event.unit_id:
            unit = db.query(Unit).filter(
                Unit.id == latest_unit_event.unit_id,
                Unit.company_id == company_id,
            ).first()

    clinical_record = db.query(FrapClinicalRecordV2).filter(FrapClinicalRecordV2.company_id == company_id, FrapClinicalRecordV2.intake_id == intake_id).first()
    assessment = db.query(FrapAssessmentV2).filter(FrapAssessmentV2.company_id == company_id, FrapAssessmentV2.intake_id == intake_id).first()
    trauma = db.query(FrapTraumaV2).filter(FrapTraumaV2.company_id == company_id, FrapTraumaV2.intake_id == intake_id).first()
    body_map = db.query(FrapBodyMapV2).filter(FrapBodyMapV2.company_id == company_id, FrapBodyMapV2.intake_id == intake_id).first()
    refusal = db.query(FrapRefusalV2).filter(FrapRefusalV2.company_id == company_id, FrapRefusalV2.intake_id == intake_id).first()
    handoff = db.query(FrapHandoffV2).filter(FrapHandoffV2.company_id == company_id, FrapHandoffV2.intake_id == intake_id).first()
    pediatrics = db.query(FrapPediatricsV2).filter(FrapPediatricsV2.company_id == company_id, FrapPediatricsV2.intake_id == intake_id).first()
    cardio = db.query(FrapCardioV2).filter(FrapCardioV2.company_id == company_id, FrapCardioV2.intake_id == intake_id).first()
    pregnancy = db.query(FrapPregnancyV2).filter(FrapPregnancyV2.company_id == company_id, FrapPregnancyV2.intake_id == intake_id).first()

    vital_signs = db.query(FrapVitalSignV2).filter(FrapVitalSignV2.company_id == company_id, FrapVitalSignV2.intake_id == intake_id).order_by(FrapVitalSignV2.created_at.asc()).all()
    procedures = db.query(FrapProcedureV2).filter(FrapProcedureV2.company_id == company_id, FrapProcedureV2.intake_id == intake_id).order_by(FrapProcedureV2.created_at.asc()).all()
    medications = db.query(FrapMedicationV2).filter(FrapMedicationV2.company_id == company_id, FrapMedicationV2.intake_id == intake_id).order_by(FrapMedicationV2.created_at.asc()).all()
    events = db.query(ServiceDispatchEventV2).filter(ServiceDispatchEventV2.company_id == company_id, ServiceDispatchEventV2.intake_id == intake_id).order_by(ServiceDispatchEventV2.created_at.asc()).all()
    signatures = db.query(FrapSignatureV2).filter(FrapSignatureV2.company_id == company_id, FrapSignatureV2.intake_id == intake_id).all()

    validation = validate_case_signatures(db, company_id, intake_id)

    company_data = _clean_dict(_row_to_dict(company))
    pdf_config = _clean_dict(_row_to_dict(pdf_config_row)) if pdf_config_row else _default_pdf_config(company_id)
    pdf_config = {**_default_pdf_config(company_id), **pdf_config}
    timezone_name = _get_timezone_name(company_data, pdf_config)

    service_data = _clean_dict(_row_to_dict(intake))
    service_data["created_at_display"] = _local_dt_str(service_data.get("created_at"), timezone_name)
    service_data["updated_at_display"] = _local_dt_str(service_data.get("updated_at"), timezone_name)
    service_data["standby_starts_at_display"] = _local_dt_str(
        service_data.get("standby_starts_at"),
        timezone_name,
    )
    service_data["standby_ends_at_display"] = _local_dt_str(
        service_data.get("standby_ends_at"),
        timezone_name,
    )
    if service:
        service_data["service_record"] = _clean_dict(_row_to_dict(service))
    if unit:
        service_data["unit"] = _clean_dict(_row_to_dict(unit))

    location_rows = (
        db.query(ServiceLocationV2)
        .filter(
            ServiceLocationV2.company_id == company_id,
            ServiceLocationV2.intake_id == intake_id,
            ServiceLocationV2.active.is_(True),
        )
        .order_by(
            ServiceLocationV2.sequence.asc(),
            ServiceLocationV2.created_at.asc(),
        )
        .all()
    )

    service_data["locations"] = [
        _clean_dict(_row_to_dict(row) or {})
        for row in location_rows
    ]

    parent_context = None
    if intake.parent_intake_id:
        parent = (
            db.query(ServiceIntakeV2)
            .filter(
                ServiceIntakeV2.company_id == company_id,
                ServiceIntakeV2.id == intake.parent_intake_id,
            )
            .first()
        )

        if parent:
            parent_context = _clean_dict(_row_to_dict(parent))
            parent_context["standby_starts_at_display"] = _local_dt_str(
                parent_context.get("standby_starts_at"),
                timezone_name,
            )
            parent_context["standby_ends_at_display"] = _local_dt_str(
                parent_context.get("standby_ends_at"),
                timezone_name,
            )

    if parent_context:
        service_data["parent_context"] = parent_context

    patient = {}
    if clinical_record:
        patient = {
            "patient_name": clinical_record.patient_name,
            "patient_age": clinical_record.patient_age,
            "patient_sex": clinical_record.patient_sex,
            "patient_birth_date": _serialize(clinical_record.patient_birth_date),
            "patient_identifier": clinical_record.patient_identifier,
            "patient_address": clinical_record.patient_address,
            "responsible_name": clinical_record.responsible_name,
            "responsible_relationship": clinical_record.responsible_relationship,
            "responsible_phone": clinical_record.responsible_phone,
        }
    patient = _clean_dict(patient)

    assessment_data = _clean_dict(_row_to_dict(assessment))
    clinical_record_data = _clean_dict(_row_to_dict(clinical_record))
    trauma_data = _clean_dict(_row_to_dict(trauma))
    body_map_data = _clean_dict(_row_to_dict(body_map))
    refusal_data = _clean_dict(_row_to_dict(refusal))
    handoff_data = _clean_dict(_row_to_dict(handoff))
    pediatrics_data = _clean_dict(_row_to_dict(pediatrics))
    cardio_data = _clean_dict(_row_to_dict(cardio))
    pregnancy_data = _clean_dict(_row_to_dict(pregnancy))

    semantic_section_dates = [
        (assessment_data, "assessed_at"),
        (trauma_data, "assessed_at"),
        (body_map_data, "assessed_at"),
        (pediatrics_data, "assessed_at"),
        (cardio_data, "assessed_at"),
        (pregnancy_data, "assessed_at"),
        (refusal_data, "refused_at"),
        (handoff_data, "handoff_at"),
    ]

    for section_data, field_name in semantic_section_dates:
        if section_data:
            section_data[f"{field_name}_display"] = _local_dt_str(
                section_data.get(field_name),
                timezone_name,
            )

    vital_signs_data = [_clean_dict(_row_to_dict(x) or {}) for x in vital_signs]
    procedures_data = [_clean_dict(_row_to_dict(x) or {}) for x in procedures]
    medications_data = [_clean_dict(_row_to_dict(x) or {}) for x in medications]

    for row in vital_signs_data:
        row["taken_at_display"] = _local_dt_str(
            row.get("taken_at") or row.get("created_at"),
            timezone_name,
        )

    for row in procedures_data:
        row["performed_at_display"] = _local_dt_str(
            row.get("performed_at") or row.get("created_at"),
            timezone_name,
        )

    for row in medications_data:
        row["administered_at_display"] = _local_dt_str(
            row.get("administered_at") or row.get("created_at"),
            timezone_name,
        )

    vital_signs_data.sort(
        key=lambda x: _coerce_datetime(x.get("taken_at") or x.get("created_at"))
        or datetime.min.replace(tzinfo=timezone.utc)
    )
    procedures_data.sort(
        key=lambda x: _coerce_datetime(x.get("performed_at") or x.get("created_at"))
        or datetime.min.replace(tzinfo=timezone.utc)
    )
    medications_data.sort(
        key=lambda x: _coerce_datetime(x.get("administered_at") or x.get("created_at"))
        or datetime.min.replace(tzinfo=timezone.utc)
    )

    timeline_data = [_timeline_item(x, timezone_name) for x in events]
    timeline_data.sort(
        key=lambda x: _coerce_datetime(x.get("created_at"))
        or datetime.min.replace(tzinfo=timezone.utc)
    )

    signatures_data = sorted([_clean_dict(_row_to_dict(x) or {}) for x in signatures], key=lambda x: _signature_sort_key(x.get("signature_role")))
    for sig in signatures_data:
        sig["signed_at_display"] = _local_dt_str(sig.get("signed_at"), timezone_name)

    clinical_summary = _clean_dict({
        "chief_complaint": clinical_record.chief_complaint if clinical_record else "",
        "mechanism_of_injury": clinical_record.mechanism_of_injury if clinical_record else "",
        "clinical_impression": clinical_record.clinical_impression if clinical_record else "",
        "consciousness_level": clinical_record.consciousness_level if clinical_record else "",
        "airway_status": clinical_record.airway_status if clinical_record else "",
        "breathing_status": clinical_record.breathing_status if clinical_record else "",
        "circulation_status": clinical_record.circulation_status if clinical_record else "",
        "narrative": clinical_record.narrative if clinical_record else "",
        "destination_outcome": clinical_record.destination_outcome if clinical_record else "",
        "triage": assessment.triage if assessment else "",
        "impression_primary": assessment.impression_primary if assessment else "",
        "impression_secondary": assessment.impression_secondary if assessment else "",
    })

    relevance_context = {"patient": patient, "clinical_summary": clinical_summary}

    sections = {
        "clinical_record": {"included": _section_has_content(clinical_record_data, {"id", "company_id", "intake_id", "created_at", "updated_at", "active"}), "title": "Registro clínico", "data": clinical_record_data},
        "assessment": {"included": _section_has_content(assessment_data, {"id", "company_id", "intake_id", "created_at", "updated_at"}), "title": "Evaluación general", "data": assessment_data},
        "vital_signs": {"included": len(vital_signs_data) > 0, "title": "Signos vitales", "data": vital_signs_data},
        "procedures": {"included": len(procedures_data) > 0, "title": "Procedimientos", "data": procedures_data},
        "medications": {"included": len(medications_data) > 0, "title": "Medicamentos", "data": medications_data},
        "trauma": {"included": _section_has_content(trauma_data, {"id", "company_id", "intake_id", "created_at", "updated_at", "active"}), "title": "Trauma", "data": trauma_data},
        "body_map": {"included": _section_has_content(body_map_data, {"id", "company_id", "intake_id", "created_at", "updated_at"}), "title": "Mapa corporal", "data": body_map_data},
        "pediatrics": {"included": _section_has_content(pediatrics_data, {"id", "company_id", "intake_id", "created_at", "updated_at", "active"}), "title": "Pediatría", "data": pediatrics_data},
        "cardio": {"included": _section_has_content(cardio_data, {"id", "company_id", "intake_id", "created_at", "updated_at", "active"}), "title": "Cardio", "data": cardio_data},
        "pregnancy": {"included": _section_has_content(pregnancy_data, {"id", "company_id", "intake_id", "created_at", "updated_at", "active"}), "title": "Embarazo / Obstetricia", "data": pregnancy_data},
        "refusal": {"included": validation.get("case_type") == "refusal", "title": "Negativa de atención / traslado", "data": refusal_data},
        "handoff": {"included": validation.get("case_type") == "handoff", "title": "Traslado y entrega", "data": handoff_data},
    }

    for key in ["pediatrics", "cardio", "pregnancy", "trauma", "body_map"]:
        section = sections.get(key)
        if section and section.get("included"):
            included, reason = _apply_relevance_filter(key, section.get("data") or {}, relevance_context)
            section["included"] = included
            if reason:
                section["hidden_reason"] = reason

    generated_at = _now_utc()
    verification = _build_verification_block(
        intake_id=intake_id,
        company_id=company_id,
        case_type=validation.get("case_type") or "incomplete",
        ready_for_pdf=bool(validation.get("is_ready_for_pdf")),
        timezone_name=timezone_name,
        generated_at=generated_at,
        signatures_data=signatures_data,
        pdf_config=pdf_config,
    )

    payload = {
        "intake_id": intake_id,
        "company_id": company_id,
        "ready_for_pdf": bool(validation.get("is_ready_for_pdf")),
        "case_type": validation.get("case_type") or "incomplete",
        "validation": {
            "intake_id": str(validation.get("intake_id") or intake_id),
            "case_type": validation.get("case_type") or "incomplete",
            "is_ready_for_pdf": bool(validation.get("is_ready_for_pdf")),
            "missing_signature_roles": validation.get("missing_signature_roles") or [],
            "inconsistency": validation.get("inconsistency"),
            "requires_retrospective_approval": bool(
                validation.get("requires_retrospective_approval")
            ),
            "is_retrospective_approved": bool(
                validation.get("is_retrospective_approved")
            ),
            "approval_missing": bool(validation.get("approval_missing")),
        },
        "generated_at": generated_at,
        "generated_at_display": _local_dt_str(generated_at, timezone_name),
        "timezone_name": timezone_name,
        "company": company_data,
        "pdf_config": pdf_config,
        "branding": _build_branding(pdf_config),
        "service": service_data,
        "patient": patient,
        "clinical_summary": clinical_summary,
        "sections": sections,
        "timeline": timeline_data,
        "signatures": signatures_data,
        "legal_blocks": _build_legal_blocks(pdf_config),
        "verification": verification,
    }

    return payload
