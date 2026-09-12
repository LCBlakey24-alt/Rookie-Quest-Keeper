import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'PlayerDashboard.js'), 'utf8');

describe('Player Dashboard optional tab loading', () => {
  test('notes and received handouts load only when their tabs are opened', () => {
    expect(source).toContain("const PlayerNotesTab = lazy(() => import('@/components/tabs/PlayerNotesTab'));");
    expect(source).toContain("const PlayerHandoutsPanel = lazy(() => import('@/components/tabs/HandoutsTab').then(module => ({ default: module.PlayerHandoutsPanel })));\n");
    expect(source).not.toMatch(/import PlayerNotesTab from ['\"]@\/components\/tabs\/PlayerNotesTab['\"]/);
    expect(source).not.toMatch(/import \{ PlayerHandoutsPanel \} from ['\"]@\/components\/tabs\/HandoutsTab['\"]/);
    expect(source).toContain('<Suspense fallback={<div style={tabLoadingStyle}>Loading notes…</div>}>');
    expect(source).toContain('<Suspense fallback={<div style={tabLoadingStyle}>Loading received handouts…</div>}>');
  });
});
