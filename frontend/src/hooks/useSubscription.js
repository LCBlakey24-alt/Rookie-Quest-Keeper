import { useState, useEffect, createContext, useContext } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Feature definitions by tier
const TIER_FEATURES = {
  free: {
    name: 'Free',
    color: '#808080',
    characters: 1,
    campaigns: 0,
    aiCallsPerMonth: 3,
    features: [
      'basic_character_sheet',
      'dice_roller',
      'join_campaigns'
    ]
  },
  pro: {
    name: 'All Access',
    color: '#F59E0B',
    characters: -1,
    campaigns: -1,
    aiCallsPerMonth: -1,
    features: [
      'basic_character_sheet',
      'dice_roller',
      'join_campaigns',
      'unlimited_characters',
      'character_journal',
      'party_inventory',
      'session_recaps',
      'portrait_ai',
      'unlimited_campaigns',
      'world_building',
      'rook_ai',
      'combat_tracker',
      'reference_tools',
      'session_mode',
      'priority_support',
      'early_access'
    ]
  },
  player: {
    name: 'Hero',
    color: '#3B82F6',
    characters: -1, // Unlimited
    campaigns: 0,
    aiCallsPerMonth: 50,
    features: [
      'basic_character_sheet',
      'dice_roller',
      'join_campaigns',
      'unlimited_characters',
      'character_journal',
      'party_inventory',
      'session_recaps',
      'portrait_ai'
    ]
  },
  gm: {
    name: 'Quest Master',
    color: '#E11D48',
    characters: 1,
    campaigns: -1, // Unlimited
    aiCallsPerMonth: -1, // Unlimited
    features: [
      'basic_character_sheet',
      'dice_roller',
      'join_campaigns',
      'unlimited_campaigns',
      'world_building',
      'rook_ai',
      'combat_tracker',
      'reference_tools',
      'session_mode'
    ]
  },
  legendary: {
    name: 'Legendary',
    color: '#F59E0B',
    characters: -1, // Unlimited
    campaigns: -1, // Unlimited
    aiCallsPerMonth: -1, // Unlimited
    features: [
      // All features
      'basic_character_sheet',
      'dice_roller',
      'join_campaigns',
      'unlimited_characters',
      'character_journal',
      'party_inventory',
      'session_recaps',
      'portrait_ai',
      'unlimited_campaigns',
      'world_building',
      'rook_ai',
      'combat_tracker',
      'reference_tools',
      'session_mode',
      'priority_support',
      'early_access'
    ]
  },
  // Legacy/Promo tier for early testers - full access
  adventurer: {
    name: 'Adventurer',
    color: '#22C55E',
    characters: -1, // Unlimited
    campaigns: -1, // Unlimited
    aiCallsPerMonth: -1, // Unlimited
    features: [
      'basic_character_sheet',
      'dice_roller',
      'join_campaigns',
      'unlimited_characters',
      'character_journal',
      'party_inventory',
      'session_recaps',
      'portrait_ai',
      'unlimited_campaigns',
      'world_building',
      'rook_ai',
      'combat_tracker',
      'reference_tools',
      'session_mode',
      'early_tester'
    ]
  }
};

['player', 'gm', 'legendary'].forEach((legacyTier) => {
  TIER_FEATURES[legacyTier] = {
    ...TIER_FEATURES.pro,
    name: legacyTier === 'legendary' ? 'All Access' : `${TIER_FEATURES[legacyTier].name} (Legacy)`,
    color: TIER_FEATURES.pro.color
  };
});

// Feature gate check
export function canAccessFeature(tier, feature) {
  const tierFeatures = TIER_FEATURES[tier] || TIER_FEATURES.free;
  return tierFeatures.features.includes(feature);
}

// Check if user can create more characters
export function canCreateCharacter(tier, currentCount) {
  const tierConfig = TIER_FEATURES[tier] || TIER_FEATURES.free;
  if (tierConfig.characters === -1) return true;
  return currentCount < tierConfig.characters;
}

