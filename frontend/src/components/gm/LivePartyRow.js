import React from 'react';

import { normalizeCampaignCharacter } from '@/data/campaignCharacterBridge';
import DisplayHexPortrait from './DisplayHexPortrait';

/**
 * "At the table" on the Live Play run screen: each character in the party
 * as a hexagon portrait with a health ring (the same portrait the player
 * display uses), with their HP and AC. Tapping one opens the Party tool.
 * Nothing here edits a character; it is a glance, not a control panel.
 */
export default function LivePartyRow({ players = [], onOpenParty }) {
  const party = (Array.isArray(players) ? players : [])
    .map((player) => normalizeCampaignCharacter(player))
    .filter((member) => member?.name);
  if (!party.length) return null;
  return (
    <section className="rqk-live-party" aria-label="Party at the table" data-testid="live-party-row">
      <p className="rqk-live-party__label">At the table</p>
      <ul className="rqk-live-party__list">
        {party.map((member) => (
          <li key={member.id || member.name}>
            <button
              type="button"
              className={`rqk-live-party__member is-${member.hpStatus || 'healthy'}`}
              onClick={() => onOpenParty?.()}
              aria-label={`${member.name}: ${member.currentHp} of ${member.maxHp} hit points, armour class ${member.armorClass || '-'}. Open party.`}
              data-testid={`live-party-${member.id || member.name}`}
            >
              <DisplayHexPortrait
                imageUrl={member.portraitUrl}
                name={member.name}
                tone="cool"
                size={46}
                hpPercent={member.maxHp ? member.hpPercent : null}
                hpStatus={member.hpStatus}
              />
              <span className="rqk-live-party__copy">
                <strong>{member.name}</strong>
                <small className="rqk-live-party__hp">HP {member.currentHp}/{member.maxHp || '?'}</small>
                <small>AC {member.armorClass || '-'}</small>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
