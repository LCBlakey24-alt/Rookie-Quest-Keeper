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

const completeClassPackage = CLASS_COMPLETION_CHECKLIST.map(item => item.key);

export const CLASS_COMPLETION_STATUS = [
  {
    className: 'Fighter',
    priority: 0,
    status: 'complete',
    completed: completeClassPackage,
    nextWork: 'Playtest polish only; core Fighter implementation is complete.',
  },
  {
    className: 'Barbarian',
    priority: 0,
    status: 'complete',
    completed: completeClassPackage,
    nextWork: 'Playtest polish only; core Barbarian implementation is complete.',
  },
  {
    className: 'Rogue',
    priority: 0,
    status: 'complete',
    completed: completeClassPackage,
    nextWork: 'Playtest polish only; core Rogue implementation is complete.',
  },
  {
    className: 'Monk',
    priority: 0,
    status: 'complete',
    completed: completeClassPackage,
    nextWork: 'Playtest polish only; core Monk implementation is complete.',
  },
  {
    className: 'Paladin',
    priority: 0,
    status: 'complete',
    completed: completeClassPackage,
    nextWork: 'Playtest polish only; core Paladin implementation is complete.',
  },
  {
    className: 'Ranger',
    priority: 0,
    status: 'complete',
    completed: completeClassPackage,
    nextWork: 'Playtest polish only; core Ranger implementation is complete.',
  },
  {
    className: 'Bard',
    priority: 0,
    status: 'complete',
    completed: completeClassPackage,
    nextWork: 'Playtest polish only; core Bard implementation is complete.',
  },
  {
    className: 'Cleric',
    priority: 0,
    status: 'complete',
    completed: completeClassPackage,
    nextWork: 'Playtest polish only; core Cleric implementation is complete.',
  },
  {
    className: 'Druid',
    priority: 0,
    status: 'complete',
    completed: completeClassPackage,
    nextWork: 'Playtest polish only; core Druid implementation is complete.',
  },
  {
    className: 'Wizard',
    priority: 1,
    status: 'next',
    completed: ['core_class_data', 'character_detection', 'progression_helper', 'resource_rules', 'builder_options', 'builder_readiness', 'sheet_summary', 'subclass_summary'],
    nextWork: 'Build Wizard final status, package export, and tests.',
  },
  {
    className: 'Warlock',
    priority: 2,
    status: 'queued',
    completed: ['core_class_data', 'resource_rules'],
    nextWork: 'Build Warlock progression, Pact Magic, invocations, pact boon, patron summaries, final status, package export, and tests.',
  },
  {
    className: 'Sorcerer',
    priority: 3,
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
