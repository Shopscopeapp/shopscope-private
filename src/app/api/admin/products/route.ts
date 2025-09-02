import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface Product {
  id: string
  title: string
  brand_id?: string
  status: string
  created_at: string
  updated_at: string
  description?: string
  price?: number
  sale_price?: number
  inventory_count?: number
  category?: string
  brand?: string
  published_to_shopscope?: boolean
  validation_status?: string
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch products with all fields (same as brand dashboard)
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error



    // Get brand names for enrichment
    const brandIds = Array.from(new Set(products?.map(p => p.brand_id).filter(Boolean) || []))
    
    const { data: brands } = await supabase
      .from('brands')
      .select('id, name')
      .in('id', brandIds)

    const brandMap = new Map<string, string>()
    brands?.forEach(b => brandMap.set(b.id, b.name))

    // Get variant counts and analytics data for each product
    const productsWithVariants = await Promise.all((products || []).map(async (product: Product) => {
      const { count: variantCount } = await supabase
        .from('product_variants')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', product.id)

      // Get analytics events for engagement metrics
      const { data: productEvents } = await supabase
        .from('brand_analytics_events')
        .select('event_type')
        .eq('product_id', product.id)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

      // Get sales data from order items
      const { data: productSales } = await supabase
        .from('order_items')
        .select('quantity, total_price')
        .eq('product_id', product.id)

      // Calculate engagement metrics
      const events = productEvents || []
      const sales = productSales || []
      
      const views = events.filter(e => e.event_type === 'product_view').length
      const likes = events.filter(e => e.event_type === 'product_swipe_right').length
      const totalSales = sales.reduce((sum, sale) => sum + (sale.quantity || 0), 0)
      const totalRevenue = sales.reduce((sum, sale) => sum + (sale.total_price || 0), 0)

      return {
        ...product,
        brand_name: product.brand_id ? brandMap.get(product.brand_id) : product.brand || null,
        variant_count: variantCount || 0,
        views,
        likes,
        total_sales: totalSales,
        total_revenue: totalRevenue
      }
    }))

    return NextResponse.json({ 
      products: productsWithVariants, 
      timestamp: new Date().toISOString() 
    })

  } catch (error) {
    console.error('Admin products fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch products data' }, { status: 500 })
  }
}
