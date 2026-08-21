import React, { useState } from 'react';
import { CheckCircle2, Crown, Download } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';

const rq = {
  panel: '#2f2f2f', card: '#3a3a3a', red: '#d00000', text: '#fff',
  soft: 'rgba(255,255,255,0.74)', muted: 'rgba(255,255,255,0.58)', line: 'rgba(255,255,255,0.16)',
};

const CORE_NPCS = [
  {
    name: 'Merithera Anora of Balderin',
    role: 'Royal heir',
    occupation: 'Heir of Balderin',
    location: 'Balderin Palace',
    description: 'The surviving royal heir of Balderin. She has returned to the palace as the ruined city is restored.',
    notes: 'Merithera is based at the palace and is not travelling with the party.',
  },
  {
    name: 'Lucian Grey',
    role: 'First Councillor',
    occupation: 'Council candidate',
    location: 'Balderin',
    description: 'Candidate for the First Councillor seat in the restored city of Balderin.',
    notes: 'One of the contingency candidates approached separately before Balderin fell.',
  },
  {
    name: 'Jordan Crow',
    role: 'Master of Defence candidate',
    occupation: 'Defender',
    location: 'Gragon',
    description: 'Candidate for Master of Defence in the restored city of Balderin.',
    notes: 'Recruitment is tied to the Gragon attacks and missing-child crisis.',
  },
  {
    name: 'Thorgar Ironhammer',
    role: 'Master of Works & Industry candidate',
    occupation: 'Council candidate',
    location: '',
    description: 'Candidate for Master of Works & Industry in the restored city of Balderin.',
    notes: 'One of the contingency candidates approached separately before Balderin fell.',
  },
  {
    name: 'Mabel Barleybrook',
    role: 'Master of Provisions candidate',
    occupation: 'Council candidate',
    location: '',
    description: 'Candidate for Master of Provisions in the restored city of Balderin.',
    notes: 'One of the contingency candidates approached separately before Balderin fell.',
  },
  {
    name: 'Godfrey Barfoot',
    role: 'Ally',
    occupation: 'Alchemist / potion shopkeeper',
    location: 'Balderin Palace',
    description: 'An allied alchemist operating from the palace during Balderin’s restoration.',
    notes: 'The party bought out his current potion stock for 100 gp. Restock takes one week.',
  },
];

const CORE_LOCATIONS = [
  {
    name: 'Balderin',
    location_type: 'ruined city / restoration',
    description: 'A royal city destroyed roughly ten years ago and now being rebuilt. Restoration is moving from rubble clearing to infrastructure and then district-by-district rebuilding.',
    notes: 'The surviving heir, Merithera Anora of Balderin, has returned to the palace.',
  },
  {
    name: 'Balderin Palace',
    location_type: 'palace',
    description: 'The restored royal base in Balderin where Merithera has returned and where campaign administration can be coordinated.',
    notes: 'Godfrey Barfoot also operates his alchemy shop from the palace.',
  },
];

const COUNCIL_TEXT = `BALDERIN RESTORATION — GM REFERENCE

Recognition exchange
“The crown may fall, but Balderin must stand.”
Response: “Then the people shall be its foundation.”

The contingency candidates were approached separately by Queen Seraphina / King Aldren. They were not told who the other candidates were. They knew the contingency and the recognition exchange.

COUNCIL — 12 SEATS
1. First Councillor — Lucian Grey
2. Master of Defence — Jordan Crow
3. Master of Works & Industry — Thorgar Ironhammer
4. Master of Provisions — Mabel Barleybrook
5. Master of Coin — TBD
6. Speaker of Commons — Queen Seraphina’s old friend — TBD
7. Master of Lore — Living Library / Hunter’s Haven candidate
8. Master of Trade — TBD
9. Master of Justice — TBD
10. Master of Roads & Passage — TBD
11. Master of Arcane Affairs — OPEN for player nomination
12. Master of Revels & Games — OPEN for player nomination; Edwin Hollowmere may become a later possibility

RESTORATION FLOW
1. Rubble clearing
2. Infrastructure / structural support
3. Specific districts

Each major restoration choice can later be offered as cheap / medium / expensive rather than forcing one fixed rebuild path.

CURRENT RESOURCES
Party treasury discovered: 56,243,512 gp.
Godfrey Barfoot potion purchase: 100 gp.
Godfrey’s stock takes one week to replenish.
`;

