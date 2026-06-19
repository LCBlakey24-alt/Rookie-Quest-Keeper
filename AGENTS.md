# Agent working manual for Rookie Quest Keeper

This file is the operating manual for Codex or any coding agent working in this repository.

The goal is to make Rookie Quest Keeper launch-ready without breaking existing working flows. Prefer small, safe, reviewable changes over large rewrites.

## Product summary

Rookie Quest Keeper is a D&D-style character and campaign companion app.

Core user goals:

- Players can create characters through multiple routes.
- Players can open and use character sheets.
- GMs can manage campaigns and live play tools.
- The app should feel polished, clear, and beginner-friendly.
- The visual direction should be Rookie Quest charcoal/red/white, not blue/gold/purple.

The current launch-readiness push is focused on practical, safe improvements that users can see or that reduce launch risk.

## Most important instruction

Do not make risky, broad, or clever changes unless specifically asked.

Prefer this pattern:

1. Make one small change.
2. Build/test it.
3. Open one focused PR.
4. Merge only after CI passes.
5. Move to the next small change.

If a requested change touches a very large file, split the work into a refactor-only PR first, then a behaviour-change PR after that.

## Repository safety rules

### Branching

Never commit directly to `main`.

Always create a branch from latest `main` for every change.

Use descriptive branch names, for example:

```text
polish-premade-characters
polish-kids-mode
extract-full-builder-background-step
wire-full-builder-background-languages
add-launch-checklist
```

### Pull requests

Every PR should include:

- What changed.
- Why it changed.
- What was intentionally not changed.
- Build/test result.
- Manual checks to perform.

Prefer draft PRs for refactors or uncertain work.

### CI

Do not recommend merging until CI has passed.

If CI fails:

1. Inspect the failing job.
2. Fix only the failure.
3. Avoid unrelated cleanup.
4. Re-run or wait for CI again.

### Accidental files

Do not create placeholder/probe/test files in the repo.

If an accidental file is created, delete it immediately and mention the cleanup in the final note.

## Styling direction

Use the current Rookie Quest visual direction:

- Charcoal backgrounds.
- Red accents.
- White text.
- Muted grey secondary text.
- Sharp/minimal cards.
- Avoid over-rounded bubbly styling.
- Avoid old blue/gold/purple styling unless the page is intentionally using a legacy theme and the task is not about restyling.

Preferred feel:

- Clean.
- Professional.
- Slightly game-like.
- Not childish unless specifically working on Kids Mode.
- Clear and practical.

Avoid words like:

- Best mode.
- Recommended mode.
- Default path.

The character creation mode picker should inform users what each route does, not push them into one route.

## Current character creation route priority

The creation modes should be understood in this order:

1. Full Creation: complete control and detailed rules.
2. Basic Build: guided quick build with ROOK filling fiddly sheet details.
3. Premade Characters: ready-to-play templates.
4. Kids Mode: simplified wording and fewer rules.

Full Creation should feel like the main complete builder, even if Basic Build is faster.

## Known important routes

- `/characters/new`: character creation mode picker.
- `/characters/new/full`: Full Creation builder.
- `/characters/new/basic`: Basic Build.
- `/characters/new/premade`: Premade Characters.
- `/characters/new/kids`: Kids Mode.
- `/characters/:characterId`: character sheet.
- `/characters/:characterId/edit`: edit existing character through the Full Creation builder.

## Current architecture notes

### CharacterBuilder.js

`frontend/src/components/CharacterBuilder.js` is the main Full Creation builder.

It is very large and fragile. Do not rewrite the whole file unless absolutely unavoidable.

Important current facts:

- It contains many render-step functions inside one file.
- It is used for both new Full Creation and editing existing characters.
- It contains race, class, background, abilities, skills, spells, equipment, and review logic.
- It should be split gradually into smaller step components.

Do not do a broad refactor of `CharacterBuilder.js` in one PR.

### Existing helper work

These files already exist and should be reused rather than duplicated:

```text
frontend/src/data/languageChoiceUtils.js
frontend/src/data/languageFullBuilderHelpers.js
frontend/src/components/builder/LanguageChoicePicker.js
```

