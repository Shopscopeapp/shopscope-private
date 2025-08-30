import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Basic security check
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch brands with fields that actually exist
    const { data: brands, error } = await supabase
      .from('brands')
      .select(`
        id, 
        name, 
        merchant_id, 
        created_at, 
        updated_at, 
        status, 
        commission_rate, 
        logo_url, 
        description, 
        website_url, 
        contact_email,
        contact_phone,
        shopify_domain,
        shopify_connected,
        shopify_private_app_secret,
        stripe_connect_id,
        products_count,
        published_products_count
      `)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    // Add calculated fields for each brand
    const brandsWithStats = brands?.map(brand => ({
      ...brand,
      total_orders: 0, // Will be calculated from merchant_orders
      total_revenue: 0, // Will be calculated from merchant_orders
      total_payouts: 0, // Will be calculated from payouts
      stripe_connected: !!brand.stripe_connect_id,
      shopify_connected: brand.shopify_connected || !!(brand.shopify_domain && brand.shopify_private_app_secret)
    })) || []

    return NextResponse.json({
      brands: brandsWithStats,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Admin brands fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch brands data' },
      { status: 500 }
    )
  }
}
