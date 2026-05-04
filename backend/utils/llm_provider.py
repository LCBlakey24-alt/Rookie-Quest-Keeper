"""Small provider-neutral helpers for app AI calls."""
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional
import base64
import os


def get_llm_api_key(provider: Optional[str] = None) -> Optional[str]:
    """Return the best configured API key for a text or image model."""
    provider_key_map = {
        "openai": ("OPENAI_API_KEY", "LLM_API_KEY"),
        "anthropic": ("ANTHROPIC_API_KEY", "LLM_API_KEY"),
        "gemini": ("GEMINI_API_KEY", "GOOGLE_API_KEY", "LLM_API_KEY"),
    }
    names = provider_key_map.get(provider or "", ("LLM_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GEMINI_API_KEY", "GOOGLE_API_KEY"))
    for name in names:
        value = os.environ.get(name)
        if value:
            return value
    return None


@dataclass
class UserMessage:
    text: Optional[str] = None
    content: Optional[str] = None
    role: str = "user"

    def to_message(self) -> Dict[str, str]:
        return {
            "role": self.role or "user",
            "content": self.text if self.text is not None else (self.content or ""),
        }


class LlmChat:
    """Compatibility wrapper around LiteLLM for the app's existing route code."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        session_id: Optional[str] = None,
        system_message: Optional[str] = None,
        model: Optional[str] = None,
    ):
        self.api_key = api_key
        self.session_id = session_id
        self.system_message = system_message
        self.provider: Optional[str] = None
        self.model = model or "gpt-4o-mini"
        self.params: Dict[str, Any] = {}

    def with_model(self, provider: str, model: str) -> "LlmChat":
        self.provider = provider
        self.model = model if provider == "openai" else f"{provider}/{model}"
        return self

    def with_params(self, **params: Any) -> "LlmChat":
        self.params.update(params)
        return self

    def _coerce_messages(
        self,
        user_message: Optional[Any] = None,
        messages: Optional[Iterable[Any]] = None,
        system_prompt: Optional[str] = None,
    ) -> List[Dict[str, str]]:
        output: List[Dict[str, str]] = []
        system = system_prompt or self.system_message
        if system:
            output.append({"role": "system", "content": system})

        source = list(messages) if messages is not None else ([user_message] if user_message is not None else [])
        for message in source:
            if isinstance(message, UserMessage):
                output.append(message.to_message())
            elif isinstance(message, dict):
                output.append({
                    "role": message.get("role", "user"),
                    "content": message.get("content") or message.get("text") or "",
                })
            else:
                output.append({"role": "user", "content": str(message)})
        return output

    async def send_message(self, user_message: Optional[Any] = None, **kwargs: Any) -> str:
        try:
            import litellm
        except ImportError as exc:
            raise RuntimeError("LiteLLM is not installed") from exc

        litellm.drop_params = True
        system_prompt = kwargs.pop("system_prompt", None)
        messages = kwargs.pop("messages", None)
        request_params = {**self.params, **kwargs}
        request_params = {key: value for key, value in request_params.items() if value is not None}

        response = await litellm.acompletion(
            model=self.model,
            api_key=self.api_key or get_llm_api_key(self.provider),
            messages=self._coerce_messages(user_message, messages, system_prompt),
            **request_params,
        )
        return response.choices[0].message.content or ""

    async def send_message_multimodal_response(self, user_message: Optional[Any] = None) -> tuple[str, List[Dict[str, str]]]:
        try:
            import litellm
        except ImportError as exc:
            raise RuntimeError("LiteLLM is not installed") from exc

        litellm.drop_params = True
        response = await litellm.acompletion(
            model=self.model,
            api_key=self.api_key or get_llm_api_key(self.provider),
            messages=self._coerce_messages(user_message),
            **self.params,
        )
        message = response.choices[0].message
        text = message.content or ""
        images: List[Dict[str, str]] = []

        for image in getattr(message, "images", []) or []:
            data = getattr(image, "data", None) or (image.get("data") if isinstance(image, dict) else None)
            mime_type = getattr(image, "mime_type", None) or (image.get("mime_type") if isinstance(image, dict) else None) or "image/png"
            if data:
                images.append({"data": data, "mime_type": mime_type})
        return text, images


class OpenAIImageGeneration:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or get_llm_api_key("openai")

    async def generate_images(self, prompt: str, model: str = "gpt-image-1", number_of_images: int = 1) -> List[bytes]:
        try:
            from openai import AsyncOpenAI
        except ImportError as exc:
            raise RuntimeError("OpenAI SDK is not installed") from exc

        client = AsyncOpenAI(api_key=self.api_key)
        response = await client.images.generate(
            model=model,
            prompt=prompt,
            n=number_of_images,
        )
        images: List[bytes] = []
        for item in response.data or []:
            b64_data = getattr(item, "b64_json", None)
            if b64_data:
                images.append(base64.b64decode(b64_data))
        return images
