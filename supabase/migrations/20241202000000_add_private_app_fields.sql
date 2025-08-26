-- Add private app credential fields to brands table
ALTER TABLE brands 
ADD COLUMN IF NOT EXISTS shopify_private_app_id TEXT,
ADD COLUMN IF NOT EXISTS shopify_private_app_secret TEXT;

-- Add comment to explain the new columns
COMMENT ON COLUMN brands.shopify_private_app_id IS 'Private app API key from Shopify';
COMMENT ON COLUMN brands.shopify_private_app_secret IS 'Private app API secret from Shopify';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_brands_shopify_private_app_id ON brands(shopify_private_app_id);


