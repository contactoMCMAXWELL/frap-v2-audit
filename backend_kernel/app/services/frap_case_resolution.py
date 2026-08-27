from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.frap_handoff_v2 import FrapHandoffV2
from app.models.frap_refusal_v2 import FrapRefusalV2
from app.models.frap_signature_v2 import FrapSignatureV2


def _has_meaningful_refusal(row: FrapRefusalV2 | None) -> bool:
    if not row:
        return False

    fields = [
        row.refusal_type,
        row.refusal_reason,
        row.risks_explained,
        row.decision_capacity,
        row.patient_condition_at_refusal,
        row.accepted_recommendations,
        row.advised_return_precautions,
    ]
    return any(str(x or "").strip() for x in fields)


def _has_meaningful_handoff(row: FrapHandoffV2 | None) -> bool:
    if not row:
        return False

    fields = [
        row.destination_hospital,
        row.receiving_person_name,
        row.receiving_person_role,
        row.handoff_summary,
        row.patient_final_condition,
        row.handoff_result,
        row.continuity_notes,
    ]
    return bool(row.handoff_at) or any(str(x or "").strip() for x in fields)


def resolve_case_type(db: Session, company_id, intake_id) -> tuple[str, str | None]:
    refusal = (
        db.query(FrapRefusalV2)
        .filter(
            FrapRefusalV2.company_id == company_id,
            FrapRefusalV2.intake_id == intake_id,
        )
        .first()
    )

    handoff = (
        db.query(FrapHandoffV2)
        .filter(
            FrapHandoffV2.company_id == company_id,
            FrapHandoffV2.intake_id == intake_id,
        )
        .first()
    )

    has_refusal = _has_meaningful_refusal(refusal)
    has_handoff = _has_meaningful_handoff(handoff)

    if has_refusal and has_handoff:
        return "inconsistent", "El servicio contiene negativa y handoff al mismo tiempo"

    if has_refusal:
        return "refusal", None

    if has_handoff:
        return "handoff", None

    return "incomplete", "Aún no se ha definido cierre clínico (negativa o handoff)"


def validate_case_signatures(db: Session, company_id, intake_id) -> dict:
    case_type, inconsistency = resolve_case_type(db, company_id, intake_id)

    rows = (
        db.query(FrapSignatureV2)
        .filter(
            FrapSignatureV2.company_id == company_id,
            FrapSignatureV2.intake_id == intake_id,
        )
        .all()
    )

    by_role = {str(r.signature_role or "").strip().lower(): r for r in rows}

    missing: list[str] = []

    if case_type == "refusal":
        operator = by_role.get("operator")
        patient = by_role.get("patient")

        if not operator or not operator.image_base64:
            missing.append("operator")

        if not patient or (not patient.image_base64 and not patient.refused_to_sign):
            missing.append("patient")

    elif case_type == "handoff":
        operator = by_role.get("operator")
        receiver = by_role.get("receiver")
        patient = by_role.get("patient")

        if not operator or not operator.image_base64:
            missing.append("operator")

        if not receiver or not receiver.image_base64:
            missing.append("receiver")

        if not patient or not patient.image_base64:
            missing.append("patient")

    else:
        missing = []

    return {
        "intake_id": intake_id,
        "case_type": case_type,
        "is_ready_for_pdf": case_type in {"refusal", "handoff"} and not missing and not inconsistency,
        "missing_signature_roles": missing,
        "inconsistency": inconsistency,
    }