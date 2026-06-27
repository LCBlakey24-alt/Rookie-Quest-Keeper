import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { BrandMiniLogo } from '@/components/ui/BrandLogo';
import useDashboardData from '@/components/dashboard/useDashboardData';
import apiClient from '@/lib/apiClient';

const campaignTypes = {
  one_shot: 'One-shot',
  mini_campaign: 'Mini campaign',
  long_campaign: 'Long campaign',
  open_table: 'Open table',
};

const startingPoints = {
  session_zero: 'Session zero first',
  tavern_start: 'Classic tavern start',
  mid_action: 'Start mid-action',
  custom_world: 'Homebrew world intro',
  published_adventure: 'Published adventure',
};

const worldToneOptions = {
  custom: 'Custom Setting',
  high_fantasy: 'High Fantasy',
  classic_fantasy: 'Classic Sword & Sorcery',
  epic_fantasy: 'Epic Fantasy',
  gothic_horror: 'Gothic Horror',
  magipunk_noir: 'Magipunk / Noir',
  planar_adventure: 'Planar Adventure',
  fantasy_space: 'Fantasy Space',
};

const sessionZeroOptions = [
  { id: 'safety', label: 'Safety tools and table boundaries' },
  { id: 'tone', label: 'Tone, themes, and campaign style' },
  { id: 'party_roles', label: 'Party roles and character links' },
  { id: 'house_rules', label: 'House rules and rules edition' },
  { id: 'schedule', label: 'Schedule, attendance, and session length' },
  { id: 'rewards', label: 'Loot, levelling, and rewards' },
];

const initialCampaignForm = {
  name: '',
  world_name: '',
  description: '',
  rules_edition: '2024',
  campaign_type: 'long_campaign',
  starting_point: 'session_zero',
  world_setting: 'custom',
  session_zero: ['safety', 'tone', 'party_roles', 'house_rules'],
};

function safeArray(value) {
  return Array.isArray(value) ? value.filter(item => item && typeof item === 'object') : [];
}

function recordId(record) {
  return record?.id || record?._id || record?.campaign_id || record?.campaignId || record?.character_id || record?.characterId || '';
}

function characterTitle(character) {
  return character?.name || character?.character_name || 'Unnamed Character';
}

function characterMeta(character) {
  const level = character?.level || 1;
  const className = character?.character_class || character?.class_name || character?.class || 'Adventurer';
  return `Level ${level} ${className}`;
}

function campaignTitle(campaign) {
  return campaign?.name || campaign?.campaign_name || 'Untitled Campaign';
}

function campaignMeta(campaign) {
  return `${campaign?.player_count || 0} players · ${campaign?.system || campaign?.setting || 'Fantasy'}`;
}

function buildWorldSettingNotes(form) {
  const checkedItems = sessionZeroOptions
    .filter(item => form.session_zero.includes(item.id))
    .map(item => item.label);

  const setupLines = [
    `Campaign type: ${campaignTypes[form.campaign_type] || form.campaign_type}`,
    `Starting point: ${startingPoints[form.starting_point] || form.starting_point}`,
    `World tone: ${worldToneOptions[form.world_setting] || form.world_setting}`,
  ];

  if (checkedItems.length) setupLines.push(`Session zero checklist: ${checkedItems.join('; ')}`);
  if (form.description.trim()) setupLines.push(`GM notes: ${form.description.trim()}`);
  return setupLines.join('\n');
}

