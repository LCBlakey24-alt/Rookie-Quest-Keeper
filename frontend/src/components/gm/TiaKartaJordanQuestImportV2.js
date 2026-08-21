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
    location: 'Gragon', description: 'A proven defender tied to the contingency for restoring Balderin.',
    notes: 'Recruitment target for Balderin’s Master of Defence seat. Knows the royal recognition exchange.',
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
const unique = values => Array.from(new Set((values || []).filter(Boolean).map(String)));

function asList(response, label) {
  if (!Array.isArray(response?.data)) {
    throw new Error(`${label} could not be read safely. Nothing was imported.`);
  }
  return response.data;
}

async function ensureByName(existing, wanted, create) {
  const found = existing.find(item => normalise(item.name || item.title) === normalise(wanted.name || wanted.title));
  if (found) return { item: found, created: false };
  const response = await create(wanted);
  if (!response?.data) throw new Error(`Could not create ${wanted.name || wanted.title}.`);
  existing.push(response.data);
  return { item: response.data, created: true };
}

function canonicalObjectives(encounterByName) {
  return [
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
  ];
}

export function mergeJordanQuest(existingQuest, ensuredNpcs, ensuredLocations, ensuredEncounters) {
  const encounterByName = Object.fromEntries(ensuredEncounters.map(item => [item.name, item]));
  const wantedObjectives = canonicalObjectives(encounterByName);

  if (!existingQuest) {
    return {
      title: 'Recruit Jordan Crow',
      summary: 'Resolve the attacks and missing-child crisis around Gragon, uncover the ritual below, and earn Jordan Crow’s trust for Balderin.',
      hook: 'Recognition exchange: “The crown may fall, but Balderin must stand.” / “Then the people shall be its foundation.”',
      status: 'active',
      gm_notes: 'The party chose the Riverside defence and succeeded there in the known campaign run. Old Gate and Broken Wall remain useful alternate-route prep. The cave ritual requires both Vine Hearts to be destroyed in the same round.',
      objectives: wantedObjectives,
      linked_npc_ids: unique(ensuredNpcs.map(item => item.id)),
      linked_location_ids: unique(ensuredLocations.map(item => item.id)),
      linked_encounter_ids: unique(ensuredEncounters.map(item => item.id)),
      linked_map_ids: [], linked_handout_ids: [], linked_reward_ids: [], is_pinned: true,
    };
  }

  // Re-running the importer is a repair operation, not a reset. Existing GM
  // wording/progress wins; we only add missing objective shells and links.
  const existingObjectives = Array.isArray(existingQuest.objectives) ? existingQuest.objectives : [];
  const byTitle = new Map(existingObjectives.map(item => [normalise(item.title), item]));
  const mergedObjectives = [...existingObjectives];

  wantedObjectives.forEach(wanted => {
    const current = byTitle.get(normalise(wanted.title));
    if (!current) {
      mergedObjectives.push(wanted);
      return;
    }
    if (!current.linked_encounter_id && wanted.linked_encounter_id) {
      const index = mergedObjectives.indexOf(current);
      mergedObjectives[index] = { ...current, linked_encounter_id: wanted.linked_encounter_id };
    }
  });

  return {
    objectives: mergedObjectives,
    linked_npc_ids: unique([...(existingQuest.linked_npc_ids || []), ...ensuredNpcs.map(item => item.id)]),
    linked_location_ids: unique([...(existingQuest.linked_location_ids || []), ...ensuredLocations.map(item => item.id)]),
    linked_encounter_ids: unique([...(existingQuest.linked_encounter_ids || []), ...ensuredEncounters.map(item => item.id)]),
  };
}

