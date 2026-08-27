
# PATCH: normalize legacy 'assigned' -> 'unit_assigned'

def normalize_event_type(event_type: str) -> str:
    if not event_type:
        return "service_created"
    et = event_type.strip().lower()
    if et == "assigned":
        return "unit_assigned"
    return et
