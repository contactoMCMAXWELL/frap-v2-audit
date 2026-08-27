from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.frap_handoff_v2 import FrapHandoffV2
from app.models.frap_medication_v2 import FrapMedicationV2
from app.models.frap_procedure_v2 import FrapProcedureV2
from app.models.service_dispatch_event_v2 import ServiceDispatchEventV2
from app.models.service_financial_v2 import ServiceFinancialV2
from app.models.service_intake_v2 import ServiceIntakeV2
from app.models.unit import Unit
from app.services.frap_case_resolution import validate_case_signatures

ALLOWED_ROLES = {"ADMIN", "SUPERADMIN"}


CASE_TYPE_LABELS = {
    "handoff": "Entrega hospitalaria",
    "refusal": "Negativa",
    "inconsistent": "Inconsistente",
    "incomplete": "Incompleto",
}

BILLING_STATUS_LABELS = {
    "draft": "Borrador",
    "quoted": "Cotizado",
    "billed": "Facturado",
    "paid": "Pagado",
    "cancelled": "Cancelado",
    "pending": "Pendiente",
}

PAYER_TYPE_LABELS = {
    "insurance": "Seguro",
    "private": "Particular",
    "company": "Empresa",
    "corporate": "Empresa",
    "government": "Gobierno",
    "public": "Público",
    "agreement": "Convenio",
    "other": "Otro",
}

PRIORITY_LABELS = {
    "routine": "Rutina",
    "urgent": "Urgente",
    "emergency": "Emergencia",
    "critical": "Crítico",
}

SIGNATURE_ROLE_LABELS = {
    "operator": "Operador",
    "receiver": "Receptor",
    "patient": "Paciente o responsable",
    "responsible": "Paciente o responsable",
}


def _translate_case_type(value: str) -> str:
    key = str(value or "").strip().lower()
    return CASE_TYPE_LABELS.get(key, str(value or "Sin dato").strip() or "Sin dato")


def _translate_billing_status(value: str) -> str:
    key = str(value or "").strip().lower()
    return BILLING_STATUS_LABELS.get(key, str(value or "Sin estatus").strip() or "Sin estatus")


def _translate_payer_type(value: str) -> str:
    key = str(value or "").strip().lower()
    return PAYER_TYPE_LABELS.get(key, str(value or "Sin pagador").strip() or "Sin pagador")


def _translate_priority(value: str) -> str:
    key = str(value or "").strip().lower()
    return PRIORITY_LABELS.get(key, str(value or "Sin prioridad").strip() or "Sin prioridad")


def _translate_signature_role(value: str) -> str:
    key = str(value or "").strip().lower()
    return SIGNATURE_ROLE_LABELS.get(key, str(value or "Sin firma").strip() or "Sin firma")


@dataclass
class DashboardContext:
    company_id: UUID
    start_date: date
    end_date: date
    intakes: list[ServiceIntakeV2]
    intake_ids: list[UUID]
    financial_by_intake: dict[UUID, ServiceFinancialV2]
    latest_unit_by_intake: dict[UUID, str]
    handoff_by_intake: dict[UUID, FrapHandoffV2]
    validations_by_intake: dict[UUID, dict]


def _to_float(value) -> float:
    if value is None:
        return 0.0
    if isinstance(value, Decimal):
        return float(value)
    try:
        return float(value)
    except Exception:
        return 0.0


def _fmt_money(value: float) -> str:
    return f"${value:,.2f}"


def _fmt_pct(value: float) -> str:
    return f"{value:,.2f}%"


def ensure_admin_access(user) -> None:
    role = str(getattr(user, "role", "") or "").upper()
    if role not in ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="Dashboard admin requiere ADMIN o SUPERADMIN")


def resolve_date_range(start_date: date | None, end_date: date | None) -> tuple[date, date]:
    today = datetime.now(timezone.utc).date()
    end_value = end_date or today
    start_value = start_date or (end_value - timedelta(days=29))
    if start_value > end_value:
        raise HTTPException(status_code=400, detail="start_date no puede ser mayor que end_date")
    return start_value, end_value


