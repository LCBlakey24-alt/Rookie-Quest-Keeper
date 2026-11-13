import { addSpinSample, glideDuration, releaseVelocity, spinTarget, startSpinSamples } from './wheelSpin';

describe('wheelSpin', () => {
  it('moves on one wedge for a short deliberate turn instead of springing back', () => {
    // Three wedges, 120 degrees each: a 30 degree turn used to snap back.
    expect(spinTarget(30, 0, 0, 120)).toBe(120);
    expect(spinTarget(-30, 0, 0, 120)).toBe(-120);
  });

  it('stays put for a tiny wobble', () => {
    expect(spinTarget(4, 0, 0, 120)).toBe(0);
  });

  it('locks on the wedge nearest where the wheel comes to rest', () => {
    expect(spinTarget(130, 0, 0, 120)).toBe(120);
    expect(spinTarget(200, 0, 0, 120)).toBe(240);
  });

  it('lets a flick carry the wheel on past where the finger let go', () => {
    // 20 degrees of drag at 1 degree per ms glides about 260 degrees further.
    expect(spinTarget(20, 0, 1, 60)).toBe(300);
    expect(spinTarget(-20, 0, -1, 60)).toBe(-300);
  });

  it('measures release speed from the most recent movement only', () => {
    let samples = startSpinSamples(0, 0);
    samples = addSpinSample(samples, 500, 0); // a long pause
    samples = addSpinSample(samples, 520, 10);
    samples = addSpinSample(samples, 540, 30);
    expect(releaseVelocity(samples, 540)).toBeCloseTo(0.75);
    expect(releaseVelocity(samples, 900)).toBe(0); // held still before letting go
  });

  it('glides longer for a bigger spin', () => {
    expect(glideDuration(0, 20)).toBeLessThan(glideDuration(0, 300));
    expect(glideDuration(0, 5000)).toBe(1400);
  });
});
