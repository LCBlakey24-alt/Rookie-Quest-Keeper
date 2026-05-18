import React, { useState, useEffect, useRef } from 'react';
import { 
  Volume2, VolumeX, Play, Pause, Plus, Upload, Music, 
  Trees, Flame, Waves, Swords, Wind, CloudRain, Moon, 
  Building, Skull, Church, Heart, X, Trash2
} from 'lucide-react';

// Built-in ambient sounds library (using free sound URLs)
const BUILT_IN_SOUNDS = {
  tavern: {
    name: 'Tavern',
    icon: Building,
    category: 'locations',
    // Using placeholder - in production would use actual audio files
    description: 'Busy tavern ambience with chatter and music'
  },
  forest: {
    name: 'Forest',
    icon: Trees,
    category: 'nature',
    description: 'Peaceful forest with birds and rustling leaves'
  },
  campfire: {
    name: 'Campfire',
    icon: Flame,
    category: 'nature',
    description: 'Crackling campfire at night'
  },
  ocean: {
    name: 'Ocean Waves',
    icon: Waves,
    category: 'nature',
    description: 'Gentle ocean waves on the shore'
  },
  combat: {
    name: 'Battle',
    icon: Swords,
    category: 'action',
    description: 'Epic battle music and clashing swords'
  },
  wind: {
    name: 'Wind',
    icon: Wind,
    category: 'nature',
    description: 'Howling wind through mountains'
  },
  rain: {
    name: 'Rain',
    icon: CloudRain,
    category: 'weather',
    description: 'Gentle rain on rooftops'
  },
  storm: {
    name: 'Thunderstorm',
    icon: CloudRain,
    category: 'weather',
    description: 'Intense thunderstorm with lightning'
  },
  night: {
    name: 'Night',
    icon: Moon,
    category: 'nature',
    description: 'Crickets and night ambience'
  },
  dungeon: {
    name: 'Dungeon',
    icon: Skull,
    category: 'locations',
    description: 'Eerie dungeon with dripping water'
  },
  church: {
    name: 'Temple',
    icon: Church,
    category: 'locations',
    description: 'Peaceful temple with soft chanting'
  },
  tension: {
    name: 'Tension',
    icon: Heart,
    category: 'mood',
    description: 'Suspenseful music for tense moments'
  }
};

const CATEGORIES = [
  { id: 'all', name: 'All' },
  { id: 'nature', name: 'Nature' },
  { id: 'locations', name: 'Locations' },
  { id: 'weather', name: 'Weather' },
  { id: 'action', name: 'Action' },
  { id: 'mood', name: 'Mood' },
  { id: 'custom', name: 'Custom' }
];

