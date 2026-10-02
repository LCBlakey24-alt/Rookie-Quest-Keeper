"""Safe account-profile shaping shared by account routes and tests."""


def public_account_profile(user: dict) -> dict:
    """Return account settings fields without exposing authentication secrets."""
    return {
        "username": user["username"],
        "email": user.get("email"),
        "created_at": user.get("created_at"),
        "auth_provider": user.get("auth_provider") or "password",
        "password_login_enabled": user.get(
            "password_login_enabled",
            user.get("auth_provider") != "google",
        ),
    }
