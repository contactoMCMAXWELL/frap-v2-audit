from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_company_id, get_current_user, get_db
from app.models.frap_cardio_v2 import FrapCardioV2
from app.models.service_intake_v2 import ServiceIntakeV2
from app.schemas.v2.frap_cardio import FrapCardioV2Out, FrapCardioV2Upsert
from app.services.license_guard import require_company_feature
from app.services.retrospective_guard import (
    require_retrospective_timestamp,
    require_retrospective_write_access,
    validate_semantic_timestamp,
)
from app.services.timeline_service import create_dispatch_event

router = APIRouter(prefix="/v2/frap-cardio", tags=["v2-frap-cardio"])


CHEST_PAIN_TYPE_LABELS = {
    "typical_angina": "Angina típica",
    "atypical_angina": "Angina atípica",
    "oppressive": "Opresivo",
    "pleuritic": "Pleurítico",
    "burning": "Urente",
    "stabbing": "Punzante",
    "absent": "Sin dolor",
}

RHYTHM_LABELS = {
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
    "unknown": "Desconocido",
}

HEART_RATE_LABELS = {
    "bradycardia": "Bradicardia",
    "normal": "Normal",
    "tachycardia": "Taquicardia",
    "extreme_tachycardia": "Taquicardia extrema",
}

KILLIP_LABELS = {
    "i": "Killip I",
    "ii": "Killip II",
    "iii": "Killip III",
    "iv": "Killip IV",
}

PERFUSION_LABELS = {
    "adequate": "Adecuada",
    "delayed": "Retardada",
    "poor": "Deficiente",
    "critical": "Crítica",
}

BP_LABELS = {
    "normal": "Normal",
    "hypertensive": "Hipertensiva",
    "hypotensive": "Hipotensiva",
    "shock_pattern": "Patrón de choque",
}


def _safe_text(value) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _humanize(value: str | None, mapping: dict[str, str]) -> str:
    text = _safe_text(value)
    if not text:
        return ""
    return mapping.get(text.lower(), text)


def _build_summary(row: FrapCardioV2) -> str:
    parts: list[str] = []

    complaint = _safe_text(row.chief_complaint)
    if complaint:
        parts.append(complaint)

    chest_pain = _humanize(row.chest_pain_type, CHEST_PAIN_TYPE_LABELS)
    if chest_pain:
        parts.append(chest_pain)

    rhythm = _humanize(row.detected_rhythm, RHYTHM_LABELS)
    if rhythm:
        parts.append(rhythm)

    if row.suspected_acute_coronary_syndrome:
        parts.append("Sospecha de SCA")

    if row.suspected_stemi:
        parts.append("Sospecha de STEMI")

    if row.cardiac_arrest:
        parts.append("Paro cardiaco")

    return " · ".join([p for p in parts if p])


def _build_status(row: FrapCardioV2) -> str:
    if row.active is False:
        return "inactive"
    if row.cardiac_arrest or row.suspected_stemi:
        return "critical"
    return "completed"


@router.get("/{intake_id}", response_model=FrapCardioV2Out)
def get_frap_cardio(
    intake_id: uuid.UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    _ = user
    require_company_feature(db, company_id, "clinical")

    row = (
        db.query(FrapCardioV2)
        .filter(
            FrapCardioV2.company_id == company_id,
            FrapCardioV2.intake_id == intake_id,
        )
        .first()
    )

    if not row:
        raise HTTPException(status_code=404, detail="Cardio record not found")

    return row


@router.put("/", response_model=FrapCardioV2Out)
def upsert_frap_cardio(
    payload: FrapCardioV2Upsert,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    _ = user
    require_company_feature(db, company_id, "clinical")

    intake = (
        db.query(ServiceIntakeV2)
        .filter(
            ServiceIntakeV2.id == payload.intake_id,
            ServiceIntakeV2.company_id == company_id,
        )
        .first()
    )

    if not intake:
        raise HTTPException(status_code=404, detail="Intake not found")

    require_retrospective_write_access(intake, user)

    row = (
        db.query(FrapCardioV2)
        .filter(
            FrapCardioV2.company_id == company_id,
            FrapCardioV2.intake_id == payload.intake_id,
        )
        .first()
    )

    assessed_at_was_sent = "assessed_at" in payload.model_fields_set

    if assessed_at_was_sent:
        assessed_at = validate_semantic_timestamp(
            intake=intake,
            user=user,
            value=payload.assessed_at,
            field_name="assessed_at",
        )
    else:
        assessed_at = row.assessed_at if row is not None else None

    if row is None or assessed_at_was_sent:
        require_retrospective_timestamp(
            intake=intake,
            value=assessed_at,
            field_name="assessed_at",
        )

    data = payload.model_dump(exclude_unset=True)
    data.pop("intake_id", None)
    data["assessed_at"] = assessed_at

    if not row:
        row = FrapCardioV2(
            company_id=company_id,
            intake_id=payload.intake_id,
            **data,
        )
        db.add(row)
    else:
        for key, value in data.items():
            setattr(row, key, value)

    db.commit()
    db.refresh(row)

    create_dispatch_event(
        db=db,
        company_id=company_id,
        intake_id=payload.intake_id,
        event_type="clinical.cardio_updated",
        status_label="Evaluación cardiovascular actualizada",
        occurred_at=row.assessed_at,
        payload={
            "summary": _build_summary(row),
            "status": _build_status(row),
            "fields": {
                "chief_complaint": row.chief_complaint,
                "chest_pain_type": row.chest_pain_type,
                "pain_severity": row.pain_severity,
                "symptom_onset": row.symptom_onset,
                "pain_radiation": row.pain_radiation,
                "dyspnea": row.dyspnea,
                "diaphoresis": row.diaphoresis,
                "nausea_vomiting": row.nausea_vomiting,
                "syncope": row.syncope,
                "edema": row.edema,
                "palpitations": row.palpitations,
                "detected_rhythm": row.detected_rhythm,
                "interpreted_heart_rate": row.interpreted_heart_rate,
                "low_output_signs": row.low_output_signs,
                "suspected_acute_coronary_syndrome": row.suspected_acute_coronary_syndrome,
                "suspected_stemi": row.suspected_stemi,
                "cardiac_arrest": row.cardiac_arrest,
                "rosc": row.rosc,
                "killip_class": row.killip_class,
                "ecg_performed": row.ecg_performed,
                "ecg_findings": row.ecg_findings,
                "interpreted_blood_pressure": row.interpreted_blood_pressure,
                "peripheral_perfusion": row.peripheral_perfusion,
                "oxygen_administered": row.oxygen_administered,
                "aspirin_administered": row.aspirin_administered,
                "nitroglycerin_administered": row.nitroglycerin_administered,
                "iv_io_access": row.iv_io_access,
                "monitor_defibrillator": row.monitor_defibrillator,
                "defibrillation_performed": row.defibrillation_performed,
                "cardioversion_performed": row.cardioversion_performed,
                "transcutaneous_pacing": row.transcutaneous_pacing,
                "cpr_performed": row.cpr_performed,
                "notes": row.notes,
                "active": row.active,
            },
        },
    )

    return row