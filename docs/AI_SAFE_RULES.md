# AI and Rules-Content Safety

Rookie Quest Keeper should help users run tabletop games without copying protected publisher text into the repository.

## Core rule

Use SRD-safe, public-domain-compatible, or original wording. Avoid pasting protected rulebook text, subclass text, spell descriptions, monster stat blocks, adventure text, or setting lore from commercial books.

## Rook AI scope

Rook remains an important text-based assistant for Rookie Quest Keeper.

Rook may help with:

- campaign-aware text suggestions
- session prep
- session recaps
- NPC ideas
- location descriptions
- item descriptions
- encounter ideas
- homebrew drafting
- rules-safe summaries
- note organisation
- lore expansion
- GM prompts and reminders
- player-facing text handouts where appropriate

Rook must not provide AI image generation.

Do not add features that generate images, portraits, tokens, maps, monster artwork, item artwork, scene backdrops, or visual assets using an AI image model. Manual image uploads are allowed. Text AI is allowed. AI image generation is not.

## Allowed content style

Safe examples:

- Original summaries written in our own words.
- Short mechanical labels such as class names, ability names, spell names, condition names, or action labels where allowed by the rules/data source being used.
- User-created homebrew.
- User-private notes stored in their own account.
- SRD-safe mechanics and references.
- Generic fantasy-d20 compatible guidance.

## Avoid committing

Do not commit:

- Full protected class/subclass feature text.
- Full commercial spell descriptions.
- Full monster stat blocks copied from books.
- Adventure boxed text.
- Publisher setting lore copied from books.
- Large quoted passages from copyrighted game books.

## AI feature behaviour

Text AI helpers should:

1. Prefer user-authored campaign notes and saved app data.
2. Respect the selected rules edition/context.
3. Produce original wording.
4. Avoid claiming exact official rules text unless it is from a safe source.
5. Clearly separate GM-authored lore from AI suggestions.
6. Avoid overwriting user lore automatically.
7. Stay focused on text, structure, prep, summaries, and campaign support.

## Character builder and progression data

The character builder may use safe progression summaries and app-specific helper labels, but it should not reproduce restricted class/subclass text. Where deeper rules are needed, store minimal structured data and let the user add private notes.

## Homebrew Workshop

Uploaded/pasted user content should be treated as private user data. The app can parse and reshape it into draft fields, but it should not publish that content globally unless the user explicitly chooses to share/export it.

## AI budget and usage controls

Text AI features should stay behind sensible budget and usage controls. If a text generation provider fails because of quota, the app should show a friendly partial-failure state rather than breaking the page.

AI image generation should not be added or enabled. Where a feature needs artwork, portraits, item images, maps, or backdrops, use manual upload support only.
