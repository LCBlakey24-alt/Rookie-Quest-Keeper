import CharacterRulesBridge from './CharacterRulesBridge';
import CharacterRulesBridgeV3 from './CharacterRulesBridgeV3';

describe('active character rules bridge', () => {
  test('default route bridge points at the V3 wrapper', () => {
    expect(CharacterRulesBridge).toBe(CharacterRulesBridgeV3);
  });
});
