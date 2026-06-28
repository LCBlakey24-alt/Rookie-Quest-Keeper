import React, { useEffect, useRef, useState } from 'react';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';
import { Building, Castle, Home, Map, MapPin, Mountain, Plus, Save, Trees, Trash2, Upload, Waves, X } from 'lucide-react';

const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';
const titleFont = 'var(--rq-title-font, "Germania One", Georgia, serif)';
const rq = {
  bg: '#242424',
  panel: '#2f2f2f',
  card: '#3a3a3a',
  red: '#d00000',
  text: '#ffffff',
  soft: 'rgba(255,255,255,0.74)',
  muted: 'rgba(255,255,255,0.58)',
  line: 'rgba(255,255,255,0.16)',
  good: '#1f9d66',
  warn: '#d99222',
};

const PIN_TYPES = [
  { id: 'capital', label: 'Capital', icon: Castle, color: '#d99222' },
  { id: 'city', label: 'City', icon: Building, color: '#d00000' },
  { id: 'town', label: 'Town', icon: Home, color: '#ffffff' },
  { id: 'village', label: 'Village', icon: Home, color: '#c9c9c9' },
  { id: 'landmark', label: 'Landmark', icon: Mountain, color: '#d99222' },
  { id: 'dungeon', label: 'Dungeon', icon: Mountain, color: '#d00000' },
  { id: 'port', label: 'Port', icon: Waves, color: '#ffffff' },
  { id: 'forest', label: 'Forest', icon: Trees, color: '#1f9d66' },
  { id: 'custom', label: 'Custom', icon: MapPin, color: '#d00000' },
];

const EMPTY_MAP = { name: '', scale_value: 50, scale_unit: 'miles', image_data: '' };
const EMPTY_PIN = { name: '', pin_type: 'city', description: '', linked_location_id: '', x: 50, y: 50 };

function pinTypeFor(type) {
  return PIN_TYPES.find(pin => pin.id === type) || PIN_TYPES[PIN_TYPES.length - 1];
}

function normaliseMaps(data) {
  return Array.isArray(data) ? data : [];
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => resolve(event.target?.result || '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function compressImage(file) {
  if (!file?.type?.startsWith('image/')) throw new Error('Please choose an image file');
  const originalDataUrl = await readFileAsDataUrl(file);
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = originalDataUrl;
  });

  const maxSide = 2600;
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  context.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', 0.84);
}

