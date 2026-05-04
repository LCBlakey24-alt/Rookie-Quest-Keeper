"""Subscription routes: checkout, status, plans, referrals."""
from fastapi import APIRouter, HTTPException, Depends, status, Request
from config import db, STRIPE_ENABLED, STRIPE_API_KEY, ADMIN_USERNAMES, logger
from utils.auth import get_current_user, is_admin, generate_referral_code, get_user_subscription
from models import (
    SUBSCRIPTION_PLANS, SubscriptionTier, SubscriptionResponse,
    CreateCheckoutRequest, CustomReferralCodeRequest
)
import asyncio
import json
import os
import uuid
from datetime import datetime, timezone, timedelta

try:
    import stripe
    if STRIPE_API_KEY:
        stripe.api_key = STRIPE_API_KEY
except ImportError:
    stripe = None

router = APIRouter()

async def get_user_subscription(username: str) -> dict:
    """Helper to get user's subscription status"""
    user = await db.users.find_one({'username': username})
    if not user:
        return None
    
    subscription = user.get('subscription', SubscriptionTier().model_dump())
    
    # Check if promo code access has expired
    promo_expires = subscription.get('promo_expires_at')
    if promo_expires and subscription.get('promo_code_used'):
        expires_dt = datetime.fromisoformat(promo_expires.replace('Z', '+00:00'))
        if datetime.now(timezone.utc) >= expires_dt:
            # Promo expired - revert to free tier (Stripe integration removed)
            subscription['tier'] = 'free'
            subscription['subscription_status'] = 'expired'
            await db.users.update_one(
                {'username': username},
                {'$set': {
                    'subscription.tier': 'free',
                    'subscription.subscription_status': 'expired',
                    'subscription.promo_expires_at': None
                }}
            )
    
    # Check if referral/other premium has expired (legacy check)
    premium_expires = subscription.get('premium_expires_at')
    if premium_expires and not subscription.get('promo_code_used') and subscription.get('tier') != 'free':
        expires_dt = datetime.fromisoformat(premium_expires.replace('Z', '+00:00'))
        if datetime.now(timezone.utc) >= expires_dt:
            # Premium expired, revert to free
            subscription['tier'] = 'free'
            subscription['subscription_status'] = 'expired'
            await db.users.update_one(
                {'username': username},
                {'$set': {
                    'subscription.tier': 'free',
                    'subscription.subscription_status': 'expired'
                }}
            )
    
    # Reset AI calls monthly
    reset_date = subscription.get('ai_calls_reset_date')
    if reset_date:
        reset_dt = datetime.fromisoformat(reset_date.replace('Z', '+00:00'))
        if datetime.now(timezone.utc) >= reset_dt:
            subscription['ai_calls_this_month'] = 0
            next_reset = datetime.now(timezone.utc) + timedelta(days=30)
            subscription['ai_calls_reset_date'] = next_reset.isoformat()
            await db.users.update_one(
                {'username': username},
                {'$set': {'subscription': subscription}}
            )
    else:
        next_reset = datetime.now(timezone.utc) + timedelta(days=30)
        subscription['ai_calls_reset_date'] = next_reset.isoformat()
        await db.users.update_one(
            {'username': username},
            {'$set': {'subscription': subscription}}
        )
    
    return subscription

async def check_premium_feature(username: str, feature: str = 'ai') -> bool:
    """Check if user can access premium features"""
    subscription = await get_user_subscription(username)
    tier = subscription.get('tier', 'free')
    plan = SUBSCRIPTION_PLANS.get(tier, SUBSCRIPTION_PLANS['free'])
    
    if tier == 'adventurer' and subscription.get('subscription_status') == 'active':
        return True
    
    if feature == 'ai':
        limit = plan.get('ai_calls_per_month', 5)
        used = subscription.get('ai_calls_this_month', 0)
        return limit == -1 or used < limit
    
    return False

