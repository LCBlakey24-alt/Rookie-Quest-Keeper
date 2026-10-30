"""Bounded reads for uploaded files.

``await file.read()`` loads the whole upload into memory before any size check
runs. Reading one byte past the limit is enough to reject an oversized file
without holding all of it.
"""
from fastapi import HTTPException, UploadFile

MAX_UPLOAD_BYTES = 10 * 1024 * 1024


async def read_upload_capped(file: UploadFile, max_bytes: int = MAX_UPLOAD_BYTES) -> bytes:
    data = await file.read(max_bytes + 1)
    if len(data) > max_bytes:
        limit_mb = max_bytes // (1024 * 1024)
        raise HTTPException(status_code=413, detail=f"File too large. Maximum {limit_mb}MB.")
    return data
