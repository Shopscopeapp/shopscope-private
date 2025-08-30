import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface Payout {
  id: string
  brand_id: string
  amount: number
  commission_amount: number
  status: string
  created_at: string
  updated_at: string
  stripe_payout_id?: string
  period_start: string
  period_end: string
  order_ids: string[]
  metadata?: any
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch payouts with all relevant fields
    const { data: payouts, error } = await supabase
      .from('payouts')
      .select(`id, brand_id, amount, commission_amount, status, created_at, updated_at, stripe_payout_id, period_start, period_end, order_ids, metadata`)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Get brand information for enrichment
    const brandIds = Array.from(new Set(payouts?.map(p => p.brand_id) || []))
    
    const { data: brands } = await supabase
      .from('brands')
      .select('id, name, commission_rate')
      .in('id', brandIds)

    const brandMap = new Map<string, { name: string; commission_rate: number }>()
    brands?.forEach(b => brandMap.set(b.id, { name: b.name, commission_rate: b.commission_rate }))

    // Enrich payouts with brand information
    const enrichedPayouts = (payouts || []).map((payout: Payout) => {
      const brandInfo = brandMap.get(payout.brand_id)
      return {
        ...payout,
        brand_name: brandInfo?.name || 'Unknown Brand',
        commission_rate: brandInfo?.commission_rate || 0,
        order_count: payout.order_ids?.length || 0
      }
    })

    return NextResponse.json({ 
      payouts: enrichedPayouts, 
      timestamp: new Date().toISOString() 
    })

  } catch (error) {
    console.error('Admin payouts fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch payouts data' }, { status: 500 })
  }
}
