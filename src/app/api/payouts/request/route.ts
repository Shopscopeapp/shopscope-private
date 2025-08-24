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
    const { brandId } = await request.json()
    console.log('Processing payout request for brand:', brandId)

    if (!brandId) {
      return NextResponse.json(
        { error: 'Missing brandId parameter' },
        { status: 400 }
      )
    }

    // Verify brand exists
    const { data: brand, error: brandError } = await supabaseAdmin
      .from('brands')
      .select('id, stripe_connect_id')
      .eq('id', brandId)
      .single()

    if (brandError || !brand) {
      console.error('Brand not found:', brandError || 'No brand with this ID')
      return NextResponse.json(
        { error: 'Brand not found in database' },
        { status: 404 }
      )
    }

    // For now, return a mock response
    // In a real implementation, this would calculate pending payouts
    return NextResponse.json({ 
      success: true,
      message: 'Payout request processed',
      data: {
        pendingAmount: 0,
        lastPayout: null,
        nextPayout: null
      }
    })
  } catch (error) {
    console.error('Error processing payout request:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process payout request' },
      { status: 500 }
    )
  }
}


