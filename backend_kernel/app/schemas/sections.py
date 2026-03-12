from __future__ import annotations

from typing import Any, Literal, Optional, List
from pydantic import BaseModel, Field
try:
    from pydantic import ConfigDict  # Pydantic v2
except Exception:  # pragma: no cover
    ConfigDict = None  # type: ignore


Triage = Literal["Verde", "Amarillo", "Rojo", "Negro"]
Sex = Literal["M", "F", "X", "NA"]
AVPU = Literal["A", "V", "P", "U"]


class _Base(BaseModel):
    # Ignore unknown keys to keep backward/forward compatibility across sprints
    if ConfigDict:
        model_config = ConfigDict(extra="ignore")
    else:  # pragma: no cover
        class Config:
            extra = "ignore"


class Geo(_Base):
    lat: Optional[float] = None
    lng: Optional[float] = None
    accuracy_m: Optional[float] = None


class Caller(_Base):
    name: Optional[str] = None
    phone: Optional[str] = None


class DispatchTimestamps(_Base):
    created_at: Optional[str] = None
    assigned_at: Optional[str] = None
    accepted_at: Optional[str] = None
    en_route_at: Optional[str] = None
    on_scene_at: Optional[str] = None
    depart_scene_at: Optional[str] = None
    arrive_hospital_at: Optional[str] = None
    available_at: Optional[str] = None


class DispatchSection(_Base):
    service_type: Optional[Literal["Emergencia", "Traslado", "Cobertura"]] = None
    priority: Optional[int] = Field(default=None, ge=1, le=4)
    requested_by: Optional[str] = None
    motive: Optional[str] = None
    location_text: Optional[str] = None
    geo: Optional[Geo] = None
    caller: Optional[Caller] = None
    notes: Optional[str] = None
    timestamps: Optional[DispatchTimestamps] = None


class Pregnancy(_Base):
    is_pregnant: Optional[bool] = None
    gest_weeks: Optional[int] = None


class Responsible(_Base):
    name: Optional[str] = None
    phone: Optional[str] = None
    relation: Optional[str] = None


class PatientSection(_Base):
    full_name: Optional[str] = None
    age: Optional[int] = Field(default=None, ge=0, le=130)
    sex: Optional[Sex] = None
    id_type: Optional[str] = None
    id_value: Optional[str] = None
    address: Optional[str] = None
    allergies: Optional[List[str]] = None
    conditions: Optional[List[str]] = None
    meds_home: Optional[str] = None
    pregnancy: Optional[Pregnancy] = None
    responsible: Optional[Responsible] = None


class Glasgow(_Base):
    eye: Optional[int] = Field(default=None, ge=1, le=4)
    verbal: Optional[int] = Field(default=None, ge=1, le=5)
    motor: Optional[int] = Field(default=None, ge=1, le=6)
    total: Optional[int] = Field(default=None, ge=3, le=15)


class OPQRST(_Base):
    onset: Optional[str] = None
    provocation: Optional[str] = None
    quality: Optional[str] = None
    radiation: Optional[str] = None
    severity: Optional[str] = None
    time: Optional[str] = None


class SAMPLE(_Base):
    symptoms: Optional[str] = None
    allergies: Optional[str] = None
    meds: Optional[str] = None
    past: Optional[str] = None
    last_oral: Optional[str] = None
    events: Optional[str] = None


class SystemCheck(_Base):
    ok: Optional[bool] = True
    notes: Optional[str] = None


class Systems(_Base):
    neuro: Optional[SystemCheck] = None
    resp: Optional[SystemCheck] = None
    cardio: Optional[SystemCheck] = None
    abd: Optional[SystemCheck] = None
    msk: Optional[SystemCheck] = None
    skin: Optional[SystemCheck] = None


class Impression(_Base):
    primary: Optional[str] = None
    secondary: Optional[str] = None
    triage: Optional[Triage] = None


class AssessmentSection(_Base):
    chief_complaint: Optional[str] = None
    avpu: Optional[AVPU] = None
    glasgow: Optional[Glasgow] = None
    opqrst: Optional[OPQRST] = None
    sample: Optional[SAMPLE] = None
    systems: Optional[Systems] = None

    # Sprint 6A.3 (lesiones)
    regions: Optional[List[str]] = None
    injury_types: Optional[List[str]] = None
    triage: Optional[Triage] = None

    # Leave impression for future sprint; keep compatibility
    impression: Optional[Impression] = None


class Destination(_Base):
    hospital_id: Optional[str] = None
    hospital_name: Optional[str] = None


class Receiving(_Base):
    name: Optional[str] = None
    service: Optional[str] = None


class TransportSection(_Base):
    destination: Optional[Destination] = None
    receiving: Optional[Receiving] = None
    handoff_summary: Optional[str] = None
    outcome: Optional[str] = None