def _build_context(db: Session, company_id: UUID, start_date: date | None, end_date: date | None) -> DashboardContext:
    start_value, end_value = resolve_date_range(start_date, end_date)
    dt_start = datetime.combine(start_value, time.min)
    dt_end = datetime.combine(end_value + timedelta(days=1), time.min)

    intakes = (
        db.query(ServiceIntakeV2)
        .filter(
            ServiceIntakeV2.company_id == company_id,
            ServiceIntakeV2.created_at >= dt_start,
            ServiceIntakeV2.created_at < dt_end,
            ServiceIntakeV2.active.is_(True),
        )
        .order_by(ServiceIntakeV2.created_at.asc())
        .all()
    )
    intake_ids = [row.id for row in intakes]

    if not intake_ids:
        return DashboardContext(
            company_id=company_id,
            start_date=start_value,
            end_date=end_value,
            intakes=[],
            intake_ids=[],
            financial_by_intake={},
            latest_unit_by_intake={},
            handoff_by_intake={},
            validations_by_intake={},
        )

    financial_rows = (
        db.query(ServiceFinancialV2)
        .filter(
            ServiceFinancialV2.company_id == company_id,
            ServiceFinancialV2.intake_id.in_(intake_ids),
            ServiceFinancialV2.active.is_(True),
        )
        .all()
    )
    financial_by_intake = {row.intake_id: row for row in financial_rows}

    handoff_rows = (
        db.query(FrapHandoffV2)
        .filter(FrapHandoffV2.company_id == company_id, FrapHandoffV2.intake_id.in_(intake_ids))
        .all()
    )
    handoff_by_intake = {row.intake_id: row for row in handoff_rows}

    dispatch_rows = (
        db.query(ServiceDispatchEventV2)
        .filter(
            ServiceDispatchEventV2.company_id == company_id,
            ServiceDispatchEventV2.intake_id.in_(intake_ids),
            ServiceDispatchEventV2.unit_id.isnot(None),
        )
        .order_by(ServiceDispatchEventV2.intake_id.asc(), ServiceDispatchEventV2.created_at.asc())
        .all()
    )
    unit_ids = list({row.unit_id for row in dispatch_rows if row.unit_id})
    units = {}
    if unit_ids:
        units = {row.id: row for row in db.query(Unit).filter(Unit.id.in_(unit_ids)).all()}

    latest_unit_by_intake: dict[UUID, str] = {}
    for row in dispatch_rows:
        unit = units.get(row.unit_id)
        label = ""
        if unit:
            label = str(getattr(unit, "code", "") or getattr(unit, "unit_code", "") or "").strip()
        payload = row.event_payload or {}
        if not label:
            label = str(payload.get("unit_code") or payload.get("unit_label") or row.status_label or "").strip()
        if label:
            latest_unit_by_intake[row.intake_id] = label

    validations_by_intake = {
        intake_id: validate_case_signatures(db, company_id, intake_id)
        for intake_id in intake_ids
    }

    return DashboardContext(
        company_id=company_id,
        start_date=start_value,
        end_date=end_value,
        intakes=intakes,
        intake_ids=intake_ids,
        financial_by_intake=financial_by_intake,
        latest_unit_by_intake=latest_unit_by_intake,
        handoff_by_intake=handoff_by_intake,
        validations_by_intake=validations_by_intake,
    )


def _company_scope(company_id: UUID) -> str:
    return str(company_id)


def _sorted_chart(counter: Counter) -> list[dict]:
    return [{"label": label, "value": value} for label, value in counter.most_common()]


def _sorted_named_amount(data: dict[str, dict], sort_key: str = "amount", limit: int = 10) -> list[dict]:
    rows = []
    for label, payload in data.items():
        rows.append({
            "label": label,
            "count": int(payload.get("count", 0) or 0),
            "amount": round(_to_float(payload.get("amount", 0)), 2),
            "extra": round(_to_float(payload.get("extra", 0)), 2),
        })
    rows.sort(key=lambda x: (x.get(sort_key, 0), x.get("count", 0)), reverse=True)
    return rows[:limit]


