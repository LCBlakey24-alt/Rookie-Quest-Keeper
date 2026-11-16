import { writeEditableCharacterPdf } from './characterPdfFormWriter';
import { V7_FIELD_NAMES, V7_CHECKBOX_NAMES } from './characterPdfV7FieldSchema';

const checkboxNames = new Set(V7_CHECKBOX_NAMES);
class MockPDFTextField {
  constructor(name) { this.name = name; this.value = ''; }
  getName() { return this.name; }
  setText(value) { this.value = value; }
}
class MockPDFCheckBox {
  constructor(name) { this.name = name; this.checked = false; }
  getName() { return this.name; }
  check() { this.checked = true; }
  uncheck() { this.checked = false; }
}

function mockedPDF({
  title = 'Rookie Quest Keeper - Interactive Character Sheet (2024 edition) V7',
  pageCount = 8,
  width = 595.28,
  height = 841.89,
  fieldChanges = {},
} = {}) {
  // Real archived V7 has exactly 504 named fields and 55 checkboxes.
  const fields = V7_FIELD_NAMES.map(name => {
    const fieldName = fieldChanges[name]?.name || name;
    const checkbox = fieldChanges[name]?.checkbox ?? checkboxNames.has(name);
    return checkbox ? new MockPDFCheckBox(fieldName) : new MockPDFTextField(fieldName);
  });
  const byName = new Map(fields.map(field => [field.getName(), field]));
  const form = {
    getFields: jest.fn(() => fields),
    getTextField: jest.fn(name => {
      const field = byName.get(name);
      if (!(field instanceof MockPDFTextField)) throw new Error('Not a text field');
      return field;
    }),
    getCheckBox: jest.fn(name => {
      const field = byName.get(name);
      if (!(field instanceof MockPDFCheckBox)) throw new Error('Not a checkbox');
      return field;
    }),
    updateFieldAppearances: jest.fn(),
    flatten: jest.fn(),
  };
  const document = {
    getPageCount: () => pageCount,
    getPages: () => Array.from({ length: pageCount }, () => ({ getSize: () => ({ width, height }) })),
    getTitle: () => title,
    getForm: () => form,
    save: jest.fn(async () => new Uint8Array([37, 80, 68, 70])),
  };
  const pdfLib = { PDFDocument: { load: jest.fn(async () => document) } };
  return { pdfLib, form, document, byName };
}

const mapping = {
  edition: '2024',
  values: { 'identity.name': 'Mira Fenwalker', 'combat.inspiration': true },
  overflow: [],
  exportReady: true,
};

test('V7 schema matches the archived 504-field contract', () => {
  expect(V7_FIELD_NAMES).toHaveLength(504);
  expect(new Set(V7_FIELD_NAMES).size).toBe(504);
  expect(V7_CHECKBOX_NAMES).toHaveLength(55);
  expect(V7_FIELD_NAMES).toContain('actions.action.6.effect');
  expect(V7_FIELD_NAMES).toContain('combat.hit_dice.breakdown');
});

test('fills V7 editable text and checkboxes without flattening', async () => {
  const m = mockedPDF();
  const bytes = await writeEditableCharacterPdf(new Uint8Array([1]), mapping,
    { pdfLib: m.pdfLib, expectedEdition: '2024' });
  expect(bytes).toBeInstanceOf(Uint8Array);
  expect(m.byName.get('identity.name').value).toBe('Mira Fenwalker');
  expect(m.byName.get('combat.inspiration').checked).toBe(true);
  expect(m.form.flatten).not.toHaveBeenCalled();
  expect(m.document.save).toHaveBeenCalledWith({ updateFieldAppearances: true });
});

test('rejects the wrong edition and a stale V6 form', async () => {
  const wrong = mockedPDF({ title: 'Rookie Quest Keeper - Interactive Character Sheet (2014 edition) V7' });
  await expect(writeEditableCharacterPdf(new Uint8Array([1]), mapping,
    { pdfLib: wrong.pdfLib })).rejects.toThrow(/not the correct/);
  const stale = mockedPDF({ pageCount: 7, title: 'Rookie Quest Keeper - Interactive Character Sheet (2024 edition) V6' });
  await expect(writeEditableCharacterPdf(new Uint8Array([1]), mapping,
    { pdfLib: stale.pdfLib })).rejects.toThrow(/eight-page/);
  expect(wrong.document.save).not.toHaveBeenCalled();
  expect(stale.document.save).not.toHaveBeenCalled();
});

test('rejects wrong paper size and rejects overflow without modifying the form', async () => {
  const wrongSize = mockedPDF({ width: 612, height: 792 });
  await expect(writeEditableCharacterPdf(new Uint8Array([1]), mapping,
    { pdfLib: wrongSize.pdfLib })).rejects.toThrow(/A4/);
  const m = mockedPDF();
  await expect(writeEditableCharacterPdf(new Uint8Array([1]), {
    ...mapping, exportReady: false, overflow: [{ field: 'magic.spells', value: ['a'] }],
  }, { pdfLib: m.pdfLib })).rejects.toThrow(/overflow/);
  expect(m.byName.get('identity.name').value).toBe('');
});

test('rejects a same-count but altered V7 field contract', async () => {
  const m = mockedPDF({
    fieldChanges: { 'actions.action.1.name': { name: 'not-an-approved-v7-field' } },
  });
  await expect(writeEditableCharacterPdf(new Uint8Array([1]), mapping,
    { pdfLib: m.pdfLib })).rejects.toThrow(/schema/);
  expect(m.byName.get('identity.name').value).toBe('');
});

test('checks every field type, even fields left blank by the character', async () => {
  const m = mockedPDF({
    fieldChanges: { 'abilities.str.save_proficient': { checkbox: false } },
  });
  await expect(writeEditableCharacterPdf(new Uint8Array([1]), mapping,
    { pdfLib: m.pdfLib })).rejects.toThrow(/field type/);
  expect(m.byName.get('identity.name').value).toBe('');
});

test('rejects unknown mapped field and mapped value of the wrong type', async () => {
  const m = mockedPDF();
  await expect(writeEditableCharacterPdf(new Uint8Array([1]),
    { ...mapping, values: { 'not.in.this.pdf': 'oops' } },
    { pdfLib: m.pdfLib })).rejects.toThrow(/missing field/);
  await expect(writeEditableCharacterPdf(new Uint8Array([1]),
    { ...mapping, values: { 'identity.name': true } },
    { pdfLib: m.pdfLib })).rejects.toThrow(/field type/);
  expect(m.byName.get('identity.name').value).toBe('');
});

test('requires a Unicode font when the default field font cannot print a name', async () => {
  const m = mockedPDF();
  await expect(writeEditableCharacterPdf(new Uint8Array([1]),
    { ...mapping, values: { 'identity.name': 'Łukasz' } },
    { pdfLib: m.pdfLib })).rejects.toThrow(/Unicode/);
  expect(m.byName.get('identity.name').value).toBe('');
});

test('accepts an explicit embedded Unicode appearance font', async () => {
  const m = mockedPDF();
  const font = { name: 'test-embedded' };
  await writeEditableCharacterPdf(new Uint8Array([1]), {
    ...mapping, values: { 'identity.name': 'Łukasz', 'combat.inspiration': false },
  }, { pdfLib: m.pdfLib, appearanceFont: font });
  expect(m.byName.get('identity.name').value).toBe('Łukasz');
  expect(m.byName.get('combat.inspiration').checked).toBe(false);
  expect(m.form.updateFieldAppearances).toHaveBeenCalledWith(font);
});
