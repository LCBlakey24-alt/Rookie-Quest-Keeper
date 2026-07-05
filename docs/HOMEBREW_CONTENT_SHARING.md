# Homebrew Content Sharing Model

Rookie Quest Keeper can support user-provided subclasses, monsters, spells, feats, items, and other homebrew without shipping non-public rules text in the app itself.

The guiding rule is:

> Built-in app content must be public-license safe. User-provided content belongs to the user or the campaign they share it with.

This document describes the preferred sharing model for private, friend-to-friend homebrew sharing without creating a public marketplace.

## Goals

- Let users create or upload their own homebrew content.
- Let users use that content in character builders, character sheets, campaigns, and encounters.
- Let users share homebrew privately with friends or campaign members.
- Let recipients save their own copy so the content remains available in their account.
- Avoid publishing user-uploaded official/non-public material as app-provided global content.
- Preserve attribution, ownership, and audit metadata for every shared item.

## Non-goals for the first version

- No public marketplace.
- No public searchable homebrew directory.
- No app-curated official non-public subclasses or monsters.
- No automatic acceptance of parsed Word/PDF imports without user review.
- No global redistribution of private uploads by default.

## Content visibility scopes

Every homebrew record should have a visibility scope.

| Scope | Who can use it? | Typical use |
| --- | --- | --- |
| `private` | Creator only | Personal subclass, monster, spell, or item. |
| `campaign` | Members of one campaign | GM-approved campaign rules and monsters. |
| `shared_copy` | A specific recipient who accepted a share | Friend-to-friend sharing where the recipient keeps their own copy. |
| `public` | Everyone | Future-only, original/licensed content with moderation. |

The important distinction is that `shared_copy` is not a public marketplace entry. It is a private copy accepted by a specific account.

## Recommended sharing flow

1. A user creates or imports homebrew content into their private library.
2. The user clicks **Share**.
3. They choose one of these private share targets:
   - a friend account,
   - a campaign,
   - or a private invite link.
4. The recipient sees a preview before accepting.
5. If accepted, Rookie Quest Keeper creates a copy in the recipient's account or enables it for the campaign.
6. The recipient can use that copy in builders and sheets like normal selectable content.
7. The copied record keeps provenance metadata pointing back to the original share.

## Ownership and provenance fields

Homebrew content should store enough metadata to explain where it came from and who can access it.

Recommended fields:

```json
{
  "id": "homebrew-subclass-abc123",
  "contentType": "subclass",
  "name": "User Provided Fighter Subclass",
  "baseClass": "Fighter",
  "ruleset": "2024",
  "visibility": "private",
  "sourceType": "user_homebrew",
  "license": "user_provided_private_use",
  "createdByUserId": "user_1",
  "ownerUserId": "user_1",
  "originContentId": null,
  "sharedFromUserId": null,
  "sharePolicy": {
    "allowPrivateShare": true,
    "allowCampaignUse": true,
    "allowPublicListing": false
  }
}
```

When a recipient accepts a private share, create a new record:

```json
{
  "id": "homebrew-subclass-copy-xyz789",
  "contentType": "subclass",
  "name": "User Provided Fighter Subclass",
  "visibility": "shared_copy",
  "sourceType": "user_homebrew",
  "license": "user_provided_private_use",
  "createdByUserId": "user_1",
  "ownerUserId": "user_2",
  "originContentId": "homebrew-subclass-abc123",
  "sharedFromUserId": "user_1"
}
```

This keeps the recipient's copy usable even if the original creator later edits or deletes their private version, unless we intentionally add a synced-share mode later.

## Sharing modes

### Copy share

The recipient gets an independent copy.

This should be the default because it is simple and predictable.

Pros:

- Recipient keeps the content after accepting.
- Creator edits do not unexpectedly change another table's rules.
- Easier to audit and roll back.

Cons:

- Updates require re-sharing or manual update prompts.

### Campaign share

The creator or GM enables content for one campaign.

Pros:

- Best for a table using one GM-approved rules package.
- Players can choose the subclass/spell/monster while in that campaign.
- The GM can disable it later.

Cons:

- Players may lose access outside that campaign unless they also save a copy.

### Synced share

The recipient uses the creator's live version.

This should not be first-version behavior. It adds permissions, versioning, and trust complexity.

## Builder and sheet behavior

Once accepted, private homebrew should be indexed alongside built-in public content.

Example Fighter subclass picker order:

1. Built-in public-license subclasses.
2. User-owned homebrew subclasses for Fighter.
3. Campaign-enabled Fighter subclasses.
4. Accepted shared copies.
5. A generic custom/manual option if no structured homebrew exists.

The sheet should render structured homebrew features if the record includes feature data. If the record only has a name, the sheet should still show the subclass name and a custom-content notice.

## Safety checks before accepting shared content

Before a recipient accepts a private share, show:

- Content name and type.
- Creator display name.
- Visibility after accepting.
- A short statement that the content was user-provided and not official app-provided content.
- A warning that the recipient is responsible for using content they have rights to use.

## Import strategy

Use this order:

1. Structured form builder.
2. Downloadable/uploadable JSON template.
3. Document or text import assistant that drafts structured fields for review.

Word/PDF parsing should be an assistant, not the source of truth. The saved content should always end as structured data.

## Why this protects the app

- Rookie Quest Keeper ships only public-license built-in content.
- Non-public or personal content is supplied by users, scoped privately, and not listed publicly by the app.
- Sharing is account-to-account or campaign-to-campaign, with metadata showing who uploaded it and who accepted it.
- The app treats homebrew as user data, not as app-distributed rules content.

## First implementation slice

A safe first PR should add only the data contract and local helper behavior:

- Define homebrew content schemas.
- Add helper functions for filtering content by type, class, ruleset, owner, and campaign.
- Merge homebrew subclass options into class subclass pickers.
- Keep persistence mocked or behind existing account/campaign storage until the backend endpoints are planned.

Do not build a public marketplace in the first version.