// Check if user can create more campaigns
export function canCreateCampaign(tier, currentCount) {
  const tierConfig = TIER_FEATURES[tier] || TIER_FEATURES.free;
  if (tierConfig.campaigns === -1) return true;
  return currentCount < tierConfig.campaigns;
}

// Check AI calls remaining
export function canUseAI(tier, usedCalls) {
  const tierConfig = TIER_FEATURES[tier] || TIER_FEATURES.free;
  if (tierConfig.aiCallsPerMonth === -1) return true;
  return usedCalls < tierConfig.aiCallsPerMonth;
}

// Get feature requirements (which tier unlocks it)
export function getFeatureRequirement(feature) {
  for (const [tier, config] of Object.entries(TIER_FEATURES)) {
    if (config.features.includes(feature)) {
      return { tier, tierName: config.name, color: config.color };
    }
  }
  return { tier: 'pro', tierName: 'All Access', color: '#F59E0B' };
}

// Subscription Context
const SubscriptionContext = createContext(null);

export function SubscriptionProvider({ children }) {
  const [subscription, setSubscription] = useState({
    tier: 'free',
    tierName: 'Free',
    isLoading: true,
    error: null,
    aiCallsUsed: 0,
    aiCallsLimit: 3
  });

  const fetchSubscription = async () => {
    try {
      const response = await axios.get(`${API}/subscription/status`);
      setSubscription({
        tier: response.data.tier || 'free',
        tierName: response.data.tier_name || 'Free',
        isLoading: false,
        error: null,
        aiCallsUsed: response.data.ai_calls_used || 0,
        aiCallsLimit: response.data.ai_calls_limit || 3,
        isPremium: response.data.is_premium || false,
        subscriptionStatus: response.data.subscription_status || 'active'
      });
    } catch (error) {
      setSubscription(prev => ({
        ...prev,
        isLoading: false,
        error: error.message
      }));
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('dm_token');
    if (token) {
      fetchSubscription();
    } else {
      setSubscription(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const value = {
    ...subscription,
    refresh: fetchSubscription,
    canAccess: (feature) => canAccessFeature(subscription.tier, feature),
    canCreateCharacter: (currentCount) => canCreateCharacter(subscription.tier, currentCount),
    canCreateCampaign: (currentCount) => canCreateCampaign(subscription.tier, currentCount),
    canUseAI: () => canUseAI(subscription.tier, subscription.aiCallsUsed),
    getTierConfig: () => TIER_FEATURES[subscription.tier] || TIER_FEATURES.free
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

// Hook to use subscription
export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    // Return default values if used outside provider
    return {
      tier: 'free',
      tierName: 'Free',
      isLoading: false,
      canAccess: () => false,
      canCreateCharacter: () => false,
      canCreateCampaign: () => false,
      canUseAI: () => false,
      getTierConfig: () => TIER_FEATURES.free
    };
  }
  return context;
}

// Feature Gate Component
export function FeatureGate({ feature, children, fallback = null, showUpgrade = true }) {
  const { canAccess, tier } = useSubscription();
  
  if (canAccess(feature)) {
    return children;
  }
  
  if (fallback) {
    return fallback;
  }
  
  if (showUpgrade) {
    const requirement = getFeatureRequirement(feature);
    return (
      <div style={{
        padding: '16px',
        background: 'rgba(225, 29, 72, 0.1)',
        border: '1px solid rgba(225, 29, 72, 0.3)',
        textAlign: 'center'
      }}>
        <p style={{ color: '#B3B3B3', marginBottom: '8px', fontSize: '14px' }}>
          This feature requires <span style={{ color: requirement.color, fontWeight: '600' }}>{requirement.tierName}</span> tier
        </p>
        <a 
          href="/pricing" 
          style={{ 
            color: '#E11D48', 
            textDecoration: 'underline',
            fontSize: '13px'
          }}
        >
          Upgrade your subscription
        </a>
      </div>
    );
  }
  
  return null;
}

// Export tier info for UI
export const TIERS = TIER_FEATURES;
