export const CLASS_COMPLETION_CHECKLIST = [
  { key: 'core_class_data', label: 'Core class data' },
  { key: 'character_detection', label: 'Character detection helper' },
  { key: 'progression_helper', label: 'Progression helper' },
  { key: 'resource_rules', label: 'Resource rules' },
  { key: 'builder_options', label: 'Builder options' },
  { key: 'builder_readiness', label: 'Builder readiness' },
  { key: 'sheet_summary', label: 'Sheet summary' },
  { key: 'subclass_summary', label: 'Subclass summary' },
  { key: 'final_status', label: 'Final status' },
  { key: 'package_export_and_tests', label: 'Package export and focused tests' },
];

const completedFighter = CLASS_COMPLETION_CHECKLIST.map(item => item.key);
const completedBarbarian = CLASS_COMPLETION_CHECKLIST.map(item => item.key);
const completedRogue = CLASS_COMPLETION_CHECKLIST.map(item => item.key);
const completedMonk = CLASS_COMPLETION_CHECKLIST.map(item => item.key);
const completedPaladin = CLASS_COMPLETION_CHECKLIST.map(item => item.key);

export const CLASS_COMPLETION_STATUS = [
  {
    className: 'Fighter',
    priority: 0,
    status: 'complete',
    completed: completedFighter,
    nextWork: 'Playtest polish only; core Fighter implementation is complete.',
  },
  {
    className: 'Barbarian',
    priority: 0,
    status: 'complete',
    completed: completedBarbarian,
    nextWork: 'Playtest polish only; core Barbarian implementation is complete.',
  },
  {
    className: 'Rogue',
    priority: 0,
    status: 'complete',
    completed: completedRogue,
    nextWork: 'Playtest polish only; core Rogue implementation is complete.',
  },
  {
    className: 'Monk',
    priority: 0,
    status: 'complete',
    completed: completedMonk,
    nextWork: 'Playtest polish only; core Monk implementation is complete.',
  },
  {
    className: 'Paladin',
    priority: 0,
    status: 'complete',
    completed: completedPaladin,
    nextWork: 'Playtest polish only; core Paladin implementation is complete.',
  },
  {
    className: 'Ranger',
    priority: 1,
    status: 'next',
    completed: ['core_class_data'],
    nextWork: 'Build Ranger progression, exploration/combat feature summaries, weapon/spell choices, subclass summaries, final status, package export, and tests.',
  },
  {
    className: 'Bard',
    priority: 5,
    status: 'queued',
    completed: ['core_class_data', 'resource_rules'],
    nextWork: 'Build Bard progression, Bardic Inspiration scaling, Expertise/Magical Secrets choices, spellcasting summaries, final status, package export, and tests.',
  },
  {
    className: 'Cleric',
    priority: 6,
    status: 'queued',
    completed: ['core_class_data', 'resource_rules'],
    nextWork: 'Build Cleric progression, domain summaries, Channel Divinity scaling, prepared-spell support, final status, package export, and tests.',
  },
  {
    className: 'Druid',
    priority: 7,
    status: 'queued',
    completed: ['core_class_data', 'resource_rules'],
    nextWork: 'Build Druid progression, Wild Shape summaries, circle summaries, prepared-spell support, final status, package export, and tests.',
  },
  {
    className: 'Wizard',
    priority: 8,
    status: 'queued',
    completed: ['core_class_data', 'resource_rules'],
    nextWork: 'Build Wizard progression, Arcane Recovery/school summaries, spellbook/prepared-spell support, final status, package export, and tests.',
  },
  {
    className: 'Warlock',
    priority: 9,
    status: 'queued',
    completed: ['core_class_data', 'resource_rules'],
    nextWork: 'Build Warlock progression, Pact Magic, invocations, pact boon, patron summaries, final status, package export, and tests.',
  },
  {
    className: 'Sorcerer',
    priority: 10,
    status: 'queued',
    completed: ['core_class_data', 'resource_rules'],
    nextWork: 'Build Sorcerer progression, Sorcery Point/Metamagic summaries, origin summaries, final status, package export, and tests.',
  },
];

export function getClassCompletionPercent(entry) {
  const completed = new Set(entry?.completed || []);
  const count = CLASS_COMPLETION_CHECKLIST.filter(item => completed.has(item.key)).length;
  return Math.round((count / CLASS_COMPLETION_CHECKLIST.length) * 100);
}

export function getClassCompletionDashboard() {
  return CLASS_COMPLETION_STATUS.map(entry => ({
    ...entry,
    percent: getClassCompletionPercent(entry),
    missing: CLASS_COMPLETION_CHECKLIST
      .filter(item => !entry.completed.includes(item.key))
      .map(item => item.label),
  })).sort((a, b) => a.priority - b.priority || a.className.localeCompare(b.className));
}

export function getNextClassToComplete() {
  return getClassCompletionDashboard().find(entry => entry.status !== 'complete') || null;
}
