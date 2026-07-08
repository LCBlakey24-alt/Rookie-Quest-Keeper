import CharacterRulesBridge from './CharacterRulesBridge';
import CharacterRulesBridgeV2 from './CharacterRulesBridgeV2';

describe('active character rules bridge', () => {
  test('default route bridge points at the maintained V2 bridge', () => {
    expect(CharacterRulesBridge).toBe(CharacterRulesBridgeV2);
  });
});
