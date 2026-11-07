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
