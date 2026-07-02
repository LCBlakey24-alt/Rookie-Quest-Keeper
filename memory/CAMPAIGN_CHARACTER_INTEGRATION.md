# Campaign Character Integration

## Current finding

The campaign dashboard already has a Players tab and campaign invite flow, but the Players tab still contains an older built-in player/character creator style flow. That risks creating a second kind of character data separate from the main saved character sheet system.

## Direction

Campaigns should link to real saved character sheets rather than creating separate campaign-only character records.

Preferred flow:

1. Player creates or owns a normal character sheet.
2. Player joins a campaign through invite/join code.
3. Player links one of their saved characters to that campaign.
4. GM sees a party summary in the campaign Players tab.
5. GM can open linked sheets, inspect HP/AC/class/spells/inventory, and use those records in live session/combat tools.

## First bridge added

The bridge helper lives at:

- `frontend/src/data/campaignCharacterBridge.js`

It normalises campaign player records and saved character records into one party summary shape.

It supports:

- linked/unlinked character detection
- player display names
- character display names
- class/subclass/level/race summary
- HP, temporary HP, AC, speed, initiative, passive perception
- spellcaster detection from saved spell data
- party totals for GM summaries
- party search by character, player, class, subclass, or race
- link payload generation for future API calls

Tests live at:

- `frontend/src/data/campaignCharacterBridge.test.js`

The campaign bridge test is included in:

```bash
cd frontend
yarn test:character-audit
```

## Next implementation step

Add a new campaign Party Summary component that uses the bridge helper. Then wire it into the existing Players tab above the old player list before replacing the older creator-style player flow.

Recommended UI blocks:

- Party totals: total players, linked sheets, unlinked players, spellcasters, party HP, average level.
- Search/filter party members.
- Character cards showing player name, character name, class, level, HP, AC, spells marker.
- Open Sheet button for linked characters.
- Link Character button for unlinked players once the backend endpoint exists.

## Avoid

Do not make campaigns create a separate full character object unless it is being saved through the same character sheet model used by `/characters/:characterId`.
