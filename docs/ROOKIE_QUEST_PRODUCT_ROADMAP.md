# Rookie Quest Keeper — staged product roadmap

> **Working vision, 15 November 2026.** Owner-requested long-term direction. This complements (and does not override) [Master Product Blueprint #439](https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/issues/439), [Launch Readiness #238](https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/issues/238), and [Ideas Backlog #905](https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/issues/905).
>
> **Roadmap ≠ live functionality, delivery guarantee or automatic instruction to implement.** Each idea needs a short spec, owner approval, a scoped issue/PR, tests and production verification. Keep the currently verified Neon Coast / Dusk Sky design system in `docs/DESIGN_SYSTEM.md`.

## Product promise

**Make tabletop play simpler, more creative and affordable.** Rookie Quest Keeper should handle character creation, at-the-table play, campaign organisation, encounters, maps, exports and accessible dice. Build an original, coherent identity rather than recreating a competitor's purchasing friction.

Core principles:
1. **Free, usable foundations.** Standard dice, character play, fundamental GM/player functions, privacy, secure character data and essential accessibility are not premium upsells.
2. **Few surprises, fewer microtransactions.** Future optional membership should bundle eligible cosmetics and small content releases instead of pushing individual dice purchases.
3. **A player can run the game from their first character-sheet screen.** Other views are drill-downs; print/export supports handwritten and editable use.
4. **Rook proposes; players/GM decide.** AI may explain, automate safe calculations and suggest loadouts, but never silently changes character builds or campaign canon.
5. **Private by default.** Each account starts clean, every campaign and character stays scoped to its owner/authorised party, creator publication is strictly opt-in.
6. **Rules are edition-aware.** Do not mix 2014 and 2024 mechanics or treat homebrew as official.
7. **Gradual releases.** Small reviewed changes, verifiable reliability and straightforward support beat impressive but broken feature collections.

## Current baseline and immediate next steps

Existing site, open tickets and user concepts already cover far more than a minimal character app. **Before shipping new monetisation or community systems**, prioritise confirmed problems, privacy, core play and regression testing. Existing features must be tested on current `main` rather than assumed complete because a design exists.

**Printable character-sheet prototype (separate from live website export):**
- 2014 and 2024 A4 variants; colour and black-and-white; seven pages; 422 editable AcroForm text/check fields in each; first page is the play sheet, last page the edition-specific exhaustion/conditions reference.
- V5 prototype completed offline 15 Nov 2026; sample-filled files round-tripped locally. **PDF-to-account mapping, automated exporter, expansion pages, accessibility/reader compatibility testing, US Letter and any redistribution/licensing sign-off remain pending.**
- Proposed field map data can be imported into the eventual exporter, but it is **not a published API contract**.
- Track implementation in [#906 printable and populated sheets](https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/issues/906).

## Stage 0 — Ship a reliable Keeper foundation (current priority)

**Purpose:** Real game sessions must work without account leaks, lost writes or inconsistent dice/rules.

Deliverables:
- Confirm account/tenant isolation, invitation permissions, private data controls, import and export safety; new accounts start empty.
- Harden character create/edit/level-up, spells, resources, combat state and errors across 2014 and 2024.
- Stabilise encounter prep → combat → player display → save/review; recover safely from offline/reconnect failures.
- Fix broken mobile layout, navigation and accessibility; ensure PWA install and useful offline fallback.
- Test dice result integrity independently from visual 3D animation.
- Visible error states and recovery; no success indicators until writes really succeed.

**Gate to Stage 1:** stable core regression suite and representative session testing; no known account privacy blocker. Ownership: [#238](https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/issues/238), [#439](https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/issues/439).

## Stage 1 — Outstanding player experience

**Purpose:** The best place to play and manage a character, including tablet and paper users.

Deliverables:
- Refine first-screen character sheet: stats, HP, death saves, Hit Dice remaining, exhaustion hexagons, conditions, attacks, damage, range, active actions and important resources.
- **Printable/exportable 2014 & 2024 PDFs**: blank, editable, handwriting-friendly, colour/monochrome; populate from authorised Keeper characters, securely handle portraits; allow repeats/overflow rather than truncate; A4 first and US Letter later.
- Edition-appropriate reference page for conditions/exhaustion; original concise text based on **properly attributed, licensed SRDs**.
- Clearer spells and slots: active/prepared before browsing; known vs prepared vs spellbook correctness.
- **Spell loadout presets:** named player sets, optional Rook offence/defence/healing/balanced suggestions and context-appropriate rest/level-up prompts, respecting legal swap counts.
- **Level-up hex progression wheel:** each wedge explains a feature/choice; contextual central confirmation; HP fixed, themed software roll or manually entered physical roll; completed wedges change cool→warm and successful save triggers the celebration.

**Gate:** character updates remain reversible/consistent; on-paper and tablet forms usable; all editions and representative classes pass rules checks.

Issues: [#906](https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/issues/906), [#497](https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/issues/497), [#907](https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/issues/907), [#908](https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/issues/908).

## Stage 2 — GM workflow and live-table excellence

**Purpose:** Less screen-juggling for a GM; reliable handoff from preparation to play.

Deliverables:
- Saved encounter starts alert the player display, opens its linked saved map (or clearly selected grass/sand/dirt/stone/cobbles fallback), populates enemies and initiative, and opens a joined combat+map view.
- Unified monster/character combat state, live HP and conditions, clear outcomes and session review.
- Campaign workbook and guided imports for NPCs, locations, quest lines, factions, calendar settings and history; safe preview/rollback and non-destructive merges.
- Libraries for characters, NPCs, spells, items, maps, campaigns and approved reusable templates.
- Secure, readable player handout/reveal centre with no leaked GM-only notes.

**Gate:** Prep→Live Play end-to-end flow passes; imported campaigns are private and resilient.

## Stage 3 — Helpful, trustable Rook assistance

**Purpose:** Rook is an assistant, not an invisible rules authority.

Deliverables:
- Beginner explanations for skills, spells, class resources and level-up benefits, optionally with short humorous comments.
- Class/edition-valid spell suggestions and future opt-in favourite/playstyle-based loadouts; manual review before apply.
- Campaign-aware drafting: proposed NPCs, adventure hooks, encounter suggestions and worksheet completion, all labelled as suggestions.
- User controls for data sharing, suggestion history, opt-in playstyle statistics and clear outputs/cost awareness.
- No default access to another player's characters or unpublished GM secrets.

**Gate:** privacy, rules validator, transparency and refusal/undo paths thoroughly tested.

Issues: [#907](https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/issues/907), [#908](https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/issues/908).

## Stage 4 — Personalisation and Dice Vault (free-first)

**Purpose:** Distinctive fun without charging for each physical-equivalent die.

Deliverables:
- Finish accurate, legible and attractive standard 3D dice across devices and reduced-motion/low-power fallbacks.
- Growing catalogue of original **cosmetic** dice styles, previews and chosen set saved to the user profile.
- Character themes, borders, portrait frames and alternate printable sheet skins; always preserve usability.
- A free default collection; cosmetics must never alter roll probability or essential dice access.
- Clear rights and asset provenance for any theme or collaboration.

**Gate:** stable dice engine and accessible fallbacks; account ownership tests. Track [#905](https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/issues/905), existing #890/#895/#899.

## Stage 5 — Optional membership with included drops (commercial exploration only)

**Purpose:** Fair pricing with ongoing value rather than hundreds of tiny purchases.

**Owner direction:** Offer optional **monthly and annual** membership in the future. Newly released eligible dice skins, visual sets and small bonuses arrive **included in membership, with no extra per-item fee**. A transparent content drop rhythm (potentially monthly) can be explored, but there is **no committed delivery cadence, price, tier count, launch date or billing feature today**.

Potential inclusions:
- Included new dice styles/collections, optional cosmetic themes, frames and accessible additional printable layouts.
- Occasional small curated adventures/templates or original add-ons **only with rights/licences cleared**.
- Consolidated member library with one install/activate action, no repeated checkout per item.
- Same plainly described entitlements for monthly and annual subscribers; annual pricing/discount TBD.

**Never:** monetize required dice, character saving, accurate roll results, account security, essential accessibility or rules-correct basic gameplay. Avoid loot boxes, paid random unlocks, artificial urgency and pay-to-win. Existing free users must retain a complete playable experience.

**Pre-launch gate:** owner approval after cost forecasting, content production capacity, clear cancellations/refunds, UK consumer and privacy review, secure billing, tax, creators' rights, subscription terms and entitlement design. Membership is not active now.

Issue: [#909 membership plan](https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/issues/909).

## Stage 6 — Rookie ecosystem: Keeper + Worlds + Forge

**Purpose:** Create original content in one place and bring it into play without complicated imports.

Deliverables:
- **Rookie Quest Worlds:** professional campaign-setting books, adventures, printable/downloadable PDFs and authorised import bundles; Tiacarta is an example creator-owned project, **not generic seed data for new accounts**.
- **Rookie Quest Forge:** usable compatible terrain maps and modular/3D-print files; clear rights, print settings, layout metadata and storage.
- Cross-product imports and libraries with versioned packages, licence information, author credit, opt-in installation and rollback.
- Original reusable adventure templates and setting tools that work offline/online where appropriate.

**Gate:** safe account isolation, versioning/import rollback and source-content ownership.

## Stage 7 — Original Rookie Quest rules system and creator collaborations

**Purpose:** Evolve into a creator-friendly tabletop ecosystem, especially for an eventual original RPG with its own licensed terms.

Deliverables:
- Design and playtest original Rookie Quest mechanics independently from 2014/2024 D&D sheets and datasets.
- Document a distinct rules engine, builder, printable sheet, dice and encounter support.
- Optional **publish a quest/adventure** flow: private by default, explicit public submission, author credit, appropriate licence, moderation, download/install, versioning, reporting/takedowns.
- Curated guest adventures and collaborations; possible creator marketplace/revenue share **only after separate owner, rights, safety and payment approval**.
- Authors never accidentally share private campaigns, GM secrets or account data. No auto-publishing of Tiacarta or another user's work.

**Gate:** playable original system, creator licensing/contracts, safety/moderation/reporting, distribution and entitlement security. Track [#910 creator collaborations](https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/issues/910).

## Delivery rules across all stages

- Each candidate: **Idea → Spec → Owner approval → Scoped development issue → Tests and preview → Release → Post-release review**.
- Avoid bundling unrelated redesigns, monetisation and privacy fixes in one PR.
- Separate **currently live**, **prototype**, **in development** and **idea** labels in announcements.
- Track tests on actual representative PCs, UK mobile/tablet layouts, GM sessions and account boundaries.
- For D&D-compatible content publishing, check original SRD 5.1/5.2.1 terms, CC-BY-4.0 attribution, and artwork/text rights; **D&D Beyond Basic Rules are not the reuse licence**. Official guide: https://www.dndbeyond.com/srd and https://www.dndbeyond.com/creator-faq. Seek review before commercial release.
- Reserve pricing, names/tier boundaries, public uploads, collaboration terms and release dates for explicit decisions.
- Do not let a wishlist issue trigger an automatic implementation deployment.

## Roadmap tracking

| Workstream | Tracker | Status |
| --- | --- | --- |
| Reliability, privacy and safe live play | #238, #439 | Current priority; verify current main |
| Editable / exportable character PDF | #906 | V5 PDF prototype made; site integration pending |
| Spell presets and Rook assistance | #907 | Future |
| Level-up progression wheel | #908 | Future |
| Dice Vault and cosmetic content | #905 | Future |
| Membership with included drops | #909 | Future commercial research |
| Community creator collaborations | #910 | Future original-system / moderated publishing |

This document describes the destination, not a fixed schedule. Revisit stage priority after each verified release.
