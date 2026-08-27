from fastapi import APIRouter

router = APIRouter(prefix="/catalogs", tags=["catalogs"])

@router.get("")
def get_catalogs():
    return {
        "service_type": ["Emergencia", "Traslado", "Cobertura"],
        "priority": [1, 2, 3, 4],
        "location": ["Hogar", "Via publica", "Trabajo", "Escuela", "Otro"],
        "motive": ["Accidente vehicular", "Dolor toracico", "Trauma", "Parto", "Otro"],
        "requested_by": ["Particular", "Policia", "Hospital", "Otro"],
    }
