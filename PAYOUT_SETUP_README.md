# Payout System Setup Guide

## Overview
This guide explains how to set up the payout system for ShopScope Private. The system allows brands to request payouts from their mobile marketplace earnings.

## Database Setup

### 1. Run the Database Function
Copy and paste the contents of `create_payout_function.sql` into your Supabase SQL Editor and run it. This will:

- Create the `payouts` table
- Create the `get_pending_payout_amount` function
- Set up proper RLS policies
- Create necessary indexes

### 2. Verify Table Creation
After running the SQL, you should see:
- `payouts` table in your database
- `get_pending_payout_amount` function available

## How It Works

### 1. Earnings Calculation
- The system calculates earnings from completed orders
- Commission rate: 10% (ShopScope takes 10%, brand gets 90%)
- Formula: `total_amount - commission_amount = brand_earnings`

### 2. Payout Process
1. Brand requests payout from dashboard
2. System calculates available amount using `get_pending_payout_amount()`
3. Creates payout record in database
4. Initiates Stripe transfer to connected account
5. Updates payout status based on Stripe response

### 3. Payout Statuses
- `pending`: Initial request created
- `processing`: Stripe transfer initiated
- `completed`: Transfer successful
- `failed`: Transfer failed

## Environment Variables Required

Make sure these are set in your hosting platform:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_CONNECT_CLIENT_ID=ca_...
NEXT_PUBLIC_APP_URL=https://your-domain.com
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Testing the System

1. **Connect Stripe**: Ensure a brand has connected their Stripe account
2. **Create Orders**: Add some completed orders to the `orders` table
3. **Request Payout**: Use the payout request button in the dashboard
4. **Check Status**: Monitor payout status in the payouts table

## Troubleshooting

### Common Issues:

1. **"Function not found"**: Run the SQL function creation script
2. **"Table doesn't exist"**: Ensure the `payouts` table was created
3. **Stripe errors**: Check Stripe account connection and API keys
4. **RLS errors**: Verify the RLS policies are properly set up

### Debug Steps:

1. Check browser console for errors
2. Verify database function exists: `SELECT * FROM pg_proc WHERE proname = 'get_pending_payout_amount';`
3. Check payout table: `SELECT * FROM payouts LIMIT 5;`
4. Verify Stripe connection: Check `stripe_connect_id` in brands table

## Security Notes

- The payout function uses `SECURITY DEFINER` to bypass RLS
- RLS policies ensure brands can only see their own payouts
- Service role key is required for payout processing
- All payout amounts are validated before processing

## Production Considerations

- Implement webhook handling for Stripe transfer updates
- Add retry logic for failed transfers
- Consider using background jobs for payout processing
- Add audit logging for all payout operations
- Implement rate limiting for payout requests



