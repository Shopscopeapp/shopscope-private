import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Validate email format
    if (!/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Sign in the user
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (signInError) {
      console.error('Login error:', signInError)
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    if (!signInData.user) {
      return NextResponse.json(
        { error: 'Login failed' },
        { status: 500 }
      )
    }

    // Get the user's brand information
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id, name, shopify_domain, shopify_connected')
      .eq('user_id', signInData.user.id)
      .single()

    if (brandError && brandError.code !== 'PGRST116') {
      console.error('Error fetching brand:', brandError)
      return NextResponse.json(
        { error: 'Error fetching brand information' },
        { status: 500 }
      )
    }

    console.log('✅ User logged in successfully:', {
      userId: signInData.user.id,
      email: signInData.user.email,
      brandId: brand?.id,
      brandName: brand?.name
    })

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: signInData.user.id,
        email: signInData.user.email
      },
      brand: brand ? {
        id: brand.id,
        name: brand.name,
        shopify_domain: brand.shopify_domain,
        shopify_connected: brand.shopify_connected
      } : null
    })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

