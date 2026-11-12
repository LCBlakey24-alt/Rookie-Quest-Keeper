import React from 'react';
import { useNavigate } from 'react-router-dom';

import HexWheel from '@/components/hex-sheet/HexWheel';
import { SLOT } from '@/components/hex-sheet/hexGeometry';
import '@/components/hex-sheet/hexSheet.css';

/* Where each place sits on the ring, reading clockwise from the upper left. */
const SLOT_ORDER = [SLOT.UPPER_LEFT, SLOT.UPPER_RIGHT, SLOT.RIGHT, SLOT.LOWER_RIGHT, SLOT.LOWER_LEFT, SLOT.LEFT];

function openDice() {
  window.dispatchEvent(new Event('rq-dice-open'));
}

/**
 * Home's hub: the character sheet's wheel, one wedge per place in the app.
 * Each wedge shows its count (or a short mark) in the middle and its name
 * on the rim, and opens that page; the centre hexagon opens the dice.
 *
 * @param {{ id: string, label: string, value: string|number, to: string, ariaLabel: string }[]} props.places
 *   at most six, in reading order
 */
export default function HomeHubWheel({ places }) {
  const navigate = useNavigate();
  return (
    <div className="rqk-home-hub" data-testid="home-hub-wheel">
      <HexWheel
        variant="stat"
        viewKey="home"
        label="Go to"
        wedges={places.slice(0, 6).map((place, index) => ({
          id: place.id,
          slot: SLOT_ORDER[index],
          label: place.label,
          edgeLabel: place.label,
          value: String(place.value),
          ariaLabel: place.ariaLabel,
          onSelect: () => navigate(place.to),
        }))}
        centre={{ label: 'D20', ariaLabel: 'Open the dice roller', onSelect: openDice }}
      />
    </div>
  );
}
