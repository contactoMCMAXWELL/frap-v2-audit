from __future__ import annotations

import base64
import os
from datetime import datetime
from io import BytesIO
from typing import Any
from urllib.parse import urlparse

import qrcode
from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML

TEMPLATE_DIR = os.path.join(os.path.dirname(__file__), "templates")

VALUE_MAP = {
    "male": "Masculino",
    "female": "Femenino",
    "other": "Otro",
    "unknown": "Desconocido",
    "critical": "Crítica",
    "urgent": "Urgente",
    "routine": "Rutinaria",
    "high": "Alta",
    "medium": "Media",
    "low": "Baja",
    "unknown": "No determinado",
    "public": "Público",
    "private": "Particular",
    "insurance": "Aseguradora",
    "contract": "Convenio",
    "completed": "Completado",
    "performed": "Realizado",
    "attempted": "Intentado",
    "pending": "Pendiente",
    "active": "Activo",
    "inactive": "Inactivo",
    "penetrating": "Penetrante",
    "blunt": "Contuso",
    "moderate": "Moderado",
    "minor": "Leve",
    "severe": "Severo",
    "pink": "Rosa",
    "red": "Rojo",
    "yellow": "Amarillo",
    "green": "Verde",
    "blue": "Azul",
    "black": "Negro",
    "respiratory_distress": "Dificultad respiratoria",
    "typical_angina": "Angina típica",
    "atypical_angina": "Angina atípica",
    "sinus_tachycardia": "Taquicardia sinusal",
    "tachycardia": "Taquicardia",
    "bradycardia": "Bradicardia",
    "hypertensive": "Hipertenso",
    "hypotensive": "Hipotenso",
    "delayed": "Retardada",
    "cephalic": "Cefálica",
    "self": "Paciente",
    "responsible": "Responsable",
    "operator": "Paramédico / Admin",
    "receiver": "Receptor hospitalario",
    "patient": "Paciente / Responsable",
    "yes": "Sí",
    "no": "No",
    "true": "Sí",
    "false": "No",
    "vo": "VO",
    "iv": "IV",
    "im": "IM",
    "io": "IO",
    "vm": "VM",
    "sc": "SC",
    "pr": "PR",
    "sl": "SL",
    "nasal_cannula": "Cánula nasal",
    "non_rebreather": "Mascarilla con reservorio",
    "bag_valve_mask": "Bolsa-válvula-mascarilla",
    "normal": "Normal",
    "abnormal": "Anormal",
    "stable": "Estable",
    "unstable": "Inestable",
    "alert": "Alerta",
    "verbal": "Responde a voz",
    "pain": "Responde al dolor",
    "unresponsive": "No responde",
    "left": "Izquierda",
    "right": "Derecha",
    "left_leg": "Pierna izquierda",
    "right_leg": "Pierna derecha",
    "left_arm": "Brazo izquierdo",
    "right_arm": "Brazo derecho",
    "draft": "Borrador",
    "green": "Verde",
    "bilateral": "Bilateral",
    "present": "Presente",
    "absent": "Ausente",
}

LIST_VALUE_MAP = {
    "head": "Cabeza",
    "face": "Cara",
    "neck": "Cuello",
    "chest": "Tórax",
    "abdomen": "Abdomen",
    "pelvis": "Pelvis",
    "back": "Espalda",
    "gluteal": "Glútea",
    "upper_extremity_left": "Extremidad superior izquierda",
    "upper_extremity_right": "Extremidad superior derecha",
    "lower_extremity_left": "Extremidad inferior izquierda",
    "lower_extremity_right": "Extremidad inferior derecha",
    "swelling": "Inflamación",
    "contusion": "Contusión",
    "laceration": "Laceración",
    "abrasion": "Abrasión",
    "burn": "Quemadura",
    "bleeding": "Sangrado",
    "pain": "Dolor",
    "anterior": "Anterior",
    "posterior": "Posterior",
    "left_leg": "Pierna izquierda",
    "right_leg": "Pierna derecha",
    "left_arm": "Brazo izquierdo",
    "right_arm": "Brazo derecho",
}


