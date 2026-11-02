import fs from 'fs';
import path from 'path';

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, relativePath), 'utf8');
}

describe('live character save wiring', () => {
  test('routes inventory and notes through the parent character PATCH helper', () => {
    const sheet = read('./CleanCharacterSheet.js');
    const inventory = read('./clean-sheet/CleanInventoryTabV2.js');
    const notes = read('./clean-sheet/CleanNotesTab.js');

    expect(sheet).toContain('onSaveCharacter={patchCharacter}');
    expect(sheet).not.toContain('updateCharacterLocal');
    expect(sheet).toContain('createCharacterSaveQueue');
    expect(sheet).toContain('const sheetSession = saveControllerRef.current.getSession()');
    expect(sheet).toContain('saveControllerRef.current.patchForSession(sheetSession, updates, options)');
    expect(sheet).toContain('const saved = await saveControllerRef.current.patchForSession(sheetSession, updates, options)');
    expect(sheet).toContain('return saved && isCurrentSheetSession()');
    expect(sheet).toContain('const concentrationSession = saveControllerRef.current.getSession()');
    expect(sheet).toContain('onClick: () => saveControllerRef.current.patchForSession(');
    expect(sheet).toContain('          concentrationSession,');
    expect(sheet).toContain('const isCurrentSheetSession = () => sheetSession === saveControllerRef.current.getSession()');
    expect(sheet).toContain('if (!isCurrentSheetSession()) return false;');
    expect(sheet).toContain('if (saved !== false && isCurrentSheetSession() && delta < 0');
    expect(sheet).toContain('if (cleared === false || !isCurrentSheetSession()) return false;');
    expect(sheet).toContain('await saveControllerRef.current.whenIdle(characterId)');
    expect(sheet).toContain('saveControllerRef.current.invalidate()');
    expect(sheet).toContain('saveControllerRef.current.runServerAction');
    expect(sheet).not.toContain('const previous = character;');
    expect(inventory).toContain('if (onSaveCharacter)');
    expect(notes).toContain('if (onSaveCharacter)');
  });
});
