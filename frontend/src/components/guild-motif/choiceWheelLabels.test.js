import { RING_LABEL_MAX, RING_LABEL_MIN, fitRingLabel, fitRingLabels, readsUpsideDown } from './choiceWheel';

const step = (count) => 360 / count;

test('a short name on a roomy wheel is printed whole, at full size, on one line', () => {
  const fit = fitRingLabel('Bard', step(12));
  expect(fit.lines.map((line) => line.text)).toEqual(['Bard']);
  expect(fit.size).toBe(RING_LABEL_MAX);
  expect(fit.lines[0].squeeze).toBeNull();
});

test('more wedges make the same name smaller, never a three-letter code', () => {
  const twelve = fitRingLabel('Barbarian', step(12));
  const twenty = fitRingLabel('Barbarian', step(20));
  expect(twelve.lines[0].text).toBe('Barbarian');
  expect(twenty.lines[0].text).toBe('Barbarian');
  expect(twenty.size).toBeLessThan(twelve.size);
});

test('two-word and hyphenated names take two lines when that lets them be larger', () => {
  expect(fitRingLabel('Custom Lineage', step(16)).lines.map((line) => line.text)).toEqual(['Custom', 'Lineage']);
  expect(fitRingLabel('Fey-Touched', step(16)).lines.map((line) => line.text)).toEqual(['Fey-', 'Touched']);
});

test('a name that cannot fit even at the smallest size is squeezed to its room, not cut', () => {
  const fit = fitRingLabel('Extraordinarilylongname', step(30));
  expect(fit.size).toBe(RING_LABEL_MIN);
  expect(fit.lines[0].text).toBe('Extraordinarilylongname');
  expect(fit.lines[0].squeeze).toBeGreaterThan(0);
});

test('single-line mode keeps a label on one line (for wedges that also show dots)', () => {
  expect(fitRingLabel('Custom Lineage', step(16), { singleOnly: true }).lines).toHaveLength(1);
});

test('names on one wheel share a size, so short ones are not huge beside long ones', () => {
  const fits = fitRingLabels(['Elf', 'Orc', 'Human', 'Dwarf', 'Tiefling', 'Halfling', 'Dragonborn'], 360 / 16);
  const sizeOf = (index) => fits[index].size;
  expect(sizeOf(0)).toBe(sizeOf(2));
  expect(sizeOf(0)).toBeLessThan(RING_LABEL_MAX);
  expect(sizeOf(6)).toBeLessThanOrEqual(sizeOf(0));
});

test('labels on the lower half of the wheel are flipped to read upright', () => {
  expect(readsUpsideDown(0)).toBe(false);
  expect(readsUpsideDown(80)).toBe(false);
  expect(readsUpsideDown(180)).toBe(true);
  expect(readsUpsideDown(-150)).toBe(true);
  expect(readsUpsideDown(300)).toBe(false);
});

test('both lines of a two-line name fit the narrower inner radius, so a flipped label never spills', () => {
  const fit = fitRingLabel('Clockwork Gnome', 360 / 24);
  const innerRoom = 2 * Math.PI * Math.min(...fit.lines.map((line) => line.radius)) * (15 / 360) * 0.84;
  fit.lines.forEach((line) => {
    const width = line.squeeze ?? line.text.length * 0.7 * fit.size;
    expect(width).toBeLessThanOrEqual(innerRoom + 0.01);
  });
});
