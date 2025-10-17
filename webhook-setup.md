# Stripe Webhook Setup Guide

## Problem Solved

✅ **Frontend Dependency**: Credits now awarded automatically even if frontend fails  
✅ **No Webhook Backup**: Automatic webhook catches all successful payments

## Setup Steps

### 1. Add Environment Variable

Add this to your environment variables:

```bash
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_signing_secret"
```

### 2. Configure Stripe Webhook

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **"Add endpoint"**
3. **Endpoint URL**: `https://yourdomain.com/api/stripe/webhook`
4. **Events to send**: Select `checkout.session.completed`
5. Click **"Add endpoint"**
6. Copy the **"Signing secret"** (starts with `whsec_`) and add it to your environment

### 3. Deploy Your Code

Deploy the updated code with the webhook endpoint.

### 4. Test It

1. Make a test payment
2. Check your server logs - you should see: `💰 Payment succeeded via webhook: cs_xxxxx`
3. Check the user's wallet - credits should be added automatically

## How It Works Now

### Before (Problem):

```
User pays → Stripe success → Frontend must call verify-payment → Credits awarded
                           ❌ If this fails, no credits!
```

### After (Fixed):

```
User pays → Stripe success → ✅ Webhook automatically awards credits
                           → ✅ Frontend verify-payment still works as backup
```

## Benefits

- **Reliable**: Credits awarded even if user closes browser
- **Automatic**: No manual intervention needed
- **Safe**: Prevents duplicate credits with status checks
- **Secure**: Webhook signature verification prevents fake requests

## Monitoring

Watch your logs for these messages:

- `💰 Payment succeeded via webhook: cs_xxxxx` - Webhook received
- `✅ Webhook awarded X credits to user Y` - Credits successfully added
- `❌ Error processing webhook payment:` - Something went wrong (needs investigation)
