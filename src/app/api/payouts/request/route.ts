import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

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

    // Verify brand exists and has Stripe connected
    const { data: brand, error: brandError } = await supabaseAdmin
      .from('brands')
      .select('id, stripe_connect_id, name')
      .eq('id', brandId)
      .single()

    if (brandError || !brand) {
      console.error('Brand not found:', brandError || 'No brand with this ID')
      return NextResponse.json(
        { error: 'Brand not found in database' },
        { status: 404 }
      )
    }

    if (!brand.stripe_connect_id) {
      return NextResponse.json(
        { error: 'Brand must have Stripe account connected to request payouts' },
        { status: 400 }
      )
    }

    // Calculate pending payout amount using the database function
    const { data: pendingAmount, error: pendingError } = await supabaseAdmin
      .rpc('get_pending_payout_amount', { brand_id: brandId })

    if (pendingError) {
      console.error('Error calculating pending amount:', pendingError)
      return NextResponse.json(
        { error: 'Failed to calculate pending payout amount' },
        { status: 500 }
      )
    }

    const pendingAmountNum = pendingAmount || 0
    const minimumPayout = 10.00 // $10 minimum payout

    if (pendingAmountNum < minimumPayout) {
      return NextResponse.json(
        { error: `Minimum payout amount is $${minimumPayout.toFixed(2)}. Available: $${pendingAmountNum.toFixed(2)}` },
        { status: 400 }
      )
    }

    // Create payout record in database
    const { data: payoutRecord, error: payoutError } = await supabaseAdmin
      .from('payouts')
      .insert({
        brand_id: brandId,
        amount: pendingAmountNum,
        status: 'pending',
        description: `Payout request for ${brand.name}`,
        metadata: {
          request_type: 'manual',
          calculated_from: 'orders',
          commission_rate: 0.10
        }
      })
      .select()
      .single()

    if (payoutError) {
      console.error('Error creating payout record:', payoutError)
      return NextResponse.json(
        { error: 'Failed to create payout record' },
        { status: 500 }
      )
    }

    // Attempt to create Stripe transfer (this would be done by a background job in production)
    let stripeTransferId = null
    try {
      const transfer = await stripe.transfers.create({
        amount: Math.round(pendingAmountNum * 100), // Convert to cents
        currency: 'usd',
        destination: brand.stripe_connect_id,
        description: `Payout for ${brand.name} - ${payoutRecord.id}`,
        metadata: {
          payout_id: payoutRecord.id,
          brand_id: brandId
        }
      })
      
      stripeTransferId = transfer.id
      
      // Update payout record with Stripe transfer ID
      await supabaseAdmin
        .from('payouts')
        .update({
          stripe_transfer_id: stripeTransferId,
          status: 'processing',
          processed_at: new Date().toISOString()
        })
        .eq('id', payoutRecord.id)
      
      console.log('Successfully created Stripe transfer:', transfer.id)
    } catch (stripeError: any) {
      console.error('Stripe transfer failed:', stripeError)
      
      // Update payout record to failed status
      await supabaseAdmin
        .from('payouts')
        .update({
          status: 'failed',
          metadata: {
            ...payoutRecord.metadata,
            stripe_error: stripeError.message,
            stripe_error_code: stripeError.code
          }
        })
        .eq('id', payoutRecord.id)
      
      return NextResponse.json(
        { error: `Stripe transfer failed: ${stripeError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: 'Payout request processed successfully',
      data: {
        payout_id: payoutRecord.id,
        amount: pendingAmountNum,
        stripe_transfer_id: stripeTransferId,
        status: 'processing'
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


