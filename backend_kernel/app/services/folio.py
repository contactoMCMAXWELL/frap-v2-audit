import re
from datetime import datetime, timezone

def normalize_company_code(code: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9]", "", code or "").upper()
    return cleaned[:20] if cleaned else "COMP"

def build_folio(company_code: str, year: int, seq: int) -> str:
    company_code = normalize_company_code(company_code)
    return f"FRAP-{company_code}-{year}-{seq:06d}"

def current_year_utc() -> int:
    return datetime.now(timezone.utc).year
