import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Check, Crown, Sparkles, Loader2, Copy, Users, Gift } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function PricingPage({ username, onLogout }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [referralInfo, setReferralInfo] = useState(null);

  useEffect(() => {
    fetchData();
    
    // Check for session_id in URL (returning from Stripe)
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      pollPaymentStatus(sessionId);
    }
  }, [searchParams]);

  const fetchData = async () => {
    try {
      const [plansRes, subRes] = await Promise.all([
        axios.get(`${API}/subscription/plans`),
        axios.get(`${API}/subscription/status`)
      ]);
      setPlans(plansRes.data.plans);
      setSubscription(subRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const pollPaymentStatus = async (sessionId, attempts = 0) => {
    const maxAttempts = 5;
    const pollInterval = 2000;

    if (attempts >= maxAttempts) {
      toast.error('Payment status check timed out. Please refresh the page.');
      return;
    }

    try {
      const response = await axios.get(`${API}/subscription/checkout/status/${sessionId}`);
      
      if (response.data.payment_status === 'paid') {
        toast.success('Payment successful! You now have Adventurer access!');
        fetchData(); // Refresh subscription status
        // Clear URL params
        navigate('/pricing', { replace: true });
        return;
      }

      // Continue polling if not yet paid
      setTimeout(() => pollPaymentStatus(sessionId, attempts + 1), pollInterval);
    } catch (error) {
      console.error('Error checking payment status:', error);
      setTimeout(() => pollPaymentStatus(sessionId, attempts + 1), pollInterval);
    }
  };

  const handleCheckout = async (planId) => {
    if (planId === 'free') return;
    
    setCheckoutLoading(true);
    try {
      const response = await axios.post(`${API}/subscription/checkout`, {
        origin_url: window.location.origin,
        plan: planId
      });
      
      // Redirect to Stripe checkout
      window.location.href = response.data.checkout_url;
    } catch (error) {
      toast.error('Failed to start checkout. Please try again.');
      setCheckoutLoading(false);
    }
  };

  const handleApplyPromo = async (e) => {
    e.preventDefault();
    if (!promoCode.trim()) {
      toast.error('Please enter a promo code');
      return;
    }
    
    setApplyingPromo(true);
    try {
      const response = await axios.post(`${API}/promo-codes/apply`, {
        code: promoCode.trim()
      });
      toast.success(response.data.message);
      setPromoCode('');
      fetchData(); // Refresh subscription status
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid promo code');
    } finally {
      setApplyingPromo(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #030014 0%, #0a0a2e 50%, #030014 100%)',
      padding: '24px'
    }}>
      {/* Header */}
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
          <Button 
            data-testid="back-btn"
            onClick={() => navigate('/campaigns')} 
            className="btn-icon"
          >
            <ArrowLeft size={24} />
          </Button>
          <h1 style={{ 
            fontSize: '32px', 
            color: '#fff',
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: '800'
          }}>
            Choose Your Adventure
          </h1>
        </div>

        {/* Current Status */}
        {subscription && (
          <div style={{
            background: 'rgba(74, 125, 255, 0.1)',
            border: '2px solid #4a7dff',
            borderRadius: '12px',
            padding: '16px 24px',
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <span style={{ color: '#94a3b8', fontSize: '14px' }}>Current Plan: </span>
              <span style={{ 
                color: subscription.is_premium ? '#22c55e' : '#fff',
                fontWeight: '700',
                fontSize: '18px'
              }}>
                {subscription.tier_name}
                {subscription.is_premium && <Crown size={18} style={{ marginLeft: '8px', display: 'inline' }} />}
              </span>
            </div>
            {!subscription.is_premium && (
              <div style={{ color: '#94a3b8', fontSize: '14px' }}>
                AI Generations: {subscription.ai_calls_used} / {subscription.ai_calls_limit} this month
              </div>
            )}
          </div>
        )}

        {/* Promo Code Section */}
        <div style={{
          background: 'rgba(168, 85, 247, 0.1)',
          border: '2px solid #a855f7',
          borderRadius: '12px',
          padding: '20px 24px',
          marginBottom: '40px'
        }}>
          <h3 style={{ 
            color: '#a855f7', 
            marginBottom: '12px',
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Sparkles size={20} />
            Have a Promo Code?
          </h3>
          <form onSubmit={handleApplyPromo} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder="Enter your code"
              data-testid="promo-code-input"
              style={{
                flex: '1',
                minWidth: '200px',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '2px solid #374151',
                background: 'rgba(0, 0, 0, 0.3)',
                color: '#fff',
                fontSize: '16px'
              }}
            />
            <Button
              type="submit"
              data-testid="apply-promo-btn"
              disabled={applyingPromo}
              className="btn-primary"
              style={{ minWidth: '120px' }}
            >
              {applyingPromo ? <Loader2 className="animate-spin" size={18} /> : 'Apply'}
            </Button>
          </form>
        </div>

        {/* Pricing Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
          marginBottom: '40px'
        }}>
          {plans.map((plan) => {
            const isCurrentPlan = subscription?.tier === plan.id;
            const isPremium = plan.id !== 'free';
            
            return (
              <div
                key={plan.id}
                data-testid={`plan-card-${plan.id}`}
                style={{
                  background: isPremium 
                    ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(74, 125, 255, 0.15) 100%)'
                    : 'rgba(30, 30, 60, 0.5)',
                  border: isPremium 
                    ? '3px solid #22c55e' 
                    : '2px solid #374151',
                  borderRadius: '16px',
                  padding: '32px',
                  position: 'relative',
                  transform: isPremium ? 'scale(1.02)' : 'none',
                  boxShadow: isPremium ? '0 0 40px rgba(34, 197, 94, 0.3)' : 'none'
                }}
              >
                {isPremium && (
                  <div style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'linear-gradient(90deg, #22c55e, #4a7dff)',
                    padding: '6px 20px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#fff',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}>
                    Most Popular
                  </div>
                )}

                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <h2 style={{ 
                    fontSize: '28px', 
                    color: '#fff',
                    fontFamily: 'Montserrat, sans-serif',
                    fontWeight: '800',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}>
                    {isPremium && <Crown size={24} color="#22c55e" />}
                    {plan.name}
                  </h2>
                  <div style={{ marginBottom: '8px' }}>
                    <span style={{ 
                      fontSize: '48px', 
                      fontWeight: '800', 
                      color: isPremium ? '#22c55e' : '#fff',
                      fontFamily: 'Montserrat, sans-serif'
                    }}>
                      ${plan.price}
                    </span>
                    {plan.price > 0 && (
                      <span style={{ color: '#94a3b8', fontSize: '16px' }}>/month</span>
                    )}
                  </div>
                  {isPremium && (
                    <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                      Less than a coffee - support indie devs!
                    </p>
                  )}
                </div>

                <ul style={{ marginBottom: '32px', listStyle: 'none', padding: 0 }}>
                  {plan.features.map((feature, index) => (
                    <li 
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 0',
                        borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                        color: '#e2e8f0'
                      }}
                    >
                      <Check size={18} color={isPremium ? '#22c55e' : '#4a7dff'} />
                      {feature}
                    </li>
                  ))}
                </ul>

                {isCurrentPlan ? (
                  <Button
                    disabled
                    className="btn-secondary"
                    style={{ width: '100%', opacity: 0.7 }}
                  >
                    Current Plan
                  </Button>
                ) : isPremium ? (
                  <Button
                    onClick={() => handleCheckout(plan.id)}
                    disabled={checkoutLoading}
                    data-testid={`checkout-btn-${plan.id}`}
                    className="btn-primary"
                    style={{ 
                      width: '100%',
                      background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                      boxShadow: '0 0 20px rgba(34, 197, 94, 0.4)'
                    }}
                  >
                    {checkoutLoading ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      'Upgrade Now'
                    )}
                  </Button>
                ) : (
                  <Button
                    disabled
                    className="btn-secondary"
                    style={{ width: '100%' }}
                  >
                    Free Forever
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* FAQ or Support */}
        <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
          <p>Questions? Reach out to us anytime. We're here to help!</p>
          <p style={{ marginTop: '8px' }}>
            All payments are securely processed through Stripe.
          </p>
        </div>
      </div>
    </div>
  );
}

export default PricingPage;
