/**
 * Deciding whether a reviewed encounter is safe to start.
 *
 * The launch guard blocked on this:
 *
 *   loadErrors.some(item => ['players', 'npcs', 'liveState'].includes(item.key))
 *
 * which treats three different situations as one. A failed NPC lookup or a
 * failed travelling-companion lookup stopped a perfectly well understood
 * fight -- the party and the prepared enemies both loaded, the GM selected
 * them, and the only thing missing was a list of optional suggestions they
 * had not asked for.
 *
 * The three cases are not alike:
 *
 *   The party failing to load matters, because an empty roster then means
 *   "nobody could be read" rather than "nobody is in this fight", and
 *   launching would quietly leave every player out.
 *
 *   A successfully loaded party that happens to be empty is ordinary. An
 *   NPC-only or creature-only fight is a real thing a GM runs, and must not
 *   require a player character to exist.
 *
 *   Optional NPC and companion lookups are suggestions. Losing them costs
 *   the GM some convenience and nothing else.
 */

const OPTIONAL_SECTIONS = {
  npcs: 'saved NPCs',
  liveState: 'travelling companions',
};

/**
 * @param {object[]} loadErrors   sections that failed, each { key, label }
 * @param {object[]} roster       the combatants that would actually launch
 * @param {boolean}  partyLoaded  whether the party request itself succeeded
 * @param {boolean}  withoutPartyConfirmed  the GM has said to go anyway
 */
export function describeLaunchReadiness({
  loadErrors = [],
  roster = [],
  partyLoaded = true,
  withoutPartyConfirmed = false,
} = {}) {
  const failed = new Set((Array.isArray(loadErrors) ? loadErrors : [])
    .map(item => item?.key).filter(Boolean));

  const warnings = Object.keys(OPTIONAL_SECTIONS)
    .filter(key => failed.has(key))
    .map(key => `Could not refresh ${OPTIONAL_SECTIONS[key]}. They are not in this roster; everything else is.`);

  const scenariosFailed = failed.has('scenarios');
  const partyUnavailable = !partyLoaded || failed.has('players');

  if (scenariosFailed && roster.length === 0) {
    return {
      canLaunch: false,
      needsPartyConfirmation: false,
      blockReason: 'Saved encounters could not be loaded. Retry before starting combat.',
      warnings,
      partyUnavailable,
    };
  }

  if (roster.length === 0) {
    return {
      canLaunch: false,
      needsPartyConfirmation: false,
      blockReason: partyUnavailable
        ? 'The party could not be loaded, so Rookie cannot tell who is missing. Retry before starting combat.'
        : 'Choose a player, NPC or creature before starting combat.',
      warnings,
      partyUnavailable,
    };
  }

  if (partyUnavailable && !withoutPartyConfirmed) {
    // There is a usable roster, but it cannot include players, because the
    // party is unknown rather than empty. That is the GM's call to make, not
    // one to make quietly on their behalf.
    return {
      canLaunch: false,
      needsPartyConfirmation: true,
      blockReason: 'The party could not be loaded. Retry, or start this fight without the player characters.',
      warnings,
      partyUnavailable,
    };
  }

  return { canLaunch: true, needsPartyConfirmation: false, blockReason: '', warnings, partyUnavailable };
}
