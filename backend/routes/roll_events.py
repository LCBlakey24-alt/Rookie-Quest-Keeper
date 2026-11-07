"""Campaign roll event routes for player-focused session stats.

Who rolled is decided here, never by the browser.

A roll used to carry its own actor, actor type, character id and character
name, and the server stored whatever it was given. Any campaign member could
therefore record a roll as another player's character, or as the GM, and have
it land in someone else's group-check result. Now:

* a GM roll is accepted only from the campaign's GM;
* a player roll must name a character that this account owns AND that is
  linked to this campaign right now; the character's name comes from its
  saved record, so two characters called "Aria" stay two characters;
* the dice themselves are bounded and checked for shape. Their randomness is
  still the client's: nothing here can prove a die was rolled fairly, only
  that the reported numbers are possible and add up;
* a client-generated event id makes a retried request return the roll it
  already recorded instead of recording another.
"""
import json
import logging
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional
from uuid import uuid4

from fastapi import APIRouter, Body, Depends, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator, model_validator
from pymongo.errors import DuplicateKeyError

from config import db
from utils.auth import get_current_user, verify_campaign_membership, verify_campaign_ownership
from utils.player_display_payload import public_display_state
from utils.ws_manager import ws_manager

router = APIRouter()
logger = logging.getLogger(__name__)

# The dice engine's own limits (frontend/src/data/diceRoller.js): 200 dice a
# roll, d2 to d100, flat modifiers up to a million. Exploding dice can add
# more rolls than were asked for, hence the headroom on the list.
MAX_DIE_SIDES = 100
MAX_ROLLS = 500
MAX_ABS_MODIFIER = 1_000_000
MAX_ABS_TOTAL = MAX_ABS_MODIFIER + MAX_ROLLS * MAX_DIE_SIDES
MAX_EXPLOSIONS = MAX_ROLLS
MAX_BODY_BYTES = 96 * 1024
MAX_LABEL = 200
MAX_NAME = 80
MAX_ID = 128
EVENT_ID_PATTERN = re.compile(r'^[A-Za-z0-9._:-]{8,128}$')
CONTROL_CHARACTERS = re.compile(r'[\x00-\x1f\x7f]')
GROUP_CHECK_ATTEMPTS = 6


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def clean_text(value: Any, limit: int) -> str:
    text = CONTROL_CHARACTERS.sub(' ', str(value or '')).strip()
    if len(text) > limit:
        raise ValueError(f'must be at most {limit} characters')
    return text


class DieResult(BaseModel):
    """One die as the dice engine reports it. Unknown keys are dropped."""
    model_config = ConfigDict(extra='ignore')

    sides: int = Field(ge=2, le=MAX_DIE_SIDES)
    result: int = Field(ge=1, le=MAX_DIE_SIDES)
    sign: int = 1
    dropped: bool = False
    exploded: bool = False

    @model_validator(mode='after')
    def possible(self):
        if self.result > self.sides:
            raise ValueError(f'a d{self.sides} cannot show {self.result}')
        if self.sign not in (1, -1):
            raise ValueError('sign must be 1 or -1')
        return self


class RollEventPayload(BaseModel):
    """What a client may say about a roll. Identity is resolved server-side."""
    model_config = ConfigDict(extra='ignore')

    client_event_id: str = ''
    # Older clients send their generated event id as `id`.
    id: str = ''
    actor: str = ''
    actor_type: Literal['player', 'gm'] = 'player'
    character_id: str = ''
    group_check_id: str = ''
    requested_roll_id: str = ''
    check_name: str = ''
    label: str = 'Roll'
    notation: str = ''
    total: int = Field(default=0, ge=-MAX_ABS_TOTAL, le=MAX_ABS_TOTAL)
    modifier: int = Field(default=0, ge=-MAX_ABS_MODIFIER, le=MAX_ABS_MODIFIER)
    rolls: List[DieResult] = Field(default_factory=list, max_length=MAX_ROLLS)
    visibleRolls: List[DieResult] = Field(default_factory=list, max_length=MAX_ROLLS)
    isCrit: bool = False
    isFumble: bool = False
    explosionCount: int = Field(default=0, ge=0, le=MAX_EXPLOSIONS)

    @field_validator('actor', mode='before')
    @classmethod
    def bounded_name(cls, value):
        return clean_text(value, MAX_NAME)

    @field_validator('label', 'notation', 'check_name', mode='before')
    @classmethod
    def bounded_label(cls, value):
        return clean_text(value, MAX_LABEL)

    @field_validator('client_event_id', 'id', 'character_id', 'group_check_id', 'requested_roll_id', mode='before')
    @classmethod
    def bounded_id(cls, value):
        return clean_text(value, MAX_ID)

    def event_key(self) -> str:
        """The idempotency key, or '' when the client sent none usable."""
        for candidate in (self.client_event_id, self.id):
            if candidate and EVENT_ID_PATTERN.match(candidate):
                return candidate
        if self.client_event_id:
            raise ValueError('client_event_id must be 8-128 letters, digits, ".", "_", ":" or "-"')
        return ''


