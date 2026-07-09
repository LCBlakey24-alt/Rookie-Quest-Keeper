"""Site layout settings routes for future admin-powered page design controls."""
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from config import ADMIN_USERNAMES, db
from utils.auth import get_current_user

router = APIRouter()

DEFAULT_SECTION_ORDER = [
    'dashboard_hero',
    'status_bar',
    'quick_actions',
    'live_workspace',
    'site_updates',
    'reviews',
    'admin_notice',
]

DEFAULT_SECTION_ORDER_BY_DEVICE = {
    'desktop': DEFAULT_SECTION_ORDER,
    'tablet': DEFAULT_SECTION_ORDER,
    'mobile': DEFAULT_SECTION_ORDER,
}

DEFAULT_SECTION_VISIBILITY = {section_id: True for section_id in DEFAULT_SECTION_ORDER}

DEFAULT_SECTION_VISIBILITY_BY_DEVICE = {
    'desktop': DEFAULT_SECTION_VISIBILITY,
    'tablet': DEFAULT_SECTION_VISIBILITY,
    'mobile': DEFAULT_SECTION_VISIBILITY,
}

DEFAULT_LAYOUT_SETTINGS = {
    'id': 'global',
    'layout_version': 1,
    'mode': 'balanced',
    'density': 'comfortable',
    'desktop': {
        'container_max_width': 1440,
        'card_scale': 'normal',
        'columns': 3,
        'show_sidebar': True,
    },
    'tablet': {
        'container_max_width': 1024,
        'card_scale': 'normal',
        'columns': 2,
        'show_sidebar': False,
    },
    'mobile': {
        'container_max_width': 720,
        'card_scale': 'compact',
        'columns': 1,
        'show_sidebar': False,
    },
    'modules': {
        'dashboard_hero': True,
        'quick_actions': True,
        'site_updates': True,
        'feedback_prompt': True,
        'reviews': True,
        'admin_notice': True,
    },
    'section_order': DEFAULT_SECTION_ORDER,
    'section_order_by_device': DEFAULT_SECTION_ORDER_BY_DEVICE,
    'section_visibility_by_device': DEFAULT_SECTION_VISIBILITY_BY_DEVICE,
    'notes': '',
    'updated_at': '',
    'updated_by': '',
}

ALLOWED_MODES = {'compact', 'balanced', 'showcase'}
ALLOWED_DENSITIES = {'compact', 'comfortable', 'spacious'}
ALLOWED_CARD_SCALES = {'compact', 'normal', 'large'}
DEVICE_LIMITS = {
    'desktop': {'min_width': 960, 'max_width': 1920, 'min_columns': 1, 'max_columns': 5},
    'tablet': {'min_width': 720, 'max_width': 1280, 'min_columns': 1, 'max_columns': 4},
    'mobile': {'min_width': 320, 'max_width': 760, 'min_columns': 1, 'max_columns': 2},
}


class LayoutSettingsUpdate(BaseModel):
    mode: str = Field(default='balanced', max_length=40)
    density: str = Field(default='comfortable', max_length=40)
    desktop: dict = Field(default_factory=dict)
    tablet: dict = Field(default_factory=dict)
    mobile: dict = Field(default_factory=dict)
    modules: dict = Field(default_factory=dict)
    section_order: list[str] = Field(default_factory=lambda: list(DEFAULT_SECTION_ORDER))
    section_order_by_device: dict = Field(default_factory=dict)
    section_visibility_by_device: dict = Field(default_factory=dict)
    notes: str = Field(default='', max_length=1200)


async def verify_admin(username: str):
    admins = {name.lower() for name in ADMIN_USERNAMES}
    if not username or username.lower() not in admins:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")


def _clamp_int(value, fallback: int, minimum: int, maximum: int) -> int:
    try:
        number = int(value)
    except (TypeError, ValueError):
        number = fallback
    return max(minimum, min(number, maximum))


def sanitise_device_settings(device: str, incoming: Optional[dict]) -> dict:
    defaults = DEFAULT_LAYOUT_SETTINGS[device]
    source = incoming or {}
    limits = DEVICE_LIMITS[device]
    card_scale = source.get('card_scale', defaults['card_scale'])
    if card_scale not in ALLOWED_CARD_SCALES:
        card_scale = defaults['card_scale']

    return {
        'container_max_width': _clamp_int(
            source.get('container_max_width'),
            defaults['container_max_width'],
            limits['min_width'],
            limits['max_width'],
        ),
        'card_scale': card_scale,
        'columns': _clamp_int(
            source.get('columns'),
            defaults['columns'],
            limits['min_columns'],
            limits['max_columns'],
        ),
        'show_sidebar': bool(source.get('show_sidebar', defaults['show_sidebar'])),
    }


def sanitise_modules(incoming: Optional[dict]) -> dict:
    source = incoming or {}
    return {key: bool(source.get(key, default)) for key, default in DEFAULT_LAYOUT_SETTINGS['modules'].items()}


