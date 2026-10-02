import pytest
from pydantic import ValidationError

from models import ChangePasswordRequest, ResetPasswordRequest, UserLogin, UserRegister


@pytest.mark.parametrize(
    "factory",
    [
        lambda: UserRegister(username="Rook", password="short"),
        lambda: ResetPasswordRequest(token="reset-token", new_password="short"),
        lambda: ChangePasswordRequest(current_password="old-password", new_password="short"),
    ],
)
def test_new_password_flows_require_at_least_eight_characters(factory):
    with pytest.raises(ValidationError):
        factory()


def test_eight_character_password_is_accepted_for_new_password_flows():
    assert UserRegister(username="Rook", password="12345678").password == "12345678"
    assert ResetPasswordRequest(token="reset-token", new_password="12345678").new_password == "12345678"
    assert ChangePasswordRequest(
        current_password="old-password",
        new_password="12345678",
    ).new_password == "12345678"


def test_legacy_short_passwords_can_still_be_submitted_for_login():
    login = UserLogin(username="LegacyRook", password="short")
    assert login.password == "short"
