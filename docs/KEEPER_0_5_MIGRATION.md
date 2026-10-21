# Keeper 0.5.0 Windows migration and recovery validation

Status: prepared in a draft branch; **real Windows installation and migration
have not been accepted**. Do not replace the working Keeper or its OneDrive
folder on the strength of automated tests.

## More complete backups and copied-profile migration

The follow-up to #584 adds `browser-storage.json` to new installed-edition
backups. Its checksums cover supported local combat, uploaded asset records
(including inline media), custom soundboards, session/roll records, note and
character drafts, NPC relationships and safe display preferences. Values are
preserved as exact strings. Authentication tokens, credentials, unknown keys,
cookies, caches, Windows settings and session-only state are excluded.

Old 0.4.x exports remain readable and explicitly report that this supplement is
absent. Restoring such an export does not erase supplemental records already in
the target. To recover supported data missing from an old export:

1. Close the older Keeper. Copy its entire `RookieQuestKeeperData` folder into a
   separate local trial folder outside OneDrive. Leave the working original in
   place. Keep an untouched full copy for recovery.
2. In the new installed edition, open **Updates & backups → Move from earlier
   Keeper → Prepare backup from copied old data folder**. Select the closed
   copied `RookieQuestKeeperData` folder, then a separate folder for the export.
3. Keeper copies browser storage and imported pack media into isolated temporary
   storage, verifies those copied bytes, opens only that temporary browser
   profile with network and page scripts blocked, and exports the supported
   workspace and browser records. It checks the selected source again before
   finishing. The selected folder is never opened as an active Chromium profile.
4. Inspect the new backup's counts and supplemental-record summary. Preparing
   the backup does not import it. Choose **Import into this Keeper** only when
   ready, then compare records, maps and music using the checklist below.

The exporter cannot reconstruct unsaved memory/sessionStorage values or collect
external linked files. Unknown storage-key values are not read into the export.
Windows can retain temporary profile handles until Keeper closes; any retained
inspection copy stays under the app's private temporary location. It is never
the selected source or working OneDrive folder.

New restores create a durable recovery record referring to their verified
before-restore snapshot before activating media. A failed browser save attempts
to restore both prior media and supported browser records; unfinished recovery
runs through a blank local page before the real app starts. Newer autosaves
detected before commit stop the restore and retain the newer browser values.
Chromium flush requests do not acknowledge physical disk durability, so power
loss and real-device recovery remain acceptance checks.

## What the current backup includes

A Keeper exported backup contains `manifest.json`, `workspace.json`, any
locally imported files in `campaign-packs/`, and `browser-storage.json` when
captured by the new complete export. It is not a copy of the whole old
installation. Keep the entire exported folder together.

The workspace is the exact JSON value stored under `rqk.desktopWorkspace.v1`.
Migration passes those bytes through without generating new IDs, resetting
resources, normalising records, or dropping unknown fields. Supported workspace
records include campaigns and linked characters, current character HP/resources,
NPCs, custom creatures, saved encounters, homebrew, quests, notes, recaps,
calendars, map records, objects and import receipts. These records must actually
have been saved into that workspace before export.

Imported map, document and music files inside `campaign-packs/` are copied and
checked byte for byte. A checksum proves that a selected file is unchanged; it
does not prove that every file ever used by the old application was exported.
External URLs and files outside this folder are not downloaded or collected.

## Browser storage audit: information missing from the existing format

The code stores additional information outside the workspace. The existing
0.4.x export cannot include it. A matching campaign count does **not** establish
that these items migrated.

