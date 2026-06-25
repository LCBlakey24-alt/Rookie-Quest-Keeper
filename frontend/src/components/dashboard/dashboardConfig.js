export const theme = {
  bg: '#070814',
  panel: 'transparent',
  panelSoft: 'transparent',
  elevated: 'transparent',
  border: 'rgba(216, 173, 79, 0.16)',
  borderStrong: 'rgba(216, 173, 79, 0.30)',
  accent: '#D8AD4F',
  accentHover: '#E6C775',
  accentSoft: 'transparent',
  player: '#D8AD4F',
  text: '#F6EAD2',
  textSecondary: '#D9C8A5',
  muted: '#AAA6C8',
};

export const defaultSiteSettings = {
  campaign_creation_enabled: true,
  character_creation_enabled: true,
  uploads_enabled: true,
  reviews_enabled: true,
  feedback_enabled: true,
  rook_text_enabled: true,
  beta_tools_enabled: true,
};

export const defaultCampaignForm = {
  name: '',
  description: '',
  system: '5e 2024 Compatible',
  rules_edition: '2024',
  world_name: '',
  world_genre: 'fantasy',
  world_setting: 'custom',
  world_setting_notes: '',
  allow_exploding_dice: false,
  allow_epic_levels: false,
  max_character_level: 20,
  available_classes: [],
};

export const GENRE_OPTIONS = [
  ['fantasy', 'Fantasy'],
  ['sci_fi', 'Science fiction'],
  ['modern', 'Modern'],
  ['medieval', 'Medieval'],
  ['horror', 'Horror'],
  ['custom', 'Custom'],
];

export const CLASS_OPTIONS = [
  'Barbarian',
  'Bard',
  'Cleric',
  'Druid',
  'Fighter',
  'Monk',
  'Paladin',
  'Ranger',
  'Rogue',
  'Sorcerer',
  'Warlock',
  'Wizard',
];
