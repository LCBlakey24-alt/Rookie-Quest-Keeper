import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Check, Crown, Sparkles, Loader2, Copy, Users, Gift, Swords, User, Star } from 'lucide-react';
import { API_BASE } from '@/lib/api';

const API = API_BASE;

// Theme
const theme = {
  bg: { black: '#0B0F19', dark: '#141414', panel: '#111827', card: '#111827' },
  accent: { red: '#F59E0B', blue: '#06B6D4', gold: '#F59E0B' },
  text: { white: '#FFFFFF', secondary: '#B3B3B3', muted: '#808080' },
  border: 'rgba(212, 175, 55, 0.15)'
};

function PricingPage({ username, onLogout }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [promoCode, setPromoCode] = useState('');
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [referralInfo, setReferralInfo] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');

  useEffect(() => {
    fetchData();
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      pollPaymentStatus(sessionId);
    }
  }, [searchParams]);

  const fetchData = async () => {
    try {
      const [plansRes, subRes, refRes] = await Promise.all([
        axios.get(`${API}/subscription/plans`),
        axios.get(`${API}/subscription/status`),
        axios.get(`${API}/referral/code`)
      ]);
      setPlans(plansRes.data.plans);
      setSubscription(subRes.data);
      setReferralInfo(refRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const pollPaymentStatus = async (sessionId, attempts = 0) => {
    const maxAttempts = 5;
    if (attempts >= maxAttempts) {
      toast.error('Payment status check timed out. Please refresh.');
      return;
    }
    try {
      const response = await axios.get(`${API}/subscription/checkout/status/${sessionId}`);
      if (response.data.status === 'complete') {
        toast.success('Welcome to your new subscription!');
        fetchData();
        window.history.replaceState({}, '', '/pricing');
      } else if (response.data.status === 'open') {
        setTimeout(() => pollPaymentStatus(sessionId, attempts + 1), 2000);
      }
    } catch (error) {
      setTimeout(() => pollPaymentStatus(sessionId, attempts + 1), 2000);
    }
  };

  const handleSubscribe = async (planId) => {
    if (planId === 'free') return;
    setCheckoutLoading(planId);
    try {
      const response = await axios.post(`${API}/subscription/checkout`, {
        plan_id: planId,
        billing_cycle: billingCycle,
        origin_url: window.location.origin
      });
      if (response.data.checkout_url) {
        window.location.href = response.data.checkout_url;
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail;
      // Handle validation errors (array) vs string errors
      const message = Array.isArray(errorMsg) ? errorMsg[0]?.msg || 'Validation error' : errorMsg || 'Failed to start checkout';
      toast.error(message);
      setCheckoutLoading(null);
    }
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setApplyingPromo(true);
    try {
      await axios.post(`${API}/promo-codes/apply`, { code: promoCode });
      toast.success('Promo code applied successfully!');
      setPromoCode('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid promo code');
    } finally {
      setApplyingPromo(false);
    }
  };

  const copyReferralCode = () => {
    if (referralInfo?.referral_code) {
      navigator.clipboard.writeText(`${window.location.origin}?ref=${referralInfo.referral_code}`);
      toast.success('Referral link copied!');
    }
  };

  const getPlanIcon = (planId) => {
    switch (planId) {
      case 'player': return <User size={28} />;
      case 'gm': return <Swords size={28} />;
      case 'legendary': return <Crown size={28} />;
      default: return <Sparkles size={28} />;
    }
  };

  const getPlanColor = (planId) => {
    switch (planId) {
      case 'player': return theme.accent.blue;
      case 'gm': return theme.accent.red;
      case 'legendary': return theme.accent.gold;
      default: return theme.text.muted;
    }
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: theme.bg.black, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <Loader2 size={40} className="animate-spin" style={{ color: theme.accent.red }} />
      </div>
    );
  }

  const currentTier = subscription?.tier || 'free';
  const isLifetime = subscription?.lifetime_access;

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: theme.bg.black, 
      fontFamily: "Inter, sans-serif" 
    }}>
      {/* Header */}
      <div style={{ 
        padding: '20px 24px', 
        borderBottom: `1px solid ${theme.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Button onClick={() => navigate('/home')} style={{ background: 'transparent', border: 'none', padding: '8px' }}>
            <ArrowLeft size={24} color={theme.text.white} />
          </Button>
          <h1 style={{ color: theme.text.white, fontSize: '24px', fontWeight: '400' }}>
            Subscription Plans
          </h1>
        </div>
        <div style={{ color: theme.text.secondary, fontSize: '14px' }}>
          Logged in as <span style={{ color: theme.accent.red }}>{username}</span>
        </div>
      </div>

      <div style={{ padding: '40px 24px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Current Status */}
        {currentTier !== 'free' && (
          <div style={{
            background: `linear-gradient(135deg, ${getPlanColor(currentTier)}20, transparent)`,
            border: `1px solid ${getPlanColor(currentTier)}50`,
            padding: '20px 24px',
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Star size={24} style={{ color: getPlanColor(currentTier) }} />
              <div>
                <span style={{ color: theme.text.white, fontWeight: '400' }}>
                  Current Plan: {plans.find(p => p.id === currentTier)?.name || currentTier}
                </span>
                {isLifetime && (
                  <span style={{ 
                    marginLeft: '12px',
                    background: 'rgba(34, 197, 94, 0.2)',
                    color: '#22c55e',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: '400'
                  }}>
                    LIFETIME ACCESS
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Billing Toggle */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          marginBottom: '32px',
          gap: '8px'
        }}>
          <button
            onClick={() => setBillingCycle('monthly')}
            style={{
              padding: '12px 24px',
              background: billingCycle === 'monthly' ? theme.accent.red : 'transparent',
              border: billingCycle === 'monthly' ? 'none' : `1px solid ${theme.border}`,
              color: theme.text.white,
              fontWeight: '400',
              cursor: 'pointer'
            }}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            style={{
              padding: '12px 24px',
              background: billingCycle === 'yearly' ? theme.accent.red : 'transparent',
              border: billingCycle === 'yearly' ? 'none' : `1px solid ${theme.border}`,
              color: theme.text.white,
              fontWeight: '400',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            Yearly
            <span style={{ 
              background: '#22c55e', 
              color: '#fff', 
              padding: '2px 8px', 
              fontSize: '10px',
              fontWeight: '400'
            }}>
              SAVE ~17%
            </span>
          </button>
        </div>

        {/* Pricing Cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', 
          gap: '20px',
          marginBottom: '40px'
        }}>
          {plans.map((plan) => {
            const isCurrentPlan = currentTier === plan.id;
            const planColor = getPlanColor(plan.id);
            const price = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
            const isPopular = plan.popular;

            return (
              <div
                key={plan.id}
                data-testid={`plan-card-${plan.id}`}
                style={{
                  background: theme.bg.panel,
                  border: isPopular ? `2px solid ${planColor}` : `1px solid ${theme.border}`,
                  padding: '0',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {/* Popular Badge */}
                {isPopular && (
                  <div style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: planColor,
                    color: '#fff',
                    padding: '4px 16px',
                    fontSize: '11px',
                    fontWeight: '400',
                    letterSpacing: '1px'
                  }}>
                    MOST POPULAR
                  </div>
                )}

                {/* Header */}
                <div style={{
                  padding: '24px 20px 16px',
                  borderBottom: `1px solid ${theme.border}`,
                  textAlign: 'center'
                }}>
                  <div style={{ 
                    color: planColor, 
                    marginBottom: '12px',
                    display: 'flex',
                    justifyContent: 'center'
                  }}>
                    {getPlanIcon(plan.id)}
                  </div>
                  <h3 style={{ 
                    color: theme.text.white, 
                    fontSize: '22px', 
                    fontWeight: '400',
                    marginBottom: '4px'
                  }}>
                    {plan.name}
                  </h3>
                  <p style={{ color: theme.text.muted, fontSize: '12px' }}>
                    {plan.target === 'player' && 'For Players'}
                    {plan.target === 'gm' && 'For Game Masters'}
                    {plan.target === 'both' && 'For Everyone'}
                    {plan.target === 'casual' && 'Get Started'}
                  </p>
                </div>

                {/* Price */}
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '4px' }}>
                    <span style={{ color: planColor, fontSize: '36px', fontWeight: '800' }}>
                      £{price}
                    </span>
                    {price > 0 && (
                      <span style={{ color: theme.text.muted, fontSize: '14px' }}>
                        /{billingCycle === 'yearly' ? 'year' : 'month'}
                      </span>
                    )}
                  </div>
                  {billingCycle === 'yearly' && price > 0 && (
                    <p style={{ color: theme.text.muted, fontSize: '12px', marginTop: '4px' }}>
                      (£{(price / 12).toFixed(2)}/month)
                    </p>
                  )}
                </div>

                {/* Features */}
                <div style={{ padding: '0 20px 20px', flex: 1 }}>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {plan.features.map((feature, i) => (
                      <li key={i} style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        marginBottom: '10px',
                        fontSize: '13px',
                        color: theme.text.secondary
                      }}>
                        <Check size={16} style={{ color: planColor, flexShrink: 0, marginTop: '2px' }} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA Button */}
                <div style={{ padding: '0 20px 20px' }}>
                  {isCurrentPlan ? (
                    <div style={{
                      padding: '14px',
                      background: `${planColor}20`,
                      border: `1px solid ${planColor}`,
                      color: planColor,
                      textAlign: 'center',
                      fontWeight: '400',
                      fontSize: '14px'
                    }}>
                      Current Plan
                    </div>
                  ) : plan.id === 'free' ? (
                    <div style={{
                      padding: '14px',
                      background: theme.bg.card,
                      color: theme.text.muted,
                      textAlign: 'center',
                      fontWeight: '400',
                      fontSize: '14px'
                    }}>
                      Free Forever
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={checkoutLoading === plan.id}
                      data-testid={`subscribe-${plan.id}-btn`}
                      style={{
                        width: '100%',
                        padding: '14px',
                        background: planColor,
                        border: 'none',
                        color: '#fff',
                        fontWeight: '400',
                        fontSize: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      {checkoutLoading === plan.id ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <>
                          {currentTier !== 'free' ? 'Upgrade' : 'Subscribe'}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Promo Code Section */}
        <div style={{
          background: theme.bg.panel,
          border: `1px solid ${theme.border}`,
          padding: '24px',
          marginBottom: '24px'
        }}>
          <h3 style={{ 
            color: theme.text.white, 
            fontSize: '16px', 
            fontWeight: '400', 
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <Gift size={20} style={{ color: theme.accent.gold }} />
            Have a Promo Code?
          </h3>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder="Enter promo code"
              data-testid="promo-code-input"
              style={{
                flex: 1,
                padding: '12px 16px',
                background: theme.bg.dark,
                border: `1px solid ${theme.border}`,
                color: theme.text.white,
                fontSize: '14px',
                textTransform: 'uppercase'
              }}
            />
            <Button
              onClick={handleApplyPromo}
              disabled={applyingPromo || !promoCode.trim()}
              data-testid="apply-promo-btn"
              style={{
                padding: '12px 24px',
                background: theme.accent.red,
                border: 'none',
                color: '#fff',
                fontWeight: '400'
              }}
            >
              {applyingPromo ? <Loader2 size={18} className="animate-spin" /> : 'Apply'}
            </Button>
          </div>
        </div>

        {/* Referral Section */}
        {referralInfo && (
          <div style={{
            background: theme.bg.panel,
            border: `1px solid ${theme.border}`,
            padding: '24px'
          }}>
            <h3 style={{ 
              color: theme.text.white, 
              fontSize: '16px', 
              fontWeight: '400', 
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <Users size={20} style={{ color: theme.accent.blue }} />
              Refer Friends, Get Free Months
            </h3>
            <p style={{ color: theme.text.secondary, fontSize: '14px', marginBottom: '16px' }}>
              Share your link and both you and your friend get a free month when they subscribe!
            </p>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{
                flex: 1,
                padding: '12px 16px',
                background: theme.bg.dark,
                border: `1px solid ${theme.border}`,
                color: theme.accent.blue,
                fontSize: '14px',
                fontFamily: 'monospace'
              }}>
                {window.location.origin}?ref={referralInfo.referral_code}
              </div>
              <Button
                onClick={copyReferralCode}
                style={{
                  padding: '12px 16px',
                  background: theme.accent.blue,
                  border: 'none'
                }}
              >
                <Copy size={18} color="#fff" />
              </Button>
            </div>
            <div style={{ 
              display: 'flex', 
              gap: '24px', 
              marginTop: '16px',
              color: theme.text.muted,
              fontSize: '13px'
            }}>
              <span>Referrals: <strong style={{ color: theme.text.white }}>{referralInfo.referral_count}</strong></span>
              <span>Free months earned: <strong style={{ color: '#22c55e' }}>{referralInfo.free_months_earned}</strong></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PricingPage;
