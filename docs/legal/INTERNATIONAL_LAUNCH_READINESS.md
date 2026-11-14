# Rookie Quest Keeper — international launch compliance register

**Status: DRAFT — launch blockers unresolved, not legal clearance.**  
Reviewed on: 2026-11-14. The target is a worldwide service, not a UK-only product.

This is an engineering inventory, not legal advice. Cross-border online services may be regulated based on who they serve, where they operate and how they process data. There is no single 'compliant everywhere' flag. Apply the stricter global baseline where feasible, then verify location-specific requirements before actively targeting each market. Keep the core product available for private development while completing reviews.

## Implemented in the global privacy foundations PR

- [x] Gate Rook chat, form-fill, generation, notes AI and character import behind the existing explicit external-AI permission check. This is a *client-side* privacy gate, not a substitute for server-side policy enforcement or GDPR legal-basis analysis.
- [x] Remove automatic third-party session-recording scripts from ALL hosting environments, including Vercel previews.
- [x] Make withdrawal of optional PostHog analytics call the running SDK's opt-out, stop-recording and reset hooks; apply this also during account deletion.
- [x] Introduce publicly reachable draft Privacy Notice, Terms of Use and Cookie & Device Storage pages, linked from the landing, account and signup screens.
- [x] Add code tests for the AI and analytics safeguards.
- [ ] **Publication blocker:** Legal entity/person responsible for the product, verified business contact and valid privacy request route — provide `REACT_APP_PUBLIC_LEGAL_OPERATOR` and `REACT_APP_PUBLIC_LEGAL_CONTACT` *after* confirming the information. A public page with placeholder contact details is not an adequate privacy notice.
- [ ] **Publication blocker:** Final human/legal review of the documents, with actual processing and retention facts rather than assumptions.

## Core baseline required before an open worldwide launch

### Data inventory, lawful use and user requests

- [ ] Create records of processing activities: signup, accounts, campaigns, notes, image uploads, AI prompts, emails, analytics, logs, billing (when active), community content (when active).
- [ ] For each purpose: categories of personal information, reasons and applicable legal bases, recipients, storage location, retention period, deletion mechanism, security controls, whether children may be affected.
- [ ] Implement and **test** account-level access/export, correction, deletion, request verification, support appeals, response deadlines and audit trail.
- [ ] Confirm backups, archives, logs, caches and external processors have defined and enforceable retention/deletion practices. The one-off 211-record private recovery archive from the owner's clean-slate test needs an expiry decision.
- [ ] Verify privacy notice contains the actual controller/operator identity, postal or suitable contact details, supervisory rights, transfers and safeguards, DPO/representative details where legally required.
- [ ] Review requirements to appoint an EU or UK representative, as relevant to establishment and processing operations. Do not assume one is always required or always exempt.
- [ ] Use region-relevant rights/opt-out settings, but do not claim consent alone fulfils every regional legal basis.

### Countries/jurisdictions to assess before active marketing

| Region | Core topics | Official guidance | Status |
|---|---|---|---|
| UK | UK GDPR, DPA 2018, PECR analytics/cookies, ICO fee, Children's Code, Online Safety Act scope, consumer and subscriptions law | https://ico.org.uk/for-organisations/ | Open |
| EU/EEA | GDPR notice and lawful bases; cross-border transfers/SCCs; ePrivacy cookies; DSA coverage and notice/action for hosting/platforms; consumer contract rights; EU representative where necessary | https://commission.europa.eu/law/law-topic/data-protection_en and https://digital-strategy.ec.europa.eu/en/policies/digital-services-act | Open |
| US | FTC COPPA (under-13 services and actual knowledge), state privacy laws where scope thresholds apply (notably California CCPA/CPRA), state child/online-safety rules, copyright/DMCA notices, FTC subscription rules | https://www.ftc.gov/business-guidance/privacy-security/childrens-privacy and https://oag.ca.gov/privacy/ccpa | Open |
| Canada | PIPEDA and relevant provincial private-sector privacy rules, consent/complaints, anti-spam and consumer rights | https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/ | Open |
| Brazil | LGPD lawful basis and data-subject rights; international transfer rules and ANPD guidance | https://www.gov.br/anpd/pt-br | Open |
| Australia | Privacy Act, Australian Privacy Principles where applicable, cross-border transfers and online-safety/consumer requirements | https://www.oaic.gov.au/privacy/australian-privacy-principles | Open |
| India | Digital Personal Data Protection Act/Rules with staged commencement; children's data and consent when applicable; electronic commerce and cross-border requirements | https://www.meity.gov.in/ and https://upload.indiacode.nic.in/ | Open |
| Other territories | Legal availability, privacy, age assurance, import/export restrictions, content regulation, accessibility, consumer law and tax | Country-by-country advice needed | Not assessed |

Do not hardcode a single threshold or a global 18+ solution without a documented service-age model. Some jurisdictions impose different ages, consent rules and platform obligations. A merely self-declared age may be inadequate depending on risk, especially for a child-attractive service.

