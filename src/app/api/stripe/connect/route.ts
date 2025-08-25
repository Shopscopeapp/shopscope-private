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

    // Get the user's brand ID from Supabase using the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('No authorization header found during Stripe Connect callback')
      const errorUrl = '/auth/login?redirect=/dashboard/settings&stripe_connect=pending'
      return NextResponse.redirect(new URL(errorUrl, request.url))
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Verify the token and get user info
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Invalid token during Stripe Connect callback:', authError)
      const errorUrl = '/auth/login?redirect=/dashboard/settings&stripe_connect=pending'
      return NextResponse.redirect(new URL(errorUrl, request.url))
    }

    console.log('User authenticated, updating brand with Stripe account ID', {
      userId: user.id,
      stripeAccountId: connectedAccountId
    });

    // Find brand by user_id for standalone mode
    const { data: existingBrand, error: fetchError } = await supabase
      .from('brands')
      .select('id, stripe_connect_id')
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      console.error('Error fetching brand:', fetchError);
      const errorUrl = '/dashboard/settings?error=brand_not_found'
      return NextResponse.redirect(new URL(errorUrl, request.url));
    }

    console.log('Found existing brand:', existingBrand);

    // Update the brand's Stripe connect ID
    const { error: updateError } = await supabase
      .from('brands')
      .update({ 
        stripe_connect_id: connectedAccountId,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating brand:', updateError);
      console.error('Update details:', {
        userId: user.id,
        stripeAccountId: connectedAccountId,
        errorCode: updateError.code,
        errorMessage: updateError.message,
        errorDetails: updateError.details
      });

      const errorUrl = '/dashboard/settings?error=update_failed'
      return NextResponse.redirect(new URL(errorUrl, request.url));
    }

    console.log('Successfully updated brand with Stripe connect ID');

    // Redirect back to standalone dashboard
    return NextResponse.redirect(new URL('/dashboard/settings?success=stripe_connected', request.url))
  } catch (error) {
    console.error('Error in Stripe Connect callback:', error)
    return NextResponse.redirect(new URL('/dashboard/settings?error=internal_error', request.url))
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