Use them for language-choice work.

### Character save behaviour

Important save/update behaviour:

- `PUT /api/characters/{id}` is strict full update.
- `PATCH /api/characters/{id}` is lenient partial update.
- Live sheet/builder partial saves should prefer PATCH.
- Full replacement edit flows can use PUT only if the payload is complete and already expected by the backend.

Do not casually change save endpoints.

## Immediate launch-readiness workstream

The current practical workstream is tracked by GitHub issue #238: Launch readiness sweep.

The goal is to make safe, visible, mergeable improvements from here.

Recommended order:

1. Polish Premade Characters page.
2. Polish Kids Mode page.
3. Improve obvious empty/loading/error states.
4. Add deployment/environment checklist docs.
5. Add small tests for helper functions.
6. Remove or hide QA/test-only UI from normal user flows.
7. Use a patch-capable local/Codex edit to split the Full Creation builder.

## Bigger refactor workstream

The Full Creation builder split is tracked by issue #236.

Goal:

Split `CharacterBuilder.js` into smaller step components.

Do this in small PRs.

Recommended component folder:

```text
frontend/src/components/builder/full/
```

Recommended extraction order:

```text
BackgroundStep.js
RaceStep.js
ClassStep.js
SkillsStep.js
SpellsStep.js
EquipmentStep.js
ReviewStep.js
```

### First Full Creation refactor PR

First PR should extract only the Background step.

Create:

```text
frontend/src/components/builder/full/BackgroundStep.js
```

Then update `CharacterBuilder.js` so the old background render function delegates to the new component.

This PR must be refactor-only.

Do not add background language picking in the same PR.

Suggested component usage:

```jsx
<BackgroundStep
  background={background}
  setBackground={setBackground}
  backgroundData={backgroundData}
  mergedBackgrounds={mergedBackgrounds}
  edition={edition}
  originFeat={originFeat}
  setOriginFeat={setOriginFeat}
  theme={theme}
  StepHeader={StepHeader}
  labelStyle={labelStyle}
  selectStyle={selectStyle}
  traitChipStyle={traitChipStyle}
/>
```

Adjust props only if the existing background code requires more.

Acceptance criteria:

- Existing background selection still works.
- Existing background summary/details still show.
- Existing 2024 Origin Feat selection still works.
- Existing validation is unchanged.
- New character Full Creation still opens.
- Edit character route still opens.
- Frontend build passes.

### Second Full Creation feature PR

After the Background step is extracted, wire background language choices.

Use:

```text
frontend/src/components/builder/LanguageChoicePicker.js
frontend/src/data/languageFullBuilderHelpers.js
frontend/src/data/languageChoiceUtils.js
```

Behaviour goal:

- If a background grants language choices, show a picker on the Background step.
- Require the correct number of selected background languages before continuing.
- Save selected background languages onto the final character language list.
- Do not save placeholder strings such as `One of choice` or `One additional language`.
- Do not break existing characters in edit mode.

Edit mode caution:

Existing characters may already have a flat language list. Be careful not to force users to re-select languages in edit mode unless the app can tell which languages came from the background.

## Premade Characters page polish

File:

```text
frontend/src/components/PremadeCharacterBuilder.js
```

This is a good safe launch-readiness PR because the file is small and route-specific.

Goals:

- Update old styling to charcoal/red/white.
- Add clearer page intro.
- Make it clear premades are ready-to-play templates.
- Keep API behaviour the same.
- Keep AI match behaviour the same.
- Improve loading and empty states.
- Disable match button if the description is empty or whitespace.
- Keep create-from-template behaviour unchanged.

Do not:

- Change backend endpoints.
- Change template payload structure unless required by a bug.
- Change AI matching endpoint.
- Add new template data in this PR.

Suggested manual checks:

- Open `/characters/new/premade`.
- Type a character name.
- Change edition.
- Confirm templates reload.
- Try AI match with a description.
- Create a character from a template.
- Confirm navigation to the character sheet.

## Kids Mode polish

File likely:

```text
frontend/src/components/KidsCharacterBuilder.js
```

Goals:

