"""Authenticated, preview-first Word workbook import for GM-owned campaigns.

Appending never replaces existing campaign records or shares a GM's content
with other accounts. Every import is prevalidated before any database writes.
"""
from __future__ import annotations

from collections import defaultdict
from io import BytesIO
import re
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import ValidationError

from config import db, logger
from models import (
    Calendar, CalendarUpdate, CalendarEventCreate, GodCreate, InGameNoteCreate,
    LocationCreate, NPCCreate, TimelineEventCreate,
)
from routes.campaign_setup import build_campaign_update, create_campaign
from routes.npcs import create_npc
from routes.world import create_god, create_location, create_calendar_event, get_calendar, update_calendar
from routes.quests import QuestCreate, create_quest, validate_quest_status
from routes.story_arcs import StoryArcCreate, create_story_arc
from routes.notes import create_ingame_note, create_timeline_event
from utils.auth import get_current_user, verify_campaign_ownership
from utils.campaign_workbook import (
    MAX_FILE_BYTES, WorkbookError, generate_template, parse_workbook,
)
from utils.custom_calendar_rules import check_calendar, validate_day

router = APIRouter()

COLLECTIONS = {
    "NPC": "npcs", "LOCATION": "locations", "GOD": "gods",
    "QUEST": "quests", "STORY ARC": "story_arcs",
    "CALENDAR EVENT": "calendar_events", "SESSION NOTE": "ingame_notes",
    "TIMELINE EVENT": "timeline_events",
}
IDENTITY = {
    "NPC": "name", "LOCATION": "name", "GOD": "name",
    "QUEST": "title", "STORY ARC": "title", "CALENDAR EVENT": "name",
    "SESSION NOTE": "content", "TIMELINE EVENT": "title",
}
PROCESS_ORDER = (
    "NPC", "LOCATION", "GOD", "QUEST", "STORY ARC",
    "CALENDAR EVENT", "SESSION NOTE", "TIMELINE EVENT",
)
DEFAULT_MONTHS = [
    {"name": name, "days": days} for name, days in [
        ("January", 31), ("February", 28), ("March", 31), ("April", 30),
        ("May", 31), ("June", 30), ("July", 31), ("August", 31),
        ("September", 30), ("October", 31), ("November", 30), ("December", 31),
    ]
]


def _integer(value: str | None, field: str, default: int, lower: int, upper: int) -> int:
    if not value:
        return default
    if not re.fullmatch(r"[+-]?[0-9]+", value.strip()):
        raise WorkbookError(f"{field} must be a whole number.")
    number = int(value)
    if number < lower or number > upper:
        raise WorkbookError(f"{field} must be between {lower} and {upper}.")
    return number


def _calendar_values(raw: dict, campaign_id: str) -> dict:
    months = []
    for line in (raw.get("custom_months") or "").splitlines():
        if not line.strip():
            continue
        if ":" not in line:
            raise WorkbookError("Custom months must be written one per line as Month name: number of days.")
        name, days = line.rsplit(":", 1)
        if not name.strip() or len(name.strip()) > 100:
            raise WorkbookError("A custom month needs a name of at most 100 characters.")
        months.append({
            "name": name.strip(),
            "days": _integer(days, f"Days in {name.strip()}", 30, 1, 400),
        })
    if len(months) > 36:
        raise WorkbookError("A custom calendar supports at most 36 months.")
    values = {
        "calendar_type": (raw.get("calendar_type") or ("custom" if months else "gregorian")).strip().lower(),
        "days_per_week": _integer(raw.get("days_per_week"), "Days per week", 7, 1, 10),
        "current_day": _integer(raw.get("current_day"), "Current day", 1, 1, 400),
        "current_month": _integer(raw.get("current_month"), "Current month", 1, 1, 36),
        "current_year": _integer(raw.get("current_year"), "Current year", 1, 1, 999999),
        "custom_months": months or DEFAULT_MONTHS,
    }
    check_calendar({"campaign_id": campaign_id, **values})
    return values


