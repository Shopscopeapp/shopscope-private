import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface Order {
  id: string
  external_order_id?: string
  brand_id?: string
  merchant_id?: string
  total_amount: number
  status: string
  created_at: string
  updated_at: string
  payment_status?: string
  items?: any[]
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch orders from the correct orders table - only select columns that exist
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`id, external_order_id, brand_id, merchant_id, total_amount, status, created_at, updated_at, payment_status, items`)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Get brand and merchant names for enrichment
    const brandIds = Array.from(new Set(orders?.map(o => o.brand_id).filter(Boolean) || []))
    const merchantIds = Array.from(new Set(orders?.map(o => o.merchant_id).filter(Boolean) || []))

    const [brands, merchants] = await Promise.all([
      brandIds.length > 0 ? supabase.from('brands').select('id, name').in('id', brandIds) : { data: [] },
      merchantIds.length > 0 ? supabase.from('merchants').select('id, name').in('id', merchantIds) : { data: [] }
    ])

    const brandMap = new Map<string, string>()
    const merchantMap = new Map<string, string>()
    
    brands.data?.forEach(b => brandMap.set(b.id, b.name))
    merchants.data?.forEach(m => merchantMap.set(m.id, m.name))

    // Enrich orders with brand and merchant names
    const enrichedOrders = (orders || []).map((order: Order) => ({
      ...order,
      brand_name: order.brand_id ? brandMap.get(order.brand_id) : null,
      merchant_name: order.merchant_id ? merchantMap.get(order.merchant_id) : null,
      // Add items count from the items JSONB field
      items_count: order.items ? (Array.isArray(order.items) ? order.items.length : 0) : 0
    }))

    return NextResponse.json({ 
      orders: enrichedOrders, 
      timestamp: new Date().toISOString() 
    })

  } catch (error) {
    console.error('Admin orders fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch orders data' }, { status: 500 })
  }
}