export default function UnifiedDashboard({ username = 'Adventurer', onLogout }) {
  const navigate = useNavigate();
  const [backendStatus, setBackendStatus] = useState('Checking');
  const [backendCheckedAt, setBackendCheckedAt] = useState('');
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [campaignForm, setCampaignForm] = useState(initialCampaignForm);
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [pendingInvite, setPendingInvite] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const {
    characters,
    campaigns,
    loading,
    slowLoad,
    refreshing,
    isAdmin,
    recentCharacters,
    recentCampaigns,
    loadDashboard,
  } = useDashboardData();

  const safeCharacters = safeArray(characters);
  const safeCampaigns = safeArray(campaigns);
  const latestCharacters = safeArray(recentCharacters).slice(0, 4);
  const latestCampaigns = safeArray(recentCampaigns).slice(0, 4);
  const primaryCharacter = latestCharacters[0];
  const primaryCampaign = latestCampaigns[0];

  const checkBackend = async () => {
    setBackendStatus('Checking');
    const startedAt = Date.now();
    try {
      await apiClient.get('/health', { timeout: 8000 });
      setBackendStatus(Date.now() - startedAt > 3000 ? 'Slow' : 'Ready');
    } catch {
      setBackendStatus('Offline');
    } finally {
      setBackendCheckedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }
  };

  useEffect(() => {
    checkBackend();
  }, []);

  const refreshEverything = async () => {
    await Promise.allSettled([loadDashboard(), checkBackend()]);
  };

  const openCampaign = (campaign) => {
    const id = recordId(campaign);
    if (id) {
      navigate(`/campaign/${id}`);
      return;
    }
    toast.error('Campaign could not be opened because it is missing an ID. Refresh and try again.');
  };

  const openCharacter = (character) => {
    const id = recordId(character);
    if (id) navigate(`/characters/${id}`);
  };

  const openCreateCampaign = () => setShowCreateCampaign(true);
  const closeCreateCampaign = () => {
    if (!creatingCampaign) setShowCreateCampaign(false);
  };

  const updateCampaignForm = (field, value) => setCampaignForm(prev => ({ ...prev, [field]: value }));

  const toggleSessionZero = (id) => {
    setCampaignForm(prev => {
      const current = Array.isArray(prev.session_zero) ? prev.session_zero : [];
      return { ...prev, session_zero: current.includes(id) ? current.filter(item => item !== id) : [...current, id] };
    });
  };

  const handleCreateCampaign = async (event) => {
    event.preventDefault();
    const campaignName = campaignForm.name.trim();
    if (!campaignName) {
      toast.error('Campaign name is required');
      return;
    }

    try {
      setCreatingCampaign(true);
      const payload = {
        name: campaignName,
        description: campaignForm.description.trim(),
        world_name: campaignForm.world_name.trim(),
        rules_edition: campaignForm.rules_edition,
        system: campaignForm.rules_edition === '2024' ? '5e 2024 Compatible' : '5e 2014 Compatible',
        world_genre: 'fantasy',
        world_setting: campaignForm.world_setting,
        world_setting_notes: buildWorldSettingNotes(campaignForm),
        allow_exploding_dice: false,
        allow_epic_levels: false,
        max_character_level: 20,
        available_classes: [],
      };
      const response = await apiClient.post('/campaigns', payload);
      const campaignId = response.data?.id || response.data?._id || response.data?.campaign_id || response.data?.campaignId;
      toast.success('Campaign created');
      setCampaignForm(initialCampaignForm);
      setShowCreateCampaign(false);
      await loadDashboard();
      if (campaignId) navigate(`/campaign/${campaignId}`);
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Failed to create campaign');
    } finally {
      setCreatingCampaign(false);
    }
  };

  const openPrimaryCampaign = () => {
    if (primaryCampaign) openCampaign(primaryCampaign);
    else openCreateCampaign();
  };

  const requestDeleteCharacter = (character) => {
    const id = recordId(character);
    if (!id) return;
    setPendingDelete({ type: 'character', id, name: characterTitle(character), endpoint: `/characters/${id}` });
  };

  const requestDeleteCampaign = (campaign) => {
    const id = recordId(campaign);
    if (!id) return;
    setPendingDelete({ type: 'campaign', id, name: campaignTitle(campaign), endpoint: `/campaigns/${id}` });
  };

  const requestJoinCode = async (campaign) => {
    const id = recordId(campaign);
    if (!id) return;
    try {
      setInviteLoading(true);
      const response = await apiClient.get(`/campaign-invites/${id}`);
      setPendingInvite({ ...response.data, campaign_name: response.data?.campaign_name || campaignTitle(campaign) });
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Failed to get join code');
    } finally {
      setInviteLoading(false);
    }
  };

  const rotateJoinCode = async () => {
    if (!pendingInvite?.campaign_id) return;
    try {
      setInviteLoading(true);
      const response = await apiClient.post(`/campaign-invites/${pendingInvite.campaign_id}`);
      setPendingInvite(response.data);
      toast.success('New join code generated');
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Failed to rotate join code');
    } finally {
      setInviteLoading(false);
    }
  };

  const copyJoinCode = async () => {
    const code = pendingInvite?.join_code;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Join code copied');
    } catch {
      toast.info(`Join code: ${code}`);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      setDeleting(true);
      await apiClient.delete(pendingDelete.endpoint);
      toast.success(`${pendingDelete.type === 'campaign' ? 'Campaign' : 'Character'} deleted`);
      setPendingDelete(null);
      await loadDashboard();
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || `Failed to delete ${pendingDelete.type}`);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <main style={pageStyle}>
        <section style={loadingStyle}>
          <BrandMiniLogo size={64} />
          <h1 style={titleStyle}>Opening dashboard...</h1>
          <p style={mutedStyle}>{slowLoad ? 'The backend may be waking up. This should only take a moment.' : 'Loading your table workspace.'}</p>
        </section>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <header style={headerStyle}>
        <div style={brandRowStyle}>
          <div style={logoTileStyle}><BrandMiniLogo size={44} /></div>
          <div style={{ minWidth: 0 }}>
            <p style={eyebrowStyle}>Rookie Quest Keeper</p>
            <h1 style={titleStyle}>Command Dashboard</h1>
            <p style={mutedStyle}>Welcome back, <strong style={{ color: '#ffffff' }}>{username || 'Adventurer'}</strong>.</p>
          </div>
        </div>
        <div style={headerButtonsStyle}>
          {isAdmin && <DashboardButton onClick={() => navigate('/admin')}>Admin</DashboardButton>}
          <DashboardButton onClick={refreshEverything} disabled={refreshing}>{refreshing ? 'Refreshing...' : 'Refresh'}</DashboardButton>
          <DashboardButton onClick={() => navigate('/account')}>Account</DashboardButton>
          <DashboardButton onClick={onLogout}>Logout</DashboardButton>
        </div>
      </header>

      <section style={statusBarStyle} aria-label="Dashboard status">
        <StatChip label="Characters" value={safeCharacters.length} />
        <StatChip label="Campaigns" value={safeCampaigns.length} />
        <StatChip label="Access" value={isAdmin ? 'Admin' : 'Player'} />
        <StatChip label="Backend" value={backendStatus} tone={backendStatus} />
      </section>

      <section style={continueGridStyle} aria-label="Continue where you left off">
        <ContinuePanel
          label="Continue playing"
          title={primaryCharacter ? characterTitle(primaryCharacter) : 'Create your first character'}
          text={primaryCharacter ? characterMeta(primaryCharacter) : 'Start with the builder and get a sheet ready for the table.'}
          action={primaryCharacter ? 'Open Sheet' : 'Create Character'}
          onClick={() => primaryCharacter ? openCharacter(primaryCharacter) : navigate('/characters/new')}
        />
        <ContinuePanel
          label="GM workspace"
          title={primaryCampaign ? campaignTitle(primaryCampaign) : 'Create your first campaign'}
          text={primaryCampaign ? campaignMeta(primaryCampaign) : 'Start a campaign space for prep, players, homebrew, notes, and sessions.'}
          action={primaryCampaign ? 'Open Campaign' : 'Create Campaign'}
          onClick={openPrimaryCampaign}
        />
      </section>

      <section style={heroGridStyle}>
        <ActionCard title="Player Area" text="Open your characters and player tools." meta={`${safeCharacters.length} character${safeCharacters.length === 1 ? '' : 's'}`} onClick={() => navigate('/player')} />
        <ActionCard title="Create Character" text="Start a new character using the builder flow." meta="Player setup" onClick={() => navigate('/characters/new')} />
        <ActionCard title="GM Area" text="Open your latest campaign space." meta={`${safeCampaigns.length} campaign${safeCampaigns.length === 1 ? '' : 's'}`} onClick={openPrimaryCampaign} />
        <ActionCard title="Create Campaign" text="Set up campaign type, starting point, rules edition, and session zero." meta="GM setup" onClick={openCreateCampaign} />
      </section>

      <section style={twoColumnStyle}>
        <SummaryPanel title="Recent Characters" emptyText="No characters yet. Create one to get started." actionLabel="Open Player Area" onAction={() => navigate('/player')}>
          {latestCharacters.map((character, index) => (
            <ListRow
              key={recordId(character) || `character-${index}`}
              title={characterTitle(character)}
              meta={characterMeta(character)}
              onOpen={() => openCharacter(character)}
              onDelete={() => requestDeleteCharacter(character)}
              deleteLabel="Delete character"
            />
          ))}
        </SummaryPanel>

        <SummaryPanel title="GM Campaigns" emptyText="No campaigns yet. Create one to start preparing sessions." actionLabel="Create Campaign" onAction={openCreateCampaign}>
          {latestCampaigns.map((campaign, index) => (
            <ListRow
              key={recordId(campaign) || `campaign-${index}`}
              title={campaignTitle(campaign)}
              meta={campaignMeta(campaign)}
              onOpen={() => openCampaign(campaign)}
              onSecondary={() => requestJoinCode(campaign)}
              secondaryLabel={inviteLoading ? 'Loading...' : 'Code'}
              onDelete={() => requestDeleteCampaign(campaign)}
              deleteLabel="Delete campaign"
            />
          ))}
        </SummaryPanel>
      </section>

      <section style={systemPanelStyle}>
        <div>
          <p style={eyebrowStyle}>System status</p>
          <p style={mutedStyle}>{statusMessage(backendStatus, backendCheckedAt)}</p>
        </div>
        <button type="button" onClick={checkBackend} style={linkButtonStyle}><span>Check backend</span></button>
      </section>

      {showCreateCampaign && (
        <CreateCampaignDialog
          form={campaignForm}
          creating={creatingCampaign}
          onChange={updateCampaignForm}
          onToggleSessionZero={toggleSessionZero}
          onSubmit={handleCreateCampaign}
          onClose={closeCreateCampaign}
        />
      )}

      {pendingDelete && (
        <ConfirmDeleteDialog
          pendingDelete={pendingDelete}
          deleting={deleting}
          onCancel={() => !deleting && setPendingDelete(null)}
          onConfirm={confirmDelete}
        />
      )}

      {pendingInvite && (
        <JoinCodeDialog
          invite={pendingInvite}
          loading={inviteLoading}
          onClose={() => !inviteLoading && setPendingInvite(null)}
          onCopy={copyJoinCode}
          onRotate={rotateJoinCode}
        />
      )}
    </main>
  );
}

