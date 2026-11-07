/**
 * The GM owns all shop prices. Never estimate costs or silently accept
 * malformed stock: missing/invalid prices should be fixed before saving.
 * Editor format: Item name | 15 gp | 2 | GM-only
 * Quantity and GM-only marker are optional.
 */
export function isGmOnlyStockItem(item) {
  if (!item || typeof item !== 'object') return true;
  const isTrue = value => value === true || String(value).trim().toLowerCase() === 'true';
  const isFalse = value => value === false || String(value).trim().toLowerCase() === 'false';
  if (['hidden', 'is_hidden', 'gm_only', 'secret', 'private'].some(key => isTrue(item[key]))) return true;
  if (['visible', 'is_visible', 'player_visible', 'show_to_players'].some(key => isFalse(item[key]))) return true;
  return ['hidden', 'secret', 'private', 'gm', 'gm-only', 'gm_only']
    .includes(String(item.visibility || '').trim().toLowerCase());
}

export function parseShopStockText(value) {
  const lines = String(value || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (lines.length > 100) return { items: [], error: 'A shop can contain at most 100 entries.' };
  const items = [];
  for (const [index, line] of lines.entries()) {
    const parts = line.split('|').map(part => part.trim());
    if (parts.length < 2 || parts.length > 4 || !parts[0] || !parts[1] || parts[0].length > 120 || parts[1].length > 60) {
      return { items: [], error: 'Stock line ' + (index + 1) + ' needs an item name and a price, separated by |.' };
    }
    const entry = { name: parts[0], price: parts[1] };
    if (parts.length >= 3 && parts[2]) {
      if (!/^\d{1,6}$/.test(parts[2])) return { items: [], error: 'Stock line ' + (index + 1) + ' needs a whole-number quantity (0 or greater).' };
      entry.quantity = Number(parts[2]);
    }
    if (parts.length === 4) {
      if (!/^gm[- ]only$/i.test(parts[3])) return { items: [], error: 'Stock line ' + (index + 1) + ' has an invalid visibility marker. Use GM-only.' };
      entry.hidden = true;
    }
    items.push(entry);
  }
  return { items, error: '' };
}

export function formatShopStockText(value = []) {
  return (Array.isArray(value) ? value : [])
    // Display incomplete imported items instead of silently deleting them on save.
    // The parser rejects blank prices, prompting the GM to correct them explicitly.
    .filter(item => item && item.name)
    .map(item => {
      const hidden = isGmOnlyStockItem(item);
      const hasQuantity = item.quantity !== undefined && item.quantity !== null;
      return [String(item.name), String(item.price ?? ''), ...(hasQuantity || hidden ? [hasQuantity ? String(item.quantity) : ''] : []), ...(hidden ? ['GM-only'] : [])].join(' | ');
    })
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
