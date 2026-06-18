export const theme = {
  bg: '#080B1A',
  panel: '#12172A',
  panelSoft: '#0D1224',
  elevated: '#171E33',
  border: 'rgba(191,219,254,0.14)',
  borderStrong: 'rgba(124,58,237,0.38)',
  accent: '#7C3AED',
  accentHover: '#A78BFA',
  accentSoft: 'rgba(124,58,237,0.14)',
  player: '#38BDF8',
  text: '#FFFFFF',
  textSecondary: '#D1D5DB',
  muted: '#9CA3AF',
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