def _models(section: str, raw: dict) -> Any:
    if section == "NPC":
        data = {key: raw[key] for key in (
            "name", "role", "race", "class_name", "alignment", "description",
            "appearance", "personality", "backstory", "location", "notes", "image_url"
        ) if key in raw}
        if raw.get("image_url") and not raw["image_url"].lower().startswith(("https://", "http://")):
            raise WorkbookError("NPC image URLs must start with https:// or http://.")
        for field, lo, hi, default in (("level", 1, 100, 1), ("hp", 0, 100000, 10), ("ac", 0, 100, 10)):
            if field in raw:
                data[field] = _integer(raw[field], field.upper(), default, lo, hi)
        # Imported prose is not a verified combat stat block. Never infer
        # mechanics or expose an NPC to the players by default.
        data.update(combat_ready=False, mechanics_status="unverified", dm_only=True,
                    player_discovery_status="unknown",
                    statblock_source="user-provided Word campaign workbook")
        return NPCCreate(**data)
    if section == "LOCATION":
        return LocationCreate(**raw)
    if section == "GOD":
        return GodCreate(**raw)
    if section == "QUEST":
        values = {key: value for key, value in raw.items() if key != "objectives"}
        values["status"] = validate_quest_status(values.get("status", "draft"))
        values["objectives"] = [
            {"title": line.strip()} for line in raw.get("objectives", "").splitlines() if line.strip()
        ]
        values["shared_with_players"] = False
        return QuestCreate(**values)
    if section == "STORY ARC":
        return StoryArcCreate(**raw)
    if section == "CALENDAR EVENT":
        values = {key: value for key, value in raw.items() if key not in ("day", "month", "year")}
        for name, lo, hi in (("day", 1, 400), ("month", 1, 36), ("year", 1, 999999)):
            values[name] = _integer(raw.get(name), name, 1, lo, hi)
        values["recurrence_type"] = values.get("recurrence_type") or "none"
        values["is_recurring"] = values["recurrence_type"] != "none"
        return CalendarEventCreate(**values)
    if section == "SESSION NOTE":
        return InGameNoteCreate(**raw)
    if section == "TIMELINE EVENT":
        values = dict(raw)
        values["session_number"] = _integer(raw.get("session_number"), "Session number", 0, 0, 999999)
        return TimelineEventCreate(**values)
    raise WorkbookError(f"Unsupported record type: {section}.")


def _prepare(parsed: dict, campaign_id: str, calendar_baseline: dict | None = None) -> dict:
    records = parsed["records"]
    campaign_raw = (records.get("CAMPAIGN") or [{}])[0]
    if campaign_raw.get("name"):
        build_campaign_update(campaign_raw)
    calendar_raw = (records.get("CALENDAR") or [{}])[0]
    calendar = _calendar_values(calendar_raw, campaign_id) if calendar_raw else None
    proposed_calendar = calendar_baseline or calendar or {
        "calendar_type": "gregorian", "days_per_week": 7, "current_day": 1,
        "current_month": 1, "current_year": 1, "custom_months": DEFAULT_MONTHS,
    }
    check_calendar(proposed_calendar)
    prepared = defaultdict(list)
    for section in PROCESS_ORDER:
        for raw in records.get(section, []):
            model = _models(section, raw)
            if section == "CALENDAR EVENT":
                validate_day(proposed_calendar, model.year, model.month, model.day)
            prepared[section].append(model)
    return {"campaign": campaign_raw, "calendar": calendar, "entries": dict(prepared)}


async def _file_payload(file: UploadFile) -> bytes:
    filename = (file.filename or "").lower().strip()
    if not filename.endswith(".docx"):
        raise HTTPException(status_code=422, detail="Choose a Microsoft Word .docx file.")
    data = await file.read(MAX_FILE_BYTES + 1)
    if len(data) > MAX_FILE_BYTES:
        raise HTTPException(status_code=413, detail="The workbook must be smaller than 2 MB.")
    return data


async def _existing_names(campaign_id: str, section: str) -> set[str]:
    key = IDENTITY[section]
    cursor = db[COLLECTIONS[section]].find({"campaign_id": campaign_id}, {key: 1})
    rows = await cursor.to_list(5000)
    return {str(row.get(key) or "").strip().casefold() for row in rows}


async def _save_record(campaign_id: str, section: str, model, username: str) -> dict:
    route = {
        "NPC": create_npc,
        "LOCATION": create_location,
        "GOD": create_god,
        "QUEST": create_quest,
        "STORY ARC": create_story_arc,
        "CALENDAR EVENT": create_calendar_event,
        "SESSION NOTE": create_ingame_note,
        "TIMELINE EVENT": create_timeline_event,
    }[section]
    return await route(campaign_id, model, username)


async def _undo_records(campaign_id: str, created: list) -> None:
    for collection, record_id in reversed(created):
        if record_id:
            await db[collection].delete_one({"id": record_id, "campaign_id": campaign_id})


@router.get("/campaign-workbook/template")
async def download_campaign_workbook():
    return StreamingResponse(
        BytesIO(generate_template()),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": 'attachment; filename="Rookie_Quest_Keeper_Campaign_Workbook.docx"',
                 "Cache-Control": "no-store"},
    )