function statusMessage(status, checkedAt) {
  if (status === 'Ready') return `Backend is responding normally${checkedAt ? ` · checked ${checkedAt}` : ''}.`;
  if (status === 'Slow') return `Backend responded, but slowly${checkedAt ? ` · checked ${checkedAt}` : ''}. This can happen when a free host wakes up.`;
  if (status === 'Offline') return `Backend health check failed${checkedAt ? ` · checked ${checkedAt}` : ''}. Try refresh, then check the host if it continues.`;
  return 'Checking backend health...';
}

function DashboardButton({ children, onClick, disabled = false }) {
  return <button type="button" onClick={onClick} disabled={disabled} style={buttonStyle}><span>{children}</span></button>;
}

function StatChip({ label, value, tone }) {
  return <div style={statChipStyle}><span style={{ ...statValueStyle, color: statusColor(tone) }}>{value}</span><span style={statLabelStyle}>{label}</span></div>;
}

function statusColor(tone) {
  if (tone === 'Offline') return '#ff8a8a';
  if (tone === 'Slow' || tone === 'Checking') return '#ffd27a';
  return '#ffffff';
}

function ContinuePanel({ label, title, text, action, onClick }) {
  return <article style={continuePanelStyle}><span style={redRuleStyle} /><p style={eyebrowStyle}>{label}</p><h2 style={continueTitleStyle}>{title}</h2><p style={cardTextStyle}>{text}</p><button type="button" onClick={onClick} style={continueButtonStyle}><span>{action}</span></button></article>;
}