export default function Soundboard({ theme, campaignId }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [playingSounds, setPlayingSounds] = useState({});
  const [volumes, setVolumes] = useState({});
  const [customSounds, setCustomSounds] = useState([]);
  const [masterVolume, setMasterVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const audioRefs = useRef({});
  const fileInputRef = useRef(null);

  // Load custom sounds from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`soundboard-custom-${campaignId}`);
    if (saved) {
      setCustomSounds(JSON.parse(saved));
    }
  }, [campaignId]);

  // Save custom sounds to localStorage
  useEffect(() => {
    localStorage.setItem(`soundboard-custom-${campaignId}`, JSON.stringify(customSounds));
  }, [customSounds, campaignId]);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if it's an audio file
    if (!file.type.startsWith('audio/')) {
      alert('Please upload an audio file');
      return;
    }

    // Create object URL for the file
    const url = URL.createObjectURL(file);
    const newSound = {
      id: `custom-${Date.now()}`,
      name: file.name.replace(/\.[^/.]+$/, ''),
      url,
      category: 'custom',
      isCustom: true
    };

    setCustomSounds(prev => [...prev, newSound]);
  };

  const removeCustomSound = (soundId) => {
    setCustomSounds(prev => prev.filter(s => s.id !== soundId));
    // Stop if playing
    if (playingSounds[soundId]) {
      toggleSound(soundId);
    }
  };

  const toggleSound = (soundId, soundUrl) => {
    const isPlaying = playingSounds[soundId];
    
    if (isPlaying) {
      // Stop the sound
      if (audioRefs.current[soundId]) {
        audioRefs.current[soundId].pause();
        audioRefs.current[soundId].currentTime = 0;
      }
      setPlayingSounds(prev => {
        const next = { ...prev };
        delete next[soundId];
        return next;
      });
    } else {
      // For built-in sounds, we'd need actual audio URLs
      // For now, show a placeholder message
      if (!soundUrl) {
        // This is a built-in sound - in production, you'd have actual URLs
        // Placeholder until audio pipeline is wired for this sound id.
      }
      
      // Create or get audio element
      if (!audioRefs.current[soundId] && soundUrl) {
        audioRefs.current[soundId] = new Audio(soundUrl);
        audioRefs.current[soundId].loop = true;
      }
      
      if (audioRefs.current[soundId]) {
        audioRefs.current[soundId].volume = (volumes[soundId] || 0.5) * masterVolume * (isMuted ? 0 : 1);
        audioRefs.current[soundId].play();
      }
      
      setPlayingSounds(prev => ({ ...prev, [soundId]: true }));
    }
  };

  const updateVolume = (soundId, value) => {
    setVolumes(prev => ({ ...prev, [soundId]: value }));
    if (audioRefs.current[soundId]) {
      audioRefs.current[soundId].volume = value * masterVolume * (isMuted ? 0 : 1);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    Object.keys(audioRefs.current).forEach(soundId => {
      if (audioRefs.current[soundId]) {
        audioRefs.current[soundId].volume = isMuted 
          ? (volumes[soundId] || 0.5) * masterVolume 
          : 0;
      }
    });
  };

  const stopAll = () => {
    Object.keys(playingSounds).forEach(soundId => {
      if (audioRefs.current[soundId]) {
        audioRefs.current[soundId].pause();
        audioRefs.current[soundId].currentTime = 0;
      }
    });
    setPlayingSounds({});
  };

  const filteredBuiltIn = activeCategory === 'all' || activeCategory === 'custom'
    ? Object.entries(BUILT_IN_SOUNDS)
    : Object.entries(BUILT_IN_SOUNDS).filter(([_, s]) => s.category === activeCategory);

  const filteredCustom = activeCategory === 'all' || activeCategory === 'custom'
    ? customSounds
    : [];

  return (
    <div style={{ padding: '20px' }}>
      {/* Header with Master Controls */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px',
        padding: '16px',
        background: theme.bg.card,
        borderRadius: '12px',
        border: `1px solid ${theme.border}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Music size={24} style={{ color: theme.accent.primary }} />
          <h3 style={{ fontFamily: "'Outfit', sans-serif", color: theme.text.primary, margin: 0 }}>
            Soundboard
          </h3>
          <span style={{ 
            fontSize: '12px', 
            color: theme.text.muted,
            background: theme.accent.subtle,
            padding: '4px 8px',
            borderRadius: '4px'
          }}>
            {Object.keys(playingSounds).length} playing
          </span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Master Volume */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={toggleMute}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: isMuted ? theme.text.muted : theme.accent.primary
              }}
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={masterVolume}
              onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
              style={{ width: '80px', accentColor: theme.accent.primary }}
            />
          </div>
          
          {/* Stop All */}
          <button
            onClick={stopAll}
            disabled={Object.keys(playingSounds).length === 0}
            style={{
              padding: '8px 16px',
              background: Object.keys(playingSounds).length > 0 ? 'rgba(239, 68, 68, 0.2)' : theme.bg.elevated,
              border: `1px solid ${Object.keys(playingSounds).length > 0 ? 'rgba(239, 68, 68, 0.3)' : theme.border}`,
              borderRadius: '8px',
              color: Object.keys(playingSounds).length > 0 ? '#ef4444' : theme.text.muted,
              cursor: Object.keys(playingSounds).length > 0 ? 'pointer' : 'not-allowed',
              fontSize: '13px',
              fontWeight: '500'
            }}
          >
            Stop All
          </button>
          
          {/* Upload Custom */}
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '8px 16px',
              background: theme.accent.subtle,
              border: `1px solid ${theme.border}`,
              borderRadius: '8px',
              color: theme.accent.primary,
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Upload size={16} /> Upload Sound
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {/* Category Filter */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            style={{
              padding: '8px 16px',
              background: activeCategory === cat.id ? theme.accent.primary : theme.bg.elevated,
              border: `1px solid ${activeCategory === cat.id ? theme.accent.primary : theme.border}`,
              borderRadius: '20px',
              color: activeCategory === cat.id ? '#fff' : theme.text.secondary,
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Sounds Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '12px'
      }}>
        {/* Built-in Sounds */}
        {activeCategory !== 'custom' && filteredBuiltIn.map(([id, sound]) => {
          const IconComponent = sound.icon;
          const isPlaying = playingSounds[id];
          
          return (
            <div
              key={id}
              style={{
                padding: '16px',
                background: isPlaying ? theme.accent.subtle : theme.bg.card,
                border: `1px solid ${isPlaying ? theme.accent.primary : theme.border}`,
                borderRadius: '12px',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: isPlaying ? theme.accent.primary : theme.bg.elevated,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <IconComponent size={18} style={{ color: isPlaying ? '#fff' : theme.accent.primary }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', color: theme.text.primary, fontSize: '14px' }}>{sound.name}</div>
                    <div style={{ fontSize: '11px', color: theme.text.muted }}>{sound.category}</div>
                  </div>
                </div>
                <button
                  onClick={() => toggleSound(id)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: isPlaying ? theme.accent.primary : theme.bg.elevated,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {isPlaying ? <Pause size={14} color="#fff" /> : <Play size={14} color={theme.accent.primary} />}
                </button>
              </div>
              
              {/* Volume Slider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Volume2 size={14} style={{ color: theme.text.muted }} />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volumes[id] || 0.5}
                  onChange={(e) => updateVolume(id, parseFloat(e.target.value))}
                  style={{ flex: 1, accentColor: theme.accent.primary }}
                />
              </div>
            </div>
          );
        })}

        {/* Custom Sounds */}
        {filteredCustom.map(sound => {
          const isPlaying = playingSounds[sound.id];
          
          return (
            <div
              key={sound.id}
              style={{
                padding: '16px',
                background: isPlaying ? theme.accent.subtle : theme.bg.card,
                border: `1px solid ${isPlaying ? theme.accent.primary : theme.border}`,
                borderRadius: '12px',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: isPlaying ? theme.accent.primary : theme.bg.elevated,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Music size={18} style={{ color: isPlaying ? '#fff' : theme.accent.gold }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', color: theme.text.primary, fontSize: '14px' }}>{sound.name}</div>
                    <div style={{ fontSize: '11px', color: theme.accent.gold }}>Custom</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => toggleSound(sound.id, sound.url)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: isPlaying ? theme.accent.primary : theme.bg.elevated,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {isPlaying ? <Pause size={14} color="#fff" /> : <Play size={14} color={theme.accent.primary} />}
                  </button>
                  <button
                    onClick={() => removeCustomSound(sound.id)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Trash2 size={14} color="#ef4444" />
                  </button>
                </div>
              </div>
              
              {/* Volume Slider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Volume2 size={14} style={{ color: theme.text.muted }} />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volumes[sound.id] || 0.5}
                  onChange={(e) => updateVolume(sound.id, parseFloat(e.target.value))}
                  style={{ flex: 1, accentColor: theme.accent.primary }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State for Custom */}
      {activeCategory === 'custom' && customSounds.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: theme.text.muted
        }}>
          <Music size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
          <p>No custom sounds uploaded yet</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              marginTop: '16px',
              padding: '12px 24px',
              background: theme.gradient,
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Upload Your First Sound
          </button>
        </div>
      )}
    </div>
  );
}