def kept_dice(rolls: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [roll for roll in rolls if not roll.get('dropped')]


def total_check(rolls: List[Dict[str, Any]], modifier: int, total: int) -> str:
    """Whether the reported total is what the reported dice add up to.

    'unverified' is recorded, not refused: some legitimate rolls are adjusted
    after the dice (the 2024 Hit Point Die minimum, for one), so a mismatch
    is not proof of tampering. It does mark the total as the client's claim.
    """
    if not rolls:
        return 'no-dice'
    dice_total = sum(int(roll.get('sign') or 1) * int(roll.get('result') or 0) for roll in kept_dice(rolls))
    return 'consistent' if dice_total + modifier == total else 'unverified'


async def resolve_roll_identity(campaign: Dict[str, Any], campaign_id: str, username: str, payload: RollEventPayload) -> Dict[str, str]:
    """Who this roll belongs to, from the account and saved records only."""
    if payload.actor_type == 'gm':
        if campaign.get('dm_user_id') != username:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Only the GM can record GM rolls')
        return {'actor_type': 'gm', 'actor': payload.actor or 'GM / Table', 'character_id': '', 'character_name': ''}

    if not payload.character_id:
        raise HTTPException(status_code=422, detail='A player roll must name its character')
    # Owned by this account and linked to this campaign now. A character in
    # another campaign, or one that has since left this one, does not match;
    # neither does anyone else's. One refusal for all of them, so the
    # response does not reveal which characters exist.
    character = await db.player_characters.find_one(
        {'id': payload.character_id, 'user_id': username, 'campaign_id': campaign_id},
        {'_id': 0, 'id': 1, 'name': 1, 'character_name': 1},
    )
    if not character:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='You can only roll for your own character in this campaign')
    name = str(character.get('name') or character.get('character_name') or 'Player Character')[:MAX_NAME]
    return {'actor_type': 'player', 'actor': name, 'character_id': character['id'], 'character_name': name}


def _character_key(value: Dict[str, Any], *fields: str) -> str:
    for field in fields:
        if value.get(field):
            return str(value[field]).strip()
    return ''


def party_character_id(member: Dict[str, Any]) -> str:
    # Party rows from the live party carry the character id as `id`.
    return _character_key(member, 'character_id', 'characterId', 'id')


def result_character_id(result: Dict[str, Any]) -> str:
    return _character_key(result, 'character_id', 'characterId')


def group_check_result(event: Dict[str, Any]) -> Dict[str, Any]:
    visible = event.get('visibleRolls') or []
    natural = next((roll.get('result') for roll in visible if int(roll.get('sides') or 0) == 20), None)
    return {
        'id': event.get('id'),
        'character_id': event.get('character_id'),
        'character_name': event.get('character_name'),
        'name': event.get('character_name'),
        'actor': event.get('actor'),
        'actor_type': event.get('actor_type'),
        'group_check_id': event.get('group_check_id'),
        'requested_roll_id': event.get('requested_roll_id'),
        'check_name': event.get('check_name'),
        'label': event.get('label'),
        'notation': event.get('notation'),
        'total': event.get('total'),
        'natural': natural,
        'modifier': event.get('modifier'),
        'rolls': event.get('rolls') or [],
        'visibleRolls': visible,
        'isCrit': event.get('isCrit'),
        'isFumble': event.get('isFumble'),
        'created_at': event.get('created_at'),
    }


