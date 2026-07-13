export function getAssistantPathname(pathname = '') {
  if (pathname.includes('/player-display')) return '/player-display/global';
  if (/^\/characters\/[^/]+\/edit$/.test(pathname)) return '/characters/create/edit';
  return pathname;
}

export function isPlayerFacingCampaignPath(pathname = '', assistantPathname = '') {
  return assistantPathname.includes('player-display')
    || pathname.startsWith('/player-display/')
    || pathname.startsWith('/gm-second-screen/')
    || pathname.startsWith('/mobile/');
}

export function extractCharacterIdFromPath(pathname = '') {
  const match = pathname.match(/^\/characters\/([^/]+)(?:\/edit)?$/);
  const characterId = match ? match[1] : '';
  return ['create', 'new'].includes(characterId) ? '' : characterId;
}

export function listNames(value, limit = 8) {
  if (!Array.isArray(value)) return '';
  return value
    .slice(0, limit)
    .map((entry) => {
      if (typeof entry === 'string') return entry;
      return entry?.name || entry?.label || entry?.title || '';
    })
    .filter(Boolean)
    .join(', ');
}

export function truncateText(value, limit = 900) {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.length > limit ? `${text.slice(0, limit).trim()}…` : text;
}

export function settledValue(result) {
  return result?.status === 'fulfilled' ? result.value?.data : null;
}

export function summarizeCharacterForRook(character) {
  if (!character || typeof character !== 'object') return '';

  const classLevels = character.class_levels && typeof character.class_levels === 'object'
    ? Object.entries(character.class_levels).map(([name, level]) => `${name} ${level}`).join(', ')
    : '';

  const abilityScores = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']
    .map((ability) => `${ability.slice(0, 3).toUpperCase()} ${character[ability] ?? 10}`)
    .join(', ');

  const equipment = listNames(character.equipment || character.inventory || character.items, 10);
  const feats = listNames(character.feats, 8);
  const cantrips = listNames(character.cantrips_known, 8);
  const knownSpells = listNames(character.spells_known, 10);
  const preparedSpells = listNames(character.spells_prepared, 10);
  const actions = listNames(character.homebrew_actions || character.actions, 8);
  const resources = character.resources && typeof character.resources === 'object'
    ? Object.keys(character.resources).slice(0, 10).join(', ')
    : '';

  return `CURRENT CHARACTER SHEET CONTEXT:
- Name: ${character.name || 'Unnamed character'}
- Ancestry/species: ${character.race || character.species || 'Unknown'}
- Class: ${classLevels || `${character.character_class || character.class_name || 'Unknown'} level ${character.level || 1}`}
- Subclass: ${character.subclass || 'None listed'}
- Background: ${character.background || 'None listed'}
- Edition/ruleset: ${character.edition || character.rules_edition || character.ruleset_id || 'Unknown'}
- HP: ${character.current_hit_points ?? character.hit_points ?? '?'} / ${character.max_hit_points ?? character.max_hp ?? '?'}${character.temporary_hit_points || character.temp_hp ? `, temp ${character.temporary_hit_points || character.temp_hp}` : ''}
- AC: ${character.armor_class ?? character.ac ?? '?'}
- Proficiency bonus: ${character.proficiency_bonus ?? '?'}
- Ability scores: ${abilityScores}
${feats ? `- Feats: ${feats}\n` : ''}${equipment ? `- Equipment/items: ${equipment}\n` : ''}${resources ? `- Tracked resources: ${resources}\n` : ''}${actions ? `- Custom/homebrew actions: ${actions}\n` : ''}${cantrips ? `- Cantrips: ${cantrips}\n` : ''}${knownSpells ? `- Known spells: ${knownSpells}\n` : ''}${preparedSpells ? `- Prepared spells: ${preparedSpells}\n` : ''}${character.personality_traits ? `- Personality traits: ${character.personality_traits}\n` : ''}${character.ideals ? `- Ideals: ${character.ideals}\n` : ''}${character.bonds ? `- Bonds: ${character.bonds}\n` : ''}${character.flaws ? `- Flaws: ${character.flaws}\n` : ''}${character.notes ? `- Notes: ${truncateText(character.notes, 800)}\n` : ''}
When answering character-sheet questions, use this actual character context first. Be practical and avoid inventing missing sheet details.`.trim();
}

