# Manual Test Plan

Use this checklist before merging user-facing UI changes, launch-readiness fixes, or character creation work.

This is intentionally practical rather than perfect. The aim is to catch broken flows, confusing copy, missing states, and mobile layout problems before a change reaches `main`.

## When to run it

Run the relevant sections when a PR changes:

- Character creation routes.
- Character sheets or editing.
- Campaign or GM tools.
- Account/settings flows.
- Shared styling, layout, navigation, or app shell code.
- Empty, loading, or error states.
- Deployment, environment, or launch-readiness docs.

For docs-only PRs, read the changed document and confirm links, routes, filenames, and instructions are still accurate.

## General smoke check

- Open the app without console-breaking errors.
- Confirm the main dashboard/home route still loads.
- Confirm primary navigation works forward and backward.
- Confirm protected pages still redirect or block correctly when signed out.
- Confirm visible text is readable on the charcoal/red/white Rookie Quest theme.
- Confirm buttons, inputs, and cards are usable at mobile width.
- Confirm no obvious blue/gold/purple legacy styling has returned unless the page is intentionally legacy.
- Confirm no QA/test-only labels, dummy data, or development-only controls are visible to normal users.

## Character creation routes

### Mode picker: `/characters/new`

- Open the mode picker.
- Confirm the mode order is Full Creation, Basic Build, Premade Characters, Kids Mode.
- Confirm the page explains choices without calling one route best, default, or recommended.
- Click each mode card and confirm the route opens.
- Return to the mode picker from each route where a back button exists.
- Check mobile layout stacks cleanly and remains readable.

### Full Creation: `/characters/new/full`

- Open Full Creation for a new character.
- Confirm each major step opens without crashing.
- Choose a species/race, class, background, ability method, skills, spells if relevant, equipment, and review details.
- Confirm required selections block progress only when they should.
- Save a valid character.
- Confirm the app navigates to the saved character sheet.
- Open `/characters/:characterId/edit` for that character.
- Confirm the edit flow opens with existing data still present.

### Basic Build: `/characters/new/basic`

- Open Basic Build.
- Type a character name.
- Change edition.
- Change level.
- Change class, species, and background.
- Confirm the starter preview updates.
- Confirm auto-filled languages are concrete language names, not placeholder text such as `One of choice`.
- Pick the required class skills.
- Save the character.
- Confirm the character sheet opens and looks usable.

### Premade Characters: `/characters/new/premade`

- Open Premade Characters.
- Confirm loading and empty states make sense.
- Type a character name.
- Change edition and confirm templates reload or remain sensible.
- Try AI match with an empty or whitespace-only description and confirm the action is blocked or clearly disabled.
- Try AI match with a useful description.
- Create a character from a template.
- Confirm navigation to the created character sheet.

### Kids Mode: `/characters/new/kids`

- Open Kids Mode.
- Confirm the wording is simple, friendly, and not rules-heavy.
- Confirm the design still feels like Rookie Quest, not a separate toy app.
- Complete the flow using the simplest valid choices.
- Save the character.
- Confirm the character sheet opens and remains understandable.

## Character sheet and editing

- Open a recently created character sheet.
- Confirm name, class, level, species/race, background, ability scores, skills, HP, languages, and equipment display sensibly.
- Confirm edit navigation opens the edit route.
- Make a small safe edit and save.
- Confirm the sheet updates without losing unrelated character data.
- Confirm live/partial saves use safe behaviour where expected and do not wipe fields.

## Campaign and GM tools

- Open the campaign dashboard.
- Confirm empty states are clear when there are no campaigns.
- Open an existing campaign if available.
- Confirm player/member lists, campaign details, and live play tools do not crash.
- Confirm create/join flows give clear errors for missing or invalid inputs.
- Confirm GM-only actions are not shown to normal players unless intended.

## Account and settings

- Open account/settings.
- Confirm profile/account details load.
- Confirm logout still works.
- Confirm account deletion wording is clear, cautious, and not easy to trigger by accident.
- Confirm destructive actions require a deliberate confirmation step.

## Empty, loading, and error states

For any changed page:

- Confirm loading state appears while data is being fetched.
- Confirm empty state tells the user what to do next.
- Confirm error state uses plain language and does not expose technical noise.
- Confirm retry/back actions work where provided.
- Confirm disabled buttons look disabled and explain what is missing when needed.

## Mobile checks

At a narrow mobile width:

- Confirm no horizontal scrolling is needed for normal content.
- Confirm cards stack cleanly.
- Confirm buttons remain large enough to tap.
- Confirm forms do not overflow.
- Confirm sticky or fixed elements do not cover important controls.
- Confirm long names/descriptions wrap without breaking layout.

## PR sign-off template

Paste this into PR descriptions when relevant:

```md
## Manual checks
- [ ] Route opens without console-breaking errors.
- [ ] Main action still works.
- [ ] Back/navigation still works.
- [ ] Empty/loading/error states make sense.
- [ ] Mobile width checked.
- [ ] Text is readable on the Rookie Quest theme.
- [ ] No QA/test-only UI exposed.

## Build/test
- [ ] Frontend build/test run, or docs-only/not run reason written clearly.
```

## Notes for preview deployments

If the Vercel preview is unavailable because the free deployment limit has been hit, do not treat that as proof the PR is safe. Use local checks or wait for a preview before merging user-facing app changes. Docs-only changes can be reviewed directly in GitHub.
