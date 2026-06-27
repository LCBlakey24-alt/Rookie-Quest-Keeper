import React, { useEffect, useMemo, useState } from 'react';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';
import {
  Bookmark,
  BookOpen,
  Edit3,
  Eye,
  FileText,
  Filter,
  Image as ImageIcon,
  Mail,
  MailOpen,
  Plus,
  Search,
  Send,
  Share2,
  Trash2,
  Users,
  Volume2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import RookFormFillPanel from '@/components/RookFormFillPanel';

const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';

const rq = {
  bg: '#242424',
  panel: '#2f2f2f',
  card: '#3a3a3a',
  input: '#242424',
  line: 'rgba(255,255,255,0.16)',
  lineStrong: 'rgba(255,255,255,0.22)',
  accent: '#d00000',
  good: '#1f9d66',
  warn: '#d99222',
  text: '#ffffff',
  soft: 'rgba(255,255,255,0.74)',
  muted: 'rgba(255,255,255,0.62)',
};

const CATEGORY_OPTIONS = [
  { id: 'lore', label: 'Lore', helper: 'Appears in the player Lore tab when revealed.' },
  { id: 'secret', label: 'Secret', helper: 'Private information, dreams, visions, hidden truths.' },
  { id: 'clue', label: 'Clue', helper: 'Investigation leads, evidence, rumours, puzzle hints.' },
  { id: 'letter', label: 'Letter', helper: 'Letters, notes, journals, messages.' },
  { id: 'map', label: 'Map / Location', helper: 'Map notes, directions, sketches, place reveals.' },
  { id: 'item', label: 'Item / Reward', helper: 'Item cards, treasure, equipment, boons.' },
  { id: 'recap', label: 'Recap', helper: 'Player-facing summary or session memory.' },
  { id: 'other', label: 'Other', helper: 'Anything player-facing that does not fit elsewhere.' },
];

function categoryLabel(category) {
  return CATEGORY_OPTIONS.find(option => option.id === category)?.label || category || 'Clue';
}

function categoryHelper(category) {
  return CATEGORY_OPTIONS.find(option => option.id === category)?.helper || '';
}

function emptyHandoutDraft() {
  return {
    title: '',
    content: '',
    category: 'lore',
    image_url: '',
    attachment_url: '',
    attachment_type: '',
    attachment_name: '',
    allow_player_sharing: true,
  };
}

function GMHandoutsTab({ campaignId }) {
  const [handouts, setHandouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState(emptyHandoutDraft());
  const [sharing, setSharing] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [selectedRecipients, setSelectedRecipients] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(emptyHandoutDraft());
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => { loadHandouts(); }, [campaignId]);

  const loadHandouts = async () => {
    setLoading(true);
    try {
      const [handoutsRes, recipientsRes] = await Promise.all([
        apiClient.get(`/campaigns/${campaignId}/handouts`),
        apiClient.get(`/campaigns/${campaignId}/handout-recipients`).catch(() => ({ data: { recipients: [] } })),
      ]);
      setHandouts(Array.isArray(handoutsRes.data) ? handoutsRes.data : []);
      setRecipients(recipientsRes.data?.recipients || []);
    } catch {
      toast.error('Could not load lore, secrets, and handouts');
    } finally {
      setLoading(false);
    }
  };

  const visibleHandouts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return handouts.filter(handout => {
      const category = handout.category || 'clue';
      const matchesCategory = categoryFilter === 'all' || category === categoryFilter;
      const matchesSearch = !query || [handout.title, handout.content, categoryLabel(category), handout.attachment_name]
        .some(value => String(value || '').toLowerCase().includes(query));
      return matchesCategory && matchesSearch;
    });
  }, [handouts, searchTerm, categoryFilter]);

  const counts = useMemo(() => {
    const lore = handouts.filter(item => item.category === 'lore').length;
    const revealed = handouts.filter(item => item.shared_with?.length || item.delivery_count > 0).length;
    const unread = handouts.reduce((sum, item) => sum + Number(item.unread_count || 0), 0);
    return { total: handouts.length, lore, revealed, unread };
  }, [handouts]);

  const create = async () => {
    if (!draft.title.trim()) { toast.error('Title is required'); return; }
    try {
      const r = await apiClient.post(`/campaigns/${campaignId}/handouts`, draft);
      setHandouts(prev => [r.data, ...prev]);
      setDraft(emptyHandoutDraft());
      setShowCreate(false);
      toast.success(draft.category === 'lore' ? 'Lore entry created' : 'Entry created');
    } catch {
      toast.error('Could not create entry');
    }
  };

  const startEditing = (handout) => {
    setEditingId(handout.id);
    setEditDraft({
      title: handout.title || '',
      content: handout.content || '',
      category: handout.category || 'clue',
      image_url: handout.image_url || '',
      attachment_url: handout.attachment_url || handout.image_url || '',
      attachment_type: handout.attachment_type || (handout.image_url ? 'image/upload' : ''),
      attachment_name: handout.attachment_name || '',
      allow_player_sharing: handout.allow_player_sharing !== false,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditDraft(emptyHandoutDraft());
  };

  const saveEdit = async (handout) => {
    if (!editDraft.title.trim()) { toast.error('Title is required'); return; }
    try {
      const r = await apiClient.put(`/campaigns/${campaignId}/handouts/${handout.id}`, editDraft);
      setHandouts(prev => prev.map(item => item.id === handout.id ? { ...item, ...r.data } : item));
      cancelEditing();
      toast.success('Entry updated. Revealed copies will show as unread again.');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not update entry');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this entry?')) return;
    try {
      await apiClient.delete(`/campaigns/${campaignId}/handouts/${id}`);
      setHandouts(prev => prev.filter(item => item.id !== id));
      toast.success('Entry deleted');
    } catch {
      toast.error('Could not delete entry');
    }
  };

  const revealEntry = async (handout, recipientList = []) => {
    setSharing(handout.id);
    try {
      await apiClient.post(`/campaigns/${campaignId}/handouts/${handout.id}/share`, { recipients: recipientList });
      const revealedTo = recipientList.length ? recipientList : recipients.map(recipient => recipient.username);
      setHandouts(prev => prev.map(item => item.id === handout.id ? {
        ...item,
        shared_with: Array.from(new Set([...(item.shared_with || []), ...revealedTo])),
        delivery_count: Math.max(Number(item.delivery_count || 0), revealedTo.length),
      } : item));
      toast.success(recipientList.length ? `Revealed to ${recipientList.length} player(s)` : 'Revealed to all eligible players');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not reveal entry');
    } finally {
      setSharing(null);
    }
  };

  const toggleRecipient = (handoutId, username) => {
    setSelectedRecipients(prev => {
      const current = new Set(prev[handoutId] || []);
      if (current.has(username)) current.delete(username);
      else current.add(username);
      return { ...prev, [handoutId]: Array.from(current) };
    });
  };

  if (loading) return <section style={loadingStyle}>Loading lore, secrets, and handouts...</section>;

  return (
    <section data-testid="gm-handouts-tab" style={shellStyle}>
      <header style={heroStyle}>
        <div style={heroIconStyle}><BookOpen size={24} /></div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={eyebrowStyle}>Player knowledge control</p>
          <h2 style={titleStyle}>Lore / Secrets / Handouts</h2>
          <p style={subtitleStyle}>Create player-facing information once, then tick who knows it. Lore entries revealed to players appear in their character sheet Lore tab.</p>
        </div>
        <Button onClick={() => setShowCreate(prev => !prev)} style={primaryButtonStyle}>
          {showCreate ? <X size={16} /> : <Plus size={16} />} {showCreate ? 'Close' : 'New Entry'}
        </Button>
      </header>

      <section style={ruleStyle}>
        <p style={ruleLabelStyle}>Import rule</p>
        <p style={ruleTextStyle}>Use this only for information the players can receive. Private GM-only truths stay in World Overview or GM notes until you reveal them.</p>
      </section>

      <section style={statsStyle}>
        <Stat label="Entries" value={counts.total} />
        <Stat label="Lore entries" value={counts.lore} />
        <Stat label="Revealed" value={counts.revealed} />
        <Stat label="Unread copies" value={counts.unread} />
      </section>

      {showCreate && (
        <EntryForm
          title="New lore, secret, or handout"
          draft={draft}
          setDraft={setDraft}
          onSave={create}
          onCancel={() => setShowCreate(false)}
          campaignId={campaignId}
        />
      )}

      <section style={controlsStyle}>
        <div style={searchWrapStyle}>
          <Search size={17} style={searchIconStyle} />
          <Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search title, content, category, file..." style={searchInputStyle} />
        </div>
        <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} style={selectStyle}>
          <option value="all">All categories</option>
          {CATEGORY_OPTIONS.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
      </section>

      {handouts.length === 0 && !showCreate ? (
        <section style={emptyStateStyle}>
          <BookOpen size={42} />
          <h3>No entries yet</h3>
          <p>Create lore, secrets, clues, letters, maps, or item cards, then tick which players know them.</p>
          <Button onClick={() => setShowCreate(true)} style={primaryButtonStyle}><Plus size={16} /> Create first entry</Button>
        </section>
      ) : visibleHandouts.length === 0 ? (
        <section style={emptyStateStyle}>
          <Search size={38} />
          <h3>No matching entries</h3>
          <p>Clear the search or category filter.</p>
        </section>
      ) : (
        <div style={listStyle}>
          {visibleHandouts.map(handout => (
            <GMEntryCard
              key={handout.id}
              handout={handout}
              recipients={recipients}
              selected={(selectedRecipients[handout.id] || [])}
              sharing={sharing === handout.id}
              editing={editingId === handout.id}
              editDraft={editDraft}
              setEditDraft={setEditDraft}
              onStartEdit={() => startEditing(handout)}
              onCancelEdit={cancelEditing}
              onSaveEdit={() => saveEdit(handout)}
              onDelete={() => remove(handout.id)}
              onRevealAll={() => revealEntry(handout, [])}
              onRevealSelected={() => revealEntry(handout, selectedRecipients[handout.id] || [])}
              onToggleRecipient={(username) => toggleRecipient(handout.id, username)}
              campaignId={campaignId}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }) {
  return <div style={statStyle}><strong>{value}</strong><span>{label}</span></div>;
}

function EntryForm({ title, draft, setDraft, onSave, onCancel, campaignId }) {
  return (
    <section style={formPanelStyle}>
      <h3 style={formTitleStyle}>{title}</h3>
      <p style={formHelpStyle}>Choose <strong>Lore</strong> when you want the information to appear in a player character's Lore tab after it is revealed.</p>
      <RookFormFillPanel
        title="Ask Rook for a draft"
        helperText="Describe the clue, secret, lore entry, letter, rumour, or reveal you need, then apply it here."
        section="gm_handout"
        campaignId={campaignId}
        fields={[
          { name: 'title', label: 'Title', type: 'text' },
          { name: 'category', label: 'Category', type: 'select', choices: CATEGORY_OPTIONS.map(option => option.id) },
          { name: 'content', label: 'Content', type: 'textarea' },
        ]}
        currentValues={draft}
        onApply={(patch) => setDraft(prev => ({ ...prev, ...patch }))}
        placeholder="Example: Write a short lore reveal about the ruined capital that only one player currently knows..."
      />
      <div style={twoColumnStyle}>
        <label style={fieldStyle}>
          <span style={labelStyle}>Title</span>
          <Input value={draft.title} onChange={(event) => setDraft(prev => ({ ...prev, title: event.target.value }))} placeholder="Title" style={inputStyle} />
        </label>
        <label style={fieldStyle}>
          <span style={labelStyle}>Category</span>
          <select value={draft.category} onChange={(event) => setDraft(prev => ({ ...prev, category: event.target.value }))} style={selectStyle}>
            {CATEGORY_OPTIONS.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        </label>
      </div>
      <p style={categoryHelpStyle}>{categoryHelper(draft.category)}</p>
      <label style={fieldStyle}>
        <span style={labelStyle}>Content</span>
        <textarea value={draft.content} onChange={(event) => setDraft(prev => ({ ...prev, content: event.target.value }))} placeholder="What does the player know?" style={textareaStyle} />
      </label>
      <HandoutAttachmentPanel title="Attach file" helperText="Optional image, PDF, map sheet, item card, or audio note." value={draft} onChange={setDraft} />
      <HandoutSharingToggle value={draft.allow_player_sharing} onChange={(value) => setDraft(prev => ({ ...prev, allow_player_sharing: value }))} />
      <div style={formActionsStyle}>
        <Button onClick={onCancel} style={secondaryButtonStyle}>Cancel</Button>
        <Button onClick={onSave} style={primaryButtonStyle}>Save Entry</Button>
      </div>
    </section>
  );
}

function GMEntryCard({ handout, recipients, selected, sharing, editing, editDraft, setEditDraft, onStartEdit, onCancelEdit, onSaveEdit, onDelete, onRevealAll, onRevealSelected, onToggleRecipient, campaignId }) {
  const isLore = handout.category === 'lore';
  const revealedNames = handout.delivery_status?.map(status => status.username) || handout.shared_with || [];
  return (
    <article style={entryCardStyle(isLore)}>
      <header style={entryHeaderStyle}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={entryTitleRowStyle}>
            <h3 style={entryTitleStyle}>{handout.title}</h3>
            <span style={categoryBadgeStyle(isLore)}>{categoryLabel(handout.category || 'clue')}</span>
            {isLore && <span style={loreBadgeStyle}>Player Lore tab</span>}
            {getAttachmentUrl(handout) && <AttachmentIcon handout={handout} size={14} style={{ color: rq.text }} />}
          </div>
          {handout.content && <p style={entryPreviewStyle}>{handout.content.slice(0, 260)}{handout.content.length > 260 ? '…' : ''}</p>}
          {getAttachmentUrl(handout) && <AttachmentPreview handout={handout} compact />}
          <p style={entryMetaStyle}>{revealedNames.length ? `Known by ${revealedNames.length} player(s)` : 'Not revealed yet'}{handout.unread_count ? ` • ${handout.unread_count} unread` : ''}</p>
        </div>
        <div style={entryActionsStyle}>
          <button onClick={onStartEdit} style={smallButtonStyle}><Edit3 size={13} /> Edit</button>
          <button onClick={onRevealAll} disabled={sharing || recipients.length === 0} style={goodButtonStyle}><Send size={13} /> {sharing ? 'Revealing…' : 'Reveal all'}</button>
          <button onClick={onDelete} style={dangerButtonStyle}><Trash2 size={13} /></button>
        </div>
      </header>

      {editing && (
        <EntryForm title="Edit entry" draft={editDraft} setDraft={setEditDraft} onSave={onSaveEdit} onCancel={onCancelEdit} campaignId={campaignId} />
      )}

      <section style={knowledgeBoxStyle}>
        <div style={knowledgeHeaderStyle}>
          <div>
            <strong style={knowledgeTitleStyle}><Users size={15} /> Players who know this</strong>
            <p style={knowledgeHelpStyle}>Tick the players or characters who know this information, then reveal it to selected.</p>
          </div>
          <button onClick={onRevealSelected} disabled={sharing || selected.length === 0} style={primaryMiniButtonStyle}>
            <Eye size={13} /> Reveal to selected ({selected.length})
          </button>
        </div>

        {recipients.length === 0 ? (
          <p style={emptyRecipientsStyle}>No linked players found yet. Once players join the campaign, they will appear here.</p>
        ) : (
          <div style={recipientGridStyle}>
            {recipients.map(recipient => {
              const username = recipient.username;
              const alreadyKnows = revealedNames.includes(username);
              const checked = selected.includes(username);
              return (
                <label key={username} style={recipientPillStyle(alreadyKnows, checked)}>
                  <input type="checkbox" checked={checked} onChange={() => onToggleRecipient(username)} />
                  <span>{recipient.character_name || recipient.display_name || username}</span>
                  {alreadyKnows && <small>knows</small>}
                </label>
              );
            })}
          </div>
        )}
      </section>

      {handout.delivery_status?.length > 0 && (
        <section style={deliveryStatusStyle}>
          {handout.delivery_status.map(status => (
            <span key={status.username} style={deliveryChipStyle(status.read)}>{status.username}: {status.read ? 'read' : 'unread'}</span>
          ))}
        </section>
      )}
    </article>
  );
}

function PlayerHandoutsPanel({ onSummaryChange } = {}) {
  const [handouts, setHandouts] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [shareOptions, setShareOptions] = useState({});
  const [selectedShares, setSelectedShares] = useState({});
  const [sharingHandout, setSharingHandout] = useState(null);

  useEffect(() => {
    apiClient.get('/player/handouts')
      .then(response => setHandouts(response.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!onSummaryChange) return;
    onSummaryChange({
      total: handouts.length,
      unread: handouts.filter(handout => !handout.read).length,
      saved: handouts.filter(handout => handout.saved).length,
    });
  }, [handouts, onSummaryChange]);

  const markRead = async (handout) => {
    if (handout.read) return;
    try {
      await apiClient.patch(`/player/handouts/${handout.handout_id}/read`);
      setHandouts(prev => prev.map(item => item.handout_id === handout.handout_id ? { ...item, read: true } : item));
    } catch {}
  };

  const loadShareOptions = async (handout) => {
    if (handout.allow_player_sharing === false || shareOptions[handout.handout_id]) return;
    try {
      const response = await apiClient.get(`/player/handouts/${handout.handout_id}/share-options`);
      setShareOptions(prev => ({ ...prev, [handout.handout_id]: response.data?.recipients || [] }));
    } catch {}
  };

  const toggleSaved = async (handout, event) => {
    event.stopPropagation();
    const nextSaved = !handout.saved;
    try {
      await apiClient.patch(`/player/handouts/${handout.handout_id}/saved`, { saved: nextSaved });
      setHandouts(prev => prev.map(item => item.handout_id === handout.handout_id ? { ...item, saved: nextSaved } : item));
      toast.success(nextSaved ? 'Saved' : 'Removed from saved');
    } catch {
      toast.error('Could not update saved state');
    }
  };

  const toggleShareRecipient = (handoutId, username) => {
    setSelectedShares(prev => {
      const current = new Set(prev[handoutId] || []);
      if (current.has(username)) current.delete(username);
      else current.add(username);
      return { ...prev, [handoutId]: Array.from(current) };
    });
  };

  const shareWithPlayers = async (handout, event) => {
    event.stopPropagation();
    if (handout.allow_player_sharing === false) {
      toast.info('The GM has locked re-sharing for this entry');
      return;
    }
    const recipients = selectedShares[handout.handout_id] || [];
    if (!recipients.length) {
      toast.info('Choose at least one player first');
      return;
    }
    setSharingHandout(handout.handout_id);
    try {
      await apiClient.post(`/player/handouts/${handout.handout_id}/share`, { recipients });
      setHandouts(prev => prev.map(item => item.handout_id === handout.handout_id ? { ...item, shared_with: Array.from(new Set([...(item.shared_with || []), ...recipients])) } : item));
      setSelectedShares(prev => ({ ...prev, [handout.handout_id]: [] }));
      toast.success(`Shared with ${recipients.length} player(s)`);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not share entry');
    } finally {
      setSharingHandout(null);
    }
  };

  const handleExpand = (handout) => {
    const id = handout.id || handout.handout_id;
    const next = expanded === id ? null : id;
    setExpanded(next);
    markRead(handout);
    if (next) loadShareOptions(handout);
  };

  const filterOptions = buildHandoutFilters(handouts);
  const visibleHandouts = filterPlayerHandouts(handouts, activeFilter);
  const unreadCount = handouts.filter(handout => !handout.read).length;
  const savedCount = handouts.filter(handout => handout.saved).length;

  if (loading) return null;
  if (handouts.length === 0) return <div style={playerEmptyStyle}><Mail size={24} />No handouts yet</div>;

  return (
    <section style={playerPanelStyle}>
      {unreadCount > 0 && <div style={playerAlertStyle}><Mail size={16} /><span>You have {unreadCount} new reveal{unreadCount === 1 ? '' : 's'}.</span></div>}
      <h4 style={playerTitleStyle}><Mail size={15} /> Handouts & Reveals {savedCount > 0 && <span style={miniBadgeStyle}>{savedCount} saved</span>}</h4>
      <div style={playerFiltersStyle}>
        <Filter size={12} style={{ color: rq.muted }} />
        {filterOptions.map(option => <button key={option.id} onClick={() => setActiveFilter(option.id)} style={playerFilterButtonStyle(activeFilter === option.id)}>{option.label} {option.count > 0 ? `(${option.count})` : ''}</button>)}
      </div>
      {visibleHandouts.map(handout => {
        const id = handout.id || handout.handout_id;
        const isExpanded = expanded === id;
        return (
          <article key={id} onClick={() => handleExpand(handout)} style={playerCardStyle(!handout.read)}>
            <div style={playerCardTopStyle}>
              {handout.read ? <MailOpen size={14} /> : <Mail size={14} />}
              <strong>{handout.title}</strong>
              <span style={miniBadgeStyle}>{categoryLabel(handout.category || 'clue')}</span>
              {getAttachmentUrl(handout) && <AttachmentIcon handout={handout} size={12} />}
              {handout.saved && <Bookmark size={12} style={{ fill: rq.text }} />}
            </div>
            {isExpanded && (handout.content || getAttachmentUrl(handout)) && (
              <div style={playerContentStyle}>
                {getAttachmentUrl(handout) && <AttachmentPreview handout={handout} />}
                {handout.content && <p>{handout.content}</p>}
                <div style={playerActionsStyle} onClick={(event) => event.stopPropagation()}>
                  <button type="button" onClick={(event) => toggleSaved(handout, event)} style={savePlayerButtonStyle(handout.saved)}><Bookmark size={12} /> {handout.saved ? 'Saved' : 'Save'}</button>
                  {handout.allow_player_sharing === false && <span style={lockedStyle}>GM locked re-sharing</span>}
                  {handout.allow_player_sharing !== false && (shareOptions[handout.handout_id] || []).length > 0 && (
                    <button type="button" onClick={(event) => shareWithPlayers(handout, event)} disabled={sharingHandout === handout.handout_id || !(selectedShares[handout.handout_id] || []).length} style={sharePlayerButtonStyle}><Share2 size={12} /> {sharingHandout === handout.handout_id ? 'Sharing…' : 'Share selected'}</button>
                  )}
                </div>
                {handout.allow_player_sharing !== false && (shareOptions[handout.handout_id] || []).length > 0 && (
                  <div onClick={(event) => event.stopPropagation()} style={shareOptionsStyle}>
                    {(shareOptions[handout.handout_id] || []).map(recipient => (
                      <label key={recipient.username} style={playerRecipientStyle}>
                        <input type="checkbox" checked={(selectedShares[handout.handout_id] || []).includes(recipient.username)} onChange={() => toggleShareRecipient(handout.handout_id, recipient.username)} />
                        {recipient.character_name || recipient.display_name || recipient.username}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}

function filterPlayerHandouts(handouts, activeFilter) {
  if (activeFilter === 'all') return handouts;
  if (activeFilter === 'unread') return handouts.filter(item => !item.read);
  if (activeFilter === 'saved') return handouts.filter(item => item.saved);
  if (activeFilter === 'shared') return handouts.filter(item => item.shared_by);
  if (activeFilter === 'images') return handouts.filter(item => getAttachmentType(item).startsWith('image/'));
  if (activeFilter === 'pdfs') return handouts.filter(item => getAttachmentType(item) === 'application/pdf');
  if (activeFilter === 'audio') return handouts.filter(item => getAttachmentType(item).startsWith('audio/'));
  return handouts.filter(item => (item.category || 'clue') === activeFilter);
}

function buildHandoutFilters(handouts) {
  const base = [
    { id: 'all', label: 'All', count: handouts.length },
    { id: 'unread', label: 'Unread', count: handouts.filter(item => !item.read).length },
    { id: 'saved', label: 'Saved', count: handouts.filter(item => item.saved).length },
  ];
  const categoryCounts = handouts.reduce((acc, handout) => {
    const category = handout.category || 'clue';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});
  const categories = Object.entries(categoryCounts).map(([id, count]) => ({ id, label: categoryLabel(id), count }));
  const media = [
    { id: 'images', label: 'Images', count: handouts.filter(item => getAttachmentType(item).startsWith('image/')).length },
    { id: 'pdfs', label: 'PDFs', count: handouts.filter(item => getAttachmentType(item) === 'application/pdf').length },
    { id: 'audio', label: 'Audio', count: handouts.filter(item => getAttachmentType(item).startsWith('audio/')).length },
    { id: 'shared', label: 'Shared by players', count: handouts.filter(item => item.shared_by).length },
  ].filter(option => option.count > 0);
  return [...base, ...categories, ...media];
}

function getAttachmentUrl(handout) {
  return handout?.attachment_url || handout?.image_url || '';
}

function getAttachmentType(handout) {
  return handout?.attachment_type || (handout?.image_url ? 'image/upload' : '');
}

function HandoutSharingToggle({ value, onChange }) {
  return (
    <label style={shareToggleStyle}>
      <input type="checkbox" checked={value !== false} onChange={(event) => onChange(event.target.checked)} />
      <span><strong>Allow players to re-share this entry</strong><small>Turn this off for private secrets, dreams, backstory reveals, or lore that should stay with the original recipient.</small></span>
    </label>
  );
}

function HandoutAttachmentPanel({ title, helperText, value, onChange }) {
  const inputId = React.useId?.() || `handout-file-${Math.random().toString(36).slice(2)}`;
  const attachmentUrl = getAttachmentUrl(value);

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowed = file.type.startsWith('image/') || file.type === 'application/pdf' || file.type.startsWith('audio/');
    if (!allowed) { toast.error('Upload an image, PDF, or audio file'); return; }
    if (file.size > 12 * 1024 * 1024) { toast.error('File must be under 12MB'); return; }
    const reader = new FileReader();
    reader.onload = () => onChange(prev => ({
      ...prev,
      attachment_url: reader.result,
      attachment_type: file.type,
      attachment_name: file.name,
      image_url: file.type.startsWith('image/') ? reader.result : '',
    }));
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const clear = () => onChange(prev => ({ ...prev, attachment_url: '', attachment_type: '', attachment_name: '', image_url: '' }));

  return (
    <section style={attachmentPanelStyle}>
      <div style={attachmentHeaderStyle}>
        <div><h4>{title}</h4><p>{helperText}</p></div>
        <label htmlFor={inputId} style={uploadLabelStyle}>Upload file</label>
        <input id={inputId} type="file" accept="image/*,application/pdf,audio/*" onChange={handleFile} style={{ display: 'none' }} />
      </div>
      {attachmentUrl ? <div><AttachmentPreview handout={value} /><button type="button" onClick={clear} style={clearAttachmentStyle}>Clear attachment</button></div> : <div style={noAttachmentStyle}>No file attached yet</div>}
    </section>
  );
}

function AttachmentIcon({ handout, size = 12, style = {} }) {
  const type = getAttachmentType(handout);
  if (type.startsWith('audio/')) return <Volume2 size={size} style={style} />;
  if (type === 'application/pdf') return <FileText size={size} style={style} />;
  return <ImageIcon size={size} style={style} />;
}

function AttachmentPreview({ handout, compact = false }) {
  const url = getAttachmentUrl(handout);
  const type = getAttachmentType(handout);
  const name = handout?.attachment_name || 'Handout attachment';
  if (!url) return null;
  if (type.startsWith('audio/')) return <audio controls src={url} style={{ width: '100%', marginTop: compact ? 8 : 0 }} />;
  if (type === 'application/pdf') return <div style={pdfPreviewStyle(compact)}><strong>{name}</strong><a href={url} target="_blank" rel="noreferrer">Open PDF</a></div>;
  return <img src={url} alt={name} style={imagePreviewStyle(compact)} />;
}

const shellStyle = { display: 'grid', gap: 16, fontFamily: fontStack };
const loadingStyle = { minHeight: 180, display: 'grid', placeItems: 'center', color: rq.soft, background: rq.panel, border: `1px solid ${rq.line}`, fontFamily: fontStack };
const heroStyle = { display: 'flex', alignItems: 'flex-start', gap: 14, justifyContent: 'space-between', flexWrap: 'wrap', background: rq.card, border: `1px solid ${rq.line}`, padding: 16 };
const heroIconStyle = { width: 48, height: 48, display: 'grid', placeItems: 'center', background: rq.bg, color: rq.text, borderLeft: `6px solid ${rq.accent}`, flex: '0 0 auto' };
const eyebrowStyle = { margin: '0 0 5px', color: rq.muted, fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.1em' };
const titleStyle = { margin: 0, color: rq.text, fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: 950, letterSpacing: '-0.04em', lineHeight: 1.02 };
const subtitleStyle = { margin: '7px 0 0', color: rq.soft, fontSize: 14, lineHeight: 1.45, maxWidth: 820 };
const primaryButtonStyle = { minHeight: 42, border: 0, borderRadius: 0, background: rq.accent, color: rq.text, padding: '0 14px', fontWeight: 950, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', fontFamily: fontStack };
const secondaryButtonStyle = { minHeight: 42, border: 0, borderRadius: 0, background: rq.panel, color: rq.text, padding: '0 14px', fontWeight: 900, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', fontFamily: fontStack };
const ruleStyle = { background: rq.panel, borderLeft: `6px solid ${rq.accent}`, padding: 14, display: 'grid', gap: 4 };
const ruleLabelStyle = { margin: 0, color: rq.text, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 950 };
const ruleTextStyle = { margin: 0, color: rq.soft, lineHeight: 1.45, fontSize: 14 };
const statsStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', borderTop: `1px solid ${rq.line}`, borderBottom: `1px solid ${rq.line}` };
const statStyle = { minHeight: 64, padding: '10px 12px', display: 'grid', alignContent: 'center', gap: 3, borderRight: `1px solid ${rq.line}`, color: rq.text };
const controlsStyle = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(190px, 260px)', gap: 10 };
const searchWrapStyle = { position: 'relative', minWidth: 0 };
const searchIconStyle = { position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: rq.muted, zIndex: 1 };
const inputStyle = { width: '100%', minHeight: 44, background: rq.input, border: `1px solid ${rq.lineStrong}`, color: rq.text, padding: '0 11px', fontFamily: fontStack, outline: 'none', colorScheme: 'dark', borderRadius: 0 };
const searchInputStyle = { ...inputStyle, paddingLeft: 40 };
const selectStyle = { ...inputStyle, appearance: 'auto' };
const textareaStyle = { width: '100%', minHeight: 120, background: rq.input, border: `1px solid ${rq.lineStrong}`, color: rq.text, padding: 12, fontFamily: fontStack, lineHeight: 1.45, outline: 'none', resize: 'vertical', colorScheme: 'dark', borderRadius: 0 };
const formPanelStyle = { display: 'grid', gap: 12, background: rq.card, border: `1px solid ${rq.line}`, borderLeft: `6px solid ${rq.accent}`, padding: 14 };
const formTitleStyle = { margin: 0, color: rq.text, fontSize: 18, fontWeight: 950 };
const formHelpStyle = { margin: 0, color: rq.soft, fontSize: 13, lineHeight: 1.45 };
const twoColumnStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 };
const fieldStyle = { display: 'grid', gap: 6 };
const labelStyle = { color: rq.muted, fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.08em' };
const categoryHelpStyle = { margin: '-4px 0 0', color: rq.muted, fontSize: 12 };
const formActionsStyle = { display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap', borderTop: `1px solid ${rq.line}`, paddingTop: 12 };
const listStyle = { display: 'grid', gap: 14 };
const emptyStateStyle = { display: 'grid', justifyItems: 'center', gap: 10, textAlign: 'center', background: rq.panel, border: `1px dashed ${rq.lineStrong}`, padding: 38, color: rq.muted };
const entryCardStyle = (isLore) => ({ background: rq.card, border: `1px solid ${rq.line}`, borderLeft: `6px solid ${isLore ? rq.accent : rq.lineStrong}`, color: rq.text });
const entryHeaderStyle = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: 14, borderBottom: `1px solid ${rq.line}`, flexWrap: 'wrap' };
const entryTitleRowStyle = { display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' };
const entryTitleStyle = { margin: 0, color: rq.text, fontSize: 19, fontWeight: 950 };
const categoryBadgeStyle = (active) => ({ background: active ? rq.accent : rq.panel, color: rq.text, padding: '4px 8px', fontSize: 10, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.08em' });
const loreBadgeStyle = { background: rq.panel, color: rq.soft, padding: '4px 8px', fontSize: 10, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.08em', border: `1px solid ${rq.line}` };
const entryPreviewStyle = { margin: '8px 0 0', color: rq.soft, fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' };
const entryMetaStyle = { margin: '8px 0 0', color: rq.muted, fontSize: 12 };
const entryActionsStyle = { display: 'flex', gap: 7, flexWrap: 'wrap', justifyContent: 'flex-end' };
const smallButtonStyle = { minHeight: 34, border: 0, borderRadius: 0, background: rq.panel, color: rq.text, padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 900, fontFamily: fontStack };
const goodButtonStyle = { ...smallButtonStyle, background: rq.good };
const dangerButtonStyle = { ...smallButtonStyle, background: 'rgba(208,0,0,0.32)' };
const knowledgeBoxStyle = { padding: 14, display: 'grid', gap: 10, background: rq.panel };
const knowledgeHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' };
const knowledgeTitleStyle = { color: rq.text, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14 };
const knowledgeHelpStyle = { margin: '4px 0 0', color: rq.muted, fontSize: 12, lineHeight: 1.4 };
const primaryMiniButtonStyle = { minHeight: 34, border: 0, borderRadius: 0, background: rq.accent, color: rq.text, padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 950, fontFamily: fontStack };
const emptyRecipientsStyle = { margin: 0, color: rq.muted, fontSize: 13 };
const recipientGridStyle = { display: 'flex', gap: 8, flexWrap: 'wrap' };
const recipientPillStyle = (knows, checked) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, color: rq.text, background: knows ? 'rgba(31,157,102,0.18)' : checked ? 'rgba(208,0,0,0.18)' : rq.bg, border: `1px solid ${knows ? 'rgba(31,157,102,0.5)' : checked ? 'rgba(208,0,0,0.5)' : rq.lineStrong}`, padding: '6px 9px', fontSize: 12, cursor: 'pointer' });
const deliveryStatusStyle = { display: 'flex', gap: 6, flexWrap: 'wrap', padding: 14, borderTop: `1px solid ${rq.line}` };
const deliveryChipStyle = (read) => ({ color: read ? '#bbf7d0' : rq.soft, border: `1px solid ${read ? 'rgba(31,157,102,0.45)' : rq.lineStrong}`, background: read ? 'rgba(31,157,102,0.12)' : rq.bg, padding: '4px 8px', fontSize: 11 });
const shareToggleStyle = { display: 'flex', gap: 8, alignItems: 'flex-start', padding: 10, border: `1px solid ${rq.lineStrong}`, background: rq.panel, color: rq.soft, fontSize: 12, lineHeight: 1.45 };
const attachmentPanelStyle = { background: rq.panel, border: `1px solid ${rq.line}`, padding: 12 };
const attachmentHeaderStyle = { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', marginBottom: 10 };
const uploadLabelStyle = { color: rq.text, border: `1px solid ${rq.lineStrong}`, background: rq.bg, padding: '7px 10px', fontSize: 11, fontWeight: 900, cursor: 'pointer', whiteSpace: 'nowrap' };
const noAttachmentStyle = { color: rq.muted, border: `1px dashed ${rq.lineStrong}`, padding: 10, fontSize: 11 };
const clearAttachmentStyle = { marginTop: 8, background: 'transparent', border: `1px solid rgba(208,0,0,0.55)`, color: rq.text, padding: '5px 9px', fontSize: 11, cursor: 'pointer' };
const pdfPreviewStyle = (compact) => ({ marginTop: compact ? 8 : 0, border: `1px solid ${rq.line}`, padding: 10, background: rq.bg, display: 'grid', gap: 4, color: rq.text });
const imagePreviewStyle = (compact) => compact ? { width: 96, height: 64, objectFit: 'cover', border: `1px solid ${rq.line}`, marginTop: 8, display: 'block' } : { width: '100%', maxHeight: 320, objectFit: 'contain', border: `1px solid ${rq.line}`, background: rq.bg, marginBottom: 8 };
const playerPanelStyle = { display: 'flex', flexDirection: 'column', gap: 8, padding: 12, fontFamily: fontStack };
const playerEmptyStyle = { padding: 16, color: rq.muted, textAlign: 'center', fontSize: 12, display: 'grid', justifyItems: 'center', gap: 6 };
const playerAlertStyle = { display: 'flex', gap: 8, alignItems: 'center', padding: '10px 12px', border: `1px solid ${rq.lineStrong}`, background: rq.panel, color: rq.text };
const playerTitleStyle = { fontSize: 14, color: rq.text, margin: 0, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' };
const miniBadgeStyle = { background: rq.accent, color: rq.text, fontSize: 9, fontWeight: 900, padding: '2px 6px', textTransform: 'uppercase', letterSpacing: '0.06em' };
const playerFiltersStyle = { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', padding: '2px 0 4px' };
const playerFilterButtonStyle = (active) => ({ background: active ? rq.accent : rq.panel, border: 0, color: rq.text, cursor: 'pointer', fontSize: 10, fontWeight: 900, padding: '5px 8px', fontFamily: fontStack });
const playerCardStyle = (unread) => ({ padding: '9px 12px', cursor: 'pointer', border: `1px solid ${rq.line}`, borderLeft: `5px solid ${unread ? rq.accent : rq.lineStrong}`, background: unread ? rq.card : rq.panel, color: rq.text });
const playerCardTopStyle = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' };
const playerContentStyle = { marginTop: 8, borderTop: `1px solid ${rq.line}`, paddingTop: 8, color: rq.soft, lineHeight: 1.6, whiteSpace: 'pre-wrap', fontSize: 12 };
const playerActionsStyle = { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 };
const savePlayerButtonStyle = (saved) => ({ background: saved ? rq.accent : rq.card, border: 0, color: rq.text, cursor: 'pointer', padding: '5px 9px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5, fontFamily: fontStack });
const sharePlayerButtonStyle = { background: rq.good, border: 0, color: rq.text, cursor: 'pointer', padding: '5px 9px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5, fontFamily: fontStack };
const lockedStyle = { border: `1px solid ${rq.lineStrong}`, color: rq.muted, padding: '5px 9px', fontSize: 11 };
const shareOptionsStyle = { marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' };
const playerRecipientStyle = { display: 'flex', alignItems: 'center', gap: 5, color: rq.soft, fontSize: 11, border: `1px solid ${rq.lineStrong}`, padding: '4px 8px', background: rq.bg };

export { GMHandoutsTab, PlayerHandoutsPanel };
export default GMHandoutsTab;
