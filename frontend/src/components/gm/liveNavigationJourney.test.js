/**
 * Mounted: the Live Play command centre, driven the way a GM drives it.
 *
 * Replaces a six-item horizontal strip plus a "More" page. The acceptance
 * run below is the one from the brief: open the categories in turn, use a
 * tool from each, come back to Encounters and find the draft intact.
 */
import React from 'react';
import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LiveSessionGridMode from './LiveSessionGridMode';

jest.mock('@/lib/apiClient', () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn() }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() } }));

const apiClient = require('@/lib/apiClient');
const CAMPAIGN = 'camp-1';

const PLAYERS = [
  { id: 'p1', character_id: 'c1', name: 'Rina Ironside', hp: 40, max_hp: 54, ac: 19 },
  { id: 'p2', character_id: 'c2', name: 'Orren Oakenshade', hp: 31, max_hp: 38, ac: 16 },
];
const SCENARIOS = [{
  id: 'hm01', name: 'Hollowmere Ambush', live_ready: true, live_default: true, planned_encounter_order: 1,
  combatants: [
    { id: 'g1', name: 'Goblin', type: 'enemy', hp: 7, maxHp: 7 },
    { id: 'g2', name: 'Goblin', type: 'enemy', hp: 7, maxHp: 7 },
  ],
}];

function setWidth(width) {
  window.innerWidth = width;
  window.dispatchEvent(new Event('resize'));
}

function mockApi(scenarios = SCENARIOS) {
  apiClient.get.mockImplementation(url => {
    if (url === `/campaigns/${CAMPAIGN}`) return Promise.resolve({ data: { id: CAMPAIGN, name: 'Spilsby' } });
    if (url === `/campaigns/${CAMPAIGN}/combat-scenarios`) return Promise.resolve({ data: JSON.parse(JSON.stringify(scenarios)) });
    if (url === `/campaigns/${CAMPAIGN}/npcs`) return Promise.resolve({ data: [] });
    if (url === `/campaigns/${CAMPAIGN}/live-state`) return Promise.resolve({ data: { companion_npc_ids: [] } });
    if (url.includes('/live-party') || url.includes('/players')) return Promise.resolve({ data: JSON.parse(JSON.stringify(PLAYERS)) });
    return Promise.resolve({ data: [] });
  });
}

function livePlayElement(campaignId = CAMPAIGN, overrides = {}) {
  return (
    <MemoryRouter>
      <LiveSessionGridMode
        campaignId={campaignId} scenarios={SCENARIOS} players={PLAYERS}
        renderTool={toolId => <div data-testid={`tool-${toolId}`}>{toolId}</div>}
        onOpenSingleTab={() => {}} onRollDice={() => {}} onResumeCombat={() => {}}
        {...overrides}
      />
    </MemoryRouter>
  );
}

function openLivePlay(width = 1440, overrides = {}) {
  setWidth(width);
  return render(livePlayElement(CAMPAIGN, overrides));
}

function signInAs(accountId) {
  const payload = window.btoa(JSON.stringify({ sub: accountId }));
  localStorage.setItem('dm_token', `header.${payload}.signature`);
}

function validCheckpoint(accountId = 'keeper-gm', campaignId = CAMPAIGN) {
  return {
    version: 3,
    ownerId: accountId,
    campaignId,
    scenarioId: 'hm01',
    scenarioName: 'Hollowmere Ambush',
    combatants: [{ id: 'g1', name: 'Goblin' }],
    currentTurn: 0,
    round: 3,
    source: 'live-play',
  };
}

const counts = async () => (await screen.findByTestId('live-encounter-roster-counts')).textContent;

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  signInAs('keeper-gm');
  mockApi();
  localStorage.setItem(`gm.liveMode.focus.${CAMPAIGN}`, 'overview');
});

afterEach(() => setWidth(1024));