| Information | Storage used by the current code | Existing portable export |
| --- | --- | --- |
| Live battle checkpoint, initiative, map tokens and round | `gm.activeCombat.<campaignId>` in `CombatPageTable.js` | Not included; separately saved character resources and encounter templates remain in the workspace |
| Locally uploaded assets, including inline image/audio/document data and metadata | `rqk.gm.assets.<campaignId>` in `gm/UploadTab.js` | Not included unless separately present in workspace/imported pack files |
| Custom soundboard entries and audio links | `soundboard-custom-<campaignId>` in `gm/Soundboard.js` | Not included |
| Smart session logs | `smart-sessions-<campaignId>` in `gm/SmartSessionLog.js` | Not included |
| Custom local roll tables | `rqk.liveRollTables.<campaignId>` in `gm/LiveRollTablesPanel.js` | Not included |
| Staged combat creatures | `rqk.combat.stagedCreatures.<campaignId>` in `lib/combatStaging.js` | Not included |
| Roll history/statistics | `rqk.rollStats.session.*`, `rqk.rollStats.allTime.*`, `rqk.rollStats.archive.*` in `lib/sessionRollStats.js` | Not included |
| Audience display state | `rqk.liveDisplay.<campaignId>` in `lib/liveDisplayBus.js` | Not included; workspace player-display objects are a separate record |
| Unsaved character note drafts and builder drafts | `rqk.character-notes-draft:*`, `rqk.full_character_creator_v2.safe`, `rq_character_builder_draft_v2` | Not included; saved character fields are included |
| Prototype GM notes and Friday-runner progress | `rq.prototype.tia-karta.gm-notes`, `rqk.tiaKarta.fridayRunner.*` | Not included |
| Theme, search/sort, display target, recent tools and onboarding preferences | Separate localStorage keys in the corresponding components | Not included |
| Chromium profile, cookies, login tokens, session storage, caches, IndexedDB and window/profile settings | Old `RookieQuestKeeperData` and its `session-data` subtree | Not included |

This is a source-code audit, not an inspection of the owner's private data.
Older deployed builds may use additional keys. Determine which omitted features
are in use during the Windows trial. The new copied-profile procedure captures
the explicitly supported localStorage records. Any remaining required state
still needs a reviewed recovery procedure. Do not copy arbitrary browser-storage keys into an
export: profiles can contain passwords, tokens and other private information.
Do not upload a profile or campaign backup to a public pull request or artifact.

Future installed updates keep the same application data identity, so ordinary
settings should remain on disk. The new automatic before-update snapshot
covers the workspace, `campaign-packs/` and supported supplemental records;
it is not a complete profile image.
A full profile recovery claim still requires additional implementation and
Windows validation.

If the saved desktop workspace is malformed or browser storage is unreadable,
Keeper blocks API reads/edits with a recovery error instead of creating an empty
replacement. Stale writes after another window changes the saved workspace are
also refused. Ordinary restore still requires a valid current workspace for its
safety snapshot; an unreadable current workspace needs assisted recovery from a
closed copy of the entire data folder. Preserve that folder and a verified
export, then request recovery help. Clearing application data is not a repair.

## Disposable-copy trial on Windows

The following is the validation procedure for an operator with access to the
laptop. No step has been performed against the owner's working data here.

1. Close both Keeper editions and allow OneDrive to finish syncing. Make the
   original launcher and entire `RookieQuestKeeperData` available offline.
2. Copy the old launcher and the **whole** data folder together into a new local
   validation folder outside OneDrive. Keep one closed, untouched copy as the
   full-profile recovery baseline. Make a second disposable copy for the trial.
   Do not move, rename, edit or delete the working OneDrive files.
3. Launch the old Keeper from the disposable folder. Verify it uses that copy
   and contains the expected campaigns. Save outstanding edits, finish or record
   any active combat, and export a fresh backup to a separate test folder using
   **Updates & backups → Export backup to USB / folder**. A USB drive is optional.
4. On a disposable Windows account or test PC, install the reviewed signed
   0.5.0 installer. Check its publisher, installation wizard, shortcuts and
   no-account offline launch. Do not point it at the old data directory.
5. In installed Keeper choose **Updates & backups → Move from earlier Keeper →
   Choose and inspect earlier backup**. Select the exported dated folder.
   Review its date, counts and omissions. Unchecked, damaged, missing-file or
   changed backups must be refused without changing the installed workspace.
