const displayName = (value) => {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  return value.name || value.title || value.label || value.value || '';
};

const normaliseKey = (value = '') => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

function firstValue(source = {}, keys = []) {
  return keys.map((key) => source?.[key]).find((value) => value !== undefined && value !== null && value !== '');
}

export function resolveClassName(value, classes = {}, fallback = 'Fighter') {
  const raw = displayName(value).trim();
  if (!raw) return fallback;
  if (classes?.[raw]) return raw;
  const matched = Object.keys(classes || {}).find((name) => normaliseKey(name) === normaliseKey(raw));
  return matched || raw;
}

export function resolveDraftClassName(draft = {}, classes = {}, fallback = 'Fighter') {
  return resolveClassName(firstValue(draft, [
    'characterClass',
    'character_class',
    'className',
    'class_name',
    'class',
  ]), classes, fallback);
}

export function resolvePayloadClassName(payload = {}, classes = {}, fallback = 'Fighter') {
  return resolveClassName(firstValue(payload, [
    'character_class',
    'characterClass',
    'className',
    'class_name',
    'class',
  ]), classes, fallback);
}

export function resolveRulesEdition(source = {}, fallback = '2014') {
  const raw = firstValue(source, [
    'edition',
    'rulesEdition',
    'rules_edition',
    'ruleset',
    'rules_set',
    'rules',
  ]);
  const value = String(raw || fallback || '2014');
  return value.includes('2024') ? '2024' : '2014';
}
