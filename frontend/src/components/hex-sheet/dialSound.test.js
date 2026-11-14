describe('wheel click sound', () => {
  let audio;
  let source;

  beforeEach(() => {
    jest.resetModules();
    window.localStorage.clear();
    source = { connect: jest.fn(), start: jest.fn(), disconnect: jest.fn() };
    const gain = { gain: { setValueAtTime: jest.fn() }, connect: jest.fn(), disconnect: jest.fn() };
    source.connect.mockReturnValue(gain);
    audio = {
      state: 'running', currentTime: 1, sampleRate: 48000, destination: {},
      createBuffer: jest.fn((_channels, size) => ({ getChannelData: () => new Float32Array(size) })),
      createBufferSource: jest.fn(() => source), createGain: jest.fn(() => gain),
      createOscillator: jest.fn(),
    };
    window.AudioContext = jest.fn(() => audio);
  });

  afterEach(() => { delete window.AudioContext; window.localStorage.clear(); });

  test('plays a short click without a pitched oscillator and avoids stacked sources', () => {
    const { playDialTick } = require('./dialSound');
    playDialTick();
    playDialTick();
    expect(audio.createOscillator).not.toHaveBeenCalled();
    expect(audio.createBuffer).toHaveBeenCalledWith(1, 768, 48000);
    expect(audio.createBufferSource).toHaveBeenCalledTimes(1);
    expect(source.start).toHaveBeenCalledWith(1);
    audio.currentTime += 0.03;
    playDialTick();
    expect(audio.createBufferSource).toHaveBeenCalledTimes(2);
    expect(audio.createBuffer).toHaveBeenCalledTimes(1);
  });

  test('the saved mute preference prevents playback', () => {
    const { isDialSoundOn, setDialSoundOn, playDialTick } = require('./dialSound');
    setDialSoundOn(false);
    playDialTick();
    expect(isDialSoundOn()).toBe(false);
    expect(window.AudioContext).not.toHaveBeenCalled();
    expect(window.localStorage.getItem('rqk.hexSheet.dialSound')).toBe('off');
  });

  test('mute still works for this visit when storage is unavailable', () => {
    const { isDialSoundOn, setDialSoundOn, playDialTick } = require('./dialSound');
    const original = window.localStorage;
    Object.defineProperty(window, 'localStorage', { configurable: true, get: () => { throw new Error('blocked'); } });
    try {
      setDialSoundOn(false);
      playDialTick();
      expect(isDialSoundOn()).toBe(false);
      expect(window.AudioContext).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(window, 'localStorage', { configurable: true, value: original });
    }
  });
});