def get_summary(db: Session, company_id: UUID, start_date: date | None, end_date: date | None) -> dict:
    ctx = _build_context(db, company_id, start_date, end_date)
    total_services = len(ctx.intakes)
    ready = 0
    handoff = 0
    refusal = 0
    inconsistency = 0
    sale_price = 0.0
    total_cost = 0.0
    margin_amount = 0.0
    paid = 0.0
    pending = 0.0

    for intake in ctx.intakes:
        validation = ctx.validations_by_intake.get(intake.id) or {}
        case_type = validation.get("case_type") or "incomplete"
        if validation.get("is_ready_for_pdf"):
            ready += 1
        if case_type == "handoff":
            handoff += 1
        elif case_type == "refusal":
            refusal += 1
        elif case_type == "inconsistent":
            inconsistency += 1

        fin = ctx.financial_by_intake.get(intake.id)
        if fin:
            sale_price += _to_float(fin.sale_price)
            total_cost += _to_float(fin.total_cost)
            margin_amount += _to_float(fin.margin_amount)
            status = str(getattr(fin, "billing_status", "") or "").lower()
            if status == "paid":
                paid += _to_float(fin.sale_price)
            else:
                pending += _to_float(fin.sale_price)

    margin_pct = (margin_amount / sale_price * 100) if sale_price > 0 else 0.0
    kpis = [
        {"key": "services", "label": "Servicios", "value": total_services, "formatted": str(total_services), "tone": "default", "hint": "Servicios creados en el periodo"},
        {"key": "ready_for_pdf", "label": "Listos para PDF", "value": ready, "formatted": str(ready), "tone": "ok", "hint": "Cierre y firmas completas"},
        {"key": "handoff", "label": "Entregas hospitalarias", "value": handoff, "formatted": str(handoff), "tone": "default", "hint": "Servicios con traslado y entrega hospitalaria"},
        {"key": "refusal", "label": "Negativas", "value": refusal, "formatted": str(refusal), "tone": "warn", "hint": "Servicios cerrados por negativa"},
        {"key": "sale_price", "label": "Valor vendido", "value": round(sale_price, 2), "formatted": _fmt_money(sale_price), "tone": "default", "hint": "Suma de precios de venta"},
        {"key": "total_cost", "label": "Costo total", "value": round(total_cost, 2), "formatted": _fmt_money(total_cost), "tone": "default", "hint": "Costo acumulado de operación"},
        {"key": "margin_amount", "label": "Margen", "value": round(margin_amount, 2), "formatted": _fmt_money(margin_amount), "tone": "ok" if margin_amount >= 0 else "warn", "hint": _fmt_pct(margin_pct)},
        {"key": "pending_collection", "label": "Pendiente de cobro", "value": round(pending, 2), "formatted": _fmt_money(pending), "tone": "warn", "hint": f"Pagado: {_fmt_money(paid)}"},
    ]
    if inconsistency:
        kpis.append({"key": "inconsistency", "label": "Inconsistencias", "value": inconsistency, "formatted": str(inconsistency), "tone": "warn", "hint": "Servicios con negativa y entrega hospitalaria simultáneas"})
    return {
        "start_date": ctx.start_date.isoformat(),
        "end_date": ctx.end_date.isoformat(),
        "company_scope": _company_scope(company_id),
        "kpis": kpis,
    }


def get_operations(db: Session, company_id: UUID, start_date: date | None, end_date: date | None) -> dict:
    ctx = _build_context(db, company_id, start_date, end_date)
    by_type = Counter()
    by_priority = Counter()
    units = defaultdict(lambda: {"count": 0, "amount": 0.0, "extra": 0.0})
    destinations = defaultdict(lambda: {"count": 0, "amount": 0.0, "extra": 0.0})

    for intake in ctx.intakes:
        service_type = str(getattr(intake, "service_type", "") or "Sin tipo").strip() or "Sin tipo"
        priority = str(getattr(intake, "priority_clinical", "") or "routine").strip() or "routine"
        by_type[service_type] += 1
        by_priority[_translate_priority(priority)] += 1

        unit_label = ctx.latest_unit_by_intake.get(intake.id) or "Sin unidad"
        units[unit_label]["count"] += 1
        fin = ctx.financial_by_intake.get(intake.id)
        if fin:
            units[unit_label]["amount"] += _to_float(fin.sale_price)
            units[unit_label]["extra"] += _to_float(fin.margin_amount)

        handoff = ctx.handoff_by_intake.get(intake.id)
        destination = ""
        if handoff:
            destination = str(getattr(handoff, "destination_hospital", "") or "").strip()
        if not destination:
            destination = str(getattr(intake, "destination_suggested", "") or "Sin destino").strip() or "Sin destino"
        destinations[destination]["count"] += 1
        if fin:
            destinations[destination]["amount"] += _to_float(fin.sale_price)

    return {
        "start_date": ctx.start_date.isoformat(),
        "end_date": ctx.end_date.isoformat(),
        "services_by_type": _sorted_chart(by_type),
        "services_by_priority": _sorted_chart(by_priority),
        "top_units": _sorted_named_amount(units, sort_key="count"),
        "top_destinations": _sorted_named_amount(destinations, sort_key="count"),
    }