FREE_TEXT_REPLACEMENTS = {
    "Type:": "Tipo:",
    "View:": "Vista:",
    "Notes:": "Notas:",
    "Region:": "Región:",
    "Severity:": "Severidad:",
    "Status ": "Estado ",
    "payer type ": "tipo de pagador ",
    "clinical priority ": "prioridad clínica ",
    "Heart rate": "Frecuencia cardiaca",
    "Blood pressure": "Tensión arterial",
    "Spo2": "SpO2",
    "Dose:": "Dosis:",
    "Route:": "Vía:",
    "Medication:": "Medicamento:",
    "Procedure:": "Procedimiento:",
    "Body site:": "Sitio corporal:",
    "Signer name:": "Nombre del firmante:",
    "Signer role:": "Rol del firmante:",
    "Signature role:": "Tipo de firma:",
    "Refused to sign:": "Se negó a firmar:",
    "Assessment V2 guardado/actualizado": "Evaluación clínica guardada/actualizada",
    "Body Map V2 guardado/actualizado": "Mapa corporal guardado/actualizado",
    "Broselow pink": "Broselow rosa",
    "PAT respiratory_distress": "TEP dificultad respiratoria",
}


def _translate_free_text(text: str) -> str:
    rendered = str(text or "").strip()
    for src, dst in FREE_TEXT_REPLACEMENTS.items():
        rendered = rendered.replace(src, dst)
    return rendered


def _format_datetime(value: Any) -> str:
    if not value:
        return ""
    text = str(value).strip()
    if not text:
        return ""
    text = text.replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(text)
        return dt.strftime("%d/%m/%Y %H:%M")
    except Exception:
        text = text.replace("T", " ").replace("+00:00", "")
        return text[:19] if len(text) >= 19 else text


