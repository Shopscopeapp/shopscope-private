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
        inventory_count: product.variants?.[0]?.inventory_quantity || 0,
        images: product.images || [],
        metadata: {
          handle: product.handle,
          product_type: product.product_type,
          variants: product.variants
        },
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (existingProduct) {
        // Update existing product
        const { error: updateError } = await supabaseAdmin
          .from('products')
          .update(productData)
          .eq('id', existingProduct.id);

        if (updateError) {
          console.error('Error updating product:', updateError);
          errorCount++;
        } else {
          updatedCount++;
        }
      } else {
        // Insert new product
        const { error: insertError } = await supabaseAdmin
          .from('products')
          .insert(productData);

        if (insertError) {
          console.error('Error inserting product:', insertError);
          errorCount++;
        } else {
          syncedCount++;
        }
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