describe('the rail itself', () => {
  test('Run Overview, Encounters and Quick Notes are visible without opening anything', async () => {
    openLivePlay();
    const rail = await screen.findByTestId('live-tool-rail');
    expect(within(rail).getByTestId('live-tool-overview')).toBeInTheDocument();
    expect(within(rail).getByTestId('live-tool-combat')).toBeInTheDocument();
    expect(within(rail).getByTestId('live-tool-notes')).toBeInTheDocument();
  });

  test('all eight categories are offered', async () => {
    openLivePlay();
    const rail = await screen.findByTestId('live-tool-rail');
    ['players', 'npcs', 'beasts', 'world', 'rules', 'items', 'session', 'tools']
      .forEach(id => expect(within(rail).getByTestId(`live-category-${id}`)).toBeInTheDocument());
  });

  test('a collapsed category hides its tools and says so', async () => {
    openLivePlay();
    const rail = await screen.findByTestId('live-tool-rail');
    const beasts = within(rail).getByTestId('live-category-beasts');
    expect(beasts).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(beasts);
    expect(beasts).toHaveAttribute('aria-expanded', 'true');
    expect(within(rail).getByTestId('live-tool-monsters')).toBeVisible();
  });

  test('the active tool is marked, and its group opens even if collapsed', async () => {
    openLivePlay();
    const rail = await screen.findByTestId('live-tool-rail');
    fireEvent.click(within(rail).getByTestId('live-category-beasts'));
    fireEvent.click(within(rail).getByTestId('live-tool-monsters'));
    await screen.findByTestId('tool-monsters');

    expect(within(rail).getByTestId('live-tool-monsters')).toHaveAttribute('aria-current', 'page');
    // Collapse it again; the active tool must stay discoverable.
    fireEvent.click(within(rail).getByTestId('live-category-beasts'));
    expect(within(rail).getByTestId('live-category-beasts')).toHaveAttribute('aria-expanded', 'true');
  });

  test('the filter narrows to a tool and opens its group', async () => {
    openLivePlay();
    const rail = await screen.findByTestId('live-tool-rail');
    fireEvent.change(within(rail).getByTestId('live-tool-filter'), { target: { value: 'relation' } });
    expect(within(rail).getByTestId('live-tool-network')).toBeVisible();
    expect(within(rail).queryByTestId('live-tool-maps')).not.toBeInTheDocument();
  });

  test('Resume Combat appears only when a fight is unfinished', async () => {
    openLivePlay();
    await screen.findByTestId('live-tool-rail');
    expect(screen.queryByTestId('live-tool-resume-combat')).not.toBeInTheDocument();
  });

  test('and does appear when one is', async () => {
    signInAs('keeper-gm');
    localStorage.setItem(`gm.activeCombat.${CAMPAIGN}`, JSON.stringify(validCheckpoint()));
    const onResumeCombat = jest.fn();
    openLivePlay(1440, { onResumeCombat });
    expect(await screen.findByTestId('live-tool-resume-combat')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('live-tool-resume-combat'));
    expect(onResumeCombat).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('live-encounter-launcher')).not.toBeInTheDocument();
  });

  test('a saved fight belonging to another account is never offered', async () => {
    signInAs('keeper-gm');
    localStorage.setItem(`gm.activeCombat.${CAMPAIGN}`, JSON.stringify(validCheckpoint('different-gm')));
    openLivePlay();
    await screen.findByTestId('live-tool-rail');
    expect(screen.queryByTestId('live-tool-resume-combat')).not.toBeInTheDocument();
  });

  test('an account switch removes the previous account resume action immediately', async () => {
    signInAs('keeper-gm');
    localStorage.setItem(`gm.activeCombat.${CAMPAIGN}`, JSON.stringify(validCheckpoint()));
    openLivePlay();
    expect(await screen.findByTestId('live-tool-resume-combat')).toBeInTheDocument();

    signInAs('different-gm');
    act(() => window.dispatchEvent(new CustomEvent('rqk:auth-scope-changed')));
    await waitFor(() => expect(screen.queryByTestId('live-tool-resume-combat')).not.toBeInTheDocument());
  });

  test('an unstamped legacy fight is preserved but not advertised as safe to resume', async () => {
    signInAs('keeper-gm');
    const legacy = validCheckpoint();
    delete legacy.ownerId;
    localStorage.setItem(`gm.activeCombat.${CAMPAIGN}`, JSON.stringify(legacy));
    openLivePlay();
    await screen.findByTestId('live-tool-rail');
    expect(screen.queryByTestId('live-tool-resume-combat')).not.toBeInTheDocument();
  });
});