const normalise = value => String(value || '').trim().toLowerCase();

function asList(response, label) {
  if (!Array.isArray(response?.data)) {
    throw new Error(`${label} could not be read safely. Nothing was imported.`);
  }
  return response.data;
}

async function ensureNamed(existing, wanted, create) {
  const found = existing.find(item => normalise(item.name || item.title) === normalise(wanted.name || wanted.title));
  if (found) return { item: found, created: false };
  const response = await create(wanted);
  if (!response?.data) throw new Error(`Could not create ${wanted.name || wanted.title}.`);
  existing.push(response.data);
  return { item: response.data, created: true };
}

export default function TiaKartaBalderinCoreImport({ campaignId, onImported }) {
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);

  const runImport = async () => {
    if (!campaignId || importing) return;
    setImporting(true);
    try {
      // Never turn a failed read into an empty campaign. A transient failure here
      // must stop the import, otherwise a retry could create duplicate canon.
      const [npcRes, locationRes, handoutRes] = await Promise.all([
        apiClient.get(`/campaigns/${campaignId}/npcs`),
        apiClient.get(`/campaigns/${campaignId}/locations`),
        apiClient.get(`/campaigns/${campaignId}/handouts`),
      ]);

      const npcs = [...asList(npcRes, 'NPCs')];
      const locations = [...asList(locationRes, 'Locations')];
      const handouts = asList(handoutRes, 'Handouts');
      let createdCount = 0;

      for (const wanted of CORE_NPCS) {
        const result = await ensureNamed(npcs, wanted, payload => apiClient.post(`/campaigns/${campaignId}/npcs`, payload));
        if (result.created) createdCount += 1;
      }

      for (const wanted of CORE_LOCATIONS) {
        const result = await ensureNamed(locations, wanted, payload => apiClient.post(`/campaigns/${campaignId}/locations`, payload));
        if (result.created) createdCount += 1;
      }

      const title = 'Balderin Council & Restoration — GM Reference';
      const existingHandout = handouts.find(item => normalise(item.title) === normalise(title));
      if (!existingHandout) {
        await apiClient.post(`/campaigns/${campaignId}/handouts`, {
          title,
          content: COUNCIL_TEXT,
          category: 'gm_reference',
          allow_player_sharing: false,
        });
        createdCount += 1;
      }

      setDone(true);
      toast.success(createdCount ? 'Balderin core loaded' : 'Balderin core already complete', {
        description: createdCount
          ? `${createdCount} missing campaign record${createdCount === 1 ? '' : 's'} added; existing matching records were preserved.`
          : 'No duplicates were created.',
      });
      onImported?.();
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || error?.message || 'Could not load Balderin core');
    } finally {
      setImporting(false);
    }
  };

  return (
    <section data-testid="tia-karta-balderin-core-import" style={panelStyle}>
      <div style={{ minWidth: 0 }}>
        <p style={eyebrowStyle}>Tia-Karta · Campaign Core</p>
        <strong style={titleStyle}><Crown size={16} /> Balderin Core</strong>
        <p style={textStyle}>Load or repair the established city, palace, core council candidates and GM restoration reference. Matching records are preserved.</p>
      </div>
      <button type="button" onClick={runImport} disabled={importing || done} style={buttonStyle(done)}>
        {done ? <CheckCircle2 size={15} /> : <Download size={15} />}
        {done ? 'Checked' : importing ? 'Checking…' : 'Load / Repair'}
      </button>
    </section>
  );
}

const panelStyle = { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap', background: rq.panel, border: `1px solid ${rq.line}`, borderLeft: `5px solid ${rq.red}`, padding: 10, marginBottom: 7, color: rq.text };
const eyebrowStyle = { margin: '0 0 3px', color: rq.muted, fontSize: 9, fontWeight: 950, letterSpacing: '0.1em', textTransform: 'uppercase' };
const titleStyle = { display: 'flex', alignItems: 'center', gap: 6, color: rq.text, fontSize: 13 };
const textStyle = { margin: '4px 0 0', color: rq.soft, fontSize: 10, lineHeight: 1.35, maxWidth: 760 };
const buttonStyle = done => ({ minHeight: 34, border: done ? `1px solid ${rq.line}` : 0, background: done ? rq.card : rq.red, color: '#fff', padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: 6, cursor: done ? 'default' : 'pointer', fontWeight: 950, fontSize: 11 });