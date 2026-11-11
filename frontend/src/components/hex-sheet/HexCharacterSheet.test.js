/**
 * The hexagonal sheet as a player uses it: synthetic character, mocked API.
 */
import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import HexCharacterSheet from './HexCharacterSheet';
import { DEAL_DURATION_MS, DEAL_STAGGER_MS } from './HexWheel';
import { SLOT } from './hexGeometry';

jest.mock('@/lib/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn(), patch: jest.fn(), post: jest.fn(), put: jest.fn() },
}));
jest.mock('sonner', () => {
  const toast = Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() });
  return { toast, Toaster: () => null };
});
// The real tray needs WebGL. These tests only need to know what was rolled.
const rolled = [];
jest.mock('@/components/DiceRollFlicker', () => function MockFlicker(props) {
  rolled.push(props);
  return <div data-testid="dice-flicker">{props.label} {props.total}</div>;
});
jest.mock('@/components/LevelUpWizard', () => function MockLevelUp() {
  return <div data-testid="level-up-wizard" />;
});

const apiClient = require('@/lib/apiClient').default;
const { toast } = require('sonner');

const PUNCH = {
  id: 'char-punch', name: 'Punch', level: 5, character_class: 'Monk', subclass: 'Way of the Open Hand',
  strength: 12, dexterity: 18, constitution: 14, intelligence: 10, wisdom: 16, charisma: 8,
  saving_throw_proficiencies: ['strength', 'dexterity'], max_hit_points: 35, current_hit_points: 35,
};

