import React, { useState } from 'react';
import { CheckCircle2, Download, Swords } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';

const rq = {
  bg: '#242424', panel: '#2f2f2f', card: '#3a3a3a', red: '#d00000', text: '#fff',
  soft: 'rgba(255,255,255,0.74)', muted: 'rgba(255,255,255,0.58)', line: 'rgba(255,255,255,0.16)',
};

const NPCS = [
  {
    name: 'Jordan Crow', race: 'Human', role: 'Master of Defence candidate', occupation: 'Defender',
    location: 'Gragon', description: 'A proven defender tied to the contingency for restoring Baldering.',
    notes: 'Recruitment target for Baldering’s Master of Defence seat. Knows the royal recognition exchange.',
  },
  {
    name: 'Edris Brambleheart', role: 'Enemy', occupation: 'Ritual leader', location: 'Brambleheart Cave',
    description: 'The hostile figure at the centre of the ritual beneath Gragon.',
    notes: 'Boss of the recruitment quest. Exact combat statistics are intentionally left for the GM to define.',
  },
];

const LOCATIONS = [
  { name: 'Gragon', location_type: 'settlement', description: 'Settlement where Jordan Crow can be recruited after the attacks and missing-child crisis.' },
  { name: 'Old Gate', location_type: 'defence point', description: 'One of three possible sites the party can choose to defend during the attacks on Gragon.' },
  { name: 'Riverside', location_type: 'defence point', description: 'One of three possible defence sites. The party chose the riverside during the known campaign run.' },
  { name: 'Broken Wall', location_type: 'defence point', description: 'One of three possible sites the party can choose to defend during the attacks on Gragon.' },
  { name: 'Brambleheart Cave', location_type: 'dungeon', description: 'The cave reached after investigating the attacks. Children are held in cocoons beyond the ritual defences.' },
];

const ENCOUNTERS = [
  { name: 'Old Gate Defence', description: 'Alternative defence route for Gragon. Run as three waves. Exact enemies and quantities remain GM-defined.', combatants: [] },
  { name: 'Riverside Defence', description: 'Chosen defence route for the known campaign run. Run as three waves; the river is an active battlefield feature. Exact enemies and quantities remain GM-defined.', combatants: [] },
  { name: 'Broken Wall Defence', description: 'Alternative defence route for Gragon. Run as three waves. Exact enemies and quantities remain GM-defined.', combatants: [] },
  { name: 'Brambleheart Ritual', description: 'Ritual chamber encounter: a force field protects the ritual, two Vine Hearts must be destroyed in the same round, enemies grow stronger as the ritual continues, children are held in cocoons, and Edris Brambleheart is the boss. Exact combat statistics remain GM-defined.', combatants: [] },
];

const normalise = value => String(value || '').trim().toLowerCase();

async function ensureByName(existing, wanted, create) {
  const found = existing.find(item => normalise(item.name || item.title) === normalise(wanted.name || wanted.title));
  if (found) return found;
  const response = await create(wanted);
  return response.data;
}