- Keep language simple and friendly.
- Keep design consistent with Rookie Quest.
- Do not make it too childish visually.
- Explain what the page creates.
- Keep creation flow reliable.
- Add clearer empty/loading states if needed.

Do not:

- Add complex rules.
- Make children choose detailed abilities/spells unless already part of the existing flow.
- Change backend endpoints unless required by a bug.

## Basic Build notes

File:

```text
frontend/src/components/BasicCharacterBuilder.js
```

Basic Build has recently been polished and language auto-fill has been added.

Do not reintroduce:

- Blue/gold styling.
- QA/test background fallbacks.
- `Recommended path` language.

Basic Build should be described as guided and quick, not as the best/default mode.

## Character creation mode picker notes

File:

```text
frontend/src/components/CharacterCreationModePicker.js
```

Current desired behaviour:

- Inform, do not steer.
- Full Creation appears first.
- Then Basic Build.
- Then Premade Characters.
- Then Kids Mode.
- No `best/default/recommended` framing.

## Docs/checklist work

Good docs to add:

```text
docs/LAUNCH_CHECKLIST.md
docs/DEPLOYMENT_ENVIRONMENT.md
docs/MANUAL_TEST_PLAN.md
```

### Launch checklist should include

- Auth/login works.
- Character creation modes open.
- Full Creation can save a character.
- Basic Build can save a character.
- Premade can save a character.
- Kids Mode can save a character.
- Character sheet opens after creation.
- Edit character opens.
- Campaign dashboard opens.
- Account settings opens.
- Account deletion flow is clear and safe.
- Mobile layout checked.
- Empty states checked.
- Production env variables checked.

### Deployment environment docs should include

- Frontend environment variables.
- Backend environment variables.
- API base URL expectations.
- Auth/token expectations.
- Database connection expectations.
- Email/provider expectations if used.
- Any admin/bootstrap expectations.

Do not invent secrets or real values. Use placeholder examples only.

## Testing guidance

Add tests where they are cheap and valuable.

Good test candidates:

- Language helper functions.
- Formatting helpers.
- Small utility functions.
- Sanitisation/draft helpers.

Avoid large brittle UI tests unless the component is already set up for them.

## PR size guide

Good PR:

- 1 to 3 files changed.
- Clear visible or risk-reduction purpose.
- Build passes.
- Easy to review.
- No unrelated cleanup.

Risky PR:

- Many files changed.
- Large component rewrite.
- Styling plus behaviour plus refactor mixed together.
- Backend endpoint changes plus frontend changes with no tests.
- Changes to `CharacterBuilder.js` plus unrelated pages.

## Copywriting guidance

Use plain, helpful language.

Good:

- `Choose how you want to build your hero.`
- `Pick the main choices while ROOK fills in the sheet details.`
- `Ready-made characters help you start quickly.`
- `You can edit this character later.`

Avoid:

- `Best mode`.
- `Recommended default`.
- Overly dramatic fantasy wording on utility screens.
- Overexplaining rules on beginner routes.

## Manual checks before merging any UI PR

At minimum:

- Page opens without console-breaking errors.
- Main action button works.
- Back/navigation works.
- Empty/loading state makes sense.
- Mobile width is not obviously broken.
- Text is readable on dark background.
- CI passes.

## How to handle uncertainty

If unsure, do not guess.

Either:

- inspect the current file,
- search for existing patterns,
- make a smaller PR,
- or leave a note in the PR description.

Do not make silent assumptions around character saving, authentication, or campaign permissions.

## Work not suitable for a quick PR

These should be planned and done carefully:

- Full `CharacterBuilder.js` rewrite.
- Auth model changes.
- Account deletion backend changes.
- Campaign permission changes.
- Payment/subscription functionality.
- Large visual redesign across the app.
- Backend schema migrations.

## Current open tracking issues

- #236 Refactor Full Creation builder into smaller step components.
- #238 Launch readiness sweep.

Follow those before inventing new long-running workstreams.

## Final guidance

Make the app more ready, not more complicated.

Every change should answer at least one of these:

- Does this make the app clearer for a real user?
- Does this reduce a launch risk?
- Does this make future safe editing easier?
- Does this remove confusing/test-only behaviour?

If not, do not do it yet.
