"""AI portrait generation — Gemini Nano Banana via the configured AI provider.

Single endpoint POST /api/ai/portrait accepts a character sketch plus a style
and returns a base64-encoded PNG so the frontend can render inline + save to
the character record's portrait field.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import asyncio
import uuid

from utils.auth import get_current_user
from config import logger
from utils.llm_provider import LlmChat, UserMessage, get_llm_api_key

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


@router.post("/ai/portrait")
async def generate_portrait(req: PortraitRequest, username: str = Depends(get_current_user)):
    """Generate a single fantasy-style character portrait via Gemini Nano Banana.

    Returns: { image_base64: str, mime_type: str, prompt: str, style: str }
    """
    if LlmChat is None or UserMessage is None or not get_llm_api_key("gemini"):
        raise HTTPException(status_code=503, detail="Image generation is not configured on this server.")

    if req.style not in STYLE_PROMPTS:
        req.style = "photoreal"

    prompt = _build_prompt(req)
    session_id = f"portrait-{username}-{uuid.uuid4().hex[:8]}"

    try:
        chat = LlmChat(
            api_key=get_llm_api_key("gemini"),
            session_id=session_id,
            system_message="You are an expert fantasy portrait artist."
        )
        chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])
        msg = UserMessage(text=prompt)
        _text, images = await chat.send_message_multimodal_response(msg)
    except Exception as e:
        logger.exception("Portrait generation failed")
        raise HTTPException(status_code=500, detail=f"Portrait generation failed: {type(e).__name__}")

    if not images:
        raise HTTPException(status_code=502, detail="No image returned from the model.")

    first = images[0]
    return {
        "image_base64": first.get("data", ""),
        "mime_type": first.get("mime_type", "image/png"),
        "style": req.style,
        "prompt": prompt
    }


@router.post("/ai/portrait/batch")
async def generate_portrait_batch(req: PortraitRequest, username: str = Depends(get_current_user)):
    """Generate 3 portraits (photoreal, painterly, stylized) in parallel so the
    player can pick their favorite at the end of the builder."""
    if LlmChat is None or UserMessage is None or not get_llm_api_key("gemini"):
        raise HTTPException(status_code=503, detail="Image generation is not configured on this server.")

    styles = ["photoreal", "painterly", "stylized"]

    async def one(style: str):
        copy = req.model_copy(update={"style": style})
        prompt = _build_prompt(copy)
        session_id = f"portrait-{username}-{style}-{uuid.uuid4().hex[:6]}"
        try:
            chat = LlmChat(
                api_key=get_llm_api_key("gemini"),
                session_id=session_id,
                system_message="You are an expert fantasy portrait artist."
            )
            chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])
            _text, images = await chat.send_message_multimodal_response(UserMessage(text=prompt))
            if not images:
                return {"style": style, "error": "no_image", "prompt": prompt}
            first = images[0]
            return {
                "style": style,
                "image_base64": first.get("data", ""),
                "mime_type": first.get("mime_type", "image/png"),
                "prompt": prompt
            }
        except Exception as e:
            logger.exception(f"Portrait ({style}) failed")
            return {"style": style, "error": type(e).__name__, "prompt": prompt}

    results = await asyncio.gather(*[one(s) for s in styles])
    return {"portraits": results}
