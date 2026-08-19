# GM Quest + Live Play Model

## Core product rule

Rookie Quest Keeper must not require a GM to predefine what will happen in a specific session.

A session is only the period of time the group happens to be playing. Campaign content must remain available regardless of session length, player speed, skipped scenes, unexpected choices, or side quests.

The product should have two clear working states:

1. **Campaign Prep** — create, organise, link, and edit campaign content.
2. **Live Play** — quickly find, run, tick off, reveal, and lightly adjust prepared content while reacting to player choices.

There should be no required **Tonight's Session** layer between the two.

---

## Campaign Prep

The GM campaign page is the campaign library and planning workspace.

Primary areas should be easy to scan and should favour short titles/cards over large blocks of text.

### Core prep areas

- **Quests**
- **Encounters**
- **NPCs**
- **Locations / World**
- **Maps**
- **Handouts**
- **Loot / Rewards**
- **Notes / Timeline**
- **Players**
- **References / Settings** as secondary or collapsed tools

Campaign Prep may contain deep editing controls. Live Play should not expose the same density by default.

---

## Quests

Quests are reusable campaign objects, not sessions or chapters.

A quest should contain:

- Title
- Short GM summary
- Hook / how the party discovers it
- Status: draft, available, active, completed, failed, archived
- Objectives / beats as a checklist
- Optional objectives
- GM notes
- Linked NPCs
- Linked locations
- Linked encounters
- Linked maps
- Linked handouts
- Linked rewards / loot

Objectives should not force a single order unless the GM explicitly marks a dependency.

During Live Play the GM should be able to open a quest and quickly:

- tick an objective complete
- skip an objective
- add a quick note
- open a linked NPC/location/map/handout
- run a linked encounter
- edit a small amount of quest information without returning to full Prep

Completing one quest must never end Live Play. The GM can immediately open another quest or encounter.

---

## Encounters

A saved encounter is a **template / prepared blueprint**.

Starting an encounter in Live Play creates a **live combat instance** from that blueprint.

The live instance may be changed without automatically rewriting the saved template.

Before starting combat, Live Play should show a short participant review:

- campaign player characters
- planned allies
- planned enemies
- NPCs currently travelling with the party
- quick Add / Remove participant controls

The GM should be able to start immediately or make a small adjustment first.

After combat, changing the original saved encounter should be an explicit choice, not an automatic side effect.

---

## Live Play

Live Play is a focused runner, not another planner.

### Default Live Play screen

The default Run Screen should prioritise:

- Search campaign
- Pinned / recently used content
- Open quests
- Ready encounters
- Quick note
- Quick dice / rules access

### Primary live navigation

Keep the main navigation deliberately small:

- **Quests**
- **Encounters**
- **NPCs / Party**
- **Notes**
- **More** — maps, handouts, dice, rules/reference, player display

Desktop can use a compact rail. Mobile can use an equivalent bottom or compact navigation pattern.

The GM should normally be one or two actions away from any prepared quest or encounter.

---

## Focused quest, not planned session

Live Play may remember a **focused quest** for convenience, but this is not a session plan and must never lock the GM into that quest.

Multiple quests can remain active at once.

The GM can switch the focused quest at any time, open an unrelated encounter, or ignore quests entirely.

Recent and pinned content should make switching fast.

---

## Live notes and campaign-impact suggestions

Live notes should help the app react to unexpected player decisions without silently changing prepared content.

Existing deterministic note sync can continue to detect high-confidence named entities and campaign-state changes, but the preferred UX is **preview / suggest / confirm** before changing linked prep.

### Example

Prepared quest: **Recruit Jordan Crow**

Linked encounter: **Broken Wall Ambush**

The encounter was originally prepared for the four player characters.

During play the GM records:

> Jordan Crow agrees to travel with the party and help them at the Broken Wall.

Rookie Quest Keeper should recognise Jordan Crow and the linked upcoming encounter and offer a compact suggestion such as:

**Jordan Crow is now travelling with the party. Add him to Broken Wall Ambush?**

- Add
- Not this time
- Review encounter

If several linked upcoming encounters are affected, allow:

- Add to all linked encounters
- Choose encounters
- Ignore

The app must not silently add an NPC to prepared combat.

The same model can later support:

- NPC leaves the party
- NPC dies
- NPC changes location
- quest objective appears completed
- discovered clue affects a handout or quest
- loot/reward state changes

High-risk or ambiguous changes should always require GM confirmation.

---

## Temporary party companions

NPCs should be able to have a lightweight live campaign state such as **Travelling with party**.

This state is useful beyond one encounter.

When a saved encounter starts, the participant review can automatically surface current companions as suggestions even when the original encounter template was created earlier.

This gives the GM a simple manual fallback if note interpretation misses something: open the NPC and toggle **With Party**.

---

## Linked completion prompts

Links should reduce admin rather than dictate play.

Examples:

- Finish a linked combat -> optionally prompt **Mark “Defeat the gate guards” complete?**
- Tick a quest objective containing an encounter -> surface **Run encounter**
- Reveal a linked handout -> optionally mark its quest beat reached

These are prompts, not forced state transitions.

---

## Live editing rule

Live Play should support small tactical edits:

- tick/skip quest objective
- edit a short GM note
- add/remove encounter participant
- adjust encounter HP/initiative setup
- toggle NPC with-party status
- reveal handout
- add loot

Large structural editing remains in Campaign Prep.

This keeps Live Play fast and uncluttered without forcing the GM to leave the table workflow whenever players improvise.

---

## Implementation order

### Phase 1 — Saturday-useful core

1. Remove Tonight's Session from normal GM navigation.
2. Add a first-class Quests planner.
3. Add Quests to Live Play.
4. Make linked encounters runnable directly from a quest.
5. Allow quest objectives to be ticked/skipped in Live Play.
6. Keep all saved encounters directly accessible even when not linked to a quest.
7. Simplify Live Play navigation around Quests, Encounters, NPCs/Party, Notes, and More.

### Phase 2 — reactive table state

1. Add NPC **Travelling with party** state.
2. Add participant review before launching a saved encounter.
3. Surface travelling companions as encounter suggestions.
4. Convert note world-sync changes to preview/confirm where they alter campaign state.
5. Add note-to-linked-encounter impact suggestions.

### Phase 3 — richer linking

1. Quest-linked handouts, maps, rewards, and locations.
2. Completion prompts between linked objects.
3. Better campaign-wide search and recent/pinned objects.
4. Optional smarter note interpretation while preserving GM confirmation.

---

## Product test

At the table, a GM should be able to do this without opening Campaign Prep:

1. Open Live Play.
2. Open any active/available quest.
3. Tick completed objectives.
4. Run its linked encounter.
5. Adjust the encounter because the party brought an unexpected NPC ally.
6. Save a note about the consequence.
7. Open another quest or encounter immediately.

There is no session boundary and no assumption about how much content the group will complete.
