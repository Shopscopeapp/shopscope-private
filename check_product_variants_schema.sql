-- Check the product variants table structure
-- Run this in your Supabase SQL Editor to see the current schema

-- Check if product_variants table exists and its structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'product_variants'
ORDER BY ordinal_position;

-- Check the actual table structure with sample data
SELECT * FROM product_variants LIMIT 5;

-- Check if there are any foreign key relationships
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name='product_variants';

-- Check if there are any existing product variants
SELECT COUNT(*) as total_variants FROM product_variants;

-- Check the relationship between products and variants
SELECT 
    p.id as product_id,
    p.title as product_title,
    COUNT(pv.id) as variant_count
FROM products p
LEFT JOIN product_variants pv ON p.id = pv.product_id
GROUP BY p.id, p.title
ORDER BY variant_count DESC
LIMIT 10;