export default function TiaKartaJordanQuestImportV2({ campaignId, onImported }) {
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);

  const importQuest = async () => {
    if (!campaignId || importing) return;
    setImporting(true);
    try {
      // These reads are part of the duplicate-protection contract. If any of
      // them fail, abort rather than pretending the campaign is empty.
      const [questRes, npcRes, locationRes, encounterRes] = await Promise.all([
        apiClient.get(`/campaigns/${campaignId}/quests`),
        apiClient.get(`/campaigns/${campaignId}/npcs`),
        apiClient.get(`/campaigns/${campaignId}/locations`),
        apiClient.get(`/campaigns/${campaignId}/combat-scenarios`),
      ]);

      const existingQuests = asList(questRes, 'Quests');
      const npcs = [...asList(npcRes, 'NPCs')];
      const locations = [...asList(locationRes, 'Locations')];
      const encounters = [...asList(encounterRes, 'Encounters')];
      const existingQuest = existingQuests.find(item => normalise(item.title) === 'recruit jordan crow');
      let createdCount = 0;

      const ensuredNpcs = [];
      for (const wanted of NPCS) {
        const result = await ensureByName(npcs, wanted, payload => apiClient.post(`/campaigns/${campaignId}/npcs`, payload));
        ensuredNpcs.push(result.item);
        if (result.created) createdCount += 1;
      }

      const ensuredLocations = [];
      for (const wanted of LOCATIONS) {
        const result = await ensureByName(locations, wanted, payload => apiClient.post(`/campaigns/${campaignId}/locations`, payload));
        ensuredLocations.push(result.item);
        if (result.created) createdCount += 1;
      }

      const ensuredEncounters = [];
      for (const wanted of ENCOUNTERS) {
        const result = await ensureByName(encounters, wanted, payload => apiClient.post(`/campaigns/${campaignId}/combat-scenarios`, payload));
        ensuredEncounters.push(result.item);
        if (result.created) createdCount += 1;
      }

      const questPayload = mergeJordanQuest(existingQuest, ensuredNpcs, ensuredLocations, ensuredEncounters);
      if (existingQuest?.id) {
        await apiClient.put(`/campaigns/${campaignId}/quests/${existingQuest.id}`, questPayload);
      } else {
        await apiClient.post(`/campaigns/${campaignId}/quests`, questPayload);
        createdCount += 1;
      }

      setDone(true);
      toast.success(existingQuest ? 'Jordan Crow quest checked & repaired' : 'Jordan Crow quest loaded', {
        description: createdCount
          ? `${createdCount} missing campaign record${createdCount === 1 ? '' : 's'} added. Existing GM edits and quest progress were preserved.`
          : 'Everything was already present; no duplicates were created.',
      });
      onImported?.();
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || error?.message || 'Could not load the Jordan Crow quest pack');
    } finally {
      setImporting(false);
    }
  };

  return (
    <section data-testid="tia-karta-jordan-quest-import" style={panelStyle}>
      <div style={{ minWidth: 0 }}>
        <p style={eyebrowStyle}>Tia-Karta · Balderin</p>
        <strong style={titleStyle}><Swords size={16} /> Recruit Jordan Crow</strong>
        <p style={textStyle}>Load or repair the known quest, NPCs, locations and encounter shells. Existing GM edits and progress are preserved.</p>
      </div>
      <button type="button" onClick={importQuest} disabled={importing || done} style={buttonStyle(done)}>
        {done ? <CheckCircle2 size={15} /> : <Download size={15} />}
        {done ? 'Checked' : importing ? 'Checking…' : 'Load / Repair'}
      </button>
    </section>
  );
}

const panelStyle = { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap', background: rq.panel, border: `1px solid ${rq.line}`, borderLeft: `5px solid ${rq.red}`, padding: 10, marginBottom: 9, color: rq.text };
const eyebrowStyle = { margin: '0 0 3px', color: rq.muted, fontSize: 9, fontWeight: 950, letterSpacing: '0.1em', textTransform: 'uppercase' };
const titleStyle = { display: 'flex', alignItems: 'center', gap: 6, color: rq.text, fontSize: 13 };
const textStyle = { margin: '4px 0 0', color: rq.soft, fontSize: 10, lineHeight: 1.35, maxWidth: 720 };
const buttonStyle = done => ({ minHeight: 34, border: done ? `1px solid ${rq.line}` : 0, background: done ? rq.card : rq.red, color: '#fff', padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: 6, cursor: done ? 'default' : 'pointer', fontWeight: 950, fontSize: 11 });