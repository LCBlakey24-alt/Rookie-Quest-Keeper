"""AI portrait generation — Gemini Nano Banana via the configured AI provider.

Single endpoint POST /api/ai/portrait accepts a character sketch plus a style
and returns a base64-encoded PNG so the frontend can render inline + save to
the character record's portrait field.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import asyncio
import base64
import uuid

from utils.auth import get_current_user
from config import logger
from utils.llm_provider import LlmChat, OpenAIImageGeneration, UserMessage, get_llm_api_key

router = APIRouter()

# Style presets — frontend sends one of these 3 keys
STYLE_PROMPTS = {
    "photoreal": (
        "photorealistic high-fantasy portrait, cinematic lighting, dramatic rim light, "
        "rich detail, D&D character art style, painterly realism"
    ),
    "painterly": (
        "painterly fantasy illustration, oil painting style, soft brushwork, "
        "original pen-and-ink watercolor feel, tabletop RPG art, not in the style of any specific show, brand, or living artist"
    ),
    "stylized": (
        "stylized fantasy portrait, bold line art, vibrant saturated colors, "
        "anime-influenced illustration, clean shading, collectible card game style"
    ),
}


class PortraitRequest(BaseModel):
    race: Optional[str] = ""
    subrace: Optional[str] = ""
    character_class: Optional[str] = ""
    subclass: Optional[str] = ""
    background: Optional[str] = ""
    alignment: Optional[str] = ""
    gender: Optional[str] = ""
    description: Optional[str] = ""
    style: str = "photoreal"  # photoreal | painterly | stylized


class ImageBatchRequest(BaseModel):
    subject_type: str = "item"  # item | environment
    name: Optional[str] = ""
    item_type: Optional[str] = ""
    rarity: Optional[str] = ""
    description: Optional[str] = ""
    properties: Optional[str] = ""
    weather: Optional[str] = ""
    lighting: Optional[str] = ""
    mood: Optional[str] = ""
    location: Optional[str] = ""
    campaign_name: Optional[str] = ""
    campaign_notes: Optional[str] = ""
    notes: Optional[str] = ""
    style: str = "concept"


def _build_prompt(req: PortraitRequest) -> str:
    style = STYLE_PROMPTS.get(req.style, STYLE_PROMPTS["photoreal"])
    parts = []
    if req.gender:
        parts.append(req.gender)
    if req.subrace:
        parts.append(req.subrace)
    elif req.race:
        parts.append(req.race)
    if req.character_class:
        cls_part = req.character_class
        if req.subclass:
            cls_part = f"{req.subclass} {req.character_class}"
        parts.append(cls_part)
    subject = " ".join(parts) if parts else "fantasy adventurer"

    extras = []
    if req.background:
        extras.append(f"{req.background} background")
    if req.alignment:
        extras.append(req.alignment.lower())
    if req.description:
        # Trim so we don't blow past model limits
        extras.append(req.description.strip()[:400])

    extras_str = ", ".join(extras) if extras else ""
    return (
        f"Portrait of a {subject}. {extras_str}. "
        f"{style}. Head and shoulders composition, centered, neutral background, "
        f"no text, no watermark, no logo."
    )


def _build_image_prompt(req: ImageBatchRequest, variant: str) -> str:
    subject_type = (req.subject_type or "item").lower()
    variant_notes = {
        "studio": "single-object studio concept art, centered composition, crisp silhouette",
        "dramatic": "dramatic cinematic lighting, strong red rim light, premium fantasy item render",
        "arcane": "arcane workshop concept art, subtle magical energy, clean readable shape",
        "wide": "wide cinematic establishing shot, landscape orientation, strong depth",
        "immersive": "immersive tabletop battle backdrop, readable foreground and background",
        "moody": "moody atmospheric scene, high contrast, dark fantasy lighting",
    }
    variant_text = variant_notes.get(variant, variant_notes["studio"])

    if subject_type == "environment":
        weather = req.weather or "clear weather"
        lighting = req.lighting or "daylight"
        mood = req.mood or "neutral fantasy atmosphere"
        location = req.location or req.campaign_name or "fantasy adventuring location"
        details = ", ".join(
            part for part in [
                f"weather: {weather}",
                f"lighting: {lighting}",
                f"mood: {mood}",
                req.notes,
                req.campaign_notes[:300] if req.campaign_notes else "",
            ]
            if part
        )
        return (
            f"Fantasy tabletop RPG environment background for {location}. {details}. "
            f"{variant_text}. Dark grey and red-accented cinematic palette where appropriate. "
            f"No characters in the foreground, no text, no watermark, no logo."
        )

    item_name = req.name or "custom fantasy item"
    item_type = req.item_type or "equipment"
    rarity = req.rarity or "common"
    details = ", ".join(
        part for part in [
            req.description[:450] if req.description else "",
            req.properties[:300] if req.properties else "",
        ]
        if part
    )
    return (
        f"Fantasy tabletop RPG item concept art of a {rarity} {item_type} named {item_name}. "
        f"{details}. {variant_text}. The image should show one item only on a neutral dark grey background, "
        f"with red accent lighting if it fits the object. No hands, no character wearing it, no text, no watermark, no logo."
    )


async def _generate_prompt_with_gemini(prompt: str, username: str, style: str, subject_type: str) -> dict:
    session_id = f"image-{subject_type}-{username}-{style}-{uuid.uuid4().hex[:8]}"
    chat = LlmChat(
        api_key=get_llm_api_key("gemini"),
        session_id=session_id,
        system_message="You are an expert fantasy concept artist for tabletop RPG tools."
    )
    chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])
    _text, images = await chat.send_message_multimodal_response(UserMessage(text=prompt))
    if not images:
        raise RuntimeError("no_image")
    first = images[0]
    return {
        "image_base64": first.get("data", ""),
        "mime_type": first.get("mime_type", "image/png"),
        "style": style,
        "prompt": prompt,
        "provider": "gemini"
    }


async def _generate_prompt_with_openai(prompt: str, style: str) -> dict:
    generator = OpenAIImageGeneration(api_key=get_llm_api_key("openai"))
    images = await generator.generate_images(prompt=prompt, number_of_images=1)
    if not images:
        raise RuntimeError("no_image")
    return {
        "image_base64": base64.b64encode(images[0]).decode("utf-8"),
        "mime_type": "image/png",
        "style": style,
        "prompt": prompt,
        "provider": "openai"
    }


async def _generate_image_option(req: ImageBatchRequest, username: str, variant: str) -> dict:
    subject_type = (req.subject_type or "item").lower()
    prompt = _build_image_prompt(req, variant)

    if LlmChat is not None and UserMessage is not None and get_llm_api_key("gemini"):
        return await _generate_prompt_with_gemini(prompt, username, variant, subject_type)

    if get_llm_api_key("openai"):
        return await _generate_prompt_with_openai(prompt, variant)

    raise HTTPException(
        status_code=503,
        detail="Image generation is not configured. Set GEMINI_API_KEY/GOOGLE_API_KEY or OPENAI_API_KEY."
    )


async def _generate_with_gemini(req: PortraitRequest, username: str) -> dict:
    prompt = _build_prompt(req)
    session_id = f"portrait-{username}-{req.style}-{uuid.uuid4().hex[:8]}"
    chat = LlmChat(
        api_key=get_llm_api_key("gemini"),
        session_id=session_id,
        system_message="You are an expert fantasy portrait artist."
    )
    chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])
    _text, images = await chat.send_message_multimodal_response(UserMessage(text=prompt))
    if not images:
        raise RuntimeError("no_image")
    first = images[0]
    return {
        "image_base64": first.get("data", ""),
        "mime_type": first.get("mime_type", "image/png"),
        "style": req.style,
        "prompt": prompt,
        "provider": "gemini"
    }


async def _generate_with_openai(req: PortraitRequest) -> dict:
    prompt = _build_prompt(req)
    generator = OpenAIImageGeneration(api_key=get_llm_api_key("openai"))
    images = await generator.generate_images(prompt=prompt, number_of_images=1)
    if not images:
        raise RuntimeError("no_image")
    return {
        "image_base64": base64.b64encode(images[0]).decode("utf-8"),
        "mime_type": "image/png",
        "style": req.style,
        "prompt": prompt,
        "provider": "openai"
    }


async def _generate_portrait_option(req: PortraitRequest, username: str) -> dict:
    if req.style not in STYLE_PROMPTS:
        req.style = "photoreal"

    if LlmChat is not None and UserMessage is not None and get_llm_api_key("gemini"):
        return await _generate_with_gemini(req, username)

    if get_llm_api_key("openai"):
        return await _generate_with_openai(req)

    raise HTTPException(
        status_code=503,
        detail="Image generation is not configured. Set GEMINI_API_KEY/GOOGLE_API_KEY or OPENAI_API_KEY."
    )


@router.post("/ai/portrait")
async def generate_portrait(req: PortraitRequest, username: str = Depends(get_current_user)):
    """Generate a single fantasy-style character portrait via Gemini Nano Banana.

    Returns: { image_base64: str, mime_type: str, prompt: str, style: str }
    """
    try:
        return await _generate_portrait_option(req, username)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Portrait generation failed")
        raise HTTPException(status_code=500, detail=f"Portrait generation failed: {type(e).__name__}")


@router.post("/ai/portrait/batch")
async def generate_portrait_batch(req: PortraitRequest, username: str = Depends(get_current_user)):
    """Generate 3 portraits (photoreal, painterly, stylized) in parallel so the
    player can pick their favorite at the end of the builder."""
    styles = ["photoreal", "painterly", "stylized"]

    async def one(style: str):
        copy = req.model_copy(update={"style": style})
        try:
            return await _generate_portrait_option(copy, username)
        except HTTPException:
            raise
        except Exception as e:
            logger.exception(f"Portrait ({style}) failed")
            prompt = _build_prompt(copy)
            return {"style": style, "error": type(e).__name__, "prompt": prompt}

    try:
        results = await asyncio.gather(*[one(s) for s in styles])
    except HTTPException:
        raise
    return {"portraits": results}


@router.post("/ai/image/batch")
async def generate_image_batch(req: ImageBatchRequest, username: str = Depends(get_current_user)):
    """Generate 3 image options for item/equipment art or a shared environment background."""
    subject_type = (req.subject_type or "item").lower()
    variants = ["wide", "immersive", "moody"] if subject_type == "environment" else ["studio", "dramatic", "arcane"]

    async def one(variant: str):
        try:
            return await _generate_image_option(req, username, variant)
        except HTTPException:
            raise
        except Exception as e:
            logger.exception(f"Image generation ({subject_type}:{variant}) failed")
            return {
                "style": variant,
                "error": type(e).__name__,
                "prompt": _build_image_prompt(req, variant),
            }

    try:
        results = await asyncio.gather(*[one(variant) for variant in variants])
    except HTTPException:
        raise
    return {"images": results}