function ActionCard({ title, text, meta, onClick }) {
  return <button type="button" onClick={onClick} style={actionCardStyle}><span style={cardAccentStyle} /><span style={actionTextWrapStyle}><strong style={cardTitleStyle}>{title}</strong><span style={cardTextStyle}>{text}</span><span style={cardMetaStyle}>{meta}</span></span><span style={arrowStyle} aria-hidden="true">›</span></button>;
}

function SummaryPanel({ title, emptyText, actionLabel, onAction, children }) {
  const hasItems = React.Children.count(children) > 0;
  return <section style={panelStyle}><div style={panelHeaderStyle}><h2 style={sectionTitleStyle}>{title}</h2><button type="button" onClick={onAction} style={linkButtonStyle}><span>{actionLabel}</span></button></div>{hasItems ? <div style={{ display: 'grid', gap: 0 }}>{children}</div> : <p style={mutedStyle}>{emptyText}</p>}</section>;
}

function ListRow({ title, meta, onOpen, onSecondary, secondaryLabel, onDelete, deleteLabel }) {
  return (
    <div style={listRowStyle}>
      <button type="button" onClick={onOpen} style={listOpenButtonStyle}>
        <span style={{ minWidth: 0 }}><strong style={listTitleStyle}>{title}</strong><span style={cardMetaStyle}>{meta}</span></span>
        <span style={arrowStyle} aria-hidden="true">›</span>
      </button>
      {secondaryLabel && <button type="button" onClick={onSecondary} style={smallButtonStyle}><span>{secondaryLabel}</span></button>}
      <button type="button" onClick={onDelete} style={deleteButtonStyle} aria-label={deleteLabel}><span>Delete</span></button>
    </div>
  );
}