export default function WorldMapTab({ campaignId }) {
  const [worldMaps, setWorldMaps] = useState([]);
  const [selectedMap, setSelectedMap] = useState(null);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [newMapData, setNewMapData] = useState(EMPTY_MAP);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');
  const [mode, setMode] = useState('view');
  const [selectedPin, setSelectedPin] = useState(null);
  const [showPinEditor, setShowPinEditor] = useState(false);
  const [pinForm, setPinForm] = useState(EMPTY_PIN);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    fetchWorldMaps();
    fetchLocations();
  }, [campaignId]);

  const fetchWorldMaps = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/campaigns/${campaignId}/world-maps`);
      const maps = normaliseMaps(response.data);
      setWorldMaps(maps);
      setSelectedMap(current => {
        if (!maps.length) return null;
        if (!current) return maps[0];
        return maps.find(map => map.id === current.id) || maps[0];
      });
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not load world maps');
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await apiClient.get(`/campaigns/${campaignId}/locations`);
      setLocations(Array.isArray(response.data) ? response.data : []);
    } catch {
      setLocations([]);
    }
  };

  const handleImageUpload = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    setUploadingImage(true);
    setUploadFileName(file.name);
    try {
      const imageData = await compressImage(file);
      setNewMapData(prev => ({ ...prev, image_data: imageData }));
      toast.success('Map image ready', { description: 'Large images are resized before saving so uploads are more reliable.' });
    } catch (error) {
      toast.error('Could not prepare image', { description: error?.message || 'Try a PNG, JPG, or WebP image.' });
    } finally {
      setUploadingImage(false);
      if (event.target) event.target.value = '';
    }
  };

  const handleCreateMap = async () => {
    if (!newMapData.name.trim()) {
      toast.error('Give the map a name');
      return;
    }
    if (!newMapData.image_data) {
      toast.error('Upload a map image first');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...newMapData, name: newMapData.name.trim(), scale_value: Number(newMapData.scale_value) || 50 };
      const response = await apiClient.post(`/campaigns/${campaignId}/world-maps`, payload);
      const created = response.data;
      setWorldMaps(prev => [...prev, created]);
      setSelectedMap(created);
      setShowUpload(false);
      setNewMapData(EMPTY_MAP);
      setUploadFileName('');
      toast.success('World map uploaded');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to create world map');
    } finally {
      setSaving(false);
    }
  };

  const getMapPercent = event => {
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100)),
    };
  };

  const handleMapClick = event => {
    if (!selectedMap || mode !== 'addPin') return;
    const position = getMapPercent(event);
    if (!position) return;
    setSelectedPin(null);
    setPinForm({ ...EMPTY_PIN, x: position.x, y: position.y });
    setShowPinEditor(true);
  };

  const openPin = pin => {
    setSelectedPin(pin);
    setPinForm({
      name: pin.name || '',
      pin_type: pin.pin_type || 'city',
      description: pin.description || '',
      linked_location_id: pin.linked_location_id || '',
      x: pin.x ?? 50,
      y: pin.y ?? 50,
    });
    setShowPinEditor(true);
  };

  const savePin = async () => {
    if (!selectedMap) return;
    if (!pinForm.name.trim()) {
      toast.error('Give the pin a name');
      return;
    }
    setSaving(true);
    try {
      const type = pinTypeFor(pinForm.pin_type);
      const payload = { ...pinForm, name: pinForm.name.trim(), color: type.color, icon: type.id };
      let savedPin;
      if (selectedPin) {
        await apiClient.put(`/campaigns/${campaignId}/world-maps/${selectedMap.id}/pins/${selectedPin.id}`, payload);
        savedPin = { ...selectedPin, ...payload };
        setSelectedMap(prev => ({ ...prev, pins: (prev.pins || []).map(pin => pin.id === selectedPin.id ? savedPin : pin) }));
        toast.success('Map pin updated');
      } else {
        const response = await apiClient.post(`/campaigns/${campaignId}/world-maps/${selectedMap.id}/pins`, payload);
        savedPin = response.data;
        setSelectedMap(prev => ({ ...prev, pins: [...(prev.pins || []), savedPin] }));
        toast.success('Map pin added');
      }
      setWorldMaps(prev => prev.map(map => map.id === selectedMap.id ? { ...map, pins: selectedPin ? (map.pins || []).map(pin => pin.id === selectedPin.id ? savedPin : pin) : [...(map.pins || []), savedPin] } : map));
      setShowPinEditor(false);
      setSelectedPin(null);
      setPinForm(EMPTY_PIN);
      setMode('view');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not save pin');
    } finally {
      setSaving(false);
    }
  };

  const deletePin = async () => {
    if (!selectedMap || !selectedPin) return;
    setSaving(true);
    try {
      await apiClient.delete(`/campaigns/${campaignId}/world-maps/${selectedMap.id}/pins/${selectedPin.id}`);
      setSelectedMap(prev => ({ ...prev, pins: (prev.pins || []).filter(pin => pin.id !== selectedPin.id) }));
      setWorldMaps(prev => prev.map(map => map.id === selectedMap.id ? { ...map, pins: (map.pins || []).filter(pin => pin.id !== selectedPin.id) } : map));
      setShowPinEditor(false);
      setSelectedPin(null);
      toast.success('Map pin removed');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not delete pin');
    } finally {
      setSaving(false);
    }
  };

  const deleteMap = async () => {
    if (!selectedMap || !window.confirm(`Delete ${selectedMap.name}?`)) return;
    setSaving(true);
    try {
      await apiClient.delete(`/campaigns/${campaignId}/world-maps/${selectedMap.id}`);
      const remaining = worldMaps.filter(map => map.id !== selectedMap.id);
      setWorldMaps(remaining);
      setSelectedMap(remaining[0] || null);
      toast.success('World map deleted');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not delete map');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <section style={loadingStyle}>Loading world maps…</section>;

  return (
    <section data-testid="world-map-tab" style={shellStyle}>
      <header style={headerStyle}>
        <div style={{ minWidth: 0 }}>
          <p style={eyebrowStyle}>World Maps</p>
          <h3 style={titleStyle}>{selectedMap?.name || 'No map uploaded yet'}</h3>
          <p style={subtitleStyle}>Upload your campaign world or region map, then add pins for cities, towns, dungeons, ports, forests, and landmarks.</p>
        </div>
        <div style={headerActionsStyle}>
          {worldMaps.length > 0 && (
            <select value={selectedMap?.id || ''} onChange={event => setSelectedMap(worldMaps.find(map => map.id === event.target.value) || null)} style={selectStyle}>
              {worldMaps.map(map => <option key={map.id} value={map.id}>{map.name}</option>)}
            </select>
          )}
          <button type="button" onClick={() => setShowUpload(true)} style={primaryButtonStyle}><Upload size={15} /> Upload Map</button>
          {selectedMap && <button type="button" onClick={deleteMap} disabled={saving} style={secondaryButtonStyle}><Trash2 size={15} /> Delete</button>}
        </div>
      </header>

      {selectedMap && (
        <nav style={toolbarStyle}>
          <button type="button" onClick={() => setMode('view')} style={toolButtonStyle(mode === 'view')}><Map size={15} /> View</button>
          <button type="button" onClick={() => setMode('addPin')} style={toolButtonStyle(mode === 'addPin')}><Plus size={15} /> Add Pin</button>
          <span style={hintStyle}>{mode === 'addPin' ? 'Click the map to place a new pin.' : 'Click an existing pin to edit it.'}</span>
        </nav>
      )}

      <main style={mapStageStyle}>
        {selectedMap ? (
          <div ref={mapRef} onClick={handleMapClick} style={mapCanvasStyle(mode === 'addPin')}>
            <img src={selectedMap.image_data} alt={selectedMap.name} style={mapImageStyle} />
            {(selectedMap.pins || []).map(pin => <MapPinMarker key={pin.id} pin={pin} onClick={openPin} />)}
          </div>
        ) : (
          <div style={emptyStateStyle}>
            <Map size={54} />
            <h3>No world map uploaded</h3>
            <p>Upload your first map image. The upload panel now fits the screen and compresses big images before saving.</p>
            <button type="button" onClick={() => setShowUpload(true)} style={primaryButtonStyle}><Upload size={15} /> Upload World Map</button>
          </div>
        )}
      </main>

      {showUpload && (
        <div style={overlayStyle} role="presentation">
          <section style={modalStyle} role="dialog" aria-modal="true" aria-label="Upload world map">
            <header style={modalHeaderStyle}>
              <div>
                <p style={eyebrowStyle}>Upload</p>
                <h3 style={modalTitleStyle}>Upload World Map</h3>
                <p style={modalTextStyle}>Choose an image, preview it, then save it to the campaign atlas. Large images are resized for reliability.</p>
              </div>
              <button type="button" onClick={() => setShowUpload(false)} style={iconButtonStyle} aria-label="Close upload"><X size={18} /></button>
            </header>

            <div style={formGridStyle}>
              <Field label="Map name">
                <input value={newMapData.name} onChange={event => setNewMapData(prev => ({ ...prev, name: event.target.value }))} placeholder="The Realm of Eldoria" style={inputStyle} />
              </Field>
              <Field label="Scale value">
                <input type="number" min="1" value={newMapData.scale_value} onChange={event => setNewMapData(prev => ({ ...prev, scale_value: event.target.value }))} style={inputStyle} />
              </Field>
              <Field label="Scale unit">
                <select value={newMapData.scale_unit} onChange={event => setNewMapData(prev => ({ ...prev, scale_unit: event.target.value }))} style={selectStyle}>
                  <option value="miles">Miles</option>
                  <option value="km">Kilometres</option>
                  <option value="leagues">Leagues</option>
                </select>
              </Field>
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
            <button type="button" onClick={() => fileInputRef.current?.click()} style={uploadBoxStyle(Boolean(newMapData.image_data))} data-testid="world-map-upload-box">
              {newMapData.image_data ? (
                <>
                  <img src={newMapData.image_data} alt="World map preview" style={previewImageStyle} />
                  <strong>{uploadFileName || 'Map image ready'}</strong>
                  <span>Click to choose a different image.</span>
                </>
              ) : (
                <>
                  <Upload size={32} />
                  <strong>{uploadingImage ? 'Preparing image…' : 'Choose map image'}</strong>
                  <span>PNG, JPG, or WebP. Large images will be resized before saving.</span>
                </>
              )}
            </button>

            <footer style={modalActionsStyle}>
              <button type="button" onClick={() => setShowUpload(false)} style={secondaryButtonStyle}>Cancel</button>
              <button type="button" onClick={handleCreateMap} disabled={saving || uploadingImage || !newMapData.name.trim() || !newMapData.image_data} style={primaryButtonStyle}><Save size={15} /> {saving ? 'Saving…' : 'Create Map'}</button>
            </footer>
          </section>
        </div>
      )}

      {showPinEditor && selectedMap && (
        <div style={overlayStyle} role="presentation">
          <section style={modalStyle} role="dialog" aria-modal="true" aria-label="Map pin editor">
            <header style={modalHeaderStyle}>
              <div>
                <p style={eyebrowStyle}>{selectedPin ? 'Edit Pin' : 'New Pin'}</p>
                <h3 style={modalTitleStyle}>{selectedPin ? 'Edit Location Pin' : 'Add Location Pin'}</h3>
              </div>
              <button type="button" onClick={() => { setShowPinEditor(false); setSelectedPin(null); }} style={iconButtonStyle} aria-label="Close pin editor"><X size={18} /></button>
            </header>
            <div style={formGridStyle}>
              <Field label="Name"><input value={pinForm.name} onChange={event => setPinForm(prev => ({ ...prev, name: event.target.value }))} style={inputStyle} /></Field>
              <Field label="Type"><select value={pinForm.pin_type} onChange={event => setPinForm(prev => ({ ...prev, pin_type: event.target.value }))} style={selectStyle}>{PIN_TYPES.map(type => <option key={type.id} value={type.id}>{type.label}</option>)}</select></Field>
              <Field label="Link location"><select value={pinForm.linked_location_id} onChange={event => setPinForm(prev => ({ ...prev, linked_location_id: event.target.value }))} style={selectStyle}><option value="">No linked location</option>{locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select></Field>
            </div>
            <Field label="Description"><textarea value={pinForm.description} onChange={event => setPinForm(prev => ({ ...prev, description: event.target.value }))} style={textareaStyle} /></Field>
            <footer style={modalActionsStyle}>
              {selectedPin && <button type="button" onClick={deletePin} disabled={saving} style={dangerButtonStyle}><Trash2 size={15} /> Delete</button>}
              <span style={{ flex: 1 }} />
              <button type="button" onClick={() => { setShowPinEditor(false); setSelectedPin(null); }} style={secondaryButtonStyle}>Cancel</button>
              <button type="button" onClick={savePin} disabled={saving || !pinForm.name.trim()} style={primaryButtonStyle}><Save size={15} /> Save Pin</button>
            </footer>
          </section>
        </div>
      )}
    </section>
  );
}

function MapPinMarker({ pin, onClick }) {
  const type = pinTypeFor(pin.pin_type);
  const Icon = type.icon;
  return (
    <button type="button" onClick={event => { event.stopPropagation(); onClick(pin); }} style={pinMarkerStyle(pin, type)} title={pin.name}>
      <Icon size={16} />
      <span>{pin.name}</span>
    </button>
  );
}

function Field({ label, children }) {
  return <label style={fieldStyle}><span>{label}</span>{children}</label>;
}

const shellStyle = { height: '100%', minHeight: 520, display: 'flex', flexDirection: 'column', background: rq.panel, color: rq.text, fontFamily: fontStack, overflow: 'hidden' };
const loadingStyle = { padding: 24, background: rq.panel, color: rq.soft, fontFamily: fontStack };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', padding: 14, background: rq.card, borderBottom: `1px solid ${rq.line}` };
const eyebrowStyle = { margin: '0 0 4px', color: rq.red, fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.11em' };
const titleStyle = { margin: 0, color: rq.text, fontFamily: titleFont, fontSize: 'clamp(30px, 4vw, 48px)', lineHeight: 0.95 };
const subtitleStyle = { margin: '6px 0 0', color: rq.soft, lineHeight: 1.4, maxWidth: 780 };
const headerActionsStyle = { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end' };
const toolbarStyle = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: 10, background: rq.bg, borderBottom: `1px solid ${rq.line}` };
const hintStyle = { color: rq.muted, fontSize: 12, marginLeft: 4 };
const mapStageStyle = { flex: 1, minHeight: 0, overflow: 'auto', background: rq.bg, padding: 12 };
const mapCanvasStyle = (adding) => ({ position: 'relative', width: '100%', minWidth: 280, maxWidth: '100%', margin: '0 auto', cursor: adding ? 'crosshair' : 'default' });
const mapImageStyle = { width: '100%', height: 'auto', display: 'block', userSelect: 'none', border: `1px solid ${rq.line}` };
const emptyStateStyle = { minHeight: 380, display: 'grid', placeItems: 'center', alignContent: 'center', textAlign: 'center', gap: 10, color: rq.soft, background: rq.card, border: `1px dashed ${rq.line}`, padding: 28 };
const overlayStyle = { position: 'fixed', inset: 0, zIndex: 5000, background: 'rgba(0,0,0,0.78)', display: 'grid', placeItems: 'center', padding: 14 };
const modalStyle = { width: 'min(560px, calc(100vw - 28px))', maxHeight: 'calc(100dvh - 28px)', overflowY: 'auto', background: rq.panel, border: `1px solid ${rq.line}`, borderLeft: `7px solid ${rq.red}`, color: rq.text, padding: 16, fontFamily: fontStack };
const modalHeaderStyle = { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', borderBottom: `1px solid ${rq.line}`, paddingBottom: 12, marginBottom: 12 };
const modalTitleStyle = { margin: 0, color: rq.text, fontFamily: titleFont, fontSize: 38, lineHeight: 0.95 };
const modalTextStyle = { margin: '6px 0 0', color: rq.soft, lineHeight: 1.4, fontSize: 13 };
const formGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 12 };
const fieldStyle = { display: 'grid', gap: 5, color: rq.muted, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 };
const inputStyle = { width: '100%', minHeight: 38, background: rq.bg, border: `1px solid ${rq.line}`, color: rq.text, padding: '0 9px', fontFamily: fontStack };
const selectStyle = { minHeight: 38, background: rq.bg, border: `1px solid ${rq.line}`, color: rq.text, padding: '0 9px', fontFamily: fontStack };
const textareaStyle = { width: '100%', minHeight: 92, background: rq.bg, border: `1px solid ${rq.line}`, color: rq.text, padding: 9, resize: 'vertical', fontFamily: fontStack };
const uploadBoxStyle = (hasImage) => ({ width: '100%', minHeight: hasImage ? 220 : 170, display: 'grid', placeItems: 'center', gap: 8, textAlign: 'center', background: rq.bg, color: rq.text, border: `2px dashed ${hasImage ? rq.good : rq.line}`, padding: 14, cursor: 'pointer', fontFamily: fontStack, marginTop: 8 });
const previewImageStyle = { maxWidth: '100%', maxHeight: 260, objectFit: 'contain', border: `1px solid ${rq.line}` };
const modalActionsStyle = { display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap', marginTop: 14, borderTop: `1px solid ${rq.line}`, paddingTop: 12 };
const primaryButtonStyle = { minHeight: 38, border: 0, background: rq.red, color: rq.text, padding: '0 12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontWeight: 950, cursor: 'pointer', fontFamily: fontStack };
const secondaryButtonStyle = { minHeight: 38, border: 0, background: rq.card, color: rq.text, padding: '0 12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontWeight: 900, cursor: 'pointer', fontFamily: fontStack };
const dangerButtonStyle = { ...secondaryButtonStyle, color: rq.text, border: `1px solid ${rq.red}` };
const iconButtonStyle = { width: 36, height: 36, display: 'grid', placeItems: 'center', background: rq.card, color: rq.text, border: 0, cursor: 'pointer' };
const toolButtonStyle = (active) => ({ minHeight: 34, border: 0, background: active ? rq.red : rq.card, color: rq.text, padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 900, cursor: 'pointer', fontFamily: fontStack });
const pinMarkerStyle = (pin, type) => ({ position: 'absolute', left: `${pin.x}%`, top: `${pin.y}%`, transform: 'translate(-50%, -100%)', display: 'inline-flex', alignItems: 'center', gap: 4, background: rq.bg, color: type.color === '#ffffff' ? rq.text : type.color, border: `2px solid ${type.color}`, padding: '5px 7px', fontSize: 11, fontWeight: 950, cursor: 'pointer', whiteSpace: 'nowrap', zIndex: 2, fontFamily: fontStack });
