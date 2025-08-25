-- Create the pending payout function for ShopScope Private
-- Run this in your Supabase SQL Editor

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_pending_payout_amount(uuid);

-- Create the pending payout function
CREATE OR REPLACE FUNCTION get_pending_payout_amount(brand_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    pending_amount numeric := 0;
    total_revenue numeric := 0;
    already_paid numeric := 0;
BEGIN
    -- Calculate total earnings from orders (90% after 10% commission)
    SELECT COALESCE(SUM(total_amount - commission_amount), 0) INTO total_revenue
    FROM orders
    WHERE brand_id = $1
    AND status = 'completed';
    
    -- Calculate already paid amounts
    SELECT COALESCE(SUM(amount), 0) INTO already_paid
    FROM payouts
    WHERE brand_id = $1
    AND status IN ('completed', 'processing');
    
    -- Pending amount is total revenue minus already paid
    pending_amount := total_revenue - already_paid;
    
    RETURN COALESCE(pending_amount, 0);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_pending_payout_amount(uuid) TO anon, authenticated;

-- Create payouts table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.payouts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    brand_id UUID NOT NULL REFERENCES public.brands(id),
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    stripe_transfer_id VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Add RLS policies
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

-- Allow brands to view their own payouts
CREATE POLICY "Brands can view their own payouts"
    ON public.payouts
    FOR SELECT
    TO authenticated
    USING (brand_id IN (
        SELECT id FROM public.brands
        WHERE user_id = auth.uid()
    ));

-- Allow brands to insert their own payouts
CREATE POLICY "Brands can insert their own payouts"
    ON public.payouts
    FOR INSERT
    TO authenticated
    WITH CHECK (brand_id IN (
        SELECT id FROM public.brands
        WHERE user_id = auth.uid()
    ));

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS payouts_brand_id_idx ON public.payouts(brand_id);
CREATE INDEX IF NOT EXISTS payouts_status_idx ON public.payouts(status);
CREATE INDEX IF NOT EXISTS payouts_created_at_idx ON public.payouts(created_at);