describe('campaign boundaries', () => {
  test('switching campaigns loads that campaign preference without overwriting it', async () => {
    const otherCampaign = 'camp-2';
    localStorage.setItem(`gm.liveMode.focus.${CAMPAIGN}`, JSON.stringify({ activeTool: 'maps' }));
    localStorage.setItem(`gm.liveMode.focus.${otherCampaign}`, JSON.stringify({ activeTool: 'monsters' }));
    const view = openLivePlay();
    expect(await screen.findByTestId('tool-maps')).toBeInTheDocument();

    view.rerender(livePlayElement(otherCampaign));
    expect(await screen.findByTestId('tool-monsters')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(`gm.liveMode.focus.${otherCampaign}`)))
      .toEqual({ activeTool: 'monsters' });
    expect(JSON.parse(localStorage.getItem(`gm.liveMode.focus.${CAMPAIGN}`)))
      .toEqual({ activeTool: 'maps' });
  });
});

describe('the acceptance run', () => {
  test('every category opens a real tool, and the encounter draft survives all of it', async () => {
    openLivePlay();
    const rail = await screen.findByTestId('live-tool-rail');

    // Encounters, then take a player out of the fight.
    fireEvent.click(within(rail).getByTestId('live-tool-combat'));
    await screen.findByTestId('live-encounter-launcher');
    await waitFor(async () => expect(await counts()).toContain('Party: 2'));
    const launcher = screen.getByTestId('live-encounter-launcher');
    fireEvent.click(within(launcher).getByText('Orren Oakenshade').closest('button'));
    await waitFor(async () => expect(await counts()).toContain('Party: 1'));

    // Walk every category, using a tool from each.
    const journey = [
      ['players', 'party'],
      ['npcs', 'npcs'],
      ['npcs', 'network'],
      ['beasts', 'monsters'],
      ['world', 'maps'],
      ['rules', 'reference-hub'],
      ['items', 'loot'],
      ['tools', 'player-display'],
      ['session', 'planner'],
    ];
    for (const [category, tool] of journey) {
      fireEvent.click(within(rail).getByTestId(`live-category-${category}`));
      const button = within(rail).getByTestId(`live-tool-${tool}`);
      fireEvent.click(button);
      // eslint-disable-next-line no-await-in-loop
      await screen.findByTestId(`tool-${tool}`);
    }

    // Back to Encounters. The exclusion must still be there.
    fireEvent.click(within(rail).getByTestId('live-tool-combat'));
    await screen.findByTestId('live-encounter-launcher');
    await waitFor(async () => expect(await counts()).toContain('Party: 1'));
    expect(await counts()).toContain('Enemies: 2');
  });

  test('Quick Notes and back leaves a half-typed creature alone', async () => {
    openLivePlay();
    const rail = await screen.findByTestId('live-tool-rail');
    fireEvent.click(within(rail).getByTestId('live-tool-combat'));
    let launcher = await screen.findByTestId('live-encounter-launcher');
    fireEvent.change(within(launcher).getByPlaceholderText('Name'), { target: { value: 'Bandit Capt' } });

    fireEvent.click(within(rail).getByTestId('live-tool-notes'));
    await screen.findByTestId('tool-notes');
    fireEvent.click(within(rail).getByTestId('live-tool-combat'));

    launcher = await screen.findByTestId('live-encounter-launcher');
    await waitFor(() => expect(within(launcher).getByPlaceholderText('Name')).toHaveValue('Bandit Capt'));
  });
});

