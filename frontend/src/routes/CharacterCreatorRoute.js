// Character-creator-only bootstrap. Keeping these compatibility mutations inside
// the lazy creator route avoids loading the full 5e origin data on public/auth
// pages while preserving the exact builder behaviour when creation is opened.
import '@/data/applyTestBackgrounds';
import '@/data/sanitizeCharacterBuilderDraft';

export { default } from '@/components/CharacterRulesBridgeV2';