async def update_group_check_display(campaign_id: str, event: Dict[str, Any]) -> bool:
    """Put a player's roll on the group check it answers, if it may.

    Results are keyed by character id alone. A result only joins the check it
    names, only for a character the GM asked to roll, and a character's
    newer roll is never replaced by an older one that arrives late.

    The write is a compare-and-swap on the state's sync id, update time and
    revision: if another roll, or the GM putting something else on screen,
    changed the state since it was read, this write matches nothing and the
    merge is redone from the fresh state. It can never overwrite a newer
    display with a stale copy of the group check.
    """
    group_check_id = str(event.get('group_check_id') or '')
    character_id = str(event.get('character_id') or '')
    if not group_check_id or not character_id or event.get('actor_type') != 'player':
        return False

    for _ in range(GROUP_CHECK_ATTEMPTS):
        state = await db.campaign_display_states.find_one({'campaign_id': campaign_id}, {'_id': 0})
        if not state or state.get('mode') != 'group-check':
            return False
        payload = state.get('payload') if isinstance(state.get('payload'), dict) else {}
        active_id = str(payload.get('group_check_id') or payload.get('id') or '')
        if not active_id or active_id != group_check_id or payload.get('status') == 'closed':
            return False

        party = [member for member in payload.get('party') or [] if isinstance(member, dict)]
        party_ids = {party_character_id(member) for member in party} - {''}
        if character_id not in party_ids:
            return False

        results = [result for result in payload.get('results') or [] if isinstance(result, dict)]
        current = next((result for result in results if result_character_id(result) == character_id), None)
        if current is not None:
            if current.get('id') == event.get('id'):
                return False  # already applied; a retry changes nothing
            if str(current.get('created_at') or '') > str(event.get('created_at') or ''):
                return False  # a newer roll by this character is already showing

        updated_results = [result for result in results if result_character_id(result) != character_id]
        updated_results.append(group_check_result(event))
        rolled = {result_character_id(result) for result in updated_results}
        updated_at = now_iso()
        revision = int(state.get('revision') or 0)
        updated_payload = {
            **payload,
            'results': updated_results,
            'status': 'complete' if party_ids <= rolled else 'collecting',
            'last_result_at': updated_at,
        }
        written = await db.campaign_display_states.update_one(
            {
                'campaign_id': campaign_id,
                'sync_id': state.get('sync_id'),
                'updated_at': state.get('updated_at'),
                'revision': state.get('revision'),
            },
            {'$set': {'payload': updated_payload, 'updated_at': updated_at, 'revision': revision + 1}},
        )
        if not written.matched_count:
            continue
        public = public_display_state({**state, 'payload': updated_payload, 'updated_at': updated_at})
        await ws_manager.broadcast_to_campaign(campaign_id, {
            'type': 'player_display_update',
            'user_id': '',
            'data': public,
            'timestamp': updated_at,
        })
        return True

    logger.warning('Group check result for campaign %s not applied after %s attempts', campaign_id, GROUP_CHECK_ATTEMPTS)
    return False


def d20s_for(event: Dict[str, Any]) -> List[Dict[str, Any]]:
    rolls = event.get("visibleRolls") or event.get("rolls") or []
    return [roll for roll in rolls if int(roll.get("sides") or 0) == 20 and not roll.get("dropped")]


