/**
 * An icon-only button with no text and no aria-label is announced as just
 * "button" by a screen reader. Seven of them were reachable in the GM tools:
 * clear conversation, delete event, add combatant, open/close Live Session,
 * edit NPC and delete handout.
 *
 * The two in lists name their record, because several identical "Delete"
 * buttons down a list are indistinguishable from each other otherwise.
 */
import fs from 'fs';
import path from 'path';

const SRC = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(SRC, relative), 'utf8');

// A <button> whose only child is an icon element, carrying neither an
// aria-label nor a title.
const UNNAMED_ICON_BUTTON = /<button(?![^>]*aria-label)(?![^>]*title=)[^>]*>\s*<([A-Z]\w+)\s[^>]*\/>\s*<\/button>/s;

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  if (entry.isDirectory()) return walk(full);
  return entry.isFile() && entry.name.endsWith('.js') && !entry.name.includes('.test.') ? [full] : [];
});

describe('icon-only buttons have accessible names', () => {
  test('no icon-only button anywhere is left unnamed', () => {
    const offenders = walk(SRC)
      .filter((file) => UNNAMED_ICON_BUTTON.test(fs.readFileSync(file, 'utf8')))
      .map((file) => path.relative(SRC, file));

    expect(offenders).toEqual([]);
  });

  test.each([
    ['components/gm/AICoGM.js', 'Clear conversation'],
    ['components/gm/InitiativeTracker.js', 'Add combatant'],
    ['components/gm/NPCRelationshipMap.js', 'Edit NPC'],
    ['components/gm/LiveSessionMode.js', 'Open Live Session'],
    ['components/gm/LiveSessionMode.js', 'Close Live Session'],
  ])('%s names its control "%s"', (file, label) => {
    expect(read(file)).toContain(`aria-label="${label}"`);
  });

  test('a delete button in a list names the record it would remove', () => {
    expect(read('components/gm/EventSystem.js')).toContain('aria-label={`Delete event: ${evt.name');
    expect(read('components/tabs/HandoutsTab.js')).toContain('aria-label={`Delete handout: ${handout.title');
  });

  test('those labels fall back rather than reading "Delete event: undefined"', () => {
    expect(read('components/gm/EventSystem.js')).toContain("evt.name || 'untitled'");
    expect(read('components/tabs/HandoutsTab.js')).toContain("handout.title || 'untitled'");
  });

  test('the two Live Session toggles are named for their direction', () => {
    // Both call the same onToggle, so one shared label would be wrong in one
    // of the two states.
    const source = read('components/gm/LiveSessionMode.js');
    expect(source).toContain('aria-label="Open Live Session"');
    expect(source).toContain('aria-label="Close Live Session"');
  });
});
