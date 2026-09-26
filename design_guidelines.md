# Rookie Quest Keeper — Design Guidelines

Rookie Quest Keeper uses one professional visual system across landing, auth, player, GM, character, live-play and utility routes.

## Canonical sources

Before making UI or UX changes, read:

1. `docs/DESIGN_SYSTEM.md` — authoritative product-wide visual, accessibility and responsive rules.
2. `docs/UI_DESIGN_SYSTEM.md` — compact palette and component reference.
3. `docs/SITE_VISUAL_REVIEW_GUIDE.md` — device sizes and route review checklist.

If an older comment, CSS fallback, screenshot, issue or document conflicts with those files, the canonical design system wins.

## Visual direction

The current Keeper identity is:

- deep navy structure
- warm cream text with primary / secondary / muted hierarchy
- antique gold brand and primary-action emphasis
- restrained blue information / icon / focus support
- semantic green / amber / red for success / warning / danger

Do not reintroduce:

- neon pink as the product accent
- danger red as normal decoration
- all-text-is-white hierarchy
- purple/sunset route themes
- parchment/brown route themes
- decorative gradients or glow-heavy chrome
- page-specific palettes that compete with the shared system

## Responsive contract

- Mobile: <= 719px
- Tablet: 720–1180px
- Desktop: >= 1181px

Desktop gets more space, not more features. Mobile and tablet remain full-capability product surfaces.

## Maintenance rule

Prefer consolidating shared tokens and retiring obsolete overrides over adding another global polish layer. Route CSS should consume the shared design tokens wherever practical.

_Last updated: September 26, 2026._
