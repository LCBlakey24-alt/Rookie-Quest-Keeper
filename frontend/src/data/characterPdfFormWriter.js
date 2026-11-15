/**
 * Pure adapter for filling Keeper's V6 PDFs with pdf-lib.
 *
 * The runtime passes pdfLib.PDFDocument (MIT licensed), so this file adds no
 * dependency and does not bundle/download any PDF template. It is NOT wired
 * to the site yet. Never pass GM-private or unauthorised character records.
 *
 * mapping must be the checked result of mapFullCharacterPdfFields.
 * Long values/overflow require continuation pages FIRST; no silent clipping.
 */
export async function writeEditableCharacterPdf(templateBytes, mapping, options = {}) {
  const { pdfLib, expectedEdition, appearanceFont } = options;
  if (!pdfLib?.PDFDocument?.load) throw new Error('A compatible PDF library is required');
  if (!mapping || typeof mapping !== 'object' || mapping.exportReady !== true ||
      !mapping.values || (mapping.overflow?.length || 0) > 0) {
    throw new Error('PDF field mapping has overflow or is not export-ready');
  }
  if (!['2014','2024'].includes(mapping.edition)) {
    throw new Error('Only the verified 2014 and 2024 templates are supported');
  }
  if (expectedEdition && expectedEdition !== mapping.edition) {
    throw new Error('PDF mapping and requested edition do not match');
  }
  const doc=await pdfLib.PDFDocument.load(templateBytes);
  if (doc.getPageCount() !== 7) throw new Error('Expected a seven-page Keeper V6 template');
  const title=String(doc.getTitle() || '');
  const editionMarker='('+mapping.edition+' edition)';
  if (!title.includes(editionMarker) || !title.includes('V6')) {
    throw new Error('The selected PDF is not the correct V6 '+mapping.edition+' template');
  }
  const form=doc.getForm();
  const all=form.getFields();
  if (all.length !== 422) throw new Error('Template does not contain 422 editable fields');
  const available=new Set(all.map(field=>field.getName()));
  const values=mapping.values;
  const missing=Object.keys(values).filter(key=>!available.has(key));
  if (missing.length) throw new Error('PDF template is missing field '+missing[0]);

  // Explicitly reject non-Latin text until a Unicode supporting embedded font
  // has been supplied. pdf-lib's default Helvetica is limited to WinAnsi.
  if (!appearanceFont) {
    const unicode=Object.entries(values).find(([key,value])=>
      typeof value==='string' && /[^\u0000-\u00FF]/.test(value));
    if (unicode) throw new Error('Field '+unicode[0]+' needs an embedded Unicode appearance font');
  }

  // Perform no partial form writes until every field is known and type-safe.
  const typeErrors=[];
  for (const [key,value] of Object.entries(values)){
    try {
      const f=form.getField(key);
      if (typeof value==='boolean' && !f.constructor?.name?.includes('CheckBox'))
        typeErrors.push(key);
      if (typeof value!=='boolean' && !f.constructor?.name?.includes('TextField'))
        typeErrors.push(key);
    } catch { typeErrors.push(key); }
  }
  if(typeErrors.length)throw new Error('Unexpected form field type: '+typeErrors[0]);

  for(const [key,value] of Object.entries(values)){
    if(typeof value==='boolean'){
      const check=form.getCheckBox(key);
      if(value)check.check();else check.uncheck();
    }else{
      form.getTextField(key).setText(String(value));
    }
  }
  // Update appearance streams so filled values are visible in PDF viewers,
  // but retain the AcroForm for user edits on phones/tablets.
  if(appearanceFont)form.updateFieldAppearances(appearanceFont);
  const pdf=await doc.save({updateFieldAppearances:true});
  return pdf;
}
