import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

export async function POST(request: Request) {
  try {
    const { brandId, accessToken, shop } = await request.json()
    console.log('Syncing products for:', { brandId, shop })

    if (!brandId || !accessToken || !shop) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Verify brand exists
    const { data: brand, error: brandError } = await supabaseAdmin
      .from('brands')
      .select('id')
      .eq('id', brandId)
      .single()

    if (brandError || !brand) {
      console.error('Brand not found:', brandError || 'No brand with this ID')
      return NextResponse.json(
        { error: 'Brand not found in database' },
        { status: 404 }
      )
    }

    // Fetch products from Shopify
    const response = await fetch(`https://${shop}/admin/api/2024-01/products.json`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Shopify API error:', errorText)
      throw new Error(`Failed to fetch products from Shopify: ${errorText}`)
    }

    const data = await response.json()
    const products = data.products || []

    console.log(`Found ${products.length} products to sync`)

    // Process each product
    for (const product of products) {
      // Check if product already exists
      const { data: existingProduct } = await supabaseAdmin
        .from('products')
        .select('id')
        .eq('brand_id', brandId)
        .eq('shopify_product_id', product.id.toString())
        .single()

      const productData = {
        brand_id: brandId,
        shopify_product_id: product.id.toString(),
        title: product.title,
        description: product.body_html,
        handle: product.handle,
        vendor: product.vendor,
        product_type: product.product_type,
        status: product.status,
        tags: product.tags ? product.tags.split(',').map((tag: string) => tag.trim()) : [],
        price: product.variants?.[0]?.price ? parseFloat(product.variants[0].price) : 0,
        compare_at_price: product.variants?.[0]?.compare_at_price ? parseFloat(product.variants[0].compare_at_price) : null,
        inventory_quantity: product.variants?.[0]?.inventory_quantity || 0,
        images: product.images,
        variants: product.variants,
        sync_status: 'synced',
        last_synced: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      if (existingProduct) {
        // Update existing product
        const { error: updateError } = await supabaseAdmin
          .from('products')
          .update(productData)
          .eq('id', existingProduct.id)

        if (updateError) {
          console.error('Error updating product:', updateError)
        }
      } else {
        // Insert new product
        const { error: insertError } = await supabaseAdmin
          .from('products')
          .insert(productData)

        if (insertError) {
          console.error('Error inserting product:', insertError)
        }
      }
    }

    return NextResponse.json({ 
      success: true,
      message: `Successfully synced ${products.length} products`,
      syncedCount: products.length
    })
  } catch (error) {
    console.error('Error syncing products:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync products' },
      { status: 500 }
    )
  }
}