def get_clinical(db: Session, company_id: UUID, start_date: date | None, end_date: date | None) -> dict:
    ctx = _build_context(db, company_id, start_date, end_date)
    closure = Counter()
    procedure_counter = Counter()
    medication_counter = Counter()

    if ctx.intake_ids:
        for row in db.query(FrapProcedureV2).filter(FrapProcedureV2.company_id == company_id, FrapProcedureV2.intake_id.in_(ctx.intake_ids)).all():
            name = str(getattr(row, "procedure_name", "") or "Sin nombre").strip() or "Sin nombre"
            procedure_counter[name] += 1
        for row in db.query(FrapMedicationV2).filter(FrapMedicationV2.company_id == company_id, FrapMedicationV2.intake_id.in_(ctx.intake_ids)).all():
            name = str(getattr(row, "medication_name", "") or "Sin nombre").strip() or "Sin nombre"
            medication_counter[name] += 1

    for intake in ctx.intakes:
        case_type = str((ctx.validations_by_intake.get(intake.id) or {}).get("case_type") or "incomplete")
        closure[_translate_case_type(case_type)] += 1

    return {
        "start_date": ctx.start_date.isoformat(),
        "end_date": ctx.end_date.isoformat(),
        "closure_breakdown": _sorted_chart(closure),
        "top_procedures": [{"label": label, "count": count, "amount": 0, "extra": 0} for label, count in procedure_counter.most_common(10)],
        "top_medications": [{"label": label, "count": count, "amount": 0, "extra": 0} for label, count in medication_counter.most_common(10)],
    }


def get_documental(db: Session, company_id: UUID, start_date: date | None, end_date: date | None) -> dict:
    ctx = _build_context(db, company_id, start_date, end_date)
    ready = 0
    pending = 0
    inconsistent = 0
    missing_counter = Counter()
    case_type_counter = Counter()

    for intake in ctx.intakes:
        validation = ctx.validations_by_intake.get(intake.id) or {}
        case_type = str(validation.get("case_type") or "incomplete")
        case_type_counter[_translate_case_type(case_type)] += 1
        if validation.get("is_ready_for_pdf"):
            ready += 1
        else:
            pending += 1
        if validation.get("inconsistency"):
            inconsistent += 1
        for role in validation.get("missing_signature_roles") or []:
            missing_counter[_translate_signature_role(str(role))] += 1

    return {
        "start_date": ctx.start_date.isoformat(),
        "end_date": ctx.end_date.isoformat(),
        "ready_for_pdf": ready,
        "pending_for_pdf": pending,
        "with_inconsistency": inconsistent,
        "missing_signatures_breakdown": _sorted_chart(missing_counter),
        "case_type_breakdown": _sorted_chart(case_type_counter),
    }


