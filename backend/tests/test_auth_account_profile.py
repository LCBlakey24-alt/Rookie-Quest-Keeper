from routes.auth import public_account_profile


def test_google_account_profile_exposes_provider_without_secrets():
    profile = public_account_profile({
        "username": "GoogleRook",
        "email": "rook@gmail.com",
        "created_at": "2026-10-02T00:00:00+00:00",
        "auth_provider": "google",
        "password_hash": "never-expose-this",
        "google_sub": "provider-secret-id",
    })

    assert profile == {
        "username": "GoogleRook",
        "email": "rook@gmail.com",
        "created_at": "2026-10-02T00:00:00+00:00",
        "auth_provider": "google",
    }


def test_legacy_password_account_defaults_to_password_provider():
    profile = public_account_profile({
        "username": "LegacyRook",
        "created_at": "2026-10-02T00:00:00+00:00",
    })

    assert profile["auth_provider"] == "password"
