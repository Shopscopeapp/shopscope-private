import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

// Create a Supabase client with the service role key for webhooks
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

// Verify Shopify webhook authenticity
function verifyShopifyWebhook(rawBody: string, hmacHeader: string): boolean {
  const secret = process.env.SHOPIFY_CLIENT_SECRET
  
  if (!secret) {
    console.error('Missing SHOPIFY_CLIENT_SECRET environment variable')
    return false
  }

  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(rawBody, 'utf8')
  const hash = hmac.digest('base64')
  
  return hash === hmacHeader
}

// Function to trigger shipping zone sync
async function triggerShippingSync(shopDomain: string, brandId: string) {
  try {
    // Get brand's access token
    const { data: brand, error: brandError } = await supabaseAdmin
      .from('brands')
      .select('shopify_access_token')
      .eq('id', brandId)
      .single()

    if (brandError || !brand?.shopify_access_token) {
      console.warn('⚠️ Cannot sync shipping - missing access token for brand:', brandId)
      return
    }

    // Call the shipping sync API internally
    const syncResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/shopify/sync-shipping`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        brandId: brandId,
        accessToken: brand.shopify_access_token,
        shop: shopDomain
      })
    })

    if (syncResponse.ok) {
      console.log('✅ Shipping zones synced successfully for brand:', brandId)
    } else {
      const errorText = await syncResponse.text()
      console.warn('⚠️ Shipping sync failed:', errorText)
    }
  } catch (error) {
    console.warn('⚠️ Error triggering shipping sync:', error)
    // Don't throw - we don't want to fail the order webhook if shipping sync fails
  }
}

export async function POST(req: Request) {
  try {
    console.log('📦 Order webhook received')
    
    // Verify webhook authenticity
    const hmac = req.headers.get('x-shopify-hmac-sha256')
    if (!hmac) {
      return new NextResponse('Missing HMAC header', { status: 401 })
    }

    const rawBody = await req.text()
    if (!verifyShopifyWebhook(rawBody, hmac)) {
      return new NextResponse('Invalid HMAC', { status: 401 })
    }

    const order = JSON.parse(rawBody)
    console.log('📋 Processing order:', {
      id: order.id,
      financial_status: order.financial_status,
      fulfillment_status: order.fulfillment_status,
      source_name: order.source_name,
      referring_site: order.referring_site,
      source_identifier: order.source_identifier,
      app_id: order.app_id,
      source_url: order.source_url
    })

    // Check if this order came from ShopScope
    const isShopScopeOrder = order.source_name === 'shopscope' || 
                            order.referring_site?.includes('shopscope') ||
                            order.source_url?.includes('shopscope') ||
                            order.source_identifier?.includes('shopscope')

    if (!isShopScopeOrder) {
      console.log('⏭️ Skipping non-ShopScope order')
      return new NextResponse('OK', { status: 200 })
    }

    // Extract shop domain from webhook topic
    const shopifyShopDomain = req.headers.get('x-shopify-shop-domain')
    if (!shopifyShopDomain) {
      console.error('❌ Missing shop domain in webhook headers')
      return new NextResponse('Missing shop domain', { status: 400 })
    }

    // Find the brand by shop domain
    const { data: brand, error: brandError } = await supabaseAdmin
      .from('brands')
      .select('id, commission_rate')
      .eq('shopify_domain', shopifyShopDomain)
      .single()

    if (brandError || !brand) {
      console.error('❌ Brand not found for shop:', shopifyShopDomain)
      return new NextResponse('Brand not found', { status: 404 })
    }

    console.log('🏪 Found brand:', brand.id)

    // Calculate commission
    const totalAmount = parseFloat(order.total_price || '0')
    const commissionAmount = totalAmount * (brand.commission_rate || 0.10)

    // Check if order already exists
    const { data: existingOrder } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('shopify_order_id', order.id.toString())
      .single()

    if (existingOrder) {
      console.log('🔄 Updating existing order:', existingOrder.id)
      
      // Update existing order
      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
          total_amount: totalAmount,
          commission_amount: commissionAmount,
          financial_status: order.financial_status,
          fulfillment_status: order.fulfillment_status,
          payment_status: getPaymentStatus(order.financial_status),
          line_items: order.line_items,
          shipping_address: order.shipping_address,
          customer_email: order.email,
          customer_name: `${order.billing_address?.first_name || ''} ${order.billing_address?.last_name || ''}`.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingOrder.id)

      if (updateError) {
        console.error('❌ Error updating order:', updateError)
        return new NextResponse('Database error', { status: 500 })
      }
    } else {
      console.log('🆕 Creating new order')
      
      // Create new order
      const { error: insertError } = await supabaseAdmin
        .from('orders')
        .insert({
          brand_id: brand.id,
          shopify_order_id: order.id.toString(),
          order_number: order.order_number,
          total_amount: totalAmount,
          commission_amount: commissionAmount,
          financial_status: order.financial_status,
          fulfillment_status: order.fulfillment_status,
          payment_status: getPaymentStatus(order.financial_status),
          line_items: order.line_items,
          shipping_address: order.shipping_address,
          customer_email: order.email,
          customer_name: `${order.billing_address?.first_name || ''} ${order.billing_address?.last_name || ''}`.trim(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (insertError) {
        console.error('❌ Error creating order:', insertError)
        return new NextResponse('Database error', { status: 500 })
      }
    }

    // Trigger shipping sync for new orders
    if (!existingOrder) {
      console.log('🚚 Triggering shipping sync for new order')
      await triggerShippingSync(shopifyShopDomain, brand.id)
    }

    console.log('✅ Order processed successfully')
    return new NextResponse('OK', { status: 200 })
    
  } catch (error) {
    console.error('❌ Error processing order webhook:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}

function getPaymentStatus(financialStatus: string): string {
  switch (financialStatus) {
    case 'paid':
      return 'paid'
    case 'pending':
      return 'pending'
    case 'refunded':
      return 'refunded'
    case 'partially_refunded':
      return 'partially_refunded'
    default:
      return 'pending'
  }
}
