import * as fighterPackage from './fighterPackage';
import * as barbarianPackage from './barbarianPackage';
import * as roguePackage from './roguePackage';
import * as monkPackage from './monkPackage';
import * as paladinPackage from './paladinPackage';
import * as rangerPackage from './rangerPackage';
import * as bardPackage from './bardPackage';
import * as clericPackage from './clericPackage';
import * as druidPackage from './druidPackage';
import * as wizardPackage from './wizardPackage';
import { CLASS_COMPLETION_CHECKLIST, getClassCompletionDashboard } from './classCompletionStatus';

const PACKAGE_BY_CLASS = {
  Fighter: fighterPackage,
  Barbarian: barbarianPackage,
  Rogue: roguePackage,
  Monk: monkPackage,
  Paladin: paladinPackage,
  Ranger: rangerPackage,
  Bard: bardPackage,
  Cleric: clericPackage,
  Druid: druidPackage,
  Wizard: wizardPackage,
};

const EXPECTED_EXPORTS_BY_CHECKLIST = {
  character_detection: className => [`is${className}Character`],
  progression_helper: className => [`get${className}ProgressionSummary`],
  builder_options: className => [`get${className}BuilderOptions`],
  builder_readiness: className => [`get${className}BuilderReadiness`],
  sheet_summary: className => [`get${className}SheetSummary`],
  subclass_summary: className => [`get${className}SubclassOptions`],
  final_status: className => [`get${className}FinalStatus`],
};

const PACKAGE_EXPORT_KEYS = [
  'character_detection',
  'progression_helper',
  'builder_options',
  'builder_readiness',
  'sheet_summary',
  'subclass_summary',
  'final_status',
];

function expectedExportsFor(className, checklistKey) {
  if (checklistKey === 'core_class_data' || checklistKey === 'resource_rules') return [];
  if (checklistKey === 'package_export_and_tests') {
    return PACKAGE_EXPORT_KEYS.flatMap(key => expectedExportsFor(className, key));
  }
  return EXPECTED_EXPORTS_BY_CHECKLIST[checklistKey]?.(className) || [];
}

export function auditClassCompletionEntry(entry) {
  const className = entry?.className;
  const packageExports = PACKAGE_BY_CLASS[className] || {};
  const completed = new Set(entry?.completed || []);
  const expectedChecklist = CLASS_COMPLETION_CHECKLIST.filter(item => completed.has(item.key));

  const checks = expectedChecklist.map(item => {
    const expectedExports = expectedExportsFor(className, item.key);
    const missingExports = expectedExports.filter(name => typeof packageExports[name] !== 'function');
    return {
      key: item.key,
      label: item.label,
      expectedExports,
      supported: missingExports.length === 0,
      missingExports,
    };
  });

  return {
    className,
    status: entry?.status,
    percent: entry?.percent,
    supported: checks.every(check => check.supported),
    checks,
    missingExports: checks.flatMap(check => check.missingExports),
  };
}

export function getClassCompletionAudit() {
  return getClassCompletionDashboard().map(auditClassCompletionEntry);
}

export function getUnsupportedCompletedClasses() {
  return getClassCompletionAudit().filter(entry => entry.status === 'complete' && !entry.supported);
}
