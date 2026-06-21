export const theme = {
  bg: 'var(--rq-bg-main, #120C08)',
  panel: 'var(--rq-bg-panel, #21150E)',
  panelSoft: 'var(--rq-bg-input, #1A100B)',
  elevated: 'var(--rq-bg-panel-alt, #2E1D13)',
  border: 'var(--rq-border-default, rgba(192, 138, 61, 0.22))',
  borderStrong: 'var(--rq-accent-strong-border, rgba(224, 177, 92, 0.56))',
  accent: 'var(--rq-accent-primary, #C08A3D)',
  accentHover: 'var(--rq-accent-hover, #E0B15C)',
  accentSoft: 'var(--rq-accent-soft, rgba(192, 138, 61, 0.14))',
  player: 'var(--rq-accent-active, #A45A32)',
  text: 'var(--rq-text-primary, #F5E6C8)',
  textSecondary: 'var(--rq-text-secondary, #E6D2AA)',
  muted: 'var(--rq-text-muted, #CDBA98)',
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