async def increment_ai_usage(username: str):
    """Increment AI call counter for free tier users"""
    subscription = await get_user_subscription(username)
    if subscription.get('tier') == 'free':
        await db.users.update_one(
            {'username': username},
            {'$inc': {'subscription.ai_calls_this_month': 1}}
        )

@router.get("/subscription/status", response_model=SubscriptionResponse)
async def get_subscription_status(username: str = Depends(get_current_user)):
    """Get current user's subscription status"""
    subscription = await get_user_subscription(username)
    tier = subscription.get('tier', 'free')
    plan = SUBSCRIPTION_PLANS.get(tier, SUBSCRIPTION_PLANS['free'])
    
    # Calculate free months remaining
    free_months_earned = subscription.get('free_months_earned', 0)
    free_months_used = subscription.get('free_months_used', 0)
    free_months_remaining = max(0, free_months_earned - free_months_used)
    
    return SubscriptionResponse(
        tier=tier,
        tier_name=plan['name'],
        campaigns_limit=plan['campaigns'],
        ai_calls_limit=plan['ai_calls_per_month'],
        ai_calls_used=subscription.get('ai_calls_this_month', 0),
        is_premium=tier != 'free',
        subscription_status=subscription.get('subscription_status', 'active'),
        referral_code=subscription.get('referral_code'),
        referral_count=subscription.get('referral_count', 0),
        free_months_earned=free_months_earned,
        free_months_remaining=free_months_remaining,
        premium_expires_at=subscription.get('premium_expires_at')
    )