def _format_label(key: str) -> str:
    key = str(key or "").strip()
    if not key:
        return ""
    custom = {
        "patient_name": "Nombre del paciente",
        "patient_age": "Edad",
        "patient_sex": "Sexo",
        "patient_birth_date": "Fecha de nacimiento",
        "patient_identifier": "Identificador",
        "patient_address": "Dirección",
        "responsible_name": "Responsable",
        "responsible_relationship": "Relación",
        "responsible_phone": "Teléfono responsable",
        "incident_number": "Número de incidente",
        "service_type": "Tipo de servicio",
        "service_subtype": "Subtipo de servicio",
        "priority_operational": "Prioridad operativa",
        "priority_clinical": "Prioridad clínica",
        "call_source": "Fuente de llamada",
        "caller_name": "Solicitante",
        "caller_phone": "Teléfono solicitante",
        "location_text": "Ubicación",
        "location_reference": "Referencia",
        "patient_count_estimated": "Pacientes estimados",
        "scene_risk": "Riesgo en escena",
        "destination_suggested": "Destino sugerido",
        "payer_type": "Tipo de pagador",
        "chief_complaint": "Motivo principal",
        "mechanism_of_injury": "Mecanismo de lesión",
        "clinical_impression": "Impresión clínica",
        "consciousness_level": "Estado de conciencia",
        "airway_status": "Vía aérea",
        "breathing_status": "Respiración",
        "circulation_status": "Circulación",
        "signature_role": "Tipo de firma",
        "signer_name": "Firmante",
        "signer_role": "Rol / cargo",
        "signer_relation": "Relación",
        "signed_at": "Fecha/hora firma",
        "detail_text": "Detalle",
        "avpu": "AVPU",
        "glasgow_eye": "Glasgow ocular",
        "glasgow_verbal": "Glasgow verbal",
        "glasgow_motor": "Glasgow motor",
        "sample_s": "Síntomas",
        "sample_a": "Alergias",
        "sample_m": "Medicamentos",
        "sample_p": "Patologías",
        "sample_l": "Última ingesta",
        "sample_e": "Eventos previos",
        "impression_primary": "Impresión diagnóstica primaria",
        "impression_secondary": "Impresión diagnóstica secundaria",
        "triage": "Triage",
        "trauma_type": "Tipo de trauma",
        "kinematics": "Cinética",
        "safety_equipment": "Equipo de seguridad",
        "injured_regions": "Regiones lesionadas",
        "deformity": "Deformidad",
        "wounds": "Heridas",
        "bleeding": "Sangrado",
        "burns": "Quemaduras",
        "immobilization": "Inmovilización",
        "trauma_priority": "Prioridad de trauma",
        "anterior_regions": "Regiones anteriores",
        "posterior_regions": "Regiones posteriores",
        "injuries": "Lesiones",
        "summary": "Resumen",
        "age_group": "Grupo de edad",
        "estimated_age_value": "Edad estimada",
        "estimated_age_unit": "Unidad de edad",
        "weight_kg": "Peso (kg)",
        "broselow_color": "Color Broselow",
        "caregiver_present": "Cuidador presente",
        "caregiver_name": "Nombre del cuidador",
        "pediatric_assessment_triangle": "Triángulo de evaluación pediátrica",
        "circulation_to_skin": "Circulación a la piel",
        "capillary_refill_seconds": "Relleno capilar (segundos)",
        "blood_glucose_mg_dl": "Glucosa (mg/dL)",
        "pain_scale_flacc": "Escala FLACC",
        "immunization_status": "Estado de inmunización",
        "temperature_control": "Control de temperatura",
        "chest_pain_type": "Tipo de dolor torácico",
        "pain_severity": "Severidad del dolor",
        "symptom_onset": "Inicio de síntomas",
        "pain_radiation": "Irradiación del dolor",
        "dyspnea": "Disnea",
        "diaphoresis": "Diaforesis",
        "palpitations": "Palpitaciones",
        "detected_rhythm": "Ritmo detectado",
        "interpreted_heart_rate": "Frecuencia cardiaca interpretada",
        "low_output_signs": "Signos de bajo gasto",
        "suspected_acute_coronary_syndrome": "Sospecha de síndrome coronario agudo",
        "killip_class": "Clase Killip",
        "ecg_performed": "ECG realizado",
        "ecg_findings": "Hallazgos ECG",
        "interpreted_blood_pressure": "Presión arterial interpretada",
        "peripheral_perfusion": "Perfusión periférica",
        "oxygen_administered": "Oxígeno administrado",
        "aspirin_administered": "Aspirina administrada",
        "nitroglycerin_administered": "Nitroglicerina administrada",
        "iv_io_access": "Acceso IV/IO",
        "monitor_defibrillator": "Monitor / desfibrilador",
        "pregnancy_confirmed": "Embarazo confirmado",
        "gestational_weeks": "Semanas de gestación",
        "gravida": "Gestas",
        "para": "Partos",
        "abortions": "Abortos",
        "c_sections": "Cesáreas",
        "last_menstrual_period": "Última menstruación",
        "prenatal_control": "Control prenatal",
        "abdominal_pain": "Dolor abdominal",
        "fluid_leak": "Salida de líquido",
        "fetal_movements_present": "Movimientos fetales presentes",
        "contractions_present": "Contracciones presentes",
        "contraction_frequency": "Frecuencia de contracciones",
        "contraction_duration": "Duración de contracciones",
        "fetal_presentation": "Presentación fetal",
        "urge_to_push": "Deseo de pujar",
        "uterine_height": "Altura uterina",
        "uterine_tone": "Tono uterino",
        "fetal_heart_rate": "Frecuencia cardiaca fetal",
        "active_labor": "Trabajo de parto activo",
        "iv_access": "Acceso IV",
        "mother_destination": "Destino materno",
        "destination_hospital": "Hospital destino",
        "receiving_person_name": "Nombre del receptor",
        "receiving_person_role": "Rol del receptor",
        "handoff_summary": "Resumen de entrega",
        "patient_final_condition": "Condición final del paciente",
        "handoff_result": "Resultado de entrega",
        "continuity_notes": "Notas de continuidad",
        "handoff_at": "Fecha/hora de entrega",
    }
    if key in custom:
        return custom[key]
    return key.replace("_", " ").strip().capitalize()


