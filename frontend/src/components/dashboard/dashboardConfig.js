export const theme = {
  bg: 'var(--rq-bg, #303030)',
  panel: 'transparent',
  panelSoft: 'transparent',
  elevated: 'transparent',
  border: 'var(--rq-line, rgba(255, 255, 255, 0.16))',
  borderStrong: 'transparent',
  accent: 'var(--rq-primary, #d00000)',
  accentHover: 'var(--rq-primary, #d00000)',
  accentSoft: 'transparent',
  player: 'var(--rq-primary, #d00000)',
  text: 'var(--rq-text, #ffffff)',
  textSecondary: 'var(--rq-muted, rgba(255, 255, 255, 0.68))',
  muted: 'var(--rq-muted, rgba(255, 255, 255, 0.68))',
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