def summarise(events: List[Dict[str, Any]], player_focus: bool = True) -> Dict[str, Any]:
    player_events = [event for event in events if event.get("actor_type") == "player"]
    gm_events = [event for event in events if event.get("actor_type") != "player"]
    # A zero-player session must remain empty in the player-facing recap.
    # Falling back to GM-only rolls exposes private labels, totals and awards.
    focus_events = player_events if player_focus else events
    by_actor: Dict[str, Dict[str, Any]] = {}
    total_dice = 0
    nat20s = 0
    nat1s = 0
    explosions = 0
    highest_total = None
    biggest_d20 = None

    for event in focus_events:
        actor = event.get("character_name") or event.get("actor") or "Player"
        if actor not in by_actor:
            by_actor[actor] = {
                "name": actor,
                "rolls": 0,
                "dice": 0,
                "nat20s": 0,
                "nat1s": 0,
                "explosions": 0,
                "highestTotal": 0,
            }
        actor_stats = by_actor[actor]
        visible = event.get("visibleRolls") or event.get("rolls") or []
        actor_stats["rolls"] += 1
        actor_stats["dice"] += len(visible)
        actor_stats["explosions"] += int(event.get("explosionCount") or 0)
        actor_stats["highestTotal"] = max(actor_stats["highestTotal"], int(event.get("total") or 0))
        total_dice += len(visible)
        explosions += int(event.get("explosionCount") or 0)

        if highest_total is None or int(event.get("total") or 0) > int(highest_total.get("total") or 0):
            highest_total = event

        for roll in d20s_for(event):
            result = int(roll.get("result") or 0)
            if result == 20:
                nat20s += 1
                actor_stats["nat20s"] += 1
            if result == 1:
                nat1s += 1
                actor_stats["nat1s"] += 1
            if biggest_d20 is None or result > int(biggest_d20.get("result") or 0):
                biggest_d20 = {**roll, "actor": actor, "label": event.get("label") or "Roll"}

    actors = sorted(by_actor.values(), key=lambda item: (-item["rolls"], -item["nat20s"], item["name"]))
    most_crits = max(actors, key=lambda item: item["nat20s"], default=None)
    most_fumbles = max(actors, key=lambda item: item["nat1s"], default=None)
    busiest = actors[0] if actors else None
    awards = []
    if most_crits and most_crits["nat20s"]:
        awards.append({"title": "Crit Goblin", "name": most_crits["name"], "value": f"{most_crits['nat20s']} Nat 20{'s' if most_crits['nat20s'] != 1 else ''}"})
    if most_fumbles and most_fumbles["nat1s"]:
        awards.append({"title": "Dice Betrayal", "name": most_fumbles["name"], "value": f"{most_fumbles['nat1s']} Nat 1{'s' if most_fumbles['nat1s'] != 1 else ''}"})
    if busiest and busiest["rolls"]:
        awards.append({"title": "Button Masher", "name": busiest["name"], "value": f"{busiest['rolls']} player roll{'s' if busiest['rolls'] != 1 else ''}"})
    if highest_total:
        awards.append({"title": "Big Number Energy", "name": highest_total.get("character_name") or highest_total.get("actor") or "Player", "value": f"{highest_total.get('total', 0)} on {highest_total.get('label') or highest_total.get('notation') or 'a roll'}"})

    return {
        "totalRolls": len(focus_events),
        "playerRolls": len(player_events),
        "gmRolls": len(gm_events),
        "totalDice": total_dice,
        "nat20s": nat20s,
        "nat1s": nat1s,
        "explosions": explosions,
        "highestTotal": highest_total,
        "biggestD20": biggest_d20,
        "actors": actors,
        "awards": awards,
    }


async def build_summary(campaign_id: str, *, cutoff: Optional[str] = None) -> Dict[str, Any]:
    """Snapshot preview or a point-in-time session before archiving.

    The cutoff prevents late rolls arriving during End Session from being
    archived without appearing in the saved recap.
    """
    campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0, "name": 1}) or {}
    active_query = {"campaign_id": campaign_id, "archived": {"$ne": True}}
    all_time_query = {"campaign_id": campaign_id}
    if cutoff:
        active_query["created_at"] = {"$lte": cutoff}
        all_time_query["created_at"] = {"$lte": cutoff}
    active = await db.roll_events.find(active_query, {"_id": 0}).sort("created_at", 1).to_list(2000)
    all_time = await db.roll_events.find(all_time_query, {"_id": 0}).sort("created_at", 1).to_list(10000)
    return {
        "campaignName": campaign.get("name") or "Campaign",
        "generated_at": cutoff or now_iso(),
        "session": summarise(active, player_focus=True),
        "allTime": summarise(all_time, player_focus=True),
    }