describe('Bestiary encounter navigation', () => {
  test.each([390, 1024, 1440])('opens the exact requested encounter at %ipx without clicking a hidden DOM button', async width => {
    const target = {
      ...SCENARIOS[0],
      id: 'hm02', name: 'Cavern Ambush', live_default: false, planned_encounter_order: 2,
    };
    mockApi([...SCENARIOS, target]);
    const renderTool = (toolId, { openEncounterReview } = {}) => (
      toolId === 'monsters'
        ? <button type="button" data-testid="bestiary-open-saved" onClick={() => openEncounterReview('hm02')}>Open saved encounter</button>
        : <div data-testid={`tool-${toolId}`}>{toolId}</div>
    );
    openLivePlay(width, { renderTool });
    let rail;
    if (width < 720) {
      fireEvent.click(await screen.findByTestId('live-tool-menu'));
      rail = await screen.findByTestId('live-tool-rail');
    } else {
      rail = await screen.findByTestId('live-tool-rail');
    }
    fireEvent.click(within(rail).getByTestId('live-category-beasts'));
    fireEvent.click(within(rail).getByTestId('live-tool-monsters'));
    fireEvent.click(await screen.findByTestId('bestiary-open-saved'));

    const launcher = await screen.findByTestId('live-encounter-launcher');
    await waitFor(() => expect(within(launcher).getByLabelText('Choose battle type')).toHaveValue('hm02'));
    expect(within(launcher).getByLabelText('Choose battle type')).toHaveTextContent('Cavern Ambush');
  });
});

describe('the phone drawer', () => {
  const openDrawer = async () => {
    fireEvent.click(await screen.findByTestId('live-tool-menu'));
    return screen.findByTestId('live-tool-rail');
  };

  test('the rail is behind a Tools button that names the current tool', async () => {
    openLivePlay(390);
    const menu = await screen.findByTestId('live-tool-menu');
    expect(menu).toHaveTextContent('Run Overview');
    expect(screen.queryByTestId('live-tool-rail')).not.toBeInTheDocument();
  });

  test('it opens, shows the current tool, and closes on its own control', async () => {
    openLivePlay(390);
    const menu = await screen.findByTestId('live-tool-menu');
    expect(menu).toHaveAttribute('aria-expanded', 'false');
    expect(menu).toHaveAttribute('aria-controls', 'rqk-live-tool-drawer');
    const drawer = await openDrawer();
    expect(menu).toHaveAttribute('aria-expanded', 'true');
    expect(drawer).toHaveAttribute('role', 'dialog');
    expect(drawer).toHaveAttribute('aria-modal', 'true');
    expect(within(drawer).getByTestId('live-tool-rail-current')).toHaveTextContent('Run Overview');
    fireEvent.click(within(drawer).getByTestId('live-tool-rail-close'));
    await waitFor(() => expect(screen.queryByTestId('live-tool-rail')).not.toBeInTheDocument());
    expect(menu).toHaveAttribute('aria-expanded', 'false');
  });

  test('Escape closes it', async () => {
    openLivePlay(390);
    await openDrawer();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByTestId('live-tool-rail')).not.toBeInTheDocument());
  });

  test('the backdrop closes it', async () => {
    openLivePlay(390);
    await openDrawer();
    fireEvent.click(screen.getByTestId('live-tool-rail-scrim'));
    await waitFor(() => expect(screen.queryByTestId('live-tool-rail')).not.toBeInTheDocument());
  });

  test('choosing a tool closes the drawer rather than covering it', async () => {
    openLivePlay(390);
    const drawer = await openDrawer();
    fireEvent.click(within(drawer).getByTestId('live-category-beasts'));
    fireEvent.click(within(drawer).getByTestId('live-tool-monsters'));
    await screen.findByTestId('tool-monsters');
    expect(screen.queryByTestId('live-tool-rail')).not.toBeInTheDocument();
  });

  test('focus moves into the drawer and comes back to the button', async () => {
    openLivePlay(390);
    const menu = await screen.findByTestId('live-tool-menu');
    menu.focus();
    fireEvent.click(menu);
    const drawer = await screen.findByTestId('live-tool-rail');
    await waitFor(() => expect(drawer.contains(document.activeElement)).toBe(true));

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(document.activeElement).toBe(screen.getByTestId('live-tool-menu')));
  });
});

describe('tablet', () => {
  test('the rail is a compact column whose controls keep their names', async () => {
    openLivePlay(1024);
    const rail = await screen.findByTestId('live-tool-rail');
    expect(rail.className).toContain('rqk-tool-rail--tablet');
    // Labels are hidden visually, not removed: the accessible name survives.
    expect(within(rail).getByTestId('live-tool-combat')).toHaveAttribute('title', 'Encounters');
    expect(within(rail).getByTestId('live-tool-combat')).toHaveTextContent('Encounters');
  });
});
