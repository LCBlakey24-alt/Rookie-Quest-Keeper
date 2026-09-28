import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, 'CleanSpellsTab.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../../styles/cleanSpellsTab.css'), 'utf8');

describe('CleanSpellsTab play-first layout', () => {
  test('keeps the class spell library closed until the player asks for it', () => {
    expect(source).toContain("const [libraryOpen, setLibraryOpen] = useState(false)");
    expect(source).toContain('const hasClassSpellLibrary = availableClassSpells.length > 0');
    expect(source).toContain('aria-expanded={libraryOpen}');
    expect(source).toContain("{libraryOpen ? 'Hide Class Library' : 'Manage Class Library'}");
    expect(source).toContain('{libraryOpen && hasClassSpellLibrary && (');
  });

  test('puts live spell resources and saved spells before the full class catalogue', () => {
    const slots = source.indexOf('<SpellSlots');
    const pact = source.indexOf('<PactMagicPool');
    const cantrips = source.indexOf('title="Cantrips"');
    const library = source.lastIndexOf('<SpellLibrary');

    expect(slots).toBeGreaterThan(-1);
    expect(pact).toBeGreaterThan(slots);
    expect(cantrips).toBeGreaterThan(pact);
    expect(library).toBeGreaterThan(cantrips);
  });

  test('search defaults to the saved character spell list while the library is hidden', () => {
    expect(source).toContain("placeholder={libraryOpen ? 'Search your spells and class library…' : 'Search your saved spells…'}");
  });

  test('uses Guild Ledger tokens and a 46px phone library control', () => {
    expect(css).toContain('background: var(--cs-card);');
    expect(css).toContain('border-color: var(--cs-accent);');
    expect(css).toContain('background: var(--cs-blue-soft);');
    expect(css).toContain("min-height: 46px;");
  });
});