### Children and mixed-age tabletop groups

- [ ] Define whether the *general public* may self-register when under 18, and if not, how age assurance actually works without unnecessary date-of-birth collection.
- [ ] Separate parent-created child accounts from ordinary public registration, with verified parental authority where required; do not equate a checkbox with verifiable parental consent.
- [ ] Child mode: no external AI by default, no public community sharing, no marketing tracking, no payments, restricted player/GM visibility, high privacy defaults.
- [ ] Document an age-appropriate design / impact assessment. Product visual design, game setting and teen appeal may make a service 'likely to be accessed by children' regardless of a claimed intended audience.
- [ ] Review FTC COPPA, ICO Children's Code and child privacy requirements in the actual launch markets.

### Vendor processing and transfers

- [ ] Verify current vendors, contract/data-processing agreement (DPA), processing region, subprocessors, retention and incident reporting: Vercel, Render, MongoDB Atlas, Resend, OpenAI, PostHog, any OAuth provider and any future payment provider.
- [ ] Where EU/UK transfers need a basis, verify adequacy or appropriate clauses and supplementary measures, and conduct required transfer risk assessments.
- [ ] Distinguish regional EU-hosted endpoints from the actual location of the account database, email provider and AI processing. EU endpoints do not make the whole service EU-only.
- [ ] Ensure least-privilege, encryption in transit/at rest, roles, audit logs, secrets management and tested incident response.

### Copyright, rules and marketplace

- [ ] Prioritise `docs/licensing/CONTENT_AUDIT.md`: non-SRD subclasses, spells, races and backgrounds still need source verification and removal/replacement. The 47 legacy creatures were already absent from the live bestiary; this PR removes their old public JSON pack. Review historical Git commits separately.
- [ ] Verify actual text matches licensed SRD 5.1/5.2, not just the title; retain notices and change records. User-uploaded material is not automatically licensed.
- [ ] Establish IP complaint, review, takedown and appeals workflow before community sharing or public storefront sales.
- [ ] Complete brand/trademark clearance in countries where marketed; don't imply official WotC partnership.

### Platform safety and online communities

- [ ] Assess existing user-to-user sharing and whether the UK Online Safety Act and EU Digital Services Act apply. Document service classification before and after launching a public gallery.
- [ ] Add human-reviewable content reporting, abuse escalation, user moderation, record retention, and appeals where required.
- [ ] Do not auto-publish private campaigns or character data; keep GM secrets out of player/public APIs. Validate against actual multi-account test environments.
- [ ] For any child-accessible social feature, implement appropriate risk assessment and default restrictions BEFORE launch.

### Monetisation and consumer rights

- [ ] Paid plans must disclose currency, total tax-inclusive price where required, billing cadence, renewals, cancellation flow, receipts and statutory refund/withdrawal rights for all target markets.
- [ ] Configure tax/VAT/GST/sales tax and a payment processor with appropriate consumer disclosures for each territory served.
- [ ] Design cancellations and recurring billing for evolving UK, EU, US and other rules. Do not use blanket 'no refunds' terms for digital downloads.
- [ ] Establish formal seller/operator details and customer support before accepting payments.

## Release gates (ALL required)

1. Operator/legal contact verified; legal notice is factually complete and professionally reviewed.
2. Contract/vendor and data-transfer review, data map, backup retention and deletion/export checks complete.
3. Copyright/SRD inventory resolved for all built-in downloadable/distributable materials.
4. Child-account and age decisions documented and implemented; existing child accounts tested.
5. Moderation/reporting duties assessed for the actually available sharing features.
6. Payments OFF until international consumer/tax and payment terms are reviewed.
7. Security review + controlled production smoke test; no cross-account access, analytics before opt-in, AI without permission or session recording.
8. Open launch territories only after a regional legal go/no-go; retain the option of region-specific feature restrictions.

## Sources for legal review

- European Commission GDPR rights: https://commission.europa.eu/law/law-topic/data-protection/information-individuals_en
- EDPB international transfers: https://www.edpb.europa.eu/sme/be-compliant/international-data-transfers_en
- EU Digital Services Act: https://digital-strategy.ec.europa.eu/en/policies/digital-services-act
- UK ICO Children's Code: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/
- US FTC COPPA: https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions
- California DOJ privacy: https://oag.ca.gov/privacy/ccpa
- Canada OPC: https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/
- Brazil ANPD: https://www.gov.br/anpd/pt-br
- Australia OAIC: https://www.oaic.gov.au/privacy/australian-privacy-principles
- India DPDP Rules (2025): https://upload.indiacode.nic.in/showfile?actid=AC_CEN_45_0_00003_2023-22_1763464807080&filename=dpdprules2025.pdf&type=rule

**Business decisions still required from the owner**: entity name/address/contact, child audience policy, which countries launch first, processor contracts, retention windows, monetisation model and community moderation policy.
