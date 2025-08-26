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

async function fetchShopifyOrders(accessToken: string, shop: string, since?: string) {
  const sinceParam = since ? `&since_id=${since}` : ''
  const response = await fetch(`https://${shop}/admin/api/2024-01/orders.json?status=any&limit=250${sinceParam}`, {
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch orders from Shopify: ${response.statusText}`)
  }

  const data = await response.json()
  return data.orders || []
}

async function syncOrdersToDatabase(brandId: string, shopifyOrders: any[]) {
  let syncedCount = 0
  let updatedCount = 0
  let errorCount = 0

  for (const order of shopifyOrders) {
    try {
      // Check if order already exists
      const { data: existingOrder } = await supabaseAdmin
        .from('orders')
        .select('id')
        .eq('shopify_order_id', order.id.toString())
        .single()

      // Calculate commission (10% of order total)
      const commissionAmount = parseFloat(order.total_price) * 0.10
      const brandEarnings = parseFloat(order.total_price) - commissionAmount

      const orderData = {
        brand_id: brandId,
        shopify_order_id: order.id.toString(),
        order_number: order.order_number,
        customer_email: order.customer?.email || order.email,
        customer_name: order.customer?.first_name && order.customer?.last_name 
          ? `${order.customer.first_name} ${order.customer.last_name}`
          : order.customer?.first_name || 'Unknown',
        total_amount: parseFloat(order.total_price),
        commission_amount: commissionAmount,
        brand_earnings: brandEarnings,
        status: order.fulfillment_status || 'pending',
        currency: order.currency || 'USD',
        shipping_address: order.shipping_address || {},
        billing_address: order.billing_address || {},
        line_items: order.line_items || [],
        metadata: {
          shopify_created_at: order.created_at,
          shopify_updated_at: order.updated_at,
          shopify_cancelled_at: order.cancelled_at,
          shopify_processed_at: order.processed_at,
          shopify_financial_status: order.financial_status,
          shopify_fulfillment_status: order.fulfillment_status,
          shopify_tags: order.tags,
          shopify_note: order.note
        },
        created_at: order.created_at,
        updated_at: new Date().toISOString()
      }

      if (existingOrder) {
        // Update existing order
        const { error: updateError } = await supabaseAdmin
          .from('orders')
          .update(orderData)
          .eq('id', existingOrder.id)

        if (updateError) {
          console.error('Error updating order:', updateError)
          errorCount++
        } else {
          updatedCount++
        }
      } else {
        // Insert new order
        const { error: insertError } = await supabaseAdmin
          .from('orders')
          .insert(orderData)

        if (insertError) {
          console.error('Error inserting order:', insertError)
          errorCount++
        } else {
          syncedCount++
        }
      }
    } catch (error) {
      console.error('Error processing order:', error)
      errorCount++
    }
  }

  return { syncedCount, updatedCount, errorCount, totalProcessed: shopifyOrders.length }
}

export async function POST(request: Request) {
  try {
    const { shop, accessToken } = await request.json()
    console.log('Received order sync request for shop:', shop)

    if (!shop || !accessToken) {
      return NextResponse.json(
        { error: 'Missing shop or accessToken' },
        { status: 400 }
      )
    }

    // Get brand ID from the shop domain
    const { data: brand, error: brandError } = await supabaseAdmin
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

    // Fetch orders from Shopify
    const shopifyOrders = await fetchShopifyOrders(accessToken, shop)
    console.log(`Fetched ${shopifyOrders.length} orders from Shopify`)

    // Sync orders to database
    const syncResult = await syncOrdersToDatabase(brand.id, shopifyOrders)
    console.log('Order sync result:', syncResult)

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${shopifyOrders.length} orders`,
      sync_result: syncResult
    })

  } catch (error) {
    console.error('Error syncing orders:', error)
    return NextResponse.json(
      { error: 'Failed to sync orders' },
      { status: 500 }
    )
  }
}
