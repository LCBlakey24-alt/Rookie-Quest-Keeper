import React from 'react';
import { Skull } from 'lucide-react';
import { toast } from 'sonner';
import MonsterLookup from '@/components/MonsterLookup';
import CustomCreatureManager from '@/components/CustomCreatureManager';

export default function MonstersTab({ theme, campaignId }) {
  return (
    <div>
      <h2 style={{ fontSize: '22px', color: theme.text.primary, fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Skull size={24} style={{ color: theme.accent.primary }} /> Monsters & Custom Creatures
      </h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        <div style={{ background: theme.bg.card, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ fontSize: '16px', color: theme.accent.primary, fontWeight: '600', marginBottom: '16px' }}>SRD Monster Lookup</h3>
          <MonsterLookup />
        </div>
        
        <div style={{ background: theme.bg.card, border: `1px solid ${theme.accent.gm}`, borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ fontSize: '16px', color: theme.accent.gm, fontWeight: '600', marginBottom: '12px' }}>Custom Creatures</h3>
          <p style={{ color: theme.text.secondary, fontSize: '13px', marginBottom: '16px' }}>Create homebrew monsters or import creatures from CSV files.</p>
          <CustomCreatureManager 
            campaignId={campaignId}
            isOpen={true}
            onClose={() => {}}
            onSelectCreature={(creature) => {
              toast.success(`${creature.name} added! Go to Combat tab to use it in an encounter.`);
            }}
            embedded={true}
          />
        </div>
      </div>
    </div>
  );
}
