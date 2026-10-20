# Keeper 0.5.0 Windows release preparation audit — 20 October 2026

Status: **draft development; do not replace the working Windows installation**.
No release has been published, no signing key generated or replaced, and no
owner campaign, OneDrive folder or existing Windows installation accessed.

## Development base and existing results

The new work starts at #583 head `a9650defdb5769c071a0f83b15a1443723e0fd61`,
not main. Local git ancestry confirms that every development head below through
#582 is an ancestor. Main is an ancestor too, 76 commits behind #583. All listed
pull requests were open drafts when audited; #583 had no reviews or inline
review threads. Existing green CI is evidence for its specific code, not an
approval to release.

| PR | Purpose | Head checked | Successful Windows CI |
| --- | --- | --- | --- |
| [#573](https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/pull/573) | Signed offline updater | `d6bf7db8` | [run 39161386917](https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/actions/runs/39161386917) |
| [#575](https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/pull/575) | 0.4.3 integration | `080a289e` | [run 39278343347](https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/actions/runs/39278343347) |
| [#576](https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/pull/576) | Offline bestiary | `09456541` | [run 39314282662](https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/actions/runs/39314282662) |
| [#577](https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/pull/577) | Player display | `34194a79` | [run 39399993157](https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/actions/runs/39399993157) |
| [#578](https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/pull/578) | 0.4.6 fixes | `6fc70d2d` | [run 39414864168](https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/actions/runs/39414864168) |
| [#579](https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/pull/579) | Windows 0.5.0 foundation | `e693b1d7` | [run 39438980413](https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/actions/runs/39438980413) |
| [#582](https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/pull/582) | One-click installed updates | `fd91b709` | [run 39490466908](https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/actions/runs/39490466908) |
| [#583](https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/pull/583) | Migration preview/import | `a9650def` | [run 39501623859](https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/actions/runs/39501623859) |
| [#581](https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/pull/581) | Separate local 0.4.x signer | `eb840a7c` | [run 39480718769](https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/actions/runs/39480718769) |

#581 branches separately from #578 and is not in #583. It remains separate:
the installed edition must not replace the old portable signing trust chain.
No existing PR branch was overwritten or merged by this work.

Related branches were also checked: #574's NPC component/layout files match
their integrated versions in #575 (the commits were integrated without making
the #574 head an ancestor). #580 is a separate older portable signing handoff,
so it is not combined into the installed release. #562's LAN feature branch
and #555's old 0.3.4 version bump remain separate, conflicting PRs; neither is a
newer 0.5.0 release base. All checked #573–#583 review-thread lists were empty.

## Problems addressed in the follow-up

- Preview approval previously covered workspace bytes but not the complete
  media payload. A final independent import read could also accept a changed
  valid backup. Both checks now bind to the approved complete payload.
- Restore copied directly over active media. Incoming files are now staged and
  checked first; activation failures restore the prior tree, with a startup
  recovery path for an interrupted rename.
- Media could change before a renderer quota error prevented saving the
  imported workspace. Native restore now waits for the save/flush and attempts
  media rollback on failure, retaining the safety snapshot.
- Update snapshots used click-time data, potentially missing edits made during
  downloads. The installed updater now reads and flushes current saved data
  after download verification, before taking the snapshot. Chromium is asked to
  flush storage; its API does not acknowledge durable disk writes.
- Installer failures had no durable reference to the recovery snapshot. A local
  receipt records the target and backup; startup and persistent UI explain
  incomplete installation. Late update errors cancel a queued restart.
- The updater previously requested an interactive assisted installer. After the
  existing explicit consent/download/backup gates, it now requests unattended
  update installation and restart. The first-install wizard remains enabled.
- Malformed/unreadable desktop storage previously became an editable empty
  workspace. It now blocks reads/edits without overwriting the original. Stale
  cached writes are refused, and failed saves retain disk and in-memory data.
- Imported attachment URLs could escape their pack directory, and OS opening
  could execute a script/program attachment. Validated paths and an inert-file
  allowlist keep campaign attachments separate from program installation.
- Official release checks now require an existing protected approval
  environment, immutable dependency installs, complete suites and real Electron
  smoke checks, forced signing, verified installed executable/installer signer,
  and matching update hashes, version, official feed and pinned publisher.
  Only verified installer assets go to a draft release; portable remains QA.

## Evidence and limits

The final local frontend suite passed: **289 suites, 1,750 tests**, and the
production renderer built successfully. Desktop checks passed **91 tests**
(four Windows-only checks skipped on Linux), and four Python package-tool tests
passed. Failure, integrity and migration tests use disposable directories and
synthetic data only. Windows CI
for the follow-up must validate its final commit and the newly added packaged
installed-edition offline/restart smoke. See the follow-up PR checks for the
current build result and QA artifacts; artifacts are not official releases.

See [the migration procedure](KEEPER_0_5_MIGRATION.md) for exact supported data,
browser-storage omissions, private before/after comparison and recovery steps.
Existing backup exports do not contain some live combat, uploaded assets,
soundboard/session records, drafts and preferences. If the owner uses these,
preserving them remains a migration gate. The old full-profile copy is retained;
this work does not claim a complete Chromium-profile migration.

The existing large-workspace storage limitation remains tracked by
[#567](https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/issues/567).
Moving the primary database out of localStorage is a separate, careful data
migration, not a safe incidental change to release preparation.

## What still needs an owner or Windows operator

1. Configure a legitimate trusted Windows code-signing certificate and the
   protected `windows-release` environment, required reviewer, certificate
   secrets and exact publisher variable described in
   [release setup](KEEPER_0_5_PUBLIC_RELEASE.md#release-security-setup-required).
   Do not send private signing material to ChatGPT or put it in the repository.
   The environment API showed only unprotected Preview/Production environments
   during this audit. Secret and branch-protection APIs returned HTTP 403, so
   their configuration could not be established with this connection.
2. Review and land the stacked drafts in order, protect main/version tags,
   then approve a signed draft build from a reviewed main commit. No tag or
   release was created by this development task.
3. On a disposable Windows account or test PC, validate the actual installation
   wizard/shortcuts, no-account offline use, old-backup import, omitted records,
   signed update between two versions, interrupted download/install, and
   reinstall/recovery with data comparison. Then separately approve publication.

The original working Keeper stays in place until those checks pass. Automated
startup and synthetic rollback tests do not establish real-world installation,
campaign completeness, OneDrive-lock handling or installer rollback.