export function summarizeCampaignForRook({ campaign, setting, environment, rules, playerFacing = false }) {
  if (!campaign && !setting && !environment && !rules) return '';

  const customRuleNames = Array.isArray(rules?.rules)
    ? rules.rules.slice(0, 10).map((rule) => `${rule.name || 'Untitled'}${rule.source_type ? ` (${rule.source_type})` : ''}`).join(', ')
    : '';
  const ruleCount = rules?.total_count ?? (Array.isArray(rules?.rules) ? rules.rules.length : 0);
  const availableClasses = Array.isArray(campaign?.available_classes) ? campaign.available_classes.join(', ') : '';
  const envBits = environment ? [
    environment.location ? `location: ${environment.location}` : '',
    environment.weather ? `weather: ${environment.weather}` : '',
    environment.lighting ? `lighting: ${environment.lighting}` : '',
    environment.mood ? `mood: ${environment.mood}` : '',
  ].filter(Boolean).join('; ') : '';

  const lines = [
    playerFacing ? 'CURRENT PLAYER-FACING CAMPAIGN CONTEXT:' : 'CURRENT GM CAMPAIGN CONTEXT:',
    `- Campaign: ${campaign?.name || 'Unknown campaign'}`,
    `- System/rules: ${campaign?.system || campaign?.rules_edition || campaign?.ruleset_id || 'Unknown'}`,
    campaign?.world_name || campaign?.setting ? `- World/setting: ${campaign.world_name || campaign.setting}` : '',
    campaign?.world_setting ? `- Tone label: ${campaign.world_setting}` : '',
    campaign?.world_setting_notes ? `- Tone notes: ${truncateText(campaign.world_setting_notes, playerFacing ? 300 : 700)}` : '',
    availableClasses ? `- Available classes: ${availableClasses}` : '',
    campaign?.max_character_level ? `- Max character level: ${campaign.max_character_level}${campaign.allow_epic_levels ? ' (epic levels allowed)' : ''}` : '',
    envBits ? `- Shared table environment: ${envBits}` : '',
    environment?.notes ? `- Environment notes: ${truncateText(environment.notes, playerFacing ? 250 : 600)}` : '',
    ruleCount ? `- Uploaded/custom rules visible: ${ruleCount}${customRuleNames ? ` — ${customRuleNames}` : ''}` : '',
  ].filter(Boolean);

  if (!playerFacing) {
    if (setting?.content) lines.push(`- Campaign setting notes: ${truncateText(setting.content, 1200)}`);
    if (setting?.dm_rules) lines.push(`- GM-only rules/notes: ${truncateText(setting.dm_rules, 700)}`);
    lines.push('Use this saved campaign context first for GM-facing answers. Do not invent lore that conflicts with saved notes.');
  } else {
    lines.push('This is player-facing context. Do not reveal GM-only secrets, hidden notes, unrevealed NPC motives, or private campaign prep.');
  }

  return lines.join('\n');
}

export async function fetchCampaignContext(apiClient, campaignId, playerFacing) {
  const [campaignResult, settingResult, environmentResult, rulesResult] = await Promise.allSettled([
    apiClient.get(`/campaigns/${campaignId}`),
    playerFacing ? Promise.resolve({ data: null }) : apiClient.get(`/campaigns/${campaignId}/setting`),
    apiClient.get(`/campaigns/${campaignId}/environment`),
    apiClient.get(`/campaigns/${campaignId}/custom-rules`),
  ]);

  return summarizeCampaignForRook({
    campaign: settledValue(campaignResult),
    setting: settledValue(settingResult),
    environment: settledValue(environmentResult),
    rules: settledValue(rulesResult),
    playerFacing,
  });
}

export function getRookContextNote({ characterId = '', campaignId = '', pageDataContext = '', playerFacingCampaign = false } = {}) {
  if (characterId) return 'Character sheet loaded — Rook can answer from this character.';
  if (!campaignId || !pageDataContext) return '';
  return playerFacingCampaign
    ? 'Player-safe campaign context loaded.'
    : 'Campaign context loaded — Rook can prep from this campaign.';
}
