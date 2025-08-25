import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    
    console.log('Stripe Connect callback received:', {
      hasCode: !!code,
      fullUrl: request.url
    });
    
    if (!code) {
      console.error('Missing code parameter in Stripe Connect callback')
      return new NextResponse('Missing code parameter', { status: 400 })
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
      const errorUrl = `/dashboard/settings?error=stripe_token_error&message=${encodeURIComponent(tokenError.message || 'Unknown error')}`
      return NextResponse.redirect(new URL(errorUrl, request.url));
    }

    // Get the connected account ID
    const connectedAccountId = response.stripe_user_id

    if (!connectedAccountId) {
      console.error('Failed to get connected account ID from Stripe response')
      const errorUrl = '/dashboard/settings?error=missing_account_id'
      return NextResponse.redirect(new URL(errorUrl, request.url));
    }

    // Store the Stripe account ID in a cookie for later processing
    // This allows us to complete the connection when the user returns to the app
    const cookieStore = cookies()
    cookieStore.set('stripe_pending_account_id', connectedAccountId, {
      path: '/',
      maxAge: 3600, // 1 hour
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    });

    console.log('Stored pending Stripe account ID in cookie:', connectedAccountId);

    // Redirect to dashboard with success message
    return NextResponse.redirect(new URL('/dashboard?stripe_connect=pending', request.url))
  } catch (error) {
    console.error('Error in Stripe Connect callback:', error)
    return NextResponse.redirect(new URL('/dashboard?error=stripe_connect_failed', request.url))
  }
}

export async function POST(request: Request) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Verify the token and get user info
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Authentication error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if there's a pending Stripe account ID in cookies
    const cookieStore = cookies()
    const pendingAccountId = cookieStore.get('stripe_pending_account_id')?.value

    // If there's a pending account ID, complete the connection
    if (pendingAccountId) {
      console.log('Found pending Stripe account ID:', pendingAccountId);
      
      // Get the brand by user_id
      const { data: brandData, error: fetchError } = await supabase
        .from('brands')
        .select('id, stripe_connect_id')
        .eq('user_id', user.id)
        .single()

      if (fetchError) {
        console.error('Brand not found for user:', user.id, fetchError)
        return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
      }

      // Update the brand's Stripe connect ID
      const { error: updateError } = await supabase
        .from('brands')
        .update({ 
          stripe_connect_id: pendingAccountId,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating brand with Stripe connect ID:', updateError);
        return NextResponse.json({ error: 'Failed to update brand' }, { status: 500 })
      }

      // Clear the pending cookie
      cookieStore.delete('stripe_pending_account_id');
      
      console.log('Successfully connected Stripe account:', pendingAccountId);
      return NextResponse.json({ 
        success: true, 
        message: 'Stripe account connected successfully',
        stripe_connect_id: pendingAccountId
      })
    }

    // Get the brand by user_id
    const { data, error } = await supabase
      .from('brands')
      .select('id, stripe_connect_id')
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('Brand not found for user:', user.id, error)
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    // Create Stripe Connect OAuth parameters for standalone mode
    const stripeOAuthParams: any = {
      client_id: process.env.STRIPE_CONNECT_CLIENT_ID!,
      response_type: 'code',
      scope: 'read_write',
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/connect`,
    }

    // Create a Stripe Connect OAuth link
    const stripeUrl = stripe.oauth.authorizeUrl(stripeOAuthParams)

    return NextResponse.json({ url: stripeUrl })
  } catch (error) {
    console.error('Error creating Stripe Connect link:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
