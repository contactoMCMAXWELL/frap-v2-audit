from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_company_id, get_current_user, get_db
from app.models.company_pdf_config import CompanyPdfConfig
from app.schemas.v2.company_pdf_config import CompanyPdfConfigOut, CompanyPdfConfigUpsert

router = APIRouter(prefix="/v2/company-pdf-config", tags=["v2-company-pdf-config"])

ALLOWED_ROLES = {"SUPERADMIN", "ADMIN"}

DEFAULT_LEGAL_LEGEND = (
    "Este documento refleja la atención prehospitalaria realizada por personal autorizado "
    "con base en los hallazgos y acciones registradas durante el servicio. No sustituye la "
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


def _require_allowed_role(user) -> None:
    role = getattr(user, "role", None)
    if role not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No autorizado para acceder a la configuración de PDF",
        )


def _build_default(company_id: uuid.UUID) -> CompanyPdfConfig:
    return CompanyPdfConfig(
        company_id=company_id,
        include_legal_legend=True,
        legal_legend_text=DEFAULT_LEGAL_LEGEND,
        include_signature_legend=True,
        signature_legend_text=DEFAULT_SIGNATURE_LEGEND,
        include_footer_legend=True,
        footer_legend_text=DEFAULT_FOOTER_LEGEND,
        include_privacy_notice=False,
        privacy_notice_text=DEFAULT_PRIVACY_NOTICE,
        include_insurance_legend=False,
        insurance_legend_text=DEFAULT_INSURANCE_LEGEND,
    )


@router.get("/", response_model=CompanyPdfConfigOut)
def get_company_pdf_config(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    _require_allowed_role(user)

    row = (
        db.query(CompanyPdfConfig)
        .filter(CompanyPdfConfig.company_id == company_id)
        .first()
    )

    if not row:
        row = _build_default(company_id)
        db.add(row)
        db.commit()
        db.refresh(row)

    return row


@router.put("/", response_model=CompanyPdfConfigOut)
def upsert_company_pdf_config(
    payload: CompanyPdfConfigUpsert,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: uuid.UUID = Depends(get_company_id),
):
    _require_allowed_role(user)

    row = (
        db.query(CompanyPdfConfig)
        .filter(CompanyPdfConfig.company_id == company_id)
        .first()
    )

    data = payload.model_dump(exclude_unset=True)

    if not row:
        row = _build_default(company_id)
        db.add(row)
        db.flush()

    for key, value in data.items():
        setattr(row, key, value)

    db.commit()
    db.refresh(row)
    return row