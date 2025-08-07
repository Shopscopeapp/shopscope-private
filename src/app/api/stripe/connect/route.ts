import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    
    console.log('Stripe Connect callback received:', {
      hasCode: !!code,
      hasState: !!state,
      state: state,
      fullUrl: request.url
    });
    
    if (!code) {
      console.error('Missing code parameter in Stripe Connect callback')
      return new NextResponse('Missing code parameter', { status: 400 })
    }

    // Parse embedded mode context from state parameter
    let embeddedContext = null
    if (state) {
      try {
        embeddedContext = JSON.parse(Buffer.from(decodeURIComponent(state), 'base64').toString())
        console.log('Parsed embedded context:', embeddedContext)
      } catch (error) {
        console.error('Error parsing state parameter:', error)
        console.error('Raw state parameter:', state)
      }
    } else {
      console.log('No state parameter found - assuming standalone mode')
    }

    console.log('Received Stripe code:', code.substring(0, 5) + '...');
    console.log('STRIPE_SECRET_KEY exists:', !!process.env.STRIPE_SECRET_KEY);
    console.log('STRIPE_CONNECT_CLIENT_ID exists:', !!process.env.STRIPE_CONNECT_CLIENT_ID);

    // Exchange the authorization code for an access token
    let response;
    try {
      // The client_id is automatically included by Stripe when using stripe.oauth.token
      response = await stripe.oauth.token({
        grant_type: 'authorization_code',
        code,
      });
      console.log('Successfully exchanged authorization code for access token', { 
        hasStripeUserId: !!response.stripe_user_id 
      });
    } catch (tokenError: any) {
      console.error('Error exchanging authorization code:', 
        tokenError.type,
        tokenError.message,
        tokenError.code
      );
      // Log more details about the error
      if (tokenError.raw) {
        console.error('Raw error:', tokenError.raw);
      }
      const errorUrl = embeddedContext && embeddedContext.embedded 
        ? `${process.env.NEXT_PUBLIC_APP_URL}/stripe-connect-success?shop=${embeddedContext.shop}&host=${encodeURIComponent(embeddedContext.host)}&error=stripe_token_error&message=${encodeURIComponent(tokenError.message || 'Unknown error')}`
        : `/dashboard/settings?error=stripe_token_error&message=${encodeURIComponent(tokenError.message || 'Unknown error')}`
      return NextResponse.redirect(embeddedContext && embeddedContext.embedded ? errorUrl : new URL(errorUrl, request.url));
    }

    // Get the connected account ID
    const connectedAccountId = response.stripe_user_id

    if (!connectedAccountId) {
      console.error('Failed to get connected account ID from Stripe response')
      const errorUrl = embeddedContext && embeddedContext.embedded 
        ? `${process.env.NEXT_PUBLIC_APP_URL}/stripe-connect-success?shop=${embeddedContext.shop}&host=${encodeURIComponent(embeddedContext.host)}&error=missing_account_id`
        : '/dashboard/settings?error=missing_account_id'
      return NextResponse.redirect(embeddedContext && embeddedContext.embedded ? errorUrl : new URL(errorUrl, request.url));
    }

    // Get the user's brand ID from Supabase
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      console.error('No session found during Stripe Connect callback')
      
      // Since we don't have a session, store the account ID in cookies temporarily
      // and redirect to login page
      cookies().set('stripe_account_id', connectedAccountId, { 
        path: '/',
        maxAge: 3600, // 1 hour
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
      });
      
      return NextResponse.redirect(new URL('/auth/login?redirect=/dashboard/settings&stripe_connect=pending', request.url))
    }

    console.log('Session found, updating brand with Stripe account ID', {
      userId: session.user.id,
      stripeAccountId: connectedAccountId
    });

    // First, verify the brand exists
    let existingBrand, fetchError;
    
    if (embeddedContext && embeddedContext.embedded && embeddedContext.shop) {
      // For embedded mode, find brand by shop domain
      const shopDomain = embeddedContext.shop.includes('.myshopify.com') 
        ? embeddedContext.shop 
        : embeddedContext.shop + '.myshopify.com';
      const { data, error } = await supabase
        .from('brands')
        .select('id, stripe_connect_id')
        .eq('shopify_domain', shopDomain)
        .single();
      existingBrand = data;
      fetchError = error;
      console.log('Looking for brand by shop domain:', shopDomain);
    } else {
      // For standalone mode, find brand by user_id
      const { data, error } = await supabase
        .from('brands')
        .select('id, stripe_connect_id')
        .eq('user_id', session.user.id)
        .single();
      existingBrand = data;
      fetchError = error;
      console.log('Looking for brand by user_id:', session.user.id);
    }

    if (fetchError) {
      console.error('Error fetching brand:', fetchError);
      const errorUrl = embeddedContext && embeddedContext.embedded 
        ? `${process.env.NEXT_PUBLIC_APP_URL}/stripe-connect-success?shop=${embeddedContext.shop}&host=${encodeURIComponent(embeddedContext.host)}&error=brand_not_found`
        : '/dashboard/settings?error=brand_not_found'
      return NextResponse.redirect(embeddedContext && embeddedContext.embedded ? errorUrl : new URL(errorUrl, request.url));
    }

    console.log('Found existing brand:', existingBrand);

    // Update the brand's Stripe connect ID
    let updateError;
    if (embeddedContext && embeddedContext.embedded && embeddedContext.shop) {
      // For embedded mode, update by shop domain
      const shopDomain = embeddedContext.shop.includes('.myshopify.com') 
        ? embeddedContext.shop 
        : embeddedContext.shop + '.myshopify.com';
      const { error } = await supabase
        .from('brands')
        .update({ 
          stripe_connect_id: connectedAccountId,
          updated_at: new Date().toISOString()
        })
        .eq('shopify_domain', shopDomain);
      updateError = error;
    } else {
      // For standalone mode, update by user_id
      const { error } = await supabase
        .from('brands')
        .update({ 
          stripe_connect_id: connectedAccountId,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', session.user.id);
      updateError = error;
    }

    if (updateError) {
      console.error('Error updating brand:', updateError);
      console.error('Update details:', {
        userId: session.user.id,
        stripeAccountId: connectedAccountId,
        errorCode: updateError.code,
        errorMessage: updateError.message,
        errorDetails: updateError.details
      });

      const errorUrl = embeddedContext && embeddedContext.embedded 
        ? `${process.env.NEXT_PUBLIC_APP_URL}/stripe-connect-success?shop=${embeddedContext.shop}&host=${encodeURIComponent(embeddedContext.host)}&error=update_failed`
        : '/dashboard/settings?error=update_failed'
      return NextResponse.redirect(embeddedContext && embeddedContext.embedded ? errorUrl : new URL(errorUrl, request.url));
    }

    console.log('Successfully updated brand with Stripe connect ID');

    // Redirect back to the appropriate dashboard
    if (embeddedContext && embeddedContext.embedded) {
      // For embedded mode, redirect back to the Shopify admin with success message
      // Extract the host from the referer URL if available
      const referer = request.headers.get('referer')
      let shopifyHost = embeddedContext.host
      
      if (referer && (!shopifyHost || shopifyHost === 'unknown')) {
        try {
          const refererUrl = new URL(referer)
          const hostParam = refererUrl.searchParams.get('host')
          if (hostParam) {
            shopifyHost = hostParam
          }
        } catch (error) {
          console.error('Error parsing referer URL:', error)
        }
      }
      
      // Redirect back to Shopify admin dashboard with success message
      if (shopifyHost && shopifyHost !== 'unknown') {
        const shopifyRedirectUrl = `https://${Buffer.from(shopifyHost, 'base64').toString()}/apps/${process.env.SHOPIFY_API_KEY}?success=stripe_connected`
        console.log('Redirecting to Shopify admin:', shopifyRedirectUrl)
        return NextResponse.redirect(shopifyRedirectUrl)
      } else {
        // Fallback to standalone success page if we can't determine the Shopify host
        const successPageUrl = `${process.env.NEXT_PUBLIC_APP_URL}/stripe-connect-success?shop=${embeddedContext.shop}&success=stripe_connected`
        console.log('Fallback redirect to standalone success page:', successPageUrl)
        return NextResponse.redirect(successPageUrl)
      }
    } else {
      // Redirect back to standalone dashboard
      return NextResponse.redirect(new URL('/dashboard/settings?success=stripe_connected', request.url))
    }
  } catch (error) {
    console.error('Error in Stripe Connect callback:', error)
    // Note: embeddedContext might not be available if error occurred early
    return NextResponse.redirect(new URL('/dashboard/settings?error=internal_error', request.url))
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check for embedded mode authentication via Bearer token
    const authHeader = request.headers.get('authorization')
    let brandData = null

    let requestBody = null
    
    if (authHeader?.startsWith('Bearer ')) {
      // Embedded mode: Get shop from session token and find brand by shop domain
      const sessionToken = authHeader.substring(7)
      
      // Validate the session token (you might want to add proper validation here)
      if (!sessionToken) {
        return NextResponse.json({ error: 'Invalid session token' }, { status: 401 })
      }

      // For embedded mode, we need to get the shop from request or decode from token
      // For now, let's check if there's a way to get the shop domain
      requestBody = await request.json().catch(() => ({}))
      const shop = requestBody.shop || request.headers.get('x-shopify-shop-domain')
      
      if (!shop) {
        // Try to decode shop from the URL parameters that might be in referer
        const referer = request.headers.get('referer')
        if (referer) {
          const url = new URL(referer)
          const shopParam = url.searchParams.get('shop')
          if (shopParam) {
                      const { data, error } = await supabase
            .from('brands')
            .select('id, stripe_connect_id')
            .eq('shopify_domain', shopParam)
            .single()

            if (error) {
              console.error('Brand not found for shop:', shopParam, error)
              return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
            }
            brandData = data
          }
        }
        
        if (!brandData) {
          return NextResponse.json({ error: 'Shop domain required for embedded mode' }, { status: 400 })
        }
      } else {
        const { data, error } = await supabase
          .from('brands')
          .select('id, stripe_connect_id')
          .eq('shopify_domain', shop)
          .single()

        if (error) {
          console.error('Brand not found for shop:', shop, error)
          return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
        }
        brandData = data
      }

    } else {
      // Standalone mode: Use traditional session-based authentication
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // Get the brand by user_id
      const { data, error } = await supabase
        .from('brands')
        .select('id, stripe_connect_id')
        .eq('user_id', session.user.id)
        .single()

      if (error) {
        console.error('Brand not found for user:', session.user.id, error)
        return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
      }
      brandData = data
    }

    // For embedded mode, we need to preserve the context for the callback
    let stripeOAuthParams: any = {
      client_id: process.env.STRIPE_CONNECT_CLIENT_ID!,
      response_type: 'code',
      scope: 'read_write',
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/connect`,
    }
    
    if (authHeader?.startsWith('Bearer ')) {
      // Store embedded mode context in the state parameter
      const shop = requestBody?.shop || request.headers.get('x-shopify-shop-domain')
      let host = requestBody?.host || request.headers.get('x-shopify-host')
      
      // Try to extract host from referer URL if not provided
      if (!host) {
        const referer = request.headers.get('referer')
        if (referer) {
          try {
            const refererUrl = new URL(referer)
            const hostParam = refererUrl.searchParams.get('host')
            if (hostParam) {
              host = hostParam
            }
          } catch (error) {
            console.error('Error parsing referer for host:', error)
          }
        }
      }
      
      console.log('Embedded mode Stripe Connect request:', {
        shop,
        host,
        hasRequestBody: !!requestBody,
        requestBodyKeys: requestBody ? Object.keys(requestBody) : [],
        headers: {
          'x-shopify-shop-domain': request.headers.get('x-shopify-shop-domain'),
          'x-shopify-host': request.headers.get('x-shopify-host'),
          referer: request.headers.get('referer')
        }
      });
    
      if (shop) {
        const embeddedContext = {
          embedded: true,
          shop,
          host: host || 'unknown' // Make host optional
        }
        const state = Buffer.from(JSON.stringify(embeddedContext)).toString('base64')
        stripeOAuthParams.state = state
        console.log('Created state parameter for embedded mode:', { embeddedContext, state });
      } else {
        console.error('No shop parameter found for embedded mode');
      }
    }

    // Create a Stripe Connect OAuth link
    const stripeUrl = stripe.oauth.authorizeUrl(stripeOAuthParams)

    return NextResponse.json({ url: stripeUrl })
  } catch (error) {
    console.error('Error creating Stripe Connect link:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

