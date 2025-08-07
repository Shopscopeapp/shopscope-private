import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  console.log('🔄 Auth callback started')
  
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const shop = searchParams.get('shop')
    const hmac = searchParams.get('hmac')

    console.log('📋 Callback parameters:', {
      code: code ? `${code.substring(0, 8)}...` : 'missing',
      shop,
      hmac: hmac ? 'present' : 'missing',
      fullUrl: request.url
    })

    if (!code || !shop) {
      console.error('❌ Missing required parameters:', { code: !!code, shop: !!shop })
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Verify HMAC for security
    if (hmac) {
      console.log('🔐 Starting HMAC verification')
      try {
        const params = new URLSearchParams()
        Array.from(searchParams.entries()).forEach(([key, value]) => {
          if (key !== 'hmac' && key !== 'signature') {
            params.append(key, value)
          }
        })
        
        const sortedParams = Array.from(params.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, value]) => `${key}=${value}`)
          .join('&')
        
        if (!process.env.SHOPIFY_CLIENT_SECRET) {
          console.error('❌ SHOPIFY_CLIENT_SECRET not found in environment')
          throw new Error('Missing SHOPIFY_CLIENT_SECRET')
        }
        
        const calculatedHmac = crypto
          .createHmac('sha256', process.env.SHOPIFY_CLIENT_SECRET!)
          .update(sortedParams)
          .digest('hex')
        
        if (calculatedHmac !== hmac) {
          console.error('❌ HMAC verification failed')
          return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
        }
        
        console.log('✅ HMAC verification passed')
      } catch (hmacError) {
        console.error('💥 HMAC verification error:', hmacError)
        throw hmacError
      }
    }

    // Exchange the code for an access token
    console.log('🔄 Starting token exchange with Shopify')
    
    if (!process.env.NEXT_PUBLIC_SHOPIFY_API_KEY) {
      console.error('❌ NEXT_PUBLIC_SHOPIFY_API_KEY not found in environment')
      throw new Error('Missing NEXT_PUBLIC_SHOPIFY_API_KEY')
    }
    
    if (!process.env.SHOPIFY_CLIENT_SECRET) {
      console.error('❌ SHOPIFY_CLIENT_SECRET not found in environment')
      throw new Error('Missing SHOPIFY_CLIENT_SECRET')
    }

    const tokenUrl = `https://${shop}/admin/oauth/access_token`
    console.log('🚀 Starting token exchange request:', { shop })

    const accessTokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_CLIENT_SECRET,
        code,
      }),
    })

    if (!accessTokenResponse.ok) {
      const errorText = await accessTokenResponse.text()
      console.error('❌ Token exchange failed:', {
        status: accessTokenResponse.status,
        statusText: accessTokenResponse.statusText,
        body: errorText,
        shop
      })
      throw new Error(`Failed to exchange code for access token: ${accessTokenResponse.status} ${errorText}`)
    }

    const tokenData = await accessTokenResponse.json()
    console.log('✅ Token exchange successful:', {
      hasAccessToken: !!tokenData.access_token,
      scope: tokenData.scope
    })

    const { access_token } = tokenData

    // Store the access token in database for this shop
    console.log('💾 Storing access token in database')
    
    const appHost = process.env.NEXT_PUBLIC_HOST || `https://${request.headers.get('host')}`
    
    try {
      const supabase = createRouteHandlerClient({ cookies })
      
      // Get the current session to find the brand by user_id
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.user) {
        console.log('⚠️ No active session found during OAuth callback')
        // Try to find brand by shopify_domain as fallback
        const { data: existingBrand, error: findError } = await supabase
          .from('brands')
          .select('*')
          .eq('shopify_domain', shop)
          .single()

        if (findError && findError.code !== 'PGRST116') {
          console.error('❌ Error finding existing brand by domain:', findError)
        }

        if (existingBrand) {
          // Update existing brand found by domain
          const { error: updateError } = await supabase
            .from('brands')
            .update({
              shopify_access_token: access_token,
              shopify_connected: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingBrand.id)

          if (updateError) {
            console.error('❌ Error updating brand by domain:', updateError)
          } else {
            console.log('✅ Updated existing brand with access token (found by domain)')
          }
        } else {
          // No existing brand and no session - create a temporary user account
          console.log('🆕 Creating new brand for first-time Shopify installation:', shop)
          
          const tempEmail = `${shop.replace('.myshopify.com', '')}@shopify-install.temp`
          const tempPassword = `temp-${Date.now()}-${Math.random()}`
          
          try {
            // Create temporary auth user
            const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
              email: tempEmail,
              password: tempPassword,
              email_confirm: true,
              user_metadata: {
                source: 'shopify_direct_install',
                shop_domain: shop
              }
            })

            if (userError) {
              console.error('❌ Error creating temp user:', userError)
            } else if (newUser.user) {
              console.log('✅ Created temporary user for shop:', shop)
              
              // Create brand for the new user
              const shopName = shop.replace('.myshopify.com', '').replace(/[-_]/g, ' ')
              const brandName = shopName.split(' ').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join(' ')
              
              const { data: newBrand, error: brandError } = await supabase
                .from('brands')
                .insert({
                  user_id: newUser.user.id,
                  name: brandName,
                  contact_email: tempEmail,
                  shopify_domain: shop,
                  shopify_access_token: access_token,
                  shopify_connected: true,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .select()
                .single()

              if (brandError) {
                console.error('❌ Error creating brand for first-time install:', brandError)
              } else {
                console.log('✅ Successfully created brand for first-time Shopify installation:', {
                  brandId: newBrand.id,
                  brandName: newBrand.name,
                  shopifyDomain: shop,
                  userId: newUser.user.id
                })
              }
            }
          } catch (createError) {
            console.error('❌ Error in first-time brand creation:', createError)
          }
        }
      } else {
        // We have a session, find brand by user_id
        console.log('🔍 Finding brand by user_id:', session.user.id)
        
        const { data: userBrand, error: userBrandError } = await supabase
          .from('brands')
          .select('*')
          .eq('user_id', session.user.id)
          .single()

        if (userBrandError) {
          console.error('❌ Error finding brand by user_id:', userBrandError)
        } else if (userBrand) {
          // Update the user's brand with Shopify details
          const { error: updateError } = await supabase
            .from('brands')
            .update({
              shopify_domain: shop,
              shopify_access_token: access_token,
              shopify_connected: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', userBrand.id)

          if (updateError) {
            console.error('❌ Error updating user brand:', updateError)
          } else {
            console.log('✅ Successfully updated user brand with Shopify connection:', {
              brandId: userBrand.id,
              brandName: userBrand.name,
              shopifyDomain: shop
            })
          }
        } else {
          console.log('🆕 Creating brand for existing user via Shopify installation')
          
          // Create brand for existing user who installed via Shopify
          const shopName = shop.replace('.myshopify.com', '').replace(/[-_]/g, ' ')
          const brandName = shopName.split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ')
          
          try {
            const { data: newBrand, error: brandError } = await supabase
              .from('brands')
              .insert({
                user_id: session.user.id,
                name: brandName,
                contact_email: session.user.email || `${shop.replace('.myshopify.com', '')}@example.com`,
                shopify_domain: shop,
                shopify_access_token: access_token,
                shopify_connected: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select()
              .single()

            if (brandError) {
              console.error('❌ Error creating brand for existing user:', brandError)
            } else {
              console.log('✅ Successfully created brand for existing user via Shopify:', {
                brandId: newBrand.id,
                brandName: newBrand.name,
                shopifyDomain: shop,
                userId: session.user.id,
                userEmail: session.user.email
              })
            }
          } catch (createError) {
            console.error('❌ Error creating brand for existing user:', createError)
          }
        }
      }
    } catch (dbError) {
      console.error('⚠️ Database operation failed (non-fatal):', dbError)
    }
    
    // Redirect to standalone dashboard
    console.log('🏠 App host determined:', appHost)
    const dashboardUrl = `${appHost}/dashboard`
    console.log('🔗 Standalone redirect URL:', dashboardUrl)
    
    console.log('✅ Returning standalone redirect')
    return NextResponse.redirect(dashboardUrl, 302)
    
  } catch (error) {
    console.error('💥 Callback error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error
    })
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
