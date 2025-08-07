import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) {
      console.error('Session validation error:', sessionError)
      return NextResponse.json(
        { error: 'Session validation failed' },
        { status: 500 }
      )
    }

    if (!session?.user) {
      return NextResponse.json(
        { error: 'No active session' },
        { status: 401 }
      )
    }

    // Get the user's brand information
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id, name, shopify_domain, shopify_connected, commission_rate')
      .eq('user_id', session.user.id)
      .single()

    if (brandError && brandError.code !== 'PGRST116') {
      console.error('Error fetching brand:', brandError)
      return NextResponse.json(
        { error: 'Error fetching brand information' },
        { status: 500 }
      )
    }

    console.log('✅ Session validated successfully:', {
      userId: session.user.id,
      email: session.user.email,
      brandId: brand?.id,
      brandName: brand?.name
    })

    return NextResponse.json({
      success: true,
      user: {
        id: session.user.id,
        email: session.user.email
      },
      brand: brand ? {
        id: brand.id,
        name: brand.name,
        shopify_domain: brand.shopify_domain,
        shopify_connected: brand.shopify_connected,
        commission_rate: brand.commission_rate
      } : null
    })

  } catch (error) {
    console.error('Session validation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
