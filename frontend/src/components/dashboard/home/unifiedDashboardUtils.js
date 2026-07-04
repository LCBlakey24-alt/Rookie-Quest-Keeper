export const campaignTypes = {
  fantasy: 'Fantasy',
  sci_fi: 'Sci-fi',
  horror: 'Horror',
  noir: 'Noir',
  modern: 'Modern',
  superhero: 'Superhero',
  post_apocalyptic: 'Post-apocalyptic',
  mixed_other: 'Mixed / Other',
};

export const rulesSystemOptions = {
  '2024': 'D&D 5e 2024 Compatible',
  '2014': 'D&D 5e 2014 Compatible',
};

export const joinSettingOptions = {
  auto_accept: 'Auto-accept characters',
  gm_approval: 'GM approval required',
};

export const visibilityOptions = {
  private: 'Private campaign',
  public: 'Public / discoverable later',
};

export const toneSliders = [
  { id: 'serious', left: 'Light-hearted', right: 'Serious' },
  { id: 'grim', left: 'Hopeful', right: 'Grim' },
  { id: 'political', left: 'Simple', right: 'Political' },
  { id: 'epic', left: 'Grounded', right: 'Epic' },
  { id: 'dangerous', left: 'Safe', right: 'Dangerous' },
];

export const tonePresets = {
  heroic_fantasy: {
    label: 'Heroic Fantasy',
    values: { serious: 6, grim: 3, political: 4, epic: 7, dangerous: 6 },
  },
  dark_gritty: {
    label: 'Dark & Gritty',
    values: { serious: 9, grim: 8, political: 6, epic: 4, dangerous: 9 },
  },
  mystery_noir: {
    label: 'Mystery Noir',
    values: { serious: 8, grim: 6, political: 8, epic: 3, dangerous: 6 },
  },
  chaotic_fun: {
    label: 'Chaotic Fun',
    values: { serious: 2, grim: 2, political: 3, epic: 6, dangerous: 5 },
  },
  epic_adventure: {
    label: 'Epic Adventure',
    values: { serious: 6, grim: 4, political: 5, epic: 10, dangerous: 7 },
  },
  horror_survival: {
    label: 'Horror Survival',
    values: { serious: 9, grim: 9, political: 4, epic: 3, dangerous: 10 },
  },
  custom: {
    label: 'Custom',
    values: { serious: 5, grim: 5, political: 5, epic: 5, dangerous: 5 },
  },
};

export const initialToneSliders = { ...tonePresets.heroic_fantasy.values };

export const initialCampaignForm = {
  name: '',
  world_name: '',
  description: '',
  rules_edition: '2024',
  campaign_type: 'fantasy',
  join_mode: 'gm_approval',
  tone_preset: 'heroic_fantasy',
  tone_sliders: initialToneSliders,
  starting_level: 1,
  party_size: 4,
  visibility: 'private',
};

export function safeArray(value) {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === 'object') : [];
}

export function recordId(record) {
  return (
    record?.id ||
    record?._id ||
    record?.campaign_id ||
    record?.campaignId ||
    record?.character_id ||
    record?.characterId ||
    ''
  );
}

export function characterTitle(character) {
  return character?.name || character?.character_name || 'Unnamed Character';
}

export function characterMeta(character) {
  const level = character?.level || 1;
  const className = character?.character_class || character?.class_name || character?.class || 'Adventurer';
  return `Level ${level} ${className}`;
}

export function campaignTitle(campaign) {
  return campaign?.name || campaign?.campaign_name || 'Untitled Campaign';
}

export function campaignMeta(campaign) {
  const linkedCount = campaign?.linked_character_count ?? campaign?.player_count ?? campaign?.players?.length ?? 0;
  const system = campaign?.system || campaign?.rules_edition || 'Campaign';
  return `${system} · ${linkedCount} linked character${linkedCount === 1 ? '' : 's'}`;
}

function sliderValue(values, id) {
  const value = Number(values?.[id]);
  return Number.isFinite(value) ? Math.max(0, Math.min(10, value)) : 5;
}

function phrase(value, low, mid, high) {
  if (value <= 3) return low;
  if (value >= 7) return high;
  return mid;
}

export function buildCampaignFeel(form) {
  const values = form?.tone_sliders || initialToneSliders;
  const serious = sliderValue(values, 'serious');
  const grim = sliderValue(values, 'grim');
  const political = sliderValue(values, 'political');
  const epic = sliderValue(values, 'epic');
  const dangerous = sliderValue(values, 'dangerous');

  const mood = phrase(serious, 'playful and relaxed', 'balanced between table fun and story weight', 'serious and focused');
  const outlook = phrase(grim, 'hopeful and uplifting', 'sometimes hopeful and sometimes harsh', 'grim, tense, and emotionally heavy');
  const complexity = phrase(political, 'straightforward and adventure-led', 'layered with a few social complications', 'political, tangled, and full of competing agendas');
  const scale = phrase(epic, 'grounded in local problems and personal stakes', 'broad enough to grow into bigger threats', 'epic in scale, with major powers and world-shaping consequences');
  const threat = phrase(dangerous, 'safe enough for bold risks and heroic recoveries', 'dangerous when choices go badly', 'dangerous, costly, and not always forgiving');

  return `This campaign feels ${mood}, ${outlook}, and ${threat}. Stories should feel ${complexity}, while the overall scale is ${scale}.`;
}

export function buildWorldSettingNotes(form) {
  const campaignType = campaignTypes[form.campaign_type] || form.campaign_type || 'Not set';
  const rules = rulesSystemOptions[form.rules_edition] || form.rules_edition || 'Not set';
  const joinMode = joinSettingOptions[form.join_mode] || form.join_mode || 'Not set';
  const preset = tonePresets[form.tone_preset]?.label || 'Custom';
  const sliders = form.tone_sliders || initialToneSliders;
  const campaignFeel = form.campaign_feel || buildCampaignFeel(form);

  const setupLines = [
    `Rules / system: ${rules}`,
    `Campaign type: ${campaignType}`,
    `World / setting name: ${form.world_name?.trim() || 'Not set'}`,
    `Tone preset: ${preset}`,
    `Tone sliders: serious ${sliderValue(sliders, 'serious')}/10; grim ${sliderValue(sliders, 'grim')}/10; political ${sliderValue(sliders, 'political')}/10; epic ${sliderValue(sliders, 'epic')}/10; dangerous ${sliderValue(sliders, 'dangerous')}/10`,
    `Private campaign feel: ${campaignFeel}`,
    `Starting level: ${form.starting_level || 'Not set'}`,
    `Party size: ${form.party_size || 'Not set'}`,
    `Visibility: ${visibilityOptions[form.visibility] || form.visibility || 'Not set'}`,
    `Join setting: ${joinMode}`,
  ];

  if (form.description?.trim()) setupLines.push(`GM notes: ${form.description.trim()}`);

  return setupLines.join('\n');
}

export function statusMessage(status, checkedAt) {
  const checkedSuffix = checkedAt ? ` · checked ${checkedAt}` : '';

  if (status === 'Ready') return `Backend is responding normally${checkedSuffix}.`;
  if (status === 'Slow') return `Backend responded, but slowly${checkedSuffix}. This can happen when a free host wakes up.`;
  if (status === 'Offline') return `Backend health check failed${checkedSuffix}. Try refresh, then check the host if it continues.`;

  return 'Checking backend health...';
}