export default function TiaKartaJordanQuestImport({ campaignId, onImported }) {
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);

  const importQuest = async () => {
    if (!campaignId || importing) return;
    setImporting(true);
    try {
      const [questRes, npcRes, locationRes, encounterRes] = await Promise.all([
        apiClient.get(`/campaigns/${campaignId}/quests`).catch(() => ({ data: [] })),
        apiClient.get(`/campaigns/${campaignId}/npcs`).catch(() => ({ data: [] })),
        apiClient.get(`/campaigns/${campaignId}/locations`).catch(() => ({ data: [] })),
        apiClient.get(`/campaigns/${campaignId}/combat-scenarios`).catch(() => ({ data: [] })),
      ]);

      const existingQuests = Array.isArray(questRes.data) ? questRes.data : [];
      const existingQuest = existingQuests.find(item => normalise(item.title) === 'recruit jordan crow');
      if (existingQuest) {
        setDone(true);
        toast.info('Recruit Jordan Crow is already in this campaign');
        onImported?.();
        return;
      }

      const npcs = [...(Array.isArray(npcRes.data) ? npcRes.data : [])];
      const locations = [...(Array.isArray(locationRes.data) ? locationRes.data : [])];
      const encounters = [...(Array.isArray(encounterRes.data) ? encounterRes.data : [])];

      const ensuredNpcs = [];
      for (const wanted of NPCS) {
        const item = await ensureByName(npcs, wanted, payload => apiClient.post(`/campaigns/${campaignId}/npcs`, payload));
        npcs.push(item); ensuredNpcs.push(item);
      }

      const ensuredLocations = [];
      for (const wanted of LOCATIONS) {
        const item = await ensureByName(locations, wanted, payload => apiClient.post(`/campaigns/${campaignId}/locations`, payload));
        locations.push(item); ensuredLocations.push(item);
      }

      const ensuredEncounters = [];
      for (const wanted of ENCOUNTERS) {
        const item = await ensureByName(encounters, wanted, payload => apiClient.post(`/campaigns/${campaignId}/combat-scenarios`, payload));
        encounters.push(item); ensuredEncounters.push(item);
      }

      const encounterByName = Object.fromEntries(ensuredEncounters.map(item => [item.name, item]));
      const questPayload = {
        title: 'Recruit Jordan Crow',
        summary: 'Resolve the attacks and missing-child crisis around Gragon, uncover the ritual below, and earn Jordan Crow’s trust for Baldering.',
        hook: 'Recognition exchange: “The crown may fall, but Baldering must stand.” / “Then the people shall be its foundation.”',
        status: 'active',
        gm_notes: 'The party chose the Riverside defence and succeeded there in the known campaign run. Old Gate and Broken Wall remain useful alternate-route prep. The cave ritual requires both Vine Hearts to be destroyed in the same round.',
        objectives: [
          { title: 'Reach Gragon and make contact with Jordan Crow', status: 'completed', optional: false },
          { title: 'Learn about the missing children and the three prior attacks', status: 'completed', optional: false },
          { title: 'Choose a defence point', status: 'completed', optional: false },
          { title: 'Defend the Riverside through three waves', status: 'completed', optional: false, linked_encounter_id: encounterByName['Riverside Defence']?.id || '' },
          { title: 'Investigate the source of the attacks and find the cave', status: 'upcoming', optional: false },
          { title: 'Reach the ritual chamber', status: 'upcoming', optional: false },
          { title: 'Destroy both Vine Hearts in the same round', status: 'upcoming', optional: false, linked_encounter_id: encounterByName['Brambleheart Ritual']?.id || '' },
          { title: 'Rescue the children from the cocoons', status: 'upcoming', optional: false },
          { title: 'Defeat or otherwise resolve Edris Brambleheart', status: 'upcoming', optional: false, linked_encounter_id: encounterByName['Brambleheart Ritual']?.id || '' },
          { title: 'Return and secure Jordan Crow’s recruitment', status: 'upcoming', optional: false },
        ],
        linked_npc_ids: ensuredNpcs.map(item => item.id).filter(Boolean),
        linked_location_ids: ensuredLocations.map(item => item.id).filter(Boolean),
        linked_encounter_ids: ensuredEncounters.map(item => item.id).filter(Boolean),
        linked_map_ids: [], linked_handout_ids: [], linked_reward_ids: [], is_pinned: true,
      };

      await apiClient.post(`/campaigns/${campaignId}/quests`, questPayload);
      setDone(true);
      toast.success('Jordan Crow quest loaded', { description: 'Known progress is pre-ticked; unknown combat stats were left blank for you.' });
      onImported?.();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not load the Jordan Crow quest pack');
    } finally {
      setImporting(false);
    }
  };

  return (
    <section data-testid="tia-karta-jordan-quest-import" style={panelStyle}>
      <div style={{ minWidth: 0 }}>
        <p style={eyebrowStyle}>Tia-Karta · Baldering</p>
        <strong style={titleStyle}><Swords size={16} /> Recruit Jordan Crow</strong>
        <p style={textStyle}>Load the known quest structure, NPCs, locations and encounter shells into this campaign. Existing matching names are reused.</p>
      </div>
      <button type="button" onClick={importQuest} disabled={importing || done} style={buttonStyle(done)}>
        {done ? <CheckCircle2 size={15} /> : <Download size={15} />}
        {done ? 'Loaded' : importing ? 'Loading…' : 'Load Quest'}
      </button>
    </section>
  );
}

const panelStyle = { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap', background: rq.panel, border: `1px solid ${rq.line}`, borderLeft: `5px solid ${rq.red}`, padding: 10, marginBottom: 9, color: rq.text };
const eyebrowStyle = { margin: '0 0 3px', color: rq.muted, fontSize: 9, fontWeight: 950, letterSpacing: '0.1em', textTransform: 'uppercase' };
const titleStyle = { display: 'flex', alignItems: 'center', gap: 6, color: rq.text, fontSize: 13 };
const textStyle = { margin: '4px 0 0', color: rq.soft, fontSize: 10, lineHeight: 1.35, maxWidth: 720 };
const buttonStyle = done => ({ minHeight: 34, border: done ? `1px solid ${rq.line}` : 0, background: done ? rq.card : rq.red, color: '#fff', padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: 6, cursor: done ? 'default' : 'pointer', fontWeight: 950, fontSize: 11 });