function JoinCodeDialog({ invite, loading, onClose, onCopy, onRotate }) {
  return (
    <div style={modalOverlayStyle} role="presentation">
      <section style={modalPanelStyle} role="dialog" aria-modal="true" aria-labelledby="join-code-title">
        <div style={modalHeaderStyle}>
          <div>
            <p style={eyebrowStyle}>Player invite</p>
            <h2 id="join-code-title" style={modalTitleStyle}>{invite.campaign_name || 'Campaign'} join code</h2>
          </div>
          <button type="button" onClick={onClose} disabled={loading} style={closeButtonStyle} aria-label="Close join code"><span>×</span></button>
        </div>
        <div style={joinCodeBoxStyle}>{invite.join_code || '------'}</div>
        <p style={mutedStyle}>Give this 6-character code to players. They can use Join Campaign and select which character to link.</p>
        <div style={modalActionsStyle}>
          <button type="button" onClick={onClose} disabled={loading} style={buttonStyle}><span>Close</span></button>
          <button type="button" onClick={onRotate} disabled={loading} style={smallButtonStyle}><span>{loading ? 'Generating...' : 'Generate New Code'}</span></button>
          <button type="button" onClick={onCopy} disabled={loading || !invite.join_code} style={continueButtonStyle}><span>Copy Code</span></button>
        </div>
      </section>
    </div>
  );
}

