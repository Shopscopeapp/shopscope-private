import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { syncProductsToAI } from '@/lib/ai-integration'
import type { ShopifyProduct } from '@/lib/ai-integration'

// Create a Supabase client with the service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function fetchShopifyProducts(accessToken: string, shop: string) {
  const response = await fetch(`https://${shop}/admin/api/2024-01/products.json`, {
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch products from Shopify: ${response.statusText}`);
  }

  const data = await response.json();
  return data.products || [];
}

async function syncProductsToDatabase(brandId: string, shopifyProducts: any[]) {
  let syncedCount = 0;
  let updatedCount = 0;
  let errorCount = 0;

  for (const product of shopifyProducts) {
    try {
      // Check if product already exists
      const { data: existingProduct } = await supabaseAdmin
        .from('products')
        .select('id')
        .eq('brand_id', brandId)
        .eq('shopify_product_id', product.id.toString())
        .single();

      const productData = {
        brand_id: brandId,
        shopify_product_id: product.id.toString(),
        title: product.title,
        description: product.body_html,
        brand: product.vendor || null,
        category: product.product_type || null,
        status: product.status || 'active',
        tags: product.tags ? product.tags.split(',').map((tag: string) => tag.trim()) : [],
        price: product.variants?.[0]?.price ? parseFloat(product.variants[0].price) : 0,
        sale_price: product.variants?.[0]?.compare_at_price ? parseFloat(product.variants[0].compare_at_price) : null,
        inventory_count: product.variants.reduce((sum, v) => sum + (v.inventory_quantity || 0), 0),
        images: product.images && product.images.length > 0 ? product.images : undefined, // Only update if images exist
        metadata: {
          handle: product.handle,
          product_type: product.product_type,
          variants: product.variants
        },
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      let productId: string;

      if (existingProduct) {
        // For existing products, only update images if new ones are provided
        const updateData = { ...productData };
        if (!product.images || product.images.length === 0) {
          delete updateData.images; // Don't overwrite existing images
        }
        
        // Update existing product
        const { error: updateError } = await supabaseAdmin
          .from('products')
          .update(updateData)
          .eq('id', existingProduct.id);

        if (updateError) {
          console.error('Error updating product:', updateError);
          errorCount++;
          continue;
        } else {
          updatedCount++;
          productId = existingProduct.id;
        }
      } else {
        // Insert new product
        const { data: newProduct, error: insertError } = await supabaseAdmin
          .from('products')
          .insert(productData)
          .select('id')
          .single();

        if (insertError) {
          console.error('Error inserting product:', insertError);
          errorCount++;
          continue;
        } else {
          syncedCount++;
          productId = newProduct.id;
        }
      }

      // Sync product variants
      if (productId && product.variants && product.variants.length > 0) {
        await syncProductVariants(product.variants, productId, supabaseAdmin);
      }

    } catch (error) {
      console.error('Error processing product:', error);
      errorCount++;
    }
  }

  return {
    syncedCount,
    updatedCount,
    errorCount,
    totalProcessed: shopifyProducts.length
  };
}

async function syncProductVariants(variants: any[], productId: string, supabase: any) {
  let variantSyncedCount = 0;
  let variantUpdatedCount = 0;
  let variantErrorCount = 0;

  for (const variant of variants) {
    try {
      // Extract size from multiple possible sources and standardize it
      let size = null;
      if (variant.size) {
        size = variant.size;
      } else if (variant.option1_value) {
        size = variant.option1_value;
      } else if (variant.option1) {
        size = variant.option1;
      } else if (variant.title && variant.title !== variant.product_title) {
        // If title is different from product title, it's likely a size
        size = variant.title;
      }
      
      // Set option names and values
      const option1Name = variant.option1_name || 'Size';
      const option1Value = variant.option1_value || variant.option1 || size;
      const option2Name = variant.option2_name || null;
      const option2Value = variant.option2_value || null;
      const option3Name = variant.option3_name || null;
      const option3Value = variant.option3_value || null;
      
      // Log size extraction for debugging
      console.log(`Variant ${variant.title}: extracted size="${size}" from:`, {
        variant_size: variant.size,
        option1_value: variant.option1_value,
        option1: variant.option1,
        title: variant.title
      });

      // Check if variant already exists
      const { data: existingVariant } = await supabase
        .from('product_variants')
        .select('id')
        .eq('shopify_variant_id', variant.id.toString())
        .single();

      const variantData = {
        product_id: productId,
        shopify_variant_id: variant.id.toString(),
        title: variant.title,
        sku: variant.sku,
        price: variant.price ? parseFloat(variant.price) : 0,
        compare_at_price: variant.compare_at_price ? parseFloat(variant.compare_at_price) : null,
        inventory_quantity: variant.inventory_quantity || 0,
        size: size,
        option1_name: option1Name,
        option1_value: option1Value,
        option2_name: option2Name,
        option2_value: option2Value,
        option3_name: option3Name,
        option3_value: option3Value,
        updated_at: new Date().toISOString()
      };

      if (existingVariant) {
        // Update existing variant
        const { error: updateError } = await supabase
          .from('product_variants')
          .update(variantData)
          .eq('id', existingVariant.id);

        if (updateError) {
          console.error('Error updating variant:', updateError);
          variantErrorCount++;
        } else {
          variantUpdatedCount++;
        }
      } else {
        // Insert new variant
        const { error: insertError } = await supabase
          .from('product_variants')
          .insert(variantData);

        if (insertError) {
          console.error('Error inserting variant:', insertError);
          variantErrorCount++;
        } else {
          variantSyncedCount++;
        }
      }
    } catch (error) {
      console.error('Error processing variant:', error);
      variantErrorCount++;
    }
  }

  console.log(`Variants synced: ${variantSyncedCount} new, ${variantUpdatedCount} updated, ${variantErrorCount} errors`);
}

export async function POST(request: Request) {
  try {
    const { shop, accessToken } = await request.json()
    console.log('Received sync request for shop:', shop)

    if (!shop || !accessToken) {
      return NextResponse.json(
        { error: 'Missing shop or accessToken' },
        { status: 400 }
      )
    }

    // Get brand ID from the shop domain
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id, name')
      .eq('shopify_domain', shop)
      .single()

    if (brandError || !brand) {
      console.error('Brand not found for shop:', shop)
      return NextResponse.json(
        { error: 'Brand not found for this shop' },
        { status: 404 }
      )
    }

    console.log('Found brand:', brand.name, 'ID:', brand.id)

    // Fetch products from Shopify
    const shopifyProducts = await fetchShopifyProducts(accessToken, shop)
    console.log(`Fetched ${shopifyProducts.length} products from Shopify`)

    // Sync products to database
    const syncResult = await syncProductsToDatabase(brand.id, shopifyProducts)
    console.log('Database sync result:', syncResult)

    // Sync products to AI/ML service
    console.log('🤖 Starting AI sync for products...')
    const aiSyncResult = await syncProductsToAI(brand.id, shopifyProducts)
    console.log('AI sync result:', aiSyncResult)

    if (aiSyncResult.success) {
      console.log(`✅ AI sync successful: ${aiSyncResult.processed_count} products processed`)
    } else {
      console.warn(`⚠️ AI sync failed: ${aiSyncResult.error}`)
      // Don't fail the entire sync if AI sync fails
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${shopifyProducts.length} products`,
      database_sync: syncResult,
      ai_sync: aiSyncResult
    })

  } catch (error) {
    console.error('Error syncing products:', error)
    return NextResponse.json(
      { error: 'Failed to sync products' },
      { status: 500 }
    )
  }
}


