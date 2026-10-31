"""Uploads are rejected once they pass the size cap, without reading them whole."""
import asyncio
import io
import sys
from pathlib import Path

import pytest
from fastapi import HTTPException
from starlette.datastructures import UploadFile

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from utils.uploads import read_upload_capped  # noqa: E402


class CountingBytes(io.BytesIO):
    def __init__(self, data):
        super().__init__(data)
        self.bytes_read = 0

    def read(self, size=-1):
        chunk = super().read(size)
        self.bytes_read += len(chunk)
        return chunk


def _upload(size):
    stream = CountingBytes(b'x' * size)
    return UploadFile(file=stream, filename='notes.docx'), stream


def test_file_at_the_limit_is_returned_whole():
    upload, _ = _upload(1024)
    assert asyncio.run(read_upload_capped(upload, max_bytes=1024)) == b'x' * 1024


def test_oversized_file_is_rejected_after_one_extra_byte():
    upload, stream = _upload(5000)
    with pytest.raises(HTTPException) as too_big:
        asyncio.run(read_upload_capped(upload, max_bytes=1024))
    assert too_big.value.status_code == 413
    assert stream.bytes_read == 1025


def test_upload_routes_use_the_capped_reader():
    root = Path(__file__).resolve().parents[1] / 'routes'
    for name in ('homebrew.py', 'rule_systems.py', 'campaigns.py'):
        source = (root / name).read_text()
        assert 'await file.read()' not in source, name
        assert 'read_upload_capped(file)' in source, name