async function openSheet(character = PUNCH) {
  apiClient.get.mockResolvedValue({ data: character });
  render(
    <MemoryRouter initialEntries={[`/characters/${character.id}/hex`]}>
      <Routes>
        <Route path="/characters/:characterId/hex" element={<HexCharacterSheet />} />
        <Route path="/characters/:characterId" element={<div data-testid="classic-sheet" />} />
        <Route path="/characters/:characterId/edit" element={<div data-testid="edit-page" />} />
        <Route path="/characters" element={<div data-testid="my-characters" />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByTestId('hex-wheel');
}

const lastRoll = () => rolled[rolled.length - 1];
const crumbs = () => within(screen.getByTestId('hex-crumbs')).getAllByRole('listitem').map((item) => item.textContent);

beforeEach(() => {
  jest.clearAllMocks();
  apiClient.patch.mockReset();
  rolled.length = 0;
});

describe('header and vitals', () => {
  test('show the character as in the sketch', async () => {
    await openSheet();
    expect(screen.getByRole('heading', { name: 'Punch' })).toBeInTheDocument();
    expect(screen.getByText('Monk — Level 5')).toBeInTheDocument();
    expect(screen.getByText('Way of the Open Hand')).toBeInTheDocument();
    expect(screen.getByTestId('hex-vital-hp')).toHaveTextContent('35 / 35');
    expect(screen.getByTestId('hex-vital-initiative')).toHaveTextContent('+4');
    expect(screen.getByTestId('hex-vital-ac')).toHaveTextContent(/\d+/);
  });

  test('initiative rolls a d20 with the initiative modifier', async () => {
    await openSheet();
    fireEvent.click(screen.getByTestId('hex-vital-initiative'));
    expect(lastRoll()).toMatchObject({ label: 'Initiative', modifier: 4, theme: 'player' });
    expect(lastRoll().rolls[0].sides).toBe(20);
  });

  test('HP opens the HP dial in place, and Back returns to the wheel', async () => {
    await openSheet();
    fireEvent.click(screen.getByTestId('hex-vital-hp'));
    expect(screen.getByTestId('hex-hp-dial')).toBeInTheDocument();
    expect(crumbs()).toEqual(['Character', 'Hit Points']);
    fireEvent.click(screen.getByTestId('hex-back'));
    expect(screen.getByTestId('hex-wedge-core')).toBeInTheDocument();
  });
});

describe('the main wheel', () => {
  test('puts each section where the sketch puts it', async () => {
    await openSheet();
    const slotOf = (id) => Number(screen.getByTestId(`hex-wedge-${id}`).getAttribute('data-slot'));
    expect(slotOf('core')).toBe(SLOT.UPPER_LEFT);
    expect(slotOf('skills')).toBe(SLOT.UPPER_RIGHT);
    expect(slotOf('equipment')).toBe(SLOT.LEFT);
    expect(slotOf('magic')).toBe(SLOT.RIGHT);
    expect(slotOf('traits')).toBe(SLOT.LOWER_LEFT);
    expect(slotOf('combat')).toBe(SLOT.LOWER_RIGHT);
    expect(screen.getByTestId('hex-centre')).toHaveTextContent('D20');
  });

  test('wedges deal out clockwise from the upper left, and the whole wheel is in place within a second', async () => {
    await openSheet();
    const delayOf = (id) => parseInt(screen.getByTestId(`hex-wedge-${id}`).style.animationDelay, 10);
    const clockwise = ['core', 'skills', 'magic', 'combat', 'traits', 'equipment'].map(delayOf);
    expect(clockwise).toEqual([0, 1, 2, 3, 4, 5].map((n) => n * DEAL_STAGGER_MS));
    expect(Math.max(...clockwise) + DEAL_DURATION_MS).toBeLessThanOrEqual(1000);
    // The centre never moves: it is not part of the deal.
    expect(screen.getByTestId('hex-centre').closest('.hex-wheel__deal')).toBeNull();
  });

  test.each(['skills', 'magic', 'traits'])('%s opens in place and offers the classic sheet for now', async (id) => {
    await openSheet();
    fireEvent.click(screen.getByTestId(`hex-wedge-${id}`));
    expect(screen.getByTestId('hex-coming-soon')).toBeInTheDocument();
    expect(screen.getByTestId('hex-sheet')).toBeInTheDocument(); // never left the page
    fireEvent.click(screen.getByTestId('hex-back'));
    expect(screen.getByTestId('hex-wedge-core')).toBeInTheDocument();
  });
});

describe('Core Abilities', () => {
  test('shows each ability with its check modifier, clockwise from the upper left', async () => {
    await openSheet();
    fireEvent.click(screen.getByTestId('hex-wedge-core'));
    const expected = { strength: ['+1', SLOT.UPPER_LEFT], dexterity: ['+4', SLOT.UPPER_RIGHT], constitution: ['+2', SLOT.RIGHT],
      intelligence: ['+0', SLOT.LOWER_RIGHT], wisdom: ['+3', SLOT.LOWER_LEFT], charisma: ['-1', SLOT.LEFT] };
    Object.entries(expected).forEach(([key, [modifier, slot]]) => {
      const wedge = screen.getByTestId(`hex-wedge-${key}`);
      expect(wedge).toHaveTextContent(modifier);
      expect(Number(wedge.getAttribute('data-slot'))).toBe(slot);
    });
  });

  test('a check rolls the ability modifier; a save adds proficiency when proficient', async () => {
    await openSheet();
    fireEvent.click(screen.getByTestId('hex-wedge-core'));
    fireEvent.click(screen.getByTestId('hex-wedge-strength'));
    expect(screen.getByTestId('hex-roll-check')).toHaveTextContent('+1');
    expect(screen.getByTestId('hex-roll-save')).toHaveTextContent('+4');
    fireEvent.click(screen.getByTestId('hex-roll-check'));
    expect(lastRoll()).toMatchObject({ label: 'Strength Check', modifier: 1 });

    fireEvent.click(screen.getByTestId('hex-wedge-wisdom'));
    fireEvent.click(screen.getByTestId('hex-roll-save'));
    expect(lastRoll()).toMatchObject({ label: 'Wisdom Save', modifier: 3 }); // not proficient
  });

  test('after rolling, the player is back on the Core Abilities wheel', async () => {
    await openSheet();
    fireEvent.click(screen.getByTestId('hex-wedge-core'));
    fireEvent.click(screen.getByTestId('hex-wedge-dexterity'));
    fireEvent.click(screen.getByTestId('hex-roll-save'));
    expect(lastRoll()).toMatchObject({ label: 'Dexterity Save', modifier: 7 });
    expect(crumbs()).toEqual(['Character', 'Core Abilities']);
    expect(screen.queryByTestId('hex-roll-choice')).not.toBeInTheDocument();
  });
});

describe('Back works like history', () => {
  test('Main → Core Abilities → Strength, then back one level at a time', async () => {
    await openSheet();
    expect(screen.queryByTestId('hex-back')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('hex-wedge-core'));
    fireEvent.click(screen.getByTestId('hex-wedge-strength'));
    expect(crumbs()).toEqual(['Character', 'Core Abilities', 'Strength']);
    fireEvent.click(screen.getByTestId('hex-back'));
    expect(crumbs()).toEqual(['Character', 'Core Abilities']);
    fireEvent.click(screen.getByTestId('hex-back'));
    expect(crumbs()).toEqual(['Character']);
    expect(screen.queryByTestId('hex-back')).not.toBeInTheDocument();
  });

  test('the header arrow leaves for My Characters', async () => {
    await openSheet();
    fireEvent.click(screen.getByTestId('hex-leave'));
    expect(screen.getByTestId('my-characters')).toBeInTheDocument();
  });
});

describe('the D20 centre and dice wheel', () => {
  test('the centre turns the wheel into dice, and a die rolls through the existing tray', async () => {
    await openSheet();
    fireEvent.click(screen.getByTestId('hex-centre'));
    expect(crumbs()).toEqual(['Character', 'Dice']);
    ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'].forEach((id) => expect(screen.getByTestId(`hex-wedge-${id}`)).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('hex-wedge-d6'));
    expect(lastRoll().label).toBe('d6');
    expect(lastRoll().rolls.every((roll) => roll.sides === 6 && roll.result >= 1 && roll.result <= 6)).toBe(true);
    expect(crumbs()).toEqual(['Character', 'Dice']); // stays on the dice wheel
  });

  test('the dice wheel centre rolls a d100 and More dice opens the full roller', async () => {
    await openSheet();
    fireEvent.click(screen.getByTestId('hex-centre'));
    fireEvent.click(screen.getByTestId('hex-centre'));
    expect(lastRoll().label).toBe('d100');
    const opened = jest.fn();
    window.addEventListener('rq-dice-open', opened);
    fireEvent.click(screen.getByTestId('hex-more-dice'));
    window.removeEventListener('rq-dice-open', opened);
    expect(opened).toHaveBeenCalledTimes(1);
  });
});

describe('keyboard', () => {
  test('wedges are buttons that Enter and Space activate', async () => {
    await openSheet();
    const core = screen.getByRole('button', { name: 'Open Core Abilities' });
    fireEvent.keyDown(core, { key: 'Enter' });
    expect(crumbs()).toEqual(['Character', 'Core Abilities']);
    fireEvent.keyDown(screen.getByTestId('hex-wedge-strength'), { key: ' ' });
    expect(screen.getByTestId('hex-roll-choice')).toBeInTheDocument();
    expect(screen.getByTestId('hex-roll-check')).toHaveFocus();
  });

  test('arrow keys move round the wheel clockwise and back', async () => {
    await openSheet();
    const core = screen.getByTestId('hex-wedge-core');
    core.focus();
    fireEvent.keyDown(core, { key: 'ArrowRight' });
    expect(screen.getByTestId('hex-wedge-skills')).toHaveFocus();
    fireEvent.keyDown(screen.getByTestId('hex-wedge-skills'), { key: 'ArrowLeft' });
    expect(core).toHaveFocus();
    fireEvent.keyDown(core, { key: 'ArrowLeft' });
    expect(screen.getByTestId('hex-wedge-equipment')).toHaveFocus();
  });
});

describe('footer', () => {
  test('Level Up opens the existing level-up wizard', async () => {
    await openSheet();
    fireEvent.click(screen.getByTestId('hex-level-up'));
    expect(screen.getByTestId('level-up-wizard')).toBeInTheDocument();
  });

  test('Settings offers editing and the classic sheet', async () => {
    await openSheet();
    fireEvent.click(screen.getByTestId('hex-settings'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit character' }));
    expect(screen.getByTestId('edit-page')).toBeInTheDocument();
  });
});

test('rolling and browsing never write to the character', async () => {
  await openSheet();
  fireEvent.click(screen.getByTestId('hex-wedge-core'));
  fireEvent.click(screen.getByTestId('hex-wedge-strength'));
  fireEvent.click(screen.getByTestId('hex-roll-check'));
  fireEvent.click(screen.getByTestId('hex-vital-initiative'));
  expect(apiClient.patch).not.toHaveBeenCalled();
  expect(apiClient.put).not.toHaveBeenCalled();
});

test('a character that cannot be loaded says so and offers a way out', async () => {
  apiClient.get.mockRejectedValue({ response: { data: { detail: 'Character not found' } } });
  render(
    <MemoryRouter initialEntries={['/characters/missing/hex']}>
      <Routes><Route path="/characters/:characterId/hex" element={<HexCharacterSheet />} /></Routes>
    </MemoryRouter>,
  );
  expect(await screen.findByRole('alert')).toHaveTextContent('Character not found');
  expect(screen.getByRole('link', { name: 'Back to My Characters' })).toBeInTheDocument();
});

describe('the HP dial saves through the existing queue', () => {
  // Each test gets its own character: the save queue rightly makes a
  // character's next load wait for its earlier writes, so tests must not
  // share one.
  let serial = 0;
  const openDial = async (character = PUNCH) => {
    serial += 1;
    await openSheet({ ...character, id: `char-dial-${serial}` });
    fireEvent.click(screen.getByTestId('hex-vital-hp'));
    return screen.getByTestId('hex-hp-slider');
  };

  test('confirming sends the classic-sheet PATCH and reports success only after the server answers', async () => {
    let answer;
    apiClient.patch.mockImplementation((url, body) => new Promise((resolve) => { answer = () => resolve({ data: { ...PUNCH, ...body } }); }));
    const slider = await openDial({ ...PUNCH, current_hit_points: 30, temporary_hit_points: 4 });
    fireEvent.keyDown(slider, { key: 'PageDown' });
    fireEvent.keyDown(slider, { key: 'ArrowDown' }); // -6
    fireEvent.click(screen.getByTestId('hex-hp-confirm'));
    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith(expect.stringMatching(/^\/characters\/char-dial-\d+$/), { current_hit_points: 28, temporary_hit_points: 0, temp_hp: 0 }));
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByTestId('hex-hp-status')).toHaveTextContent('Saving');
    await act(async () => { answer(); });
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Hit points 28 / 35'));
    expect(screen.getByTestId('hex-vital-hp')).toHaveTextContent('28 / 35');
    expect(screen.getByTestId('hex-hp-status')).toHaveTextContent('Saved');
  });

  test('a failed save is reported, rolled back and never shown as saved', async () => {
    apiClient.patch.mockRejectedValue({ response: { data: { detail: 'Server unavailable' } } });
    const slider = await openDial({ ...PUNCH, current_hit_points: 20 });
    fireEvent.keyDown(slider, { key: 'ArrowUp' });
    await act(async () => { fireEvent.click(screen.getByTestId('hex-hp-confirm')); });
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByTestId('hex-vital-hp')).toHaveTextContent('20 / 35');
    expect(screen.getByTestId('hex-hp-status')).toHaveTextContent('Not saved');
  });

  test('damage while concentrating raises the concentration check', async () => {
    apiClient.patch.mockImplementation((url, body) => Promise.resolve({ data: { ...PUNCH, concentrating_on: 'Bless', ...body } }));
    const slider = await openDial({ ...PUNCH, concentrating_on: 'Bless' });
    fireEvent.keyDown(slider, { key: 'PageDown' }); // -5
    await act(async () => { fireEvent.click(screen.getByTestId('hex-hp-confirm')); });
    await waitFor(() => expect(toast.warning).toHaveBeenCalled());
    const [title, options] = toast.warning.mock.calls[0];
    expect(title).toContain('5 damage');
    expect(options.description).toContain('DC 10');
    act(() => { options.action.onClick(); });
    expect(lastRoll().label).toBe('Concentration Save DC 10');
  });

  test('temporary HP changes go to the temporary pool only', async () => {
    apiClient.patch.mockImplementation((url, body) => Promise.resolve({ data: { ...PUNCH, ...body } }));
    const slider = await openDial();
    fireEvent.click(screen.getByTestId('hex-hp-target-temp'));
    fireEvent.keyDown(slider, { key: 'PageUp' });
    await act(async () => { fireEvent.click(screen.getByTestId('hex-hp-confirm')); });
    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith(expect.stringMatching(/^\/characters\/char-dial-\d+$/), { temporary_hit_points: 5, temp_hp: 5 }));
    await waitFor(() => expect(screen.getByTestId('hex-vital-hp')).toHaveTextContent('+5 temp'));
  });

  test('cancel changes nothing', async () => {
    const slider = await openDial();
    fireEvent.keyDown(slider, { key: 'PageDown' });
    fireEvent.click(screen.getByTestId('hex-hp-cancel'));
    expect(apiClient.patch).not.toHaveBeenCalled();
    expect(screen.getByTestId('hex-wedge-core')).toBeInTheDocument();
  });
});

