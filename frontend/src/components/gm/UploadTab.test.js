import { buildTextHandoutPayload } from './UploadTabUtils';

describe('buildTextHandoutPayload', () => {
  test('trims GM text intake and maps it to a handout draft payload', () => {
    expect(buildTextHandoutPayload({
      title: '  Rusty Anchor Letter  ',
      content: '  Meet me at the old docks after sunset.  ',
    })).toEqual({
      title: 'Rusty Anchor Letter',
      content: 'Meet me at the old docks after sunset.',
      category: 'lore',
      attachment_type: 'text/plain',
      attachment_name: 'Rusty Anchor Letter.txt',
    });
  });
});
