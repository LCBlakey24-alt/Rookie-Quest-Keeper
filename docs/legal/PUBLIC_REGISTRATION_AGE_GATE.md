# Public registration age gate — first technical control

**Status: draft implementation; NOT a worldwide legal clearance.**

## What this change does
- New password and Google sign-ups require a server-validated declaration that the registrant is at least 18 years old. Failing/missing declarations stop a new account before it is created.
- The app shows an accessible, unchecked-by-default box on both registration flows. Google sign-in for an existing account is not blocked or asked to make a retrospective statement.
- The database stores only that a new account self-declared being an adult, the method and the time. It does **not** ask for or store a date of birth or identity document.
- The staging helper cannot bypass the age-gated signup endpoint by silently registering a new account.
- Existing members are not altered, deleted, relabelled or asked to re-register.
- Current restricted child-account middleware remains unchanged. This change does **not** launch child accounts or a parental onboarding process.

## Important limits
- A self-declaration is **not** age verification. It can be falsified.
- Product design and intended audience still need a documented 'likely to be accessed by children' assessment.
- Adult-only registration by itself does not meet all requirements under COPPA, UK Children's Code, EU/EEA and state/national child rules, or any online-safety obligations. In particular, don't imply a checkbox verifies a parent's identity or parental permission.
- Google OAuth account linking and existing account login deliberately remain functional without new age checks, but accounts already created still need a risk-appropriate approach.
- The service's read-only demo and publicly accessible pages still require an age-appropriate design review.

## Next steps before expanding worldwide signups
1. Confirm owner-approved minimum age and whether minors should ever register directly, by territory; the present 18+ setting is a conservative interim decision, not a determination of universal law.
2. Conduct appropriate child-risk/age-assurance impact assessments for countries targeted, including the product's relevance to younger audiences.
3. If needed, select proportionate age-assurance methods rather than collecting full dates of birth by default. Design alternative access and appeals for erroneous denials.
4. Design a separate *verified parent-managed* child-account flow; enforce parent authority, child account type, restricted sharing, no external AI, no analytics and no payments by default.
5. Server-enforce eligibility on **every** new account creation method (currently verified: password registration and Google first signup) and document future added providers before launch.
6. Obtain specialist regional legal advice, complete the factual Privacy Notice/Terms work in PR #880, and run fresh production multi-account security tests.

Related: GitHub issue #881, `backend/utils/child_access.py`, and draft global compliance PR #880.