function ConfirmDeleteDialog({ pendingDelete, deleting, onCancel, onConfirm }) {
  const itemType = pendingDelete.type === 'campaign' ? 'campaign' : 'character';
  return (
    <div style={modalOverlayStyle} role="presentation">
      <section style={modalPanelStyle} role="dialog" aria-modal="true" aria-labelledby="delete-title">
        <div style={modalHeaderStyle}>
          <div>
            <p style={eyebrowStyle}>Delete {itemType}</p>
            <h2 id="delete-title" style={modalTitleStyle}>Delete {pendingDelete.name}?</h2>
          </div>
          <button type="button" onClick={onCancel} disabled={deleting} style={closeButtonStyle} aria-label="Close delete confirmation"><span>×</span></button>
        </div>
        <p style={mutedStyle}>This cannot be undone. {itemType === 'campaign' ? 'Players and campaign prep linked to this campaign may no longer be accessible.' : 'This character sheet and its character journal entries will be removed.'}</p>
        <div style={modalActionsStyle}>
          <button type="button" onClick={onCancel} disabled={deleting} style={buttonStyle}><span>Cancel</span></button>
          <button type="button" onClick={onConfirm} disabled={deleting} style={dangerButtonStyle}><span>{deleting ? 'Deleting...' : `Delete ${itemType}`}</span></button>
        </div>
      </section>
    </div>
  );
}

function CreateCampaignDialog({ form, creating, onChange, onToggleSessionZero, onSubmit, onClose }) {
  return (
    <div style={modalOverlayStyle} role="presentation">
      <section style={modalPanelStyle} role="dialog" aria-modal="true" aria-labelledby="create-campaign-title">
        <div style={modalHeaderStyle}>
          <div><p style={eyebrowStyle}>GM setup</p><h2 id="create-campaign-title" style={modalTitleStyle}>Create Campaign</h2></div>
          <button type="button" onClick={onClose} disabled={creating} style={closeButtonStyle} aria-label="Close create campaign"><span>×</span></button>
        </div>
        <form onSubmit={onSubmit} style={modalFormStyle}>
          <CampaignField label="Campaign name" value={form.name} onChange={(value) => onChange('name', value)} placeholder="Tia Karta" required />
          <CampaignField label="World name" value={form.world_name} onChange={(value) => onChange('world_name', value)} placeholder="Optional" />
          <div style={modalSplitStyle}>
            <CampaignSelect label="Campaign type" value={form.campaign_type} onChange={(value) => onChange('campaign_type', value)} options={campaignTypes} />
            <CampaignSelect label="Starting point" value={form.starting_point} onChange={(value) => onChange('starting_point', value)} options={startingPoints} />
          </div>
          <div style={modalSplitStyle}>
            <CampaignSelect label="Rules edition" value={form.rules_edition} onChange={(value) => onChange('rules_edition', value)} options={{ 2024: '5e 2024 Compatible', 2014: '5e 2014 Compatible' }} />
            <CampaignSelect label="World tone" value={form.world_setting} onChange={(value) => onChange('world_setting', value)} options={worldToneOptions} />
          </div>
          <fieldset style={checklistStyle}>
            <legend style={fieldLabelStyle}>Session zero checklist</legend>
            {sessionZeroOptions.map(item => <label key={item.id} style={checkboxRowStyle}><input type="checkbox" checked={form.session_zero.includes(item.id)} onChange={() => onToggleSessionZero(item.id)} /><span>{item.label}</span></label>)}
          </fieldset>
          <label style={fieldWrapStyle}><span style={fieldLabelStyle}>Campaign notes</span><textarea value={form.description} onChange={(event) => onChange('description', event.target.value)} placeholder="What is this campaign about?" style={{ ...fieldInputStyle, minHeight: 92, paddingTop: 11, resize: 'vertical' }} /></label>
          <div style={setupPreviewStyle}><p style={eyebrowStyle}>Saved setup context</p><p style={mutedStyle}>Campaign type, starting point, tone, checklist, and notes will be saved into the campaign world context for your GM tools.</p></div>
          <div style={modalActionsStyle}><button type="button" onClick={onClose} disabled={creating} style={buttonStyle}><span>Cancel</span></button><button type="submit" disabled={creating} style={continueButtonStyle}><span>{creating ? 'Creating...' : 'Create Campaign'}</span></button></div>
        </form>
      </section>
    </div>
  );
}

function CampaignField({ label, value, onChange, placeholder, required = false }) {
  return <label style={fieldWrapStyle}><span style={fieldLabelStyle}>{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} style={fieldInputStyle} /></label>;
}

