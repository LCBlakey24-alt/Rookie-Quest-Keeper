import { writeEditableCharacterPdf } from './characterPdfFormWriter';

class MockPDFTextField {
  constructor(name) { this.name=name;this.value=''; }
  getName(){return this.name;}
  setText(value){this.value=value;}
}
class MockPDFCheckBox {
  constructor(name) { this.name=name;this.checked=false; }
  getName(){return this.name;}
  check(){this.checked=true;}
  uncheck(){this.checked=false;}
}
function mockedPDF(title='Rookie Quest Keeper - Interactive Character Sheet (2024 edition) V6'){
  const text=new MockPDFTextField('identity.name');
  const checkbox=new MockPDFCheckBox('combat.inspiration');
  const fields=[text,checkbox];
  for(let i=0;i<420;i++) fields.push(new MockPDFTextField('dummy.'+i));
  const byName=new Map(fields.map(f=>[f.getName(),f]));
  const form={
    getFields:jest.fn(()=>fields),
    getField:jest.fn(name=>byName.get(name)),
    getTextField:jest.fn(name=>{
      const field=byName.get(name);
      if(!(field instanceof MockPDFTextField))throw new Error('Not a text field');
      return field;
    }),
    getCheckBox:jest.fn(name=>{
      const field=byName.get(name);
      if(!(field instanceof MockPDFCheckBox))throw new Error('Not a checkbox');
      return field;
    }),
    updateFieldAppearances:jest.fn(),
    flatten:jest.fn(),
  };
  const document={
    getPageCount:()=>7,
    getTitle:()=>title,
    getForm:()=>form,
    save:jest.fn(async()=>new Uint8Array([37,80,68,70])),
  };
  const pdfLib={PDFDocument:{load:jest.fn(async()=>document)}};
  return {pdfLib,form,document,text,checkbox};
}
const mapping={edition:'2024',values:{'identity.name':'Mira Fenwalker','combat.inspiration':true},
  overflow:[],exportReady:true};

test('writes editable text and checkboxes without flattening', async()=>{
  const m=mockedPDF();
  const bytes=await writeEditableCharacterPdf(new Uint8Array([1]),mapping,
    {pdfLib:m.pdfLib,expectedEdition:'2024'});
  expect(bytes).toBeInstanceOf(Uint8Array);
  expect(m.text.value).toBe('Mira Fenwalker');
  expect(m.checkbox.checked).toBe(true);
  expect(m.form.flatten).not.toHaveBeenCalled();
  expect(m.document.save).toHaveBeenCalledWith({updateFieldAppearances:true});
});

test('prevents wrong edition or outdated forms before writing values',async()=>{
  const m=mockedPDF('Rookie Quest Keeper - Interactive Character Sheet (2014 edition) V6');
  await expect(writeEditableCharacterPdf(new Uint8Array([1]),mapping,
    {pdfLib:m.pdfLib})).rejects.toThrow(/not the correct/);
  expect(m.text.value).toBe('');
});

test('never fills an export with overflow',async()=>{
  const m=mockedPDF();
  await expect(writeEditableCharacterPdf(new Uint8Array([1]),
    {...mapping,exportReady:false,overflow:[{field:'magic.spells',value:['a']}]},
    {pdfLib:m.pdfLib})).rejects.toThrow(/overflow/);
  expect(m.text.value).toBe('');
});

test('rejects unknown template fields rather than silently dropping data',async()=>{
  const m=mockedPDF();
  await expect(writeEditableCharacterPdf(new Uint8Array([1]),
    {...mapping,values:{'not.in.this.pdf':'oops'}},{pdfLib:m.pdfLib}))
    .rejects.toThrow(/missing field/);
  expect(m.text.value).toBe('');
});

test('rejects wrong form field types',async()=>{
  const m=mockedPDF();
  await expect(writeEditableCharacterPdf(new Uint8Array([1]),
    {...mapping,values:{'identity.name':true}},{pdfLib:m.pdfLib}))
    .rejects.toThrow(/field type/);
  expect(m.text.value).toBe('');
});

test('requires Unicode font for unsupported non-Latin writing',async()=>{
  const m=mockedPDF();
  await expect(writeEditableCharacterPdf(new Uint8Array([1]),
    {...mapping,values:{'identity.name':'Łukasz'}},{pdfLib:m.pdfLib}))
    .rejects.toThrow(/Unicode/);
  expect(m.text.value).toBe('');
});

test('supports explicit Unicode appearance font',async()=>{
  const m=mockedPDF();
  const font={name:'test-embedded'};
  await writeEditableCharacterPdf(new Uint8Array([1]),{
    ...mapping,values:{'identity.name':'Łukasz','combat.inspiration':false},
  },{pdfLib:m.pdfLib,appearanceFont:font});
  expect(m.text.value).toBe('Łukasz');
  expect(m.checkbox.checked).toBe(false);
  expect(m.form.updateFieldAppearances).toHaveBeenCalledWith(font);
});