@router.post("/subscription/checkout")
async def create_checkout_session(request: CreateCheckoutRequest, http_request: Request, username: str = Depends(get_current_user)):
    """Create Stripe checkout session for subscription"""
    if not STRIPE_ENABLED or not STRIPE_API_KEY:
        raise HTTPException(status_code=503, detail="Stripe payments not configured. Use promo codes for premium access.")
    
    try:
        if stripe is None:
            raise HTTPException(status_code=500, detail="Stripe SDK is not available")

        plan = SUBSCRIPTION_PLANS.get(request.plan_id)
        if not plan:
            raise HTTPException(status_code=400, detail="Invalid plan")
        
        # Get price based on billing cycle (amounts defined on backend for security)
        if request.billing_cycle == 'yearly':
            price_amount = plan['price_yearly']
        else:
            price_amount = plan['price_monthly']
        
        if price_amount == 0:
            raise HTTPException(status_code=400, detail="Cannot checkout free plan")
        
        # Build success/cancel URLs from frontend origin (dynamic, not hardcoded)
        success_url = f"{request.origin_url}/subscription/success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{request.origin_url}/subscription/cancel"
        
        session = await asyncio.to_thread(
            stripe.checkout.Session.create,
            mode='payment',
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'gbp',
                    'product_data': {
                        'name': f"{plan['name']} - {request.billing_cycle.title()}",
                    },
                    'unit_amount': int(round(float(price_amount) * 100)),
                },
                'quantity': 1,
            }],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                'username': username,
                'plan_id': request.plan_id,
                'billing_cycle': request.billing_cycle,
            },
        )

        # Create payment transaction record BEFORE redirect
        transaction = {
            'id': str(uuid.uuid4()),
            'session_id': session.id,
            'username': username,
            'amount': float(price_amount),
            'currency': 'gbp',
            'plan_id': request.plan_id,
            'billing_cycle': request.billing_cycle,
            'payment_status': 'pending',
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        await db.payment_transactions.insert_one(transaction)
        
        return {"checkout_url": session.url, "session_id": session.id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Checkout error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Checkout failed: {str(e)}")

@router.get("/subscription/checkout/status/{session_id}")
async def get_checkout_status(session_id: str, http_request: Request, username: str = Depends(get_current_user)):
    """Check payment status and activate subscription if paid"""
    if not STRIPE_ENABLED or not STRIPE_API_KEY:
        raise HTTPException(status_code=503, detail="Stripe payments not configured.")
    
    try:
        if stripe is None:
            raise HTTPException(status_code=500, detail="Stripe SDK is not available")

        checkout_session = await asyncio.to_thread(stripe.checkout.Session.retrieve, session_id)

        # Get the transaction record
        transaction = await db.payment_transactions.find_one({'session_id': session_id})
        
        # Only process if payment is successful and not already processed
        if checkout_session.payment_status == 'paid' and transaction and transaction.get('payment_status') != 'paid':
            plan_id = transaction.get('plan_id', 'legendary')
            billing_cycle = transaction.get('billing_cycle', 'monthly')
            
            # Activate subscription
            await db.users.update_one(
                {'username': username},
                {'$set': {
                    'subscription.tier': plan_id,
                    'subscription.billing_cycle': billing_cycle,
                    'subscription.subscription_status': 'active',
                    'subscription.stripe_session_id': session_id,
                    'subscription.activated_at': datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Update transaction status
            await db.payment_transactions.update_one(
                {'session_id': session_id},
                {'$set': {
                    'payment_status': 'paid',
                    'completed_at': datetime.now(timezone.utc).isoformat()
                }}
            )
            
            logger.info(f"Subscription activated for {username}: {plan_id}")
        
        return {
            "status": checkout_session.status,
            "payment_status": checkout_session.payment_status,
            "amount": checkout_session.amount_total / 100 if checkout_session.amount_total else 0,
            "currency": checkout_session.currency
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Status check error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Status check failed: {str(e)}")

@router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks for payment events"""
    if not STRIPE_ENABLED or not STRIPE_API_KEY:
        return {"status": "ignored", "message": "Stripe not configured"}
    
    try:
        if stripe is None:
            return {"status": "error", "message": "Stripe SDK is not available"}

        body = await request.body()
        signature = request.headers.get("Stripe-Signature")

        webhook_secret = os.environ.get('STRIPE_WEBHOOK_SECRET')
        if webhook_secret and signature:
            event = stripe.Webhook.construct_event(body, signature, webhook_secret)
        else:
            event = json.loads(body.decode('utf-8'))

        event_type = event.get('type')
        session = (event.get('data') or {}).get('object') or {}
        logger.info(f"Stripe webhook received: {event_type}")

        # Handle successful payment
        if session.get('payment_status') == 'paid':
            session_id = session.get('id')
            metadata = session.get('metadata') or {}
            username = metadata.get('username')
            plan_id = metadata.get('plan_id')
            
            if username and plan_id:
                # Update user subscription
                await db.users.update_one(
                    {'username': username},
                    {'$set': {
                        'subscription.tier': plan_id,
                        'subscription.subscription_status': 'active',
                        'subscription.activated_at': datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                # Update transaction
                await db.payment_transactions.update_one(
                    {'session_id': session_id},
                    {'$set': {
                        'payment_status': 'paid',
                        'completed_at': datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                logger.info(f"Webhook: Subscription activated for {username}: {plan_id}")
        
        return {"status": "received", "event_type": event_type}
        
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        return {"status": "error", "message": str(e)}

@router.post("/subscription/cancel")
async def cancel_subscription(username: str = Depends(get_current_user)):
    """Cancel the user's subscription"""
    user = await db.users.find_one({'username': username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    current_tier = user.get('subscription', {}).get('tier', 'free')
    if current_tier == 'free':
        raise HTTPException(status_code=400, detail="No active subscription to cancel")
    
    # Update subscription to cancelled, revert to free
    await db.users.update_one(
        {'username': username},
        {'$set': {
            'subscription.tier': 'free',
            'subscription.subscription_status': 'cancelled',
            'subscription.cancelled_at': datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "message": "Subscription cancelled. You now have free tier access.",
        "status": "cancelled"
    }

@router.get("/subscription/plans")
async def get_subscription_plans():
    """Get available subscription plans with new three-tier structure"""
    return {
        'plans': [
            {
                'id': 'free',
                'name': 'Free',
                'price_monthly': 0,
                'price_yearly': 0,
                'target': 'casual',
                'color': '#808080',
                'features': [
                    '1 character',
                    'Join campaigns (can\'t create)',
                    'Basic character sheet',
                    'Dice roller',
                    '3 AI generations per month'
                ]
            },
            {
                'id': 'player',
                'name': 'Hero',
                'price_monthly': 3.99,
                'price_yearly': 39.99,
                'target': 'player',
                'color': '#3B82F6',
                'features': [
                    'Unlimited characters',
                    'Character journal',
                    'Party inventory',
                    'Session recaps',
                    'AI portrait generation',
                    '50 AI calls per month'
                ]
            },
            {
                'id': 'gm',
                'name': 'Quest Master',
                'price_monthly': 3.99,
                'price_yearly': 39.99,
                'target': 'gm',
                'color': '#E11D48',
                'features': [
                    'Unlimited campaigns',
                    'Full world building tools',
                    'ROOK AI generation',
                    'Combat tracker',
                    'Reference tools',
                    'Session mode',
                    'Unlimited AI calls'
                ]
            },
            {
                'id': 'legendary',
                'name': 'Legendary',
                'price_monthly': 5.99,
                'price_yearly': 59.99,
                'target': 'both',
                'color': '#F59E0B',
                'popular': True,
                'features': [
                    'Everything in Hero',
                    'Everything in Quest Master',
                    'Priority support',
                    'Early access to features',
                    'Unlimited everything'
                ]
            }
        ]
    }

@router.get("/referral/code")
async def get_referral_code(username: str = Depends(get_current_user)):
    """Get or generate user's referral code"""
    user = await db.users.find_one({'username': username})
    subscription = user.get('subscription', {})
    referral_code = subscription.get('referral_code')
    
    # Generate one if doesn't exist (for existing users)
    if not referral_code:
        referral_code = generate_referral_code(username)
        await db.users.update_one(
            {'username': username},
            {'$set': {'subscription.referral_code': referral_code}}
        )
    
    return {
        'referral_code': referral_code,
        'referral_count': subscription.get('referral_count', 0),
        'free_months_earned': subscription.get('free_months_earned', 0),
        'share_url': f'?ref={referral_code}'
    }

@router.put("/referral/code")
async def customize_referral_code(
    request: CustomReferralCodeRequest,
    username: str = Depends(get_current_user)
):
    """Customize user's referral code"""
    import re
    
    new_code = request.new_code.strip().upper()
    
    # Validation
    if len(new_code) < 3:
        raise HTTPException(status_code=400, detail="Code must be at least 3 characters")
    if len(new_code) > 20:
        raise HTTPException(status_code=400, detail="Code must be 20 characters or less")
    if not re.match(r'^[A-Z0-9_-]+$', new_code):
        raise HTTPException(status_code=400, detail="Code can only contain letters, numbers, underscores, and hyphens")
    
    # Check if code already taken by another user
    existing = await db.users.find_one({
        'subscription.referral_code': new_code,
        'username': {'$ne': username}
    })
    if existing:
        raise HTTPException(status_code=400, detail="This code is already taken")
    
    # Update user's referral code
    await db.users.update_one(
        {'username': username},
        {'$set': {'subscription.referral_code': new_code}}
    )
    
    return {
        'success': True,
        'referral_code': new_code,
        'message': f'Referral code updated to {new_code}'
    }

@router.get("/referral/leaderboard")
async def get_referral_leaderboard():
    """Get top referrers"""
    top_referrers = await db.users.find(
        {'subscription.referral_count': {'$gt': 0}},
        {'_id': 0, 'username': 1, 'subscription.referral_count': 1}
    ).sort('subscription.referral_count', -1).limit(10).to_list(10)
    
    return {
        'leaderboard': [
            {
                'username': u['username'][:3] + '***',  # Privacy
                'referrals': u.get('subscription', {}).get('referral_count', 0)
            }
            for u in top_referrers
        ]
    }