async def read_roll_payload(request: Request) -> RollEventPayload:
    declared = request.headers.get('content-length')
    if declared and declared.isdigit() and int(declared) > MAX_BODY_BYTES:
        raise HTTPException(status_code=413, detail='Roll is too large')
    body = await request.body()
    if len(body) > MAX_BODY_BYTES:
        raise HTTPException(status_code=413, detail='Roll is too large')
    try:
        data = json.loads(body or b'{}')
    except (ValueError, UnicodeDecodeError):
        raise HTTPException(status_code=422, detail='Roll must be JSON')
    if not isinstance(data, dict):
        raise HTTPException(status_code=422, detail='Roll must be a JSON object')
    try:
        return RollEventPayload.model_validate(data)
    except ValidationError as exc:
        raise RequestValidationError(exc.errors(include_url=False, include_context=False))


async def existing_roll(campaign_id: str, username: str, key: str) -> Optional[Dict[str, Any]]:
    return await db.roll_events.find_one(
        {'campaign_id': campaign_id, 'user_id': username, 'client_event_id': key},
        {'_id': 0},
    )


@router.post("/campaigns/{campaign_id}/roll-events")
async def record_roll_event(campaign_id: str, request: Request, username: str = Depends(get_current_user)):
    """Record one virtual dice roll from a campaign member, exactly once."""
    campaign = await verify_campaign_membership(campaign_id, username)
    payload = await read_roll_payload(request)
    try:
        key = payload.event_key()
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    identity = await resolve_roll_identity(campaign, campaign_id, username, payload)

    if key:
        # The same request again (a retry, a double submit): hand back the
        # roll already recorded. Finishing its group-check update is safe to
        # repeat, and covers a first attempt that stopped before it.
        already = await existing_roll(campaign_id, username, key)
        if already:
            await update_group_check_display(campaign_id, already)
            return {**already, 'duplicate': True}

    rolls = [roll.model_dump() for roll in (payload.rolls or payload.visibleRolls)]
    event: Dict[str, Any] = {
        'id': f'roll-{uuid4().hex}',
        'campaign_id': campaign_id,
        'user_id': username,
        **identity,
        'group_check_id': payload.group_check_id if identity['actor_type'] == 'player' else '',
        'requested_roll_id': payload.requested_roll_id if identity['actor_type'] == 'player' else '',
        'check_name': payload.check_name,
        'label': payload.label or payload.notation or 'Roll',
        'notation': payload.notation,
        'total': payload.total,
        'modifier': payload.modifier,
        # One list of dice, and the shown dice derived from it, so the two
        # can never disagree about which dice counted.
        'rolls': rolls,
        'visibleRolls': kept_dice(rolls),
        'total_check': total_check(rolls, payload.modifier, payload.total),
        'isCrit': payload.isCrit,
        'isFumble': payload.isFumble,
        'explosionCount': payload.explosionCount,
        'archived': False,
        'created_at': now_iso(),
    }
    if key:
        event['client_event_id'] = key
    try:
        await db.roll_events.insert_one(event)
    except DuplicateKeyError:
        # The same key won a race with this request. Its roll stands.
        already = await existing_roll(campaign_id, username, key)
        if already:
            await update_group_check_display(campaign_id, already)
            return {**already, 'duplicate': True}
        raise
    event.pop('_id', None)
    await update_group_check_display(campaign_id, event)
    return event


async def ensure_roll_event_indexes(database=None) -> None:
    """One recorded roll per (campaign, account, client event id).

    Partial, so the historic rolls that have no client event id are neither
    touched nor constrained, and no migration is needed.
    """
    from pymongo import ASCENDING
    target = database if database is not None else db
    await target.roll_events.create_index(
        [('campaign_id', ASCENDING), ('user_id', ASCENDING), ('client_event_id', ASCENDING)],
        unique=True,
        background=True,
        name='roll_event_client_id_unique',
        partialFilterExpression={'client_event_id': {'$type': 'string'}},
    )
    await target.roll_events.create_index(
        [('campaign_id', ASCENDING), ('created_at', ASCENDING)],
        background=True,
        name='roll_event_campaign_time',
    )


