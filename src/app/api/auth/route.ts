import { NextResponse } from 'next/server'
import crypto from 'crypto'

// Helper function to verify HMAC signature
function verifyHmac(query: URLSearchParams, hmac: string, secret: string): boolean {
  // Create a copy and remove hmac
  const params = new URLSearchParams(query)
  params.delete('hmac')
  
  // Sort parameters alphabetically
  const sortedParams = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')
  
  // Create HMAC hash
  const generatedHash = crypto
    .createHmac('sha256', secret)
    .update(sortedParams)
    .digest('hex')
  
  return generatedHash === hmac
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get('shop')
    const host = searchParams.get('host')
    const embedded = searchParams.get('embedded')
    const hmac = searchParams.get('hmac')
    const timestamp = searchParams.get('timestamp')

    if (!shop) {
      return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 })
    }

    // Ensure shop is a valid .myshopify.com domain
    if (!shop.match(/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/)) {
      return NextResponse.json({ error: 'Invalid shop domain' }, { status: 400 })
    }

    const clientId = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET
    
    if (!clientId) {
      return NextResponse.json({ error: 'Missing Shopify API key' }, { status: 500 })
    }
    
    if (!clientSecret) {
      return NextResponse.json({ error: 'Missing Shopify API secret' }, { status: 500 })
    }

    // Verify HMAC signature if present (required for installation requests)
    if (hmac && timestamp) {
      console.log('🔐 Verifying HMAC signature for installation request')
      
      if (!verifyHmac(searchParams, hmac, clientSecret)) {
        console.error('❌ HMAC verification failed')
        return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 })
      }
      
      console.log('✅ HMAC verification passed')
    } else {
      console.log('⚠️ No HMAC provided - assuming re-authentication request')
    }

    // Check if this is an embedded app request
    const isEmbedded = host && host.length > 0

    // For ALL requests (embedded and non-embedded), initiate OAuth flow
    // This is required during Shopify app installation
    const scopes = process.env.SHOPIFY_SCOPES || 'read_products,write_products,read_orders,write_orders,read_discounts,write_discounts,read_shipping,write_shipping,read_customers,write_customers,read_inventory,write_inventory'
    const host_url = process.env.NEXT_PUBLIC_HOST || `https://${request.headers.get('host')}`
    const redirectUri = `${host_url}/api/auth/callback`
    
    // Generate a secure nonce
    const nonce = crypto.randomBytes(16).toString('hex')

    // Construct the OAuth URL with the correct Shopify format
    const authUrl = new URL(`https://${shop}/admin/oauth/authorize`)
    authUrl.searchParams.set('client_id', clientId!)
    authUrl.searchParams.set('scope', scopes)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('state', nonce)

    // Use simple meta refresh redirect for all installation scenarios
    // This ensures maximum compatibility with Shopify's automated checks
    const redirectHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="refresh" content="0; url=${authUrl.toString()}">
        <meta name="shopify-api-key" content="${clientId}" />
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            text-align: center;
            padding: 50px;
            background: #f9f9f9;
            margin: 0;
          }
          .spinner {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 2px solid #000;
            border-top: 2px solid transparent;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-top: 20px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          a {
            color: #000;
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        <div>
          <h2>Redirecting to Shopify authorization...</h2>
          <p>Please grant permissions for this app.</p>
          <div class="spinner"></div>
          <p style="margin-top: 20px; font-size: 14px; color: #666;">
            If you're not redirected automatically, 
            <a href="${authUrl.toString()}">click here</a>.
          </p>
        </div>
      </body>
      </html>
    `;
    
    return new NextResponse(redirectHtml, {
      headers: { 
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