@router.post("/campaign-workbook/preview")
async def preview_campaign_workbook(
    file: UploadFile = File(...),
    campaign_id: str = Form(""),
    username: str = Depends(get_current_user),
):
    if campaign_id:
        await verify_campaign_ownership(campaign_id, username)
    try:
        parsed = parse_workbook(await _file_payload(file))
        stored_calendar = await db.calendars.find_one({"campaign_id": campaign_id}, {"_id": 0}) if campaign_id else None
        _prepare(parsed, campaign_id or "preview", stored_calendar)
        if not campaign_id and not (parsed["records"].get("CAMPAIGN") or [{}])[0].get("name"):
            raise WorkbookError("Fill in Campaign name to create a new campaign.")
        warnings = list(parsed["warnings"])
        if campaign_id and parsed["records"].get("CAMPAIGN"):
            warnings.append("Existing campaign settings are preserved; imported campaign overview fields will not overwrite them.")
        if stored_calendar and parsed["records"].get("CALENDAR"):
            warnings.append("Existing calendar is preserved; imported calendar settings will be skipped.")
        return {
            "format": parsed["format"],
            "counts": parsed["counts"],
            "total_records": parsed["total_records"],
            "campaign_name": (parsed["records"].get("CAMPAIGN") or [{}])[0].get("name", ""),
            "target": "existing" if campaign_id else "new",
            "warnings": warnings,
        }
    except (WorkbookError, ValidationError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/campaign-workbook/import")
async def import_campaign_workbook(
    file: UploadFile = File(...),
    campaign_id: str = Form(""),
    username: str = Depends(get_current_user),
):
    if campaign_id:
        await verify_campaign_ownership(campaign_id, username)
    try:
        parsed = parse_workbook(await _file_payload(file))
        stored_calendar = await db.calendars.find_one({"campaign_id": campaign_id}, {"_id": 0}) if campaign_id else None
        prepared = _prepare(parsed, campaign_id or "preview", stored_calendar)
        if not campaign_id and not prepared["campaign"].get("name"):
            raise WorkbookError("Fill in Campaign name to create a new campaign.")
    except (WorkbookError, ValidationError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    created_campaign = False
    created_records = []
    counts = defaultdict(int)
    skipped = defaultdict(int)
    skipped_calendar = False
    try:
        if not campaign_id:
            campaign = await create_campaign(prepared["campaign"], username)
            campaign_id = campaign["id"]
            created_campaign = True

        # For existing campaigns, never replace calendar definitions, NPCs,
        # settings or other records (especially GM-only notes).
        if prepared["calendar"] and not stored_calendar:
            result = await update_calendar(
                campaign_id, CalendarUpdate(**prepared["calendar"]), username
            )
            created_records.append(("calendars", result["id"]))
        elif prepared["calendar"]:
            skipped_calendar = True

        if prepared["campaign"].get("dm_rules"):
            stored_setting = await db.campaign_settings.find_one(
                {"campaign_id": campaign_id}, {"_id": 0}
            )
            if not stored_setting:
                from models import CampaignSetting
                record = CampaignSetting(
                    campaign_id=campaign_id, dm_rules=prepared["campaign"]["dm_rules"]
                ).model_dump()
                await db.campaign_settings.insert_one(record)
                created_records.append(("campaign_settings", record["id"]))
                counts["GM rules"] += 1
            elif not stored_setting.get("dm_rules"):
                await db.campaign_settings.update_one(
                    {"id": stored_setting["id"], "campaign_id": campaign_id},
                    {"$set": {"dm_rules": prepared["campaign"]["dm_rules"]}}
                )
                counts["GM rules"] += 1
            else:
                skipped["GM rules"] += 1

        if prepared["entries"].get("CALENDAR EVENT") and not await db.calendars.find_one(
            {"campaign_id": campaign_id}, {"_id": 0}
        ):
            initial = await get_calendar(campaign_id, username)
            created_records.append(("calendars", initial.id if hasattr(initial, "id") else initial["id"]))

        for section in PROCESS_ORDER:
            known = await _existing_names(campaign_id, section)
            for model in prepared["entries"].get(section, []):
                key = IDENTITY[section]
                identity = str(getattr(model, key)).strip().casefold()
                if identity in known:
                    skipped[section] += 1
                    continue
                record = await _save_record(campaign_id, section, model, username)
                record_id = record.id if hasattr(record, "id") else record.get("id")
                created_records.append((COLLECTIONS[section], record_id))
                counts[section] += 1
                known.add(identity)
        return {
            "campaign_id": campaign_id, "created_campaign": created_campaign,
            "created": dict(counts), "skipped": dict(skipped),
            "skipped_existing_calendar": skipped_calendar,
            "message": "Workbook imported without replacing existing campaign records.",
        }
    except Exception:
        logger.exception("Campaign workbook import failed; rolling back appended entries")
        try:
            await _undo_records(campaign_id, created_records)
            if created_campaign:
                await db.campaign_invites.delete_many({"campaign_id": campaign_id})
                await db.campaigns.delete_one({"id": campaign_id, "dm_user_id": username})
        except Exception:
            logger.exception("Campaign workbook import rollback failed")
        raise HTTPException(status_code=500, detail="Import failed. No existing campaign records were intentionally overwritten.")
