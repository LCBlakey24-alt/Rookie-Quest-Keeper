# Test credentials

Do not commit real or reusable account credentials to this repository.

For browser E2E tests that require a pre-registered account, provide credentials through the environment:

```bash
export RQK_E2E_EMAIL="e2e-account@example.test"
export RQK_E2E_PASSWORD="..."
export RQK_E2E_USERNAME="e2e-test-user" # optional
```

CI should provide these values through protected repository/environment secrets.

Backend integration tests that require a pre-existing account should use the same `RQK_E2E_EMAIL` and `RQK_E2E_PASSWORD` variables, or create an isolated test user during the test.

Never add a real personal password, admin password, API key, access token, or reusable production credential to a test fixture.
