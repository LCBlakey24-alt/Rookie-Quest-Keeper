/**
 * The GM owns all shop prices. Never estimate costs or silently accept
 * malformed stock: missing/invalid prices should be fixed before saving.
 * Editor format: Item name | 15 gp | 2 (quantity optional).
 */
export function parseShopStockText(value) {
  const lines = String(value || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (lines.length > 100) return { items: [], error: 'A shop can contain at most 100 entries.' };
  const items = [];
  for (const [index, line] of lines.entries()) {
    const parts = line.split('|').map(part => part.trim());
    if (parts.length < 2 || parts.length > 3 || !parts[0] || !parts[1] || parts[0].length > 120 || parts[1].length > 60) {
      return { items: [], error: 'Stock line ' + (index + 1) + ' needs an item name and a price, separated by |.' };
    }
    const entry = { name: parts[0], price: parts[1] };
    if (parts.length === 3 && parts[2]) {
      if (!/^\d{1,6}$/.test(parts[2])) return { items: [], error: 'Stock line ' + (index + 1) + ' needs a whole-number quantity (0 or greater).' };
      entry.quantity = Number(parts[2]);
    }
    items.push(entry);
  }
  return { items, error: '' };
}

export function formatShopStockText(value = []) {
  return (Array.isArray(value) ? value : [])
    .filter(item => item && item.name && item.price)
    .map(item => [String(item.name), String(item.price), ...(item.quantity !== undefined && item.quantity !== null ? [String(item.quantity)] : [])].join(' | '))
    .join('\n');
}

export function parsePlaceImageLines(value) {
  const lines = String(value || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (lines.length > 12) return { images: [], error: 'Use at most 12 image URLs per place.' };
  if (lines.some(url => url.length > 2000 || !(/^(https?:\/\/|\/(?!\/))/i.test(url)))) {
    return { images: [], error: 'Image links must be HTTPS/HTTP addresses or safe site-relative paths.' };
  }
  return { images: [...new Set(lines)], error: '' };
}