describe('the Combat wheel', () => {
  const openCombat = async () => {
    await openSheet({ ...PUNCH, id: `char-combat-${Math.random()}` });
    fireEvent.click(screen.getByTestId('hex-wedge-combat'));
  };
  // A tap on a wedge: pointer down and up without moving.
  const tap = (testId) => {
    const target = screen.getByTestId(testId).querySelector('polygon');
    fireEvent.pointerDown(target, { pointerId: 1, button: 0, clientX: 0, clientY: 0 });
    fireEvent.pointerUp(target, { pointerId: 1, clientX: 0, clientY: 0 });
  };

  test('three wedges, Actions at the top, and the Actions list below the wheel', async () => {
    await openCombat();
    expect(screen.getAllByRole('radio').map((radio) => radio.getAttribute('aria-label'))).toEqual(['Actions', 'Bonus Actions', 'Reactions']);
    expect(screen.getByTestId('hex-spin-action')).toHaveAttribute('aria-checked', 'true');
    expect(crumbs()).toEqual(['Character', 'Actions']);
    const list = screen.getByTestId('hex-combat-list');
    expect(within(list).getByRole('heading', { name: 'Actions' })).toBeInTheDocument();
    expect(within(list).getByText('Unarmed Strike')).toBeInTheDocument();
    expect(within(list).queryByRole('heading', { name: 'Bonus Actions' })).toBeNull();
  });

  test('tapping a wedge spins it to the top and shows its list, without stacking history', async () => {
    await openCombat();
    tap('hex-spin-bonus');
    expect(screen.getByTestId('hex-spin-bonus')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('hex-spin-wheel')).toHaveAttribute('data-rotation', '-120');
    expect(within(screen.getByTestId('hex-combat-list')).getByRole('heading', { name: 'Bonus Actions' })).toBeInTheDocument();
    tap('hex-spin-reaction');
    expect(within(screen.getByTestId('hex-combat-list')).getByText(/Opportunity Attack/)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('hex-back'));
    expect(screen.getByTestId('hex-wedge-core')).toBeInTheDocument();
  });

  test('the arrow keys turn the wheel one wedge at a time', async () => {
    await openCombat();
    fireEvent.keyDown(screen.getByTestId('hex-spin-wheel'), { key: 'ArrowRight' });
    expect(screen.getByTestId('hex-spin-bonus')).toHaveAttribute('aria-checked', 'true');
    fireEvent.keyDown(screen.getByTestId('hex-spin-wheel'), { key: 'ArrowLeft' });
    fireEvent.keyDown(screen.getByTestId('hex-spin-wheel'), { key: 'ArrowLeft' });
    expect(screen.getByTestId('hex-spin-reaction')).toHaveAttribute('aria-checked', 'true');
  });

  test('an attack rolls through the dice window with the attack bonus', async () => {
    await openCombat();
    const unarmed = within(screen.getByTestId('hex-combat-list')).getByText('Unarmed Strike').closest('article');
    fireEvent.click(within(unarmed).getByRole('button', { name: /to hit/i }));
    expect(lastRoll()).toMatchObject({ label: 'Unarmed Strike', modifier: 7 });
  });
});

