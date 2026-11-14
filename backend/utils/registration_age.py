"""A conservative gate for *new public* self-registration.

This is only an adult self-declaration. It is not age verification and
does not satisfy child privacy/age-assurance laws on its own. Region-specific
child-attractive service assessments and a genuine parent-managed flow remain
outstanding. Existing accounts are not retroactively reclassified.
"""
from datetime import datetime, timezone

from fastapi import HTTPException, status

MIN_PUBLIC_SELF_REGISTRATION_AGE = 18
AGE_ATTESTATION_METHOD = 'adult-self-declaration'

def require_public_adult_attestation(confirmed: bool) -> None:
    """Reject adult public signup without an explicit affirmative statement."""
    if confirmed is not True:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f'Public self-registration is currently for adults aged {MIN_PUBLIC_SELF_REGISTRATION_AGE} or over. '
                f'Please confirm you are {MIN_PUBLIC_SELF_REGISTRATION_AGE}+ to register. Parent-managed child '
                'registration is not available yet.'
            ),
        )

def adult_attestation_record() -> dict:
    """Record only when self-declaration was made; do not collect birth dates."""
    return {
        'self_declared_adult_at': datetime.now(timezone.utc).isoformat(),
        'self_declared_adult_method': AGE_ATTESTATION_METHOD,
    }
