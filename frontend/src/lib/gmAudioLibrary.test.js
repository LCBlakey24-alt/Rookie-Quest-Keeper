import { importedCampaignAudio, listCampaignAudio, validAudioFile, getAudioState } from './gmAudioLibrary';

const storage = values => ({ getItem: key => Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null });

test('only MP3s no larger than 25 MB can enter GM audio library', () => {
  expect(validAudioFile({ name: 'Battle.mp3', size: 12000, type: 'audio/mpeg' })).toBe(true);
  expect(validAudioFile({ name: 'Battle.exe', size: 12000, type: 'application/octet-stream' })).toBe(false);
  expect(validAudioFile({ name: 'Huge.mp3', size: 26 * 1024 * 1024 })).toBe(false);
  expect(validAudioFile({ name: 'Blank.mp3', size: 0 })).toBe(false);
});

test('preloaded MP3s are found from private campaign workspace without external URLs', () => {
  const local = storage({
    'rqk.desktopWorkspace.v1': JSON.stringify({
      collections: { 'eh-camp': { 'audio-tracks': [
        { id: 'voice-1', name: 'Mabel speaks', attachment_url: 'rqk-attachment://eh-private/mabel.mp3', private_notes: 'Not published' },
        { id: 'voice-2', name: 'No recording' },
      ] } },
    }),
  });
  const tracks = importedCampaignAudio('eh-camp', local);
  expect(tracks).toHaveLength(1);
  expect(tracks[0]).toMatchObject({ name: 'Mabel speaks', source: 'campaign' });
  expect(listCampaignAudio('different-camp', local)).toEqual([]);
  expect(JSON.stringify(tracks)).not.toContain('private_notes');
});

test('audio controls begin stopped with reusable volume', () => {
  expect(getAudioState()).toMatchObject({ status: 'stopped', volume: 0.7, loop: true });
});