def sanitise_section_order(incoming: Optional[list]) -> list[str]:
    ordered = []
    if isinstance(incoming, list):
        for section_id in incoming:
            if section_id in DEFAULT_SECTION_ORDER and section_id not in ordered:
                ordered.append(section_id)
    for section_id in DEFAULT_SECTION_ORDER:
        if section_id not in ordered:
            ordered.append(section_id)
    return ordered


def sanitise_section_order_by_device(incoming: Optional[dict], fallback_order: Optional[list] = None) -> dict:
    source = incoming or {}
    fallback = sanitise_section_order(fallback_order or DEFAULT_SECTION_ORDER)
    return {
        'desktop': sanitise_section_order(source.get('desktop') if isinstance(source, dict) else fallback),
        'tablet': sanitise_section_order(source.get('tablet') if isinstance(source, dict) else fallback),
        'mobile': sanitise_section_order(source.get('mobile') if isinstance(source, dict) else fallback),
    }


def sanitise_section_visibility(incoming: Optional[dict]) -> dict:
    source = incoming or {}
    if not isinstance(source, dict):
        source = {}
    return {section_id: bool(source.get(section_id, True)) for section_id in DEFAULT_SECTION_ORDER}


def sanitise_section_visibility_by_device(incoming: Optional[dict]) -> dict:
    source = incoming or {}
    return {
        'desktop': sanitise_section_visibility(source.get('desktop') if isinstance(source, dict) else {}),
        'tablet': sanitise_section_visibility(source.get('tablet') if isinstance(source, dict) else {}),
        'mobile': sanitise_section_visibility(source.get('mobile') if isinstance(source, dict) else {}),
    }


def merge_layout_settings(doc: Optional[dict]) -> dict:
    source = {**DEFAULT_LAYOUT_SETTINGS, **(doc or {})}
    source.pop('_id', None)
    mode = source.get('mode') if source.get('mode') in ALLOWED_MODES else DEFAULT_LAYOUT_SETTINGS['mode']
    density = source.get('density') if source.get('density') in ALLOWED_DENSITIES else DEFAULT_LAYOUT_SETTINGS['density']
    section_order = sanitise_section_order(source.get('section_order'))
    return {
        **DEFAULT_LAYOUT_SETTINGS,
        'mode': mode,
        'density': density,
        'desktop': sanitise_device_settings('desktop', source.get('desktop')),
        'tablet': sanitise_device_settings('tablet', source.get('tablet')),
        'mobile': sanitise_device_settings('mobile', source.get('mobile')),
        'modules': sanitise_modules(source.get('modules')),
        'section_order': section_order,
        'section_order_by_device': sanitise_section_order_by_device(source.get('section_order_by_device'), section_order),
        'section_visibility_by_device': sanitise_section_visibility_by_device(source.get('section_visibility_by_device')),
        'notes': str(source.get('notes', ''))[:1200],
        'updated_at': source.get('updated_at', ''),
        'updated_by': source.get('updated_by', ''),
    }


@router.get("/layout-settings")
async def get_public_layout_settings():
    """Public layout configuration for pages that opt into admin-powered layout controls."""
    doc = await db.layout_settings.find_one({'id': 'global'}, {'_id': 0})
    return merge_layout_settings(doc)


@router.get("/admin/layout-settings")
async def get_admin_layout_settings(username: str = Depends(get_current_user)):
    """Admin-only full layout settings for Layout Studio."""
    await verify_admin(username)
    doc = await db.layout_settings.find_one({'id': 'global'}, {'_id': 0})
    return merge_layout_settings(doc)


@router.put("/admin/layout-settings")
async def update_admin_layout_settings(payload: LayoutSettingsUpdate, username: str = Depends(get_current_user)):
    """Admin-only update for responsive layout and module visibility controls."""
    await verify_admin(username)
    now = datetime.now(timezone.utc).isoformat()
    mode = payload.mode if payload.mode in ALLOWED_MODES else DEFAULT_LAYOUT_SETTINGS['mode']
    density = payload.density if payload.density in ALLOWED_DENSITIES else DEFAULT_LAYOUT_SETTINGS['density']
    section_order = sanitise_section_order(payload.section_order)
    patch = {
        'id': 'global',
        'layout_version': DEFAULT_LAYOUT_SETTINGS['layout_version'],
        'mode': mode,
        'density': density,
        'desktop': sanitise_device_settings('desktop', payload.desktop),
        'tablet': sanitise_device_settings('tablet', payload.tablet),
        'mobile': sanitise_device_settings('mobile', payload.mobile),
        'modules': sanitise_modules(payload.modules),
        'section_order': section_order,
        'section_order_by_device': sanitise_section_order_by_device(payload.section_order_by_device, section_order),
        'section_visibility_by_device': sanitise_section_visibility_by_device(payload.section_visibility_by_device),
        'notes': payload.notes.strip()[:1200],
        'updated_at': now,
        'updated_by': username,
    }
    await db.layout_settings.update_one({'id': 'global'}, {'$set': patch}, upsert=True)
    return {'message': 'Layout settings updated', 'settings': merge_layout_settings(patch)}
