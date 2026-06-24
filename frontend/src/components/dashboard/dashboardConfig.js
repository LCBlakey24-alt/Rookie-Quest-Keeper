export const theme = {
  bg: 'var(--rq-bg-main, #080816)',
  panel: 'var(--rq-bg-panel, rgba(39, 39, 87, 0.94))',
  panelSoft: 'var(--rq-bg-input, rgba(8, 8, 22, 0.7))',
  elevated: 'var(--rq-bg-panel-alt, rgba(52, 52, 99, 0.9))',
  border: 'var(--rq-border-default, rgba(216, 173, 79, 0.28))',
  borderStrong: 'var(--rq-accent-strong-border, rgba(242, 209, 138, 0.54))',
  accent: 'var(--rq-accent-primary, #D8AD4F)',
  accentHover: 'var(--rq-accent-hover, #F2D18A)',
  accentSoft: 'var(--rq-accent-soft, rgba(216, 173, 79, 0.15))',
  player: 'var(--rq-accent-active, #7C78FF)',
  text: 'var(--rq-text-primary, #F6EAD2)',
  textSecondary: 'var(--rq-text-secondary, #E6D7BB)',
  muted: 'var(--rq-text-muted, #A9A9CF)',
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
