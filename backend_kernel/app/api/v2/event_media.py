from __future__ import annotations

from io import BytesIO
from pathlib import Path
from uuid import UUID, uuid4
import warnings

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from PIL import Image, ImageOps, UnidentifiedImageError
from sqlalchemy.orm import Session

from app.api.deps import get_company_id, get_current_user
from app.db.session import get_db
from app.models.event_participant_protection import EventParticipantProtection


router = APIRouter(tags=["v2-media"])

MEDIA_ROOT = Path("/app/media")
EVENT_MEDIA_ROOT = MEDIA_ROOT / "events"

ALLOWED_ROLES = {"SUPERADMIN", "ADMIN"}
ALLOWED_KINDS = {"organizer_logo", "cover", "gallery"}
ALLOWED_IMAGE_FORMATS = {"JPEG", "PNG", "WEBP"}

MAX_UPLOAD_BYTES = 20 * 1024 * 1024
MAX_PIXELS = 40_000_000

MAX_DIMENSIONS = {
    "organizer_logo": (1600, 1600),
    "cover": (2560, 2560),
    "gallery": (2560, 2560),
}


def _require_allowed_role(user) -> None:
    role = str(getattr(user, "role", "") or "").upper()
    if role not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No autorizado para administrar imágenes del evento",
        )


def _protection_or_404(
    db: Session,
    company_id: UUID,
    intake_id: UUID,
) -> EventParticipantProtection:
    row = (
        db.query(EventParticipantProtection)
        .filter(
            EventParticipantProtection.company_id == company_id,
            EventParticipantProtection.intake_id == intake_id,
        )
        .first()
    )
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Protección de Participantes no configurada para este evento",
        )
    return row


def _validate_kind(kind: str) -> str:
    clean = str(kind or "").strip().lower()
    if clean not in ALLOWED_KINDS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Tipo de imagen no válido",
        )
    return clean


def _open_validated_image(data: bytes) -> Image.Image:
    if not data:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El archivo está vacío",
        )

    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="La imagen supera el límite de 20 MB",
        )

    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            probe = Image.open(BytesIO(data))
            image_format = str(probe.format or "").upper()
            width, height = probe.size

            if image_format not in ALLOWED_IMAGE_FORMATS:
                raise HTTPException(
                    status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                    detail="Formato no permitido. Usa JPEG, PNG o WEBP",
                )

            if width <= 0 or height <= 0 or (width * height) > MAX_PIXELS:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="La resolución de la imagen es demasiado grande",
                )

            if getattr(probe, "is_animated", False):
                raise HTTPException(
                    status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                    detail="No se permiten imágenes animadas",
                )

            probe.verify()

        image = Image.open(BytesIO(data))
        image.load()
        return image

    except HTTPException:
        raise
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombWarning):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El archivo no es una imagen válida",
        )


def _prepare_image(image: Image.Image, kind: str) -> Image.Image:
    # Corrige orientación de cámara sin conservar EXIF.
    image = ImageOps.exif_transpose(image)

    max_size = MAX_DIMENSIONS[kind]

    # thumbnail conserva la relación de aspecto: nunca recorta.
    image.thumbnail(max_size, Image.Resampling.LANCZOS)

    has_alpha = (
        image.mode in ("RGBA", "LA")
        or (image.mode == "P" and "transparency" in image.info)
    )

    if has_alpha:
        return image.convert("RGBA")

    return image.convert("RGB")


def _event_media_path(
    company_id: UUID,
    protection_id: UUID,
    kind: str,
    media_id: UUID,
) -> Path:
    return (
        EVENT_MEDIA_ROOT
        / str(company_id)
        / str(protection_id)
        / kind
        / f"{media_id}.webp"
    )


def _public_media_url(
    company_id: UUID,
    protection_id: UUID,
    kind: str,
    media_id: UUID,
) -> str:
    return (
        f"/api/v2/public/media/events/"
        f"{company_id}/{protection_id}/{kind}/{media_id}.webp"
    )


@router.post("/v2/media/event-images", status_code=status.HTTP_201_CREATED)
async def upload_event_image(
    intake_id: UUID = Form(...),
    kind: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    company_id: UUID = Depends(get_company_id),
):
    _require_allowed_role(user)
    kind = _validate_kind(kind)
    protection = _protection_or_404(db, company_id, intake_id)

    try:
        data = await file.read(MAX_UPLOAD_BYTES + 1)
    finally:
        await file.close()

    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="La imagen supera el límite de 20 MB",
        )

    image = _open_validated_image(data)

    try:
        optimized = _prepare_image(image, kind)
        media_id = uuid4()
        destination = _event_media_path(
            company_id=company_id,
            protection_id=protection.id,
            kind=kind,
            media_id=media_id,
        )
        destination.parent.mkdir(parents=True, exist_ok=True)

        # WEBP reduce peso y mantiene transparencia cuando existe.
        # No se copian EXIF, GPS ni otros metadatos del archivo original.
        optimized.save(
            destination,
            format="WEBP",
            quality=88,
            method=6,
        )

        width, height = optimized.size

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo procesar la imagen",
        )
    finally:
        try:
            image.close()
        except Exception:
            pass

    return {
        "ok": True,
        "media_id": str(media_id),
        "kind": kind,
        "url": _public_media_url(
            company_id=company_id,
            protection_id=protection.id,
            kind=kind,
            media_id=media_id,
        ),
        "width": width,
        "height": height,
        "format": "WEBP",
    }


@router.get(
    "/v2/public/media/events/{company_id}/{protection_id}/{kind}/{media_id}.webp"
)
def get_public_event_image(
    company_id: UUID,
    protection_id: UUID,
    kind: str,
    media_id: UUID,
):
    kind = _validate_kind(kind)

    path = _event_media_path(
        company_id=company_id,
        protection_id=protection_id,
        kind=kind,
        media_id=media_id,
    )

    if not path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Imagen no encontrada",
        )

    return FileResponse(
        path=path,
        media_type="image/webp",
        headers={
            "Cache-Control": "public, max-age=31536000, immutable",
            "X-Content-Type-Options": "nosniff",
        },
    )
