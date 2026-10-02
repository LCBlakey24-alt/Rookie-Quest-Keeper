import { mapImageSource } from './WorldMapTab';

describe('mapImageSource', () => {
  test('prefers stored media URLs over legacy base64 data', () => {
    expect(mapImageSource({
      image_url: 'https://example.invalid/private-map.jpg',
      image_data: 'data:image/jpeg;base64,legacy',
    })).toBe('https://example.invalid/private-map.jpg');
  });

  test('keeps legacy base64 maps working during storage migration', () => {
    expect(mapImageSource({
      image_data: 'data:image/jpeg;base64,legacy',
    })).toBe('data:image/jpeg;base64,legacy');
  });

  test('returns an empty source for malformed map data', () => {
    expect(mapImageSource(null)).toBe('');
    expect(mapImageSource('bad')).toBe('');
    expect(mapImageSource({})).toBe('');
  });
});