async def ensure_roll_session_indexes(database=None) -> None:
    """One in-flight close per campaign and one durable summary per close id."""
    from pymongo import ASCENDING
    target = database if database is not None else db
    await target.roll_session_summaries.create_index(
        [('campaign_id', ASCENDING), ('session_close_id', ASCENDING)],
        unique=True,
        background=True,
        name='roll_session_close_id_unique',
        partialFilterExpression={'session_close_id': {'$type': 'string'}},
    )
    await target.roll_session_summaries.create_index(
        [('campaign_id', ASCENDING)],
        unique=True,
        background=True,
        name='roll_session_one_pending',
        partialFilterExpression={'status': 'pending'},
    )


class EndSessionRequest(BaseModel):
    session_close_id: Optional[str] = Field(
        default=None, min_length=8, max_length=128, pattern=EVENT_ID_PATTERN.pattern,
    )


def public_roll_summary(record: Dict[str, Any]) -> Dict[str, Any]:
    """Return recap data only, never internal pending IDs or archive metadata."""
    return {
        key: record[key]
        for key in ('campaignName', 'generated_at', 'session', 'allTime')
        if key in record
    }


async def finish_pending_roll_session(campaign_id: str, record: Dict[str, Any]) -> Dict[str, Any]:
    """Idempotently complete a summary that was committed BEFORE rolling archival.

    If the archive write or completion mark fails, the durable 'pending' record
    remains available for the next request to finish without rebuilding stats.
    """
    if record.get('status') != 'complete':
        await db.roll_events.update_many(
            {
                'campaign_id': campaign_id,
                'archived': {'$ne': True},
                'created_at': {'$lte': record['generated_at']},
            },
            {'$set': {
                'archived': True,
                'archived_at': now_iso(),
                'archived_by_session_id': record['id'],
            }},
        )
        await db.roll_session_summaries.update_one(
            {'campaign_id': campaign_id, 'id': record['id']},
            {'$set': {'status': 'complete', 'completed_at': now_iso()}},
        )
    return public_roll_summary(record)


@router.get("/campaigns/{campaign_id}/roll-events/summary")
async def get_roll_summary(campaign_id: str, username: str = Depends(get_current_user)):
    """Preview current session and all-time roll stats."""
    await verify_campaign_ownership(campaign_id, username)
    return await build_summary(campaign_id)


@router.post("/campaigns/{campaign_id}/roll-events/end-session")
async def end_session_roll_summary(
    campaign_id: str,
    request: Optional[EndSessionRequest] = Body(default=None),
    username: str = Depends(get_current_user),
):
    """Persist the recap first, then archive its time-bounded roll snapshot.

    Retrying a close id after a timeout returns the same stored recap, rather
    than archiving a second, empty session. Older clients with no close id still
    work, but cannot identify a completed attempt after its response is lost.
    """
    await verify_campaign_ownership(campaign_id, username)
    close_id = request.session_close_id if request and request.session_close_id else f"legacy-{uuid4().hex}"

    existing = await db.roll_session_summaries.find_one(
        {'campaign_id': campaign_id, 'session_close_id': close_id}, {'_id': 0},
    )
    if existing:
        return await finish_pending_roll_session(campaign_id, existing)

    # A previous request may have crashed after persisting its pending
    # snapshot, including when the client cannot supply the original key.
    pending = await db.roll_session_summaries.find_one(
        {'campaign_id': campaign_id, 'status': 'pending'}, {'_id': 0},
    )
    if pending:
        return await finish_pending_roll_session(campaign_id, pending)

    cutoff = now_iso()
    summary = await build_summary(campaign_id, cutoff=cutoff)
    record = {
        **summary,
        'id': f"roll-summary-{uuid4().hex}",
        'campaign_id': campaign_id,
        'session_close_id': close_id,
        'status': 'pending',
        'created_at': now_iso(),
    }
    try:
        # If this fails nothing has been archived: no session data loss.
        await db.roll_session_summaries.insert_one(record)
    except DuplicateKeyError:
        # Another close of the same campaign won the insertion race.
        recovered = await db.roll_session_summaries.find_one(
            {'campaign_id': campaign_id, 'session_close_id': close_id}, {'_id': 0},
        ) or await db.roll_session_summaries.find_one(
            {'campaign_id': campaign_id, 'status': 'pending'}, {'_id': 0},
        )
        if not recovered:
            raise
        return await finish_pending_roll_session(campaign_id, recovered)
    return await finish_pending_roll_session(campaign_id, record)
