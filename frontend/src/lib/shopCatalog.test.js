import { formatShopStockText, parsePlaceImageLines, parseShopStockText } from './shopCatalog';

test('reads explicit fantasy prices and optional stock without inventing any prices', () => {
  expect(parseShopStockText('Longsword | 15 gp | 2\nPotion of Healing | 50 gp')).toEqual({
    items: [{ name: 'Longsword', price: '15 gp', quantity: 2 }, { name: 'Potion of Healing', price: '50 gp' }],
    error: '',
  });
  expect(formatShopStockText([{ name: 'Longsword', price: '15 gp', quantity: 0 }])).toBe('Longsword | 15 gp | 0');
});

test('blocks malformed stock instead of saving unpriced or negative quantities', () => {
  expect(parseShopStockText('Mystery item').error).toMatch(/price/i);
  expect(parseShopStockText('Mystery item | 3 gp | -2').error).toMatch(/whole-number/i);
  expect(parseShopStockText('Mystery item | 3 gp | 0').items[0].quantity).toBe(0);
});

test('accepts only image URL forms safe for the image viewer', () => {
  expect(parsePlaceImageLines('https://example.com/map.png\n/images/inn.png\nhttps://example.com/map.png').images)
    .toEqual(['https://example.com/map.png', '/images/inn.png']);
  expect(parsePlaceImageLines('javascript:alert(1)').error).toMatch(/image links/i);
  expect(parsePlaceImageLines('//evil.com/x.png').error).toMatch(/image links/i);
});


test('a legacy GM-only item remains private after a stock editor round-trip', () => {
  const legacyItems = [
    { name: 'Longsword', price: '15 gp' },
    { name: 'Hidden Key', price: '99 gp', gm_only: true },
    { name: 'Sealed Potion', price: '200 gp', hidden: true, quantity: 0 },
    { name: 'Secret Ring', price: '300 gp', visibility: 'private' },
  ];
  const formatted = formatShopStockText(legacyItems);
  expect(formatted).toContain('Hidden Key | 99 gp |  | GM-only');
  expect(formatted).toContain('Sealed Potion | 200 gp | 0 | GM-only');
  const result = parseShopStockText(formatted);
  expect(result.error).toBe('');
  expect(result.items).toEqual([
    { name: 'Longsword', price: '15 gp' },
    { name: 'Hidden Key', price: '99 gp', hidden: true },
    { name: 'Sealed Potion', price: '200 gp', quantity: 0, hidden: true },
    { name: 'Secret Ring', price: '300 gp', hidden: true },
  ]);
});

test('stock editor rejects an accidental visibility marker', () => {
  expect(parseShopStockText('Hidden Key | 99 gp |  | private').error).toMatch(/visibility marker/i);
});


test('legacy unpriced stock remains visible in the editor and cannot be silently erased on a location edit', () => {
  const legacy = [
    { name: 'Public Mystery', quantity: 2 },
    { name: 'Secret Mystery', gm_only: true },
    { name: 'Available Potion', price: '50 gp' },
  ];
  const formText = formatShopStockText(legacy);
  expect(formText).toContain('Public Mystery |');
  expect(formText).toContain('Secret Mystery |  |  | GM-only');
  expect(formText).toContain('Available Potion | 50 gp');
  const result = parseShopStockText(formText);
  expect(result.items).toEqual([]);
  expect(result.error).toMatch(/Stock line 1.*price/i);

  const corrected = formText
    .replace('Public Mystery |', 'Public Mystery | 3 gp')
    .replace('Secret Mystery |  |', 'Secret Mystery | 6 gp |');
  const saved = parseShopStockText(corrected);
  expect(saved.error).toBe('');
  expect(saved.items).toEqual([
    { name: 'Public Mystery', price: '3 gp', quantity: 2 },
    { name: 'Secret Mystery', price: '6 gp', hidden: true },
    { name: 'Available Potion', price: '50 gp' },
  ]);
});
