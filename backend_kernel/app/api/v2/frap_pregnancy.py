from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_company_id, get_current_user, get_db
from app.models.frap_pregnancy_v2 import FrapPregnancyV2
from app.models.service_intake_v2 import ServiceIntakeV2
from app.schemas.v2.frap_pregnancy import FrapPregnancyV2Out, FrapPregnancyV2Upsert
from app.services.license_guard import require_company_feature
from app.services.retrospective_guard import (
    require_retrospective_timestamp,
    require_retrospective_write_access,
    validate_semantic_timestamp,
)
from app.services.timeline_service import create_dispatch_event

router = APIRouter(prefix="/v2/frap-pregnancy", tags=["v2-frap-pregnancy"])


FETAL_PRESENTATION_LABELS = {
    "cephalic": "Cefálica",
    "breech": "Pélvica",
    "transverse": "Transversa",
    "unknown": "Desconocida",
}

UTERINE_TONE_LABELS = {
    "normal": "Normal",
    "hypertonic": "Hipertónico",
    "hypotonic": "Hipotónico",
}

NEWBORN_SEX_LABELS = {
    "female": "Femenino",
    "male": "Masculino",
    "indeterminate": "Indeterminado",
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


def _build_summary(row: FrapPregnancyV2) -> str:
    parts: list[str] = []

    if row.gestational_weeks:
        parts.append(f"{row.gestational_weeks} semanas")

    presentation = _humanize(row.fetal_presentation, FETAL_PRESENTATION_LABELS)
    if presentation:
        parts.append(f"Presentación {presentation}")

    if row.contractions_present:
        parts.append("Contracciones")

    if row.vaginal_bleeding:
        parts.append("Sangrado vaginal")

    if row.fluid_leak:
        parts.append("Salida de líquido")

    if row.active_labor:
        parts.append("Trabajo de parto")

    if row.delivery_performed:
        parts.append("Parto atendido")

    return " · ".join([p for p in parts if p])


def _build_status(row: FrapPregnancyV2) -> str:
    if row.active is False:
        return "inactive"
    if row.delivery_performed or row.crowning or row.suspected_eclampsia:
        return "critical"
    return "completed"


@router.get("/{intake_id}", response_model=FrapPregnancyV2Out)
def get_frap_pregnancy(
    intake_id: uuid.UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    _ = user
    require_company_feature(db, company_id, "clinical")

    row = (
        db.query(FrapPregnancyV2)
        .filter(
            FrapPregnancyV2.company_id == company_id,
            FrapPregnancyV2.intake_id == intake_id,
        )
        .first()
    )

    if not row:
        raise HTTPException(status_code=404, detail="Pregnancy record not found")

    return row


@router.put("/", response_model=FrapPregnancyV2Out)
def upsert_frap_pregnancy(
    payload: FrapPregnancyV2Upsert,
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
        db.query(FrapPregnancyV2)
        .filter(
            FrapPregnancyV2.company_id == company_id,
            FrapPregnancyV2.intake_id == payload.intake_id,
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
        row = FrapPregnancyV2(
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
        event_type="clinical.pregnancy_updated",
        status_label="Evaluación obstétrica actualizada",
        occurred_at=row.assessed_at,
        payload={
            "summary": _build_summary(row),
            "status": _build_status(row),
            "fields": {
                "pregnancy_confirmed": row.pregnancy_confirmed,
                "gestational_weeks": row.gestational_weeks,
                "gravida": row.gravida,
                "para": row.para,
                "abortions": row.abortions,
                "c_sections": row.c_sections,
                "last_menstrual_period": row.last_menstrual_period,
                "prenatal_control": row.prenatal_control,
                "high_risk_pregnancy": row.high_risk_pregnancy,
                "multiple_pregnancy": row.multiple_pregnancy,

                "abdominal_pain": row.abdominal_pain,
                "vaginal_bleeding": row.vaginal_bleeding,
                "fluid_leak": row.fluid_leak,
                "fetal_movements_present": row.fetal_movements_present,
                "contractions_present": row.contractions_present,
                "contraction_frequency": row.contraction_frequency,
                "contraction_duration": row.contraction_duration,
                "fetal_presentation": row.fetal_presentation,
                "crowning": row.crowning,
                "urge_to_push": row.urge_to_push,
                "uterine_height": row.uterine_height,
                "uterine_tone": row.uterine_tone,
                "fetal_heart_rate": row.fetal_heart_rate,
                "suspected_preeclampsia": row.suspected_preeclampsia,
                "suspected_eclampsia": row.suspected_eclampsia,
                "pregnancy_trauma": row.pregnancy_trauma,

                "active_labor": row.active_labor,
                "delivery_performed": row.delivery_performed,
                "birth_time": row.birth_time,
                "newborn_sex": row.newborn_sex,
                "apgar_1_min": row.apgar_1_min,
                "apgar_5_min": row.apgar_5_min,
                "placenta_delivered": row.placenta_delivered,
                "placenta_complete": row.placenta_complete,
                "maternal_complications": row.maternal_complications,
                "neonatal_complications": row.neonatal_complications,
                "neonatal_resuscitation": row.neonatal_resuscitation,

                "oxygen_administered": row.oxygen_administered,
                "iv_access": row.iv_access,
                "hemorrhage_control": row.hemorrhage_control,
                "cord_clamping": row.cord_clamping,
                "skin_to_skin_contact": row.skin_to_skin_contact,
                "newborn_thermal_care": row.newborn_thermal_care,
                "mother_destination": row.mother_destination,
                "newborn_destination": row.newborn_destination,
                "notes": row.notes,
                "active": row.active,
            },
        },
    )

    return row