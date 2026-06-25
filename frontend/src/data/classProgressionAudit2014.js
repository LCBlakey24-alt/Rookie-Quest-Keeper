import {
  CLASS_NAMES_2014,
  getClassProgression,
  getProgressionSnapshot,
} from './classProgressions2014';

const WARNING = 'warning';
const DANGER = 'danger';
const INFO = 'info';

function createIssue(level, message) {
  return { level, message };
}

function hasPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function getMissingFeatureLevels(progression) {
  const missing = [];
  for (let level = 1; level <= 20; level += 1) {
    if (!Array.isArray(progression?.featuresByLevel?.[level]) || progression.featuresByLevel[level].length === 0) {
      missing.push(level);
    }
  }
  return missing;
}

function auditProgressionShape(className) {
  const progression = getClassProgression(className);
  const issues = [];

  if (!progression) {
    return [createIssue(DANGER, `${className} has no progression data.`)];
  }

  if (!progression.hitDie) issues.push(createIssue(DANGER, 'Missing hit die.'));
  if (!Array.isArray(progression.primaryAbilities) || progression.primaryAbilities.length === 0) {
    issues.push(createIssue(WARNING, 'Missing primary ability guidance.'));
  }
  if (!Array.isArray(progression.savingThrows) || progression.savingThrows.length !== 2) {
    issues.push(createIssue(DANGER, 'Saving throws should list exactly two starting proficiencies.'));
  }
  if (!Number.isInteger(progression.subclassLevel) || progression.subclassLevel < 1 || progression.subclassLevel > 20) {
    issues.push(createIssue(DANGER, 'Missing or invalid subclass level.'));
  }
  if (!Array.isArray(progression.asiLevels) || progression.asiLevels.length === 0) {
    issues.push(createIssue(DANGER, 'Missing ASI level list.'));
  }
  if (!progression.spellcasting) {
    issues.push(createIssue(DANGER, 'Missing spellcasting type.'));
  }
  if (['full', 'half', 'pact'].includes(progression.spellcasting) && !progression.spellAbility) {
    issues.push(createIssue(WARNING, 'Spellcasting class is missing spell ability.'));
  }
  if (progression.spellcasting === 'subclass-dependent') {
    issues.push(createIssue(INFO, 'Subclass-dependent caster: do not auto-apply spell slots until subclass support exists.'));
  }

  const missingFeatureLevels = getMissingFeatureLevels(progression);
  if (missingFeatureLevels.length) {
    issues.push(createIssue(DANGER, `Missing listed features for levels: ${missingFeatureLevels.join(', ')}.`));
  }

  (progression.resources || []).forEach((resource) => {
    if (!resource.key) issues.push(createIssue(WARNING, 'A resource is missing a stable key.'));
    if (!resource.label) issues.push(createIssue(WARNING, `${resource.key || 'A resource'} is missing a label.`));
    if (!resource.restore) issues.push(createIssue(WARNING, `${resource.label || resource.key || 'A resource'} is missing restore timing.`));
    if (!hasPlainObject(resource.byLevel) || Object.keys(resource.byLevel).length === 0) {
      issues.push(createIssue(DANGER, `${resource.label || resource.key || 'A resource'} is missing level scaling data.`));
    }
  });

  return issues;
}

function auditSnapshot(className, level) {
  const snapshot = getProgressionSnapshot(className, level);
  const issues = [];

  if (!snapshot) return [createIssue(DANGER, `${className} level ${level} cannot create a progression snapshot.`)];

  if (!snapshot.currentFeatures?.length) {
    issues.push(createIssue(WARNING, `No current feature unlocks listed for level ${level}.`));
  }

  if (snapshot.spellcasting === 'full' && !Object.keys(snapshot.currentSpellSlots || {}).length) {
    issues.push(createIssue(DANGER, `Full caster has no spell slots at level ${level}.`));
  }

  if (snapshot.spellcasting === 'half' && level >= 2 && !Object.keys(snapshot.currentSpellSlots || {}).length) {
    issues.push(createIssue(DANGER, `Half caster should have spell slots by level ${level}.`));
  }

  if (snapshot.spellcasting === 'pact') {
    const slotEntries = Object.entries(snapshot.currentSpellSlots || {});
    if (!slotEntries.length) {
      issues.push(createIssue(DANGER, `Warlock-style Pact Magic has no pact slots at level ${level}.`));
    } else if (slotEntries.length > 1) {
      issues.push(createIssue(WARNING, 'Pact Magic should usually expose one pact slot level at a time.'));
    }
  }

  snapshot.resources.forEach((resource) => {
    if (resource.currentValue === null || resource.currentValue === undefined) {
      issues.push(createIssue(WARNING, `${resource.label} has no current value at level ${level}.`));
    }
  });

  return issues;
}

export function getClassProgressionAudit(className, level = 1) {
  const shapeIssues = auditProgressionShape(className);
  const snapshotIssues = auditSnapshot(className, level);
  const issues = [...shapeIssues, ...snapshotIssues];
  const dangerCount = issues.filter(issue => issue.level === DANGER).length;
  const warningCount = issues.filter(issue => issue.level === WARNING).length;
  const infoCount = issues.filter(issue => issue.level === INFO).length;

  return {
    className,
    level,
    issues,
    dangerCount,
    warningCount,
    infoCount,
    status: dangerCount ? 'danger' : warningCount ? 'warning' : 'ready',
  };
}

export function getAllClassProgressionAudits(level = 1) {
  return CLASS_NAMES_2014.map(className => getClassProgressionAudit(className, level));
}

export function getProgressionAuditSummary(level = 1) {
  const audits = getAllClassProgressionAudits(level);
  return {
    level,
    totalClasses: audits.length,
    readyClasses: audits.filter(audit => audit.status === 'ready').length,
    warningClasses: audits.filter(audit => audit.status === 'warning').length,
    dangerClasses: audits.filter(audit => audit.status === 'danger').length,
    totalIssues: audits.reduce((total, audit) => total + audit.issues.length, 0),
    dangerCount: audits.reduce((total, audit) => total + audit.dangerCount, 0),
    warningCount: audits.reduce((total, audit) => total + audit.warningCount, 0),
    infoCount: audits.reduce((total, audit) => total + audit.infoCount, 0),
  };
}
