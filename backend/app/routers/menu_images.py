"""Persistent menu photos. Only explicitly granted shop roles can change photos."""
import asyncio
from io import BytesIO
import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from PIL import Image, ImageOps, UnidentifiedImageError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from starlette.concurrency import run_in_threadpool

from app.database import get_session
from app.models import Product, ProductImage, User, utc_now
from app.services.auth_service import get_current_user, log_activity

router = APIRouter(tags=['Menu images'])
MAX_UPLOAD = 5 * 1024 * 1024
MAX_OUTPUT = 1024 * 1024
image_worker = asyncio.Semaphore(1)


def image_url(product):
    return f'/api/public/menu-images/{product.id}/{product.image_version}' if product.image_version else None


def encode_image(raw):
    try:
        with Image.open(BytesIO(raw), formats=['JPEG', 'PNG', 'WEBP']) as source:
            if source.width * source.height > 20_000_000:
                raise HTTPException(413, 'รูปต้องมีความละเอียดไม่เกิน 20 ล้านพิกเซล')
            if getattr(source, 'is_animated', False):
                raise HTTPException(415, 'กรุณาใช้ภาพนิ่ง JPG, PNG หรือ WebP')
            source.load()
            image = ImageOps.exif_transpose(source)
            image.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
            if image.mode not in ('RGB', 'RGBA'):
                image = image.convert('RGBA' if 'transparency' in image.info else 'RGB')
            image.info.clear()
            output = BytesIO()
            image.save(output, 'WEBP', quality=82, method=4, exif=b'', icc_profile=None)
            if output.tell() > MAX_OUTPUT:
                raise HTTPException(413, 'รูปหลังย่อยังใหญ่เกินไป กรุณาเลือกรูปที่เล็กลง')
            return output.getvalue()
    except HTTPException:
        raise
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
        raise HTTPException(415, 'ไฟล์รูปไม่ถูกต้อง กรุณาใช้ JPG, PNG หรือ WebP ที่เปิดได้จริง')


@router.get('/menu-images')
async def catalog(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    rows = (await session.execute(select(Product).where(Product.business_id == user.business_id).order_by(Product.name, Product.id))).scalars().all()
    return [{'id': p.id, 'name': p.name, 'is_active': p.is_active, 'image_url': image_url(p)} for p in rows]


@router.put('/menu-images/{product_id}')
async def upload(product_id: int, request: Request, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    # Auth/feature permissions are evaluated before reading an image body.
    if request.headers.get('content-type', '').split(';')[0] not in ('image/jpeg', 'image/png', 'image/webp'):
        raise HTTPException(415, 'รองรับเฉพาะ JPG, PNG และ WebP')
    raw = bytearray()
    async for chunk in request.stream():
        if len(raw) + len(chunk) > MAX_UPLOAD:
            raise HTTPException(413, 'ขนาดรูปต้องไม่เกิน 5 MB')
        raw.extend(chunk)
    async with image_worker:
        encoded = await run_in_threadpool(encode_image, bytes(raw))
    product = (await session.execute(select(Product).where(Product.id == product_id, Product.business_id == user.business_id).with_for_update())).scalar_one_or_none()
    if not product:
        raise HTTPException(404, 'ไม่พบเมนูในร้านนี้')
    row = await session.get(ProductImage, product.id)
    if not row:
        row = ProductImage(product_id=product.id, business_id=user.business_id, version='', content=b'')
    row.version = secrets.token_urlsafe(18)
    row.content = encoded
    row.updated_at = utc_now()
    product.image_version = row.version
    session.add_all([row, product])
    log_activity(session, user, 'upload_image', 'product', product.id, product.name)
    await session.commit()
    return {'id': product.id, 'image_url': image_url(product)}


@router.delete('/menu-images/{product_id}')
async def remove(product_id: int, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    product = (await session.execute(select(Product).where(Product.id == product_id, Product.business_id == user.business_id).with_for_update())).scalar_one_or_none()
    if not product:
        raise HTTPException(404, 'ไม่พบเมนูในร้านนี้')
    row = await session.get(ProductImage, product.id)
    if row:
        await session.delete(row)
    product.image_version = None
    session.add(product)
    log_activity(session, user, 'remove_image', 'product', product.id, product.name)
    await session.commit()
    return {'id': product.id, 'image_url': None}


@router.get('/public/menu-images/{product_id}/{version}')
async def public_image(product_id: int, version: str, session: AsyncSession = Depends(get_session)):
    if len(version) > 60:
        raise HTTPException(404, 'ไม่พบรูปเมนู')
    row = (await session.execute(select(ProductImage).where(ProductImage.product_id == product_id, ProductImage.version == version))).scalar_one_or_none()
    if not row:
        raise HTTPException(404, 'ไม่พบรูปเมนู')
    return Response(row.content, media_type='image/webp', headers={
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
        'ETag': f'"{row.version}"',
    })
