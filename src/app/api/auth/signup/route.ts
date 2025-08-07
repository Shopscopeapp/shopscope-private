import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const { brandName, email, password, shopifyDomain, contactName, phone } = await request.json()

    // Validate required fields
    if (!brandName || !email || !password || !shopifyDomain || !contactName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
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

    // Check if user already exists
    const { data: existingUser, error: userCheckError } = await supabase.auth.admin.getUserByEmail(email)
    
    if (userCheckError && userCheckError.message !== 'User not found') {
      console.error('Error checking existing user:', userCheckError)
      return NextResponse.json(
        { error: 'Error checking user account' },
        { status: 500 }
      )
    }

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Check if brand with this Shopify domain already exists
    const { data: existingBrand, error: brandCheckError } = await supabase
      .from('brands')
      .select('id')
      .eq('shopify_domain', shopifyDomain)
      .single()

    if (brandCheckError && brandCheckError.code !== 'PGRST116') {
      console.error('Error checking existing brand:', brandCheckError)
      return NextResponse.json(
        { error: 'Error checking brand account' },
        { status: 500 }
      )
    }

    if (existingBrand) {
      return NextResponse.json(
        { error: 'Brand with this Shopify domain already exists' },
        { status: 409 }
      )
    }

    // Create the user account
    const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        brand_name: brandName,
        contact_name: contactName,
        phone: phone || null
      }
    })

    if (userError) {
      console.error('Error creating user:', userError)
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      )
    }

    if (!newUser.user) {
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      )
    }

    // Create the brand record
    const { data: newBrand, error: brandError } = await supabase
      .from('brands')
      .insert({
        user_id: newUser.user.id,
        name: brandName,
        contact_email: email,
        contact_name: contactName,
        phone: phone || null,
        shopify_domain: shopifyDomain,
        shopify_connected: false,
        commission_rate: 0.10, // Default 10% commission
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (brandError) {
      console.error('Error creating brand:', brandError)
      // Try to clean up the user account if brand creation fails
      try {
        await supabase.auth.admin.deleteUser(newUser.user.id)
      } catch (cleanupError) {
        console.error('Error cleaning up user after brand creation failure:', cleanupError)
      }
      
      return NextResponse.json(
        { error: 'Failed to create brand account' },
        { status: 500 }
      )
    }

    // Sign in the user to create a session
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (signInError) {
      console.error('Error signing in user after creation:', signInError)
      return NextResponse.json(
        { error: 'Account created but failed to sign in automatically' },
        { status: 500 }
      )
    }

    console.log('✅ Successfully created user and brand:', {
      userId: newUser.user.id,
      brandId: newBrand.id,
      brandName: newBrand.name,
      email: newUser.user.email
    })

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: newUser.user.id,
        email: newUser.user.email
      },
      brand: {
        id: newBrand.id,
        name: newBrand.name,
        shopify_domain: newBrand.shopify_domain
      }
    })

  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
