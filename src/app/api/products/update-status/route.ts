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
    const { productIds, status, brandId } = await request.json()

    if (!productIds || !Array.isArray(productIds) || !status || !brandId) {
      return NextResponse.json(
        { error: 'Missing required fields: productIds, status, brandId' },
        { status: 400 }
      )
    }

    console.log('Updating products:', { productIds, status, brandId })

    // Update products in database using admin client
    const updatePromises = productIds.map(async (productId: string) => {
      // First, let's check if the product exists
      const { data: existingProduct, error: fetchError } = await supabaseAdmin
        .from('products')
        .select('id, status, brand_id')
        .eq('id', productId)
        .single()

      console.log(`Product ${productId} before update:`, existingProduct, fetchError)

      // Debug: Check if brand_id matches
      if (existingProduct) {
        console.log(`Brand ID comparison for ${productId}:`)
        console.log(`  Sent brand_id: "${brandId}" (type: ${typeof brandId})`)
        console.log(`  DB brand_id: "${existingProduct.brand_id}" (type: ${typeof existingProduct.brand_id})`)
        console.log(`  Match: ${brandId === existingProduct.brand_id}`)
      }

      const result = await supabaseAdmin
        .from('products')
        .update({ 
          status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId)
        .eq('brand_id', brandId) // Re-add security check since we're using admin client
        .select() // Return the updated data

      console.log(`Update result for product ${productId}:`, result)
      
      // Also check the product after update
      const { data: updatedProduct, error: postFetchError } = await supabaseAdmin
        .from('products')
        .select('id, status, updated_at')
        .eq('id', productId)
        .single()

      console.log(`Product ${productId} after update:`, updatedProduct, postFetchError)
      
      return result
    })

    const updateResults = await Promise.all(updatePromises)
    
    // Check for errors
    const errors = updateResults.filter(result => result.error)
    if (errors.length > 0) {
      console.error('Database update errors:', errors)
      return NextResponse.json(
        { error: 'Failed to update some products', details: errors },
        { status: 500 }
      )
    }

    // Count successful updates
    const successfulUpdates = updateResults.filter(result => !result.error)
    
    return NextResponse.json({
      success: true,
      updatedCount: successfulUpdates.length,
      message: `Successfully updated ${successfulUpdates.length} products`
    })

  } catch (error) {
    console.error('Error updating product status:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}