function CampaignSelect({ label, value, onChange, options }) {
  return <label style={fieldWrapStyle}><span style={fieldLabelStyle}>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} style={fieldInputStyle}>{Object.entries(options).map(([id, labelText]) => <option key={id} value={id}>{labelText}</option>)}</select></label>;
}

const pageStyle = { minHeight: '100dvh', background: '#242424', color: '#ffffff', padding: 'clamp(14px, 2vw, 28px)', display: 'grid', gap: 18 };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', background: '#2f2f2f', border: '1px solid rgba(255,255,255,0.16)', padding: 16 };
const brandRowStyle = { display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 };
const logoTileStyle = { width: 56, height: 56, display: 'grid', placeItems: 'center', background: '#3a3a3a', border: '1px solid rgba(255,255,255,0.16)', flex: '0 0 56px' };
const titleStyle = { margin: 0, color: '#ffffff', fontSize: 'clamp(30px, 5vw, 54px)', fontFamily: 'var(--rq-title-font, "Germania One", Georgia, serif)', letterSpacing: '0.03em', lineHeight: 0.95 };
const eyebrowStyle = { margin: '0 0 4px', color: 'rgba(255,255,255,0.58)', fontSize: 11, fontWeight: 950, letterSpacing: '0.11em', textTransform: 'uppercase' };
const mutedStyle = { margin: 0, color: 'rgba(255,255,255,0.72)', lineHeight: 1.5 };
const headerButtonsStyle = { display: 'flex', flexWrap: 'wrap', gap: 8 };
const buttonStyle = { minHeight: 40, background: '#3a3a3a', color: '#ffffff', border: 0, padding: '0 13px', fontWeight: 900, cursor: 'pointer' };
const linkButtonStyle = { minHeight: 34, background: '#242424', color: '#ffffff', border: '1px solid rgba(255,255,255,0.16)', padding: '0 10px', fontWeight: 900, cursor: 'pointer' };
const statusBarStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', borderTop: '1px solid rgba(255,255,255,0.16)', borderLeft: '1px solid rgba(255,255,255,0.16)' };
const statChipStyle = { minHeight: 70, display: 'grid', alignContent: 'center', gap: 3, padding: 12, background: '#2f2f2f', borderRight: '1px solid rgba(255,255,255,0.16)', borderBottom: '1px solid rgba(255,255,255,0.16)' };
const statValueStyle = { fontSize: 24, fontWeight: 950 };
const statLabelStyle = { color: 'rgba(255,255,255,0.58)', fontSize: 11, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase' };
const continueGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 };
const continuePanelStyle = { position: 'relative', background: '#2f2f2f', border: '1px solid rgba(255,255,255,0.16)', padding: 18, overflow: 'hidden' };
const redRuleStyle = { position: 'absolute', inset: '0 auto 0 0', width: 6, background: '#d00000' };
const continueTitleStyle = { margin: '5px 0 8px', color: '#ffffff', fontSize: 24, fontWeight: 950 };
const continueButtonStyle = { marginTop: 14, minHeight: 42, background: '#d00000', color: '#ffffff', border: 0, padding: '0 14px', fontWeight: 950, cursor: 'pointer' };
const heroGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 0, borderTop: '1px solid rgba(255,255,255,0.16)', borderLeft: '1px solid rgba(255,255,255,0.16)' };
const actionCardStyle = { minHeight: 142, display: 'flex', gap: 12, alignItems: 'flex-start', textAlign: 'left', background: '#2f2f2f', color: '#ffffff', border: 0, borderRight: '1px solid rgba(255,255,255,0.16)', borderBottom: '1px solid rgba(255,255,255,0.16)', padding: '18px 14px 18px 0', cursor: 'pointer' };
const cardAccentStyle = { width: 6, height: 46, background: '#d00000', flex: '0 0 auto' };
const actionTextWrapStyle = { display: 'grid', gap: 7, minWidth: 0, flex: 1 };
const cardTitleStyle = { color: '#ffffff', fontSize: 17, fontWeight: 950 };
const cardTextStyle = { color: 'rgba(255,255,255,0.74)', lineHeight: 1.45, fontSize: 14 };
const cardMetaStyle = { display: 'block', color: 'rgba(255,255,255,0.58)', fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 3 };
const arrowStyle = { color: '#ffffff', opacity: 0.75, fontSize: 26 };
const twoColumnStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 };
const panelStyle = { background: '#2f2f2f', border: '1px solid rgba(255,255,255,0.16)', padding: 14 };
const panelHeaderStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.16)', paddingBottom: 10, marginBottom: 8 };
const sectionTitleStyle = { margin: 0, color: '#ffffff', fontSize: 18, fontWeight: 950 };
const listRowStyle = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto', alignItems: 'stretch', background: '#242424', borderBottom: '1px solid rgba(255,255,255,0.12)' };
const listOpenButtonStyle = { minHeight: 58, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, background: 'transparent', color: '#ffffff', border: 0, padding: '10px 12px', textAlign: 'left', cursor: 'pointer' };
const listTitleStyle = { display: 'block', color: '#ffffff', fontSize: 14, fontWeight: 950, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const smallButtonStyle = { minHeight: 40, background: '#3a3a3a', color: '#ffffff', border: 0, padding: '0 10px', fontWeight: 900, cursor: 'pointer' };
const deleteButtonStyle = { minHeight: 40, background: '#5f1111', color: '#ffffff', border: 0, padding: '0 10px', fontWeight: 900, cursor: 'pointer' };
const systemPanelStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: '#2f2f2f', border: '1px solid rgba(255,255,255,0.16)', padding: 14 };
const loadingStyle = { minHeight: '70dvh', display: 'grid', placeItems: 'center', alignContent: 'center', gap: 12 };
const modalOverlayStyle = { position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.78)', display: 'grid', placeItems: 'center', padding: 16 };
const modalPanelStyle = { width: 'min(720px, 100%)', maxHeight: '92dvh', overflowY: 'auto', background: '#2f2f2f', border: '1px solid rgba(255,255,255,0.18)', padding: 18 };
const modalHeaderStyle = { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.16)', paddingBottom: 12, marginBottom: 14 };
const modalTitleStyle = { margin: 0, color: '#ffffff', fontSize: 26, fontWeight: 950 };
const closeButtonStyle = { width: 40, height: 40, border: 0, background: '#3a3a3a', color: '#ffffff', fontSize: 26, cursor: 'pointer' };
const modalFormStyle = { display: 'grid', gap: 12 };
const fieldWrapStyle = { display: 'grid', gap: 6 };
const fieldLabelStyle = { color: 'rgba(255,255,255,0.68)', fontSize: 11, fontWeight: 950, letterSpacing: '0.08em', textTransform: 'uppercase' };
const fieldInputStyle = { minHeight: 42, background: '#242424', color: '#ffffff', border: '1px solid rgba(255,255,255,0.16)', padding: '0 10px', outline: 'none', colorScheme: 'dark' };
const modalSplitStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 };
const checklistStyle = { border: '1px solid rgba(255,255,255,0.16)', padding: 12, display: 'grid', gap: 8 };
const checkboxRowStyle = { display: 'flex', alignItems: 'center', gap: 9, color: 'rgba(255,255,255,0.78)', fontSize: 13 };
const setupPreviewStyle = { background: '#242424', borderLeft: '5px solid #d00000', padding: 12 };
const modalActionsStyle = { display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap', marginTop: 4 };
const dangerButtonStyle = { minHeight: 42, background: '#5f1111', color: '#ffffff', border: 0, padding: '0 14px', fontWeight: 950, cursor: 'pointer' };
const joinCodeBoxStyle = { background: '#242424', border: '1px solid rgba(255,255,255,0.18)', color: '#ffffff', fontSize: 'clamp(34px, 8vw, 60px)', fontWeight: 950, letterSpacing: '0.16em', textAlign: 'center', padding: '16px 10px', marginBottom: 12 };
