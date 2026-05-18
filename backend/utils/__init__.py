"""Utility package for backend helpers.

Keep this module side-effect free so importing ``utils`` does not require full
runtime environment (database URLs, auth config, etc.). Import concrete helpers
from their submodules, e.g. ``from utils.auth import create_token``.
"""

__all__ = []
