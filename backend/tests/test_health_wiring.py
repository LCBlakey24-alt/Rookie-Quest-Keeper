from pathlib import Path


SERVER_SOURCE = (Path(__file__).resolve().parents[1] / "server.py").read_text(encoding="utf-8")


def test_liveness_and_readiness_are_separate():
    assert '@app.get("/health")' in SERVER_SOURCE
    assert '@app.get("/ready")' in SERVER_SOURCE
    assert 'async def health_check()' in SERVER_SOURCE
    assert 'async def readiness_check()' in SERVER_SOURCE


def test_readiness_checks_mongo_with_a_short_timeout():
    assert 'await asyncio.wait_for(db.command("ping"), timeout=3.0)' in SERVER_SOURCE
    assert '"database": "unavailable"' in SERVER_SOURCE
    assert '"database": "available"' in SERVER_SOURCE