def _translate_scalar(value: Any) -> Any:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "Sí" if value else "No"
    text = _translate_free_text(str(value).strip())
    return VALUE_MAP.get(text.lower(), text)


def _translate_complex(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, list):
        return ", ".join(_translate_complex(v) for v in value if str(v).strip())
    if isinstance(value, dict):
        pairs = []
        for k, v in value.items():
            rendered = _translate_complex(v)
            if rendered:
                pairs.append(f"{_format_label(str(k))}: {rendered}")
        return "; ".join(pairs)
    text = str(value).strip()
    return LIST_VALUE_MAP.get(text.lower(), VALUE_MAP.get(text.lower(), text))


def _display_value(value: Any) -> str:
    if isinstance(value, (list, dict)):
        return _translate_complex(value)
    return _translate_free_text(str(_translate_scalar(value)))


def _signature_title(role: str) -> str:
    mapping = {"operator": "Paramédico / Admin", "receiver": "Receptor hospitalario", "patient": "Paciente / Responsable"}
    return mapping.get(str(role or "").lower(), str(role or ""))


def _is_valid_data_image_uri(value: str | None) -> bool:
    if not value or not isinstance(value, str) or not value.startswith("data:image/") or "," not in value:
        return False
    try:
        _, encoded = value.split(",", 1)
        if len(encoded.strip()) < 16:
            return False
        base64.b64decode(encoded, validate=True)
        return True
    except Exception:
        return False


def _is_safe_raster_logo_src(value: str | None) -> bool:
    if not value or not isinstance(value, str):
        return False
    value = value.strip()
    if not value:
        return False
    lower = value.lower()
    if lower.startswith("data:image/png;base64,") or lower.startswith("data:image/jpeg;base64,") or lower.startswith("data:image/webp;base64,"):
        return _is_valid_data_image_uri(value)
    if lower.startswith("data:image/svg"):
        return False
    parsed = urlparse(value)
    path = (parsed.path or "").lower()
    if path.endswith((".svg", ".svgz")):
        return False
    return path.endswith((".png", ".jpg", ".jpeg", ".webp"))


def _qr_data_uri(text: str | None) -> str | None:
    if not text:
        return None
    qr = qrcode.QRCode(version=2, box_size=6, border=2)
    qr.add_data(text)
    qr.make(fit=True)
    image = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def _sanitize_payload_for_pdf(payload: dict[str, Any]) -> dict[str, Any]:
    payload = dict(payload)
    company = dict(payload.get("company") or {})
    branding = dict(payload.get("branding") or {})
    if not branding.get("include_company_logo", True) or not _is_safe_raster_logo_src(company.get("logo_url")):
        company["logo_url"] = None
    payload["company"] = company

    signatures = []
    for sig in payload.get("signatures", []):
        sig = dict(sig)
        if not _is_valid_data_image_uri(sig.get("image_base64")):
            sig["image_base64"] = None
        signatures.append(sig)
    payload["signatures"] = signatures

    verification = dict(payload.get("verification") or {})
    verification["qr_image_data_uri"] = _qr_data_uri(verification.get("qr_text")) if branding.get("include_verification_block", True) else None
    payload["verification"] = verification
    payload["branding"] = branding
    return payload


def render_frap_pdf_html(payload: dict[str, Any]) -> str:
    env = Environment(loader=FileSystemLoader(TEMPLATE_DIR), autoescape=select_autoescape(["html", "xml"]))
    env.filters["fmt_dt"] = _format_datetime
    env.filters["fmt_label"] = _format_label
    env.filters["display"] = _display_value
    env.filters["sig_title"] = _signature_title
    template = env.get_template("frap_v2_enterprise.html.j2")
    safe_payload = _sanitize_payload_for_pdf(payload)
    return template.render(payload=safe_payload, now=datetime.utcnow())


def render_frap_pdf_bytes(payload: dict[str, Any]) -> bytes:
    safe_payload = _sanitize_payload_for_pdf(payload)
    html = render_frap_pdf_html(safe_payload)
    return HTML(string=html, base_url=TEMPLATE_DIR).write_pdf()
