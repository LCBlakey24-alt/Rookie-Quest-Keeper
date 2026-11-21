/**
 * Pure pdf-lib adapter for the archived eight-page, 504-field Keeper V7 forms.
 *
 * Draft (#906/#911): no live UI or data fetch. The caller must authorise the
 * character before mapping. This writer must not guess, clip or discard data.
 * Long text, extra rows and mixed dice require continuation pages first.
 */
import {
  V7_CHECKBOX_NAMES, V7_FIELD_COUNT, V7_FIELD_NAMES, V7_PAGE_COUNT,
} from './characterPdfV7FieldSchema';

const EXPECTED_NAMES = new Set(V7_FIELD_NAMES);
const CHECKBOX_NAMES = new Set(V7_CHECKBOX_NAMES);
const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

export async function writeEditableCharacterPdf(templateBytes, mapping, options = {}) {
  const { pdfLib, expectedEdition, appearanceFont } = options;
  if (!pdfLib?.PDFDocument?.load) throw new Error('A compatible PDF library is required');
  if (!mapping || typeof mapping !== 'object' || mapping.exportReady !== true ||
      !mapping.values || (mapping.overflow?.length || 0) > 0) {
    throw new Error('PDF field mapping has overflow or is not export-ready');
  }
  if (!['2014', '2024'].includes(mapping.edition)) {
    throw new Error('Only the verified 2014 and 2024 templates are supported');
  }
  if (expectedEdition && expectedEdition !== mapping.edition) {
    throw new Error('PDF mapping and requested edition do not match');
  }

  const doc = await pdfLib.PDFDocument.load(templateBytes);
  if (doc.getPageCount() !== V7_PAGE_COUNT) {
    throw new Error('Expected an eight-page Keeper V7 template');
  }
  const title = String(doc.getTitle() || '');
  const requiredTitle = `Rookie Quest Keeper - Interactive Character Sheet (${mapping.edition} edition) V7`;
  if (title !== requiredTitle) {
    throw new Error('The selected PDF is not the correct V7 ' + mapping.edition + ' template');
  }
  const pages = doc.getPages();
  if (!Array.isArray(pages) || pages.length !== V7_PAGE_COUNT ||
      pages.some(page => {
        const { width, height } = page.getSize();
        return Math.abs(width - A4_WIDTH) > 2 || Math.abs(height - A4_HEIGHT) > 2;
      })) {
    throw new Error('The selected V7 template must have eight A4 pages');
  }

  const form = doc.getForm();
  const allFields = form.getFields();
  if (allFields.length !== V7_FIELD_COUNT) {
    throw new Error('Template does not contain 504 editable V7 fields');
  }
  const actualNames = allFields.map(field => field.getName());
  const available = new Set(actualNames);
  if (available.size !== V7_FIELD_COUNT ||
      actualNames.some(name => !EXPECTED_NAMES.has(name))) {
    throw new Error('PDF template does not match the reviewed V7 field schema');
  }

  const values = mapping.values;
  const missing = Object.keys(values).find(key => !available.has(key));
  if (missing) throw new Error('PDF template is missing field ' + missing);

  // Default Helvetica appearances cannot display arbitrary international text.
  // Reject rather than silently substitute unsupported glyphs or lose names.
  if (!appearanceFont) {
    const unicode = Object.entries(values).find(([key, value]) =>
      typeof value === 'string' && /[^\u0000-\u00FF]/.test(value));
    if (unicode) throw new Error('Field ' + unicode[0] + ' needs an embedded Unicode appearance font');
  }

  // Type-check the ENTIRE approved V7 contract before writing even one value.
  // A same-name wrong-type field can otherwise invalidate an exported PDF.
  const typed = new Map();
  for (const name of V7_FIELD_NAMES) {
    try {
      typed.set(name, CHECKBOX_NAMES.has(name)
        ? form.getCheckBox(name) : form.getTextField(name));
    } catch {
      throw new Error('Unexpected V7 form field type: ' + name);
    }
  }
  const resolved = [];
  for (const [key, value] of Object.entries(values)) {
    if ((typeof value === 'boolean') !== CHECKBOX_NAMES.has(key)) {
      throw new Error('Unexpected form field type: ' + key);
    }
    resolved.push({ field: typed.get(key), value });
  }
  for (const { field, value } of resolved) {
    if (typeof value === 'boolean') {
      if (value) field.check();
      else field.uncheck();
    } else {
      field.setText(String(value));
    }
  }
  // Retain editable AcroForm fields; do not flatten the exported PDF.
  if (appearanceFont) form.updateFieldAppearances(appearanceFont);
  return doc.save({ updateFieldAppearances: true });
}
