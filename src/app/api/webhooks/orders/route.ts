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
async function verifyShopifyWebhook(rawBody: string, hmacHeader: string, shopDomain: string): Promise<boolean> {
  try {
    // Get brand-specific Shopify private app secret from database
    const { data: brand, error: brandError } = await supabaseAdmin
      .from('brands')
      .select('shopify_private_app_secret')
      .eq('shopify_domain', shopDomain)
      .single()

    if (brandError || !brand?.shopify_private_app_secret) {
      console.error('❌ Brand not found or missing private app secret for shop:', shopDomain)
      return false
    }

    const secret = brand.shopify_private_app_secret
    console.log('🔐 Using brand-specific secret for HMAC verification')

    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(rawBody, 'utf8')
    const hash = hmac.digest('base64')
    
    const isValid = hash === hmacHeader
    console.log('🔍 HMAC verification result:', { isValid, expected: hash, received: hmacHeader })
    
    return isValid
  } catch (error) {
    console.error('❌ Error during HMAC verification:', error)
    return false
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
    
    // Extract shop domain from webhook topic for HMAC verification
    const shopifyShopDomain = req.headers.get('x-shopify-shop-domain')
    if (!shopifyShopDomain) {
      console.error('❌ Missing shop domain in webhook headers')
      return new NextResponse('Missing shop domain', { status: 400 })
    }

    if (!(await verifyShopifyWebhook(rawBody, hmac, shopifyShopDomain))) {
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

    // Extract tracking information from fulfillments if available
    let trackingNumber = null
    let carrier = null
    
    if (order.fulfillments && order.fulfillments.length > 0) {
      const fulfillment = order.fulfillments[0] // Get first fulfillment
      trackingNumber = fulfillment.tracking_number || fulfillment.tracking_number_sha256
      carrier = fulfillment.tracking_company || fulfillment.carrier_identifier || fulfillment.tracking_company_sha256
      
      if (trackingNumber || carrier) {
        console.log('📦 Tracking info found:', { trackingNumber, carrier })
      }
    }

    // Update tracking info in merchant_orders table for THIS brand
    if (trackingNumber || carrier) {
      const { error: trackingUpdateError } = await supabaseAdmin
        .from('merchant_orders')
        .update({
          tracking_number: trackingNumber,
          carrier: carrier,
          fulfillment_status: order.fulfillment_status || 'fulfilled',
          shipping_status: 'shipped',
          updated_at: new Date().toISOString()
        })
        .eq('merchant_id', brand.id)  // Use brand ID for multi-brand orders
        .eq('shopify_order_id', order.id.toString())  // Also match the Shopify order

      if (trackingUpdateError) {
        console.warn('⚠️ Warning: Could not update tracking in merchant_orders:', trackingUpdateError)
      } else {
        console.log('✅ Tracking info updated in merchant_orders for brand:', brand.id)
      }
    } else {
      console.log('ℹ️ No tracking info found in fulfillment')
    }

    // Extract and update shipping cost from order
    let shippingCost = 0
    if (order.shipping_lines && order.shipping_lines.length > 0) {
      shippingCost = order.shipping_lines.reduce((total: number, line: any) => {
        return total + (parseFloat(line.price) || 0)
      }, 0)
      console.log('🚚 Shipping cost calculated:', shippingCost)
    }

    // Update shipping cost in merchant_orders table for THIS brand
    if (shippingCost > 0) {
      const { error: shippingUpdateError } = await supabaseAdmin
        .from('merchant_orders')
        .update({
          shipping_cost: shippingCost,
          updated_at: new Date().toISOString()
        })
        .eq('merchant_id', brand.id)  // Use brand ID for multi-brand orders
        .eq('shopify_order_id', order.id.toString())  // Also match the Shopify order

      if (shippingUpdateError) {
        console.warn('⚠️ Warning: Could not update shipping cost in merchant_orders:', shippingUpdateError)
      } else {
        console.log('✅ Shipping cost updated in merchant_orders for brand:', brand.id, 'Cost:', shippingCost)
      }
    } else {
      console.log('ℹ️ No shipping cost found in order')
    }

    console.log('✅ Order processed successfully')
    return new NextResponse('OK', { status: 200 })
    
  } catch (error) {
    console.error('❌ Error processing order webhook:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}





