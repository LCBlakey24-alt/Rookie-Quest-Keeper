import { summariseSessionNote } from './sessionNotePreview';

describe('GM home note previews', () => {
  it('keeps a concise note as-is', () => {
    expect(summariseSessionNote('Party reaches Balderin.')).toBe('Party reaches Balderin.');
  });
  it('shows only an excerpt of an imported campaign notebook without modifying the original', () => {
    const original = 'Session 1 notes.\n' + 'Hollowmere secrets and encounter details. '.repeat(1000);
    const preview = summariseSessionNote(original);
    expect(preview.length).toBeLessThanOrEqual(241);
    expect(preview).toMatch(/…$/);
    expect(original.length).toBeGreaterThan(10000);
    expect(preview).not.toContain('  ');
  });
  it('does not crash on blank or missing content', () => {
    expect(summariseSessionNote(null)).toBe('No text in this note yet.');
    expect(summariseSessionNote('')).toBe('No text in this note yet.');
  });
});