describe('colour themes', () => {
  afterEach(() => window.localStorage.removeItem('rqk.hexSheet.theme'));

  test('Guild Ledger Brass is the default', async () => {
    window.localStorage.removeItem('rqk.hexSheet.theme');
    await openSheet({ ...PUNCH, id: 'char-theme-1' });
    expect(screen.getByTestId('hex-sheet')).toHaveAttribute('data-theme', 'ledger');
    expect(screen.getByTestId('hex-sheet').style.getPropertyValue('--hex-orange')).toBe('#c9a24a');
  });

  test('choosing a theme recolours the sheet and is remembered on this device', async () => {
    await openSheet({ ...PUNCH, id: 'char-theme-2' });
    fireEvent.click(screen.getByTestId('hex-settings'));
    fireEvent.click(screen.getByTestId('hex-theme-frost'));
    expect(screen.getByTestId('hex-sheet')).toHaveAttribute('data-theme', 'frost');
    expect(screen.getByTestId('hex-sheet').style.getPropertyValue('--hex-orange')).toBe('#5fc8f0');
    expect(screen.getByTestId('hex-theme-frost')).toHaveAttribute('aria-checked', 'true');
    expect(window.localStorage.getItem('rqk.hexSheet.theme')).toBe('frost');
  });

  test('an unknown saved theme falls back to the default', async () => {
    window.localStorage.setItem('rqk.hexSheet.theme', 'neon-pink');
    await openSheet({ ...PUNCH, id: 'char-theme-3' });
    expect(screen.getByTestId('hex-sheet')).toHaveAttribute('data-theme', 'ledger');
  });
});

test('the settings menu closes on a tap elsewhere or Escape, but stays open while choosing a theme', async () => {
  await openSheet({ ...PUNCH, id: 'char-menu-close' });
  fireEvent.click(screen.getByTestId('hex-settings'));
  fireEvent.pointerDown(screen.getByTestId('hex-theme-dragon'));
  fireEvent.click(screen.getByTestId('hex-theme-dragon'));
  expect(screen.getByRole('menu', { name: 'Character settings' })).toBeInTheDocument();
  fireEvent.pointerDown(screen.getByTestId('hex-wheel'));
  expect(screen.queryByRole('menu', { name: 'Character settings' })).toBeNull();
  fireEvent.click(screen.getByTestId('hex-settings'));
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('menu', { name: 'Character settings' })).toBeNull();
  window.localStorage.removeItem('rqk.hexSheet.theme');
});