def get_financial(db: Session, company_id: UUID, start_date: date | None, end_date: date | None) -> dict:
    ctx = _build_context(db, company_id, start_date, end_date)
    total_sale = 0.0
    total_cost = 0.0
    margin = 0.0
    by_status = defaultdict(lambda: {"count": 0, "amount": 0.0, "extra": 0.0})
    by_payer = defaultdict(lambda: {"count": 0, "amount": 0.0, "extra": 0.0})
    by_service = defaultdict(lambda: {"count": 0, "amount": 0.0, "extra": 0.0})
    by_unit = defaultdict(lambda: {"count": 0, "amount": 0.0, "extra": 0.0})

    for intake in ctx.intakes:
        fin = ctx.financial_by_intake.get(intake.id)
        if not fin:
            continue
        sale = _to_float(fin.sale_price)
        cost = _to_float(fin.total_cost)
        margin_amount = _to_float(fin.margin_amount)
        total_sale += sale
        total_cost += cost
        margin += margin_amount

        status = _translate_billing_status(str(getattr(fin, "billing_status", "") or "Sin estatus").strip() or "Sin estatus")
        payer = _translate_payer_type(str(getattr(fin, "payer_type", "") or getattr(intake, "payer_type", "") or "Sin pagador").strip() or "Sin pagador")
        service_type = str(getattr(intake, "service_type", "") or "Sin tipo").strip() or "Sin tipo"
        unit_label = ctx.latest_unit_by_intake.get(intake.id) or "Sin unidad"

        for bucket, label in ((by_status, status), (by_payer, payer), (by_service, service_type), (by_unit, unit_label)):
            bucket[label]["count"] += 1
            bucket[label]["amount"] += sale
            bucket[label]["extra"] += margin_amount

    margin_pct = (margin / total_sale * 100) if total_sale > 0 else 0.0
    totals = [
        {"key": "sale_price", "label": "Valor vendido", "value": round(total_sale, 2), "formatted": _fmt_money(total_sale), "tone": "default", "hint": "Precio de venta acumulado"},
        {"key": "total_cost", "label": "Costo total", "value": round(total_cost, 2), "formatted": _fmt_money(total_cost), "tone": "default", "hint": "Costo real acumulado"},
        {"key": "margin", "label": "Margen total", "value": round(margin, 2), "formatted": _fmt_money(margin), "tone": "ok" if margin >= 0 else "warn", "hint": _fmt_pct(margin_pct)},
        {"key": "avg_ticket", "label": "Ticket promedio", "value": round(total_sale / len(ctx.financial_by_intake), 2) if ctx.financial_by_intake else 0, "formatted": _fmt_money(total_sale / len(ctx.financial_by_intake)) if ctx.financial_by_intake else _fmt_money(0), "tone": "default", "hint": "Promedio por servicio con registro financiero"},
    ]
    return {
        "start_date": ctx.start_date.isoformat(),
        "end_date": ctx.end_date.isoformat(),
        "totals": totals,
        "by_billing_status": _sorted_named_amount(by_status, sort_key="amount"),
        "by_payer_type": _sorted_named_amount(by_payer, sort_key="amount"),
        "by_service_type": _sorted_named_amount(by_service, sort_key="amount"),
        "by_unit": _sorted_named_amount(by_unit, sort_key="amount"),
    }


def get_timeseries(db: Session, company_id: UUID, start_date: date | None, end_date: date | None) -> dict:
    ctx = _build_context(db, company_id, start_date, end_date)
    points = {}
    cursor = ctx.start_date
    while cursor <= ctx.end_date:
        points[cursor.isoformat()] = {
            "date": cursor.isoformat(),
            "services": 0,
            "sale_price": 0.0,
            "total_cost": 0.0,
            "margin_amount": 0.0,
            "ready_for_pdf": 0,
            "billed": 0,
            "paid": 0,
        }
        cursor += timedelta(days=1)

    for intake in ctx.intakes:
        key = intake.created_at.date().isoformat()
        row = points.setdefault(key, {"date": key, "services": 0, "sale_price": 0.0, "total_cost": 0.0, "margin_amount": 0.0, "ready_for_pdf": 0, "billed": 0, "paid": 0})
        row["services"] += 1
        validation = ctx.validations_by_intake.get(intake.id) or {}
        if validation.get("is_ready_for_pdf"):
            row["ready_for_pdf"] += 1
        fin = ctx.financial_by_intake.get(intake.id)
        if fin:
            row["sale_price"] += _to_float(fin.sale_price)
            row["total_cost"] += _to_float(fin.total_cost)
            row["margin_amount"] += _to_float(fin.margin_amount)
            status = str(getattr(fin, "billing_status", "") or "").lower()
            if status == "billed":
                row["billed"] += 1
            if status == "paid":
                row["paid"] += 1

    return {
        "start_date": ctx.start_date.isoformat(),
        "end_date": ctx.end_date.isoformat(),
        "granularity": "day",
        "points": [
            {
                "date": key,
                "services": int(value["services"]),
                "sale_price": round(value["sale_price"], 2),
                "total_cost": round(value["total_cost"], 2),
                "margin_amount": round(value["margin_amount"], 2),
                "ready_for_pdf": int(value["ready_for_pdf"]),
                "billed": int(value["billed"]),
                "paid": int(value["paid"]),
            }
            for key, value in sorted(points.items(), key=lambda item: item[0])
        ],
    }