6. Choose **Import into this Keeper** only after reviewing the preview. The
   final import rechecks the full selected payload, saves a before-restore
   snapshot of the installed workspace, stages and verifies media, and then
   activates it. Existing media files absent from the import are retained.
7. Compare the source and target items below, then close Keeper, disconnect
   the internet, restart Windows, reopen from the new shortcut and compare again.
8. Exercise recovery and an approved signed update using only the disposable
   data. Keep the old working edition and the closed full-profile copy until
   all supported records, important omitted state and actual media playback have
   been accounted for. Passing counts or startup alone is insufficient.

The new installed edition must remain separate from the old working portable
copy throughout the trial. Do not copy a live Chromium profile over the new
installation, and do not run two Keeper copies against the same data folder.

## Compare before and after

Record the old and new values in a private validation report, not in GitHub.

- Campaign and character IDs, campaign links, exact names and saved settings.
- Current/max/temp HP; spell slots, charges, uses and other current resources;
  inventory quantities and saved character notes.
- NPCs, custom bestiary entries, stat/provenance fields and private GM notes.
- Encounter templates, saved combat objects, quest completion and calendar date.
- World/local maps, reveal state, notes, homebrew, recaps and import receipts.
- Every imported media file's checksum, plus opening maps/documents and playing
  music offline. Separately compare uploaded assets and custom soundboard lists
  against the audit above; they may be outside the exported format.
- All browser-only state important to the owner. A missing live combat checkpoint
  or local upload is an unresolved migration issue even when workspace JSON is
  identical.
- Original working installation and the selected exported backup remain intact.

The synthetic desktop tests compare the entire raw workspace, including unknown
fields, with rich HP/resource, encounter, NPC, calendar, note and binary-media
fixtures. They also cover corrupt media, changed approved payloads, interrupted
staging, activation file locks and recovery between directory renames. They do
not simulate every Windows process crash, OneDrive conflict or renderer storage
failure.

## Recovery behaviour and limits

Before import or restore, Keeper creates a verified **before-restore** snapshot
of the target workspace and its imported media. A copy/verification error leaves
active media untouched. An activation rename failure attempts to put the old
media directory back. If Keeper stops between those two renames, the next startup
restores the retained old directory when no active media tree exists.

When a valid pending restore journal exists, Keeper recovers its referenced
safety snapshot before the app starts. If a newer autosave caused the restore to
stop, the journal preserves those newer browser values and recovers only media.
Without that journal, an existing active media tree is not replaced by guessing
which leftover directory was intended. An
operator can inspect it against the before-restore snapshot. Multiple retained
directories with no active tree require review instead of silently picking one.

After media activation, the main process waits for the main Keeper window to
acknowledge its workspace save, then requests a Chromium storage flush.
Electron's flush API does not acknowledge disk durability. If the save fails (for example, browser quota
is exceeded), Keeper attempts to restore the prior media from the before-restore
snapshot and reports the failure. A failed flush also attempts to restore the
previous browser value. The renderer reloads only after successful completion.

Filesystem and browser storage still cannot form one atomic transaction in the
present design. A process crash after media activation, or a failed rollback,
can leave the previous workspace with imported media. The retained snapshot is
the recovery source; this failure path still needs real Windows validation.
The old portable installation is unaffected. Do not continue editing the failed
target import; use **Updates & backups → Restore** on its before-restore snapshot,
or have Codex recover the disposable target from that snapshot. Preserve the
export and full-profile baseline while investigating. Do not clear browser data
or delete the target's data directory as a troubleshooting step.

A signed installer, successful frontend mount and backup existence are not proof
that a failed installed application can automatically roll back. Reinstalling a
previous reviewed signed installer while retaining app data, restoring the
before-update workspace/media snapshot, and validating profile compatibility
must all be tested on Windows before release. No production installer or signing
key is created by these migration tests.
