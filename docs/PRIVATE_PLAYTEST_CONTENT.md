# Private Playtest Content Packs

Rookie Quest Keeper can support short-term playtesting with user-owned content without committing protected book text into the repository.

## Purpose

Use private playtest packs when a GM needs to test classes, subclasses, creatures, spells, items, or other records for a campaign. Packs are stored as private user/campaign data and can be deleted after testing.

## Supported sections

A pack can include these top-level arrays inside `content`:

- `races`
- `species`
- `classes`
- `subclasses`
- `backgrounds`
- `feats`
- `features`
- `spells`
- `creatures`
- `items`
- `conditions`
- `rules_references`

## Example shape

```json
{
  "pack_name": "Friday Playtest Pack",
  "description": "Private testing content for this campaign only.",
  "edition": "2024",
  "campaign_id": "optional-campaign-id",
  "replace_existing": false,
  "content": {
    "classes": [
      {
        "name": "Example Class",
        "hit_die": "d8",
        "features": [{ "level": 1, "name": "Example Feature", "description": "Private/original summary." }]
      }
    ],
    "subclasses": [
      {
        "name": "Example Path",
        "parent_class": "Example Class",
        "subclass_level": 3,
        "features": []
      }
    ],
    "creatures": [
      {
        "name": "Example Creature",
        "armor_class": 13,
        "hit_points": 18,
        "actions": [{ "name": "Strike", "description": "Private/original summary." }]
      }
    ]
  }
}
```

## API endpoints

- `POST /api/user/content/playtest-packs/validate` — validate without saving.
- `POST /api/user/content/playtest-packs/import` — validate and import.
- `GET /api/user/content/playtest-packs` — list packs.
- `GET /api/user/content/playtest-packs/summary` — count records by edition/type.
- `GET /api/user/content/playtest-packs/{pack_id}` — inspect a pack and records.
- `GET /api/user/content/playtest-content` — list imported private records, optionally filtered by `content_type`, `edition`, and `campaign_id`.
- `DELETE /api/user/content/playtest-packs/{pack_id}` — delete a pack and records.

## Safety rule

Do not commit protected publisher text into this repository. If a GM privately uploads content for playtesting, it remains user/campaign-owned data and should be deleted or replaced with SRD-safe/original wording before public use.


## GM dashboard workflow

Open a campaign, go to **Assets → Playtest Packs**, paste or upload a JSON pack, validate it, import it as campaign-scoped or reusable private content, then inspect or delete the pack after testing. Campaign-scoped lookups include reusable private packs where supported by the consuming tool.
