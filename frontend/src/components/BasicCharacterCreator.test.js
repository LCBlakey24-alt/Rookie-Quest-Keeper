jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn() }), { virtual: true });
import { buildBasicCreatorPreset } from './BasicCharacterCreator';

describe('BasicCharacterCreator preset builder', () => {
  test('creates a safe Full Creator preset', () => {
    expect(buildBasicCreatorPreset({ name: 'Rook', characterClass: 'Wizard', race: 'Elf', background: 'Sage', abilityFocus: 'intelligence', equipmentMode: 'recommended' })).toMatchObject({ source: 'basic-creator', name: 'Rook', characterClass: 'Wizard', race: 'Elf', background: 'Sage', abilityFocus: 'intelligence' });
  });

  test('falls back when unknown rules names are provided', () => {
    expect(buildBasicCreatorPreset({ characterClass: 'Laser Knight', race: 'Robot', background: 'Astronaut' })).toMatchObject({ characterClass: 'Fighter', race: 'Human', background: 'Soldier' });
  });
});
