# Privacy rights request handling — engineering runbook

**Draft as of 14 November 2026. This is not a completed international compliance programme or legal advice.**

## Purpose
Keeper users need a trustworthy way to request access, rectification, erasure, restriction, objection and portability. A request is **not** itself proof of identity, confirmation that an exemption applies, completed deletion, or fulfilment of any country-specific obligation.

## Intake and access safeguards
- Signed-in account holders can submit typed requests in **Account Settings → Privacy rights requests**.
- A request receives a unique reference, username derived from the authenticated JWT, category, optional minimal description and submission time. The app avoids asking for IDs, birthdays, addresses or passwords in the request form.
- Users may view **only their own** requests and public status messages through `GET /api/privacy/requests`.
- A server-authorised administrator can access the queue at **Admin → Privacy Requests**, record internal notes and choose a review status. `require_admin` runs on every admin endpoint **before** any database read/write.
- Public responses use an allowlist: internal notes, moderator identity and other requesters' information are excluded. Private GET/POST/PATCH responses set `Cache-Control: private, no-store`.
- Creating a request is rate-limited to five per account per hour by the existing single-process limiter. This needs a shared store before multi-instance scaling.
- No request automatically exports data, contacts third-party processors or deletes an account.

## Manual operator workflow — REQUIRED
1. Check the protected queue frequently; there is currently **no email notification or scheduled deadline monitor**. The operator must establish a reliable notification/triage workflow before opening worldwide registrations.
2. Identify the jurisdiction and request category. Determine the actual deadline and whether a formal identity check is reasonable and proportionate.
3. Where necessary, contact the requester through a **verified** communication channel. Never send personal exports or request identity documents using plain public status notes.
4. Locate relevant personal data: active DB, shared campaign membership, offline/cache state, uploads, analytics, support messages, backups and subprocessors. Exclude or redact other people's protected data where legally required.
5. Record actions and decisions privately, apply appropriate exceptions and data-retention holds, and respond without undue delay under applicable law. A marked status is not proof that the substantive request was fulfilled.
6. Only after completing the real response, set `responded` with an appropriately limited public status note. Confirm any response separately with identity-verified recipient.
7. Create a data-processing inventory, vendor deletion workflow, appeals mechanism and reviewed retention timetable.

## Remaining launch blockers
- Actual legal-operator identity, public contact and alternative request mechanism for people who cannot sign in.
- Documented identity-verification, jurisdiction-specific deadline and escalation process. E.g. GDPR/UK GDPR timeframes can require a response within a month, but don't hardcode that for every type or region.
- Secure export beyond the partial self-service download in **draft PR #880**. Do not promise that download meets every access or portability request.
- Automatic account deletion does not guarantee immediate removal from backups/third-party records; verified retention and legal audit obligations must be reconciled. This request collection is **not yet covered by an approved retention/purge policy**. Do not mark legal data retention as complete.
- Alerts/monitoring for pending requests, support staffing, private response channel, verifiable action receipts and accessibility review.
- Parent-managed accounts and adequate age assurance, plus global territorial rollout assessment.

## Sources for legal review
- European Commission individual requests: https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/dealing-requests-individuals_en
- UK ICO right of access: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/right-of-access/what-should-we-consider-when-responding-to-a-request/
- California CPPA: https://cppa.ca.gov/

Status: **partial implementation, draft PR only.** No production account data was changed to build or test this flow.
