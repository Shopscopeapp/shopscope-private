-- Fix RLS policies for brands table to allow brand creation during signup

-- First, check if RLS is enabled
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'brands' 
        AND schemaname = 'public' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Drop existing restrictive policies that might block brand creation
DROP POLICY IF EXISTS "Brands can view their own stripe account ID" ON brands;
DROP POLICY IF EXISTS "Brands can update their own stripe account ID" ON brands;
DROP POLICY IF EXISTS "Brands can be accessed by shopify_domain or user_id" ON brands;
DROP POLICY IF EXISTS "Allow authenticated access to brands" ON brands;
DROP POLICY IF EXISTS "Brands access policy for standalone and embedded modes" ON brands;

-- Create comprehensive RLS policies for brands table

-- 1. Allow users to create their own brands (for signup)
CREATE POLICY "Allow brand creation for authenticated users"
    ON brands
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- 2. Allow users to view their own brands
CREATE POLICY "Allow users to view their own brands"
    ON brands
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- 3. Allow users to update their own brands
CREATE POLICY "Allow users to update their own brands"
    ON brands
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 4. Allow users to delete their own brands
CREATE POLICY "Allow users to delete their own brands"
    ON brands
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- Verify the policies were created
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'brands'
ORDER BY policyname;

