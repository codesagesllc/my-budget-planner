# Stripe Setup Instructions

## Required Environment Variables

Add these to your `.env.local` file:

```env
# Stripe Configuration (REQUIRED)
# Get these from https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=sk_test_... # Use sk_test_ for testing or sk_live_ for production
STRIPE_WEBHOOK_SECRET=whsec_... # Get this when you set up webhooks
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # Use pk_test_ for testing or pk_live_ for production
```

## How to Get Your Stripe Keys

1. **Login to Stripe Dashboard**: https://dashboard.stripe.com

2. **Get API Keys**:
   - Go to **Developers** → **API keys**
   - Copy your **Secret key** (starts with `sk_test_` or `sk_live_`)
   - Copy your **Publishable key** (starts with `pk_test_` or `pk_live_`)

3. **Set up Webhook (Optional for now)**:
   - Go to **Developers** → **Webhooks**
   - Add endpoint URL: `https://your-domain.com/api/webhooks/stripe`
   - Copy the **Signing secret** (starts with `whsec_`)

## Testing Your Configuration

1. **Check if keys are loaded**:
   - Restart your dev server after adding keys: `npm run dev`
   - Check browser console for any Stripe-related errors

2. **Test Mode vs Live Mode**:
   - Use `sk_test_` and `pk_test_` keys for testing (fake cards work)
   - Use `sk_live_` and `pk_live_` keys for real payments

3. **Test Credit Cards** (for test mode):
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - Requires auth: `4000 0025 0000 3155`
   - Use any future expiry date and any 3-digit CVC

## Common Issues

1. **"Payment system is not configured"**:
   - STRIPE_SECRET_KEY is missing from .env.local
   - Restart dev server after adding the key

2. **"Failed to create customer"**:
   - Check if your Stripe key is valid
   - Make sure you're using the right mode (test vs live)

3. **Price not found**:
   - The price IDs in the code might not match your Stripe account
   - Check that products exist in your Stripe dashboard

## Verifying Your Products

The app expects these products in Stripe:
- Free Trial: price_1S5vLs4GH1CShai7ilGkxOFu
- Basic ($15): price_1S5vMd4GH1CShai7PaB4XeoJ  
- Premium ($30): price_1S5vNP4GH1CShai7nzkQsFQD

Make sure these exist in your Stripe dashboard under **Products**.
