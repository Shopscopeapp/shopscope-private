import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const { brandId, shopifyDomain, apiKey, apiSecret, accessToken } = await request.json()

    // Validate required fields
    if (!brandId || !shopifyDomain || !apiKey || !apiSecret || !accessToken) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate Shopify domain format
    if (!shopifyDomain.includes('.myshopify.com')) {
      return NextResponse.json(
        { error: 'Invalid Shopify domain format' },
        { status: 400 }
      )
    }

    const supabase = createRouteHandlerClient({ cookies })

    // Test the Shopify API connection first
    try {
      const testResponse = await fetch(`https://${shopifyDomain}/admin/api/2024-01/shop.json`, {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      })

      if (!testResponse.ok) {
        const errorText = await testResponse.text()
        console.error('Shopify API test failed:', errorText)
        return NextResponse.json(
          { error: 'Failed to connect to Shopify API. Please check your credentials.' },
          { status: 400 }
        )
      }

      const shopData = await testResponse.json()
      console.log('✅ Shopify API connection test successful:', shopData.shop.name)
    } catch (testError) {
      console.error('Shopify API test error:', testError)
      return NextResponse.json(
        { error: 'Unable to test Shopify API connection. Please verify your credentials.' },
        { status: 400 }
      )
    }

    // Update the brand with Shopify credentials
    const { data: updatedBrand, error: updateError } = await supabase
      .from('brands')
      .update({
        shopify_domain: shopifyDomain,
        shopify_access_token: accessToken,
        shopify_private_app_id: apiKey,
        shopify_private_app_secret: apiSecret,
        shopify_connected: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', brandId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating brand:', updateError)
      return NextResponse.json(
        { error: 'Failed to save Shopify credentials' },
        { status: 500 }
      )
    }

    // Register webhooks for real-time updates
    try {
      const webhookEndpoints = [
        { topic: 'orders/create', address: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/orders` },
        { topic: 'orders/updated', address: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/orders` },
        { topic: 'products/create', address: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/products` },
        { topic: 'products/update', address: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/products` },
        { topic: 'inventory_levels/update', address: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/inventory` }
      ]

      for (const webhook of webhookEndpoints) {
        try {
          const webhookResponse = await fetch(`https://${shopifyDomain}/admin/api/2024-01/webhooks.json`, {
            method: 'POST',
            headers: {
              'X-Shopify-Access-Token': accessToken,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              webhook: {
                topic: webhook.topic,
                address: webhook.address,
                format: 'json'
              }
            })
          })

          if (webhookResponse.ok) {
            const webhookData = await webhookResponse.json()
            console.log(`✅ Webhook registered for ${webhook.topic}:`, webhookData.webhook.id)
          } else {
            console.warn(`⚠️ Failed to register webhook for ${webhook.topic}`)
          }
        } catch (webhookError) {
          console.warn(`⚠️ Error registering webhook for ${webhook.topic}:`, webhookError)
        }
      }
    } catch (webhookError) {
      console.warn('⚠️ Webhook registration failed:', webhookError)
      // Don't fail the whole request for webhook registration failure
    }

    console.log('✅ Shopify private app connected successfully:', {
      brandId,
      shopifyDomain,
      hasAccessToken: !!accessToken
    })

    return NextResponse.json({
      success: true,
      message: 'Shopify private app connected successfully',
      brand: {
        id: updatedBrand.id,
        shopify_domain: updatedBrand.shopify_domain,
        shopify_connected: updatedBrand.shopify_connected
      }
    })

  } catch (error) {
    console.error('Connect private app error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}




