import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    console.log('🔍 Signup request received')
    const { brandName, email, password, shopifyDomain, contactName, phone } = await request.json()
    console.log('📝 Signup data:', { brandName, email, shopifyDomain, contactName, phone: phone || 'not provided' })

    // Validate required fields
    if (!brandName || !email || !password || !shopifyDomain || !contactName) {
      console.log('❌ Missing required fields:', { brandName, email, password, shopifyDomain, contactName })
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate email format
    if (!/\S+@\S+\.\S+/.test(email)) {
      console.log('❌ Invalid email format:', email)
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate password length
    if (password.length < 8) {
      console.log('❌ Password too short:', password.length)
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Validate Shopify domain format
    if (!shopifyDomain.includes('.myshopify.com')) {
      console.log('❌ Invalid Shopify domain format:', shopifyDomain)
      return NextResponse.json(
        { error: 'Invalid Shopify domain format' },
        { status: 400 }
      )
    }

    console.log('🔐 Creating Supabase client...')
    const supabase = createRouteHandlerClient({ cookies })

    // Create the user account using regular signup
    console.log('👤 Creating user account...')
    const { data: newUser, error: userError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          brand_name: brandName,
          contact_name: contactName,
          phone: phone || null
        }
      }
    })

    if (userError) {
      console.error('❌ Error creating user:', userError)
      console.error('❌ User error details:', {
        message: userError.message,
        status: userError.status,
        name: userError.name
      })
      return NextResponse.json(
        { error: 'Failed to create user account', details: userError.message },
        { status: 500 }
      )
    }

    if (!newUser.user) {
      console.error('❌ No user returned from signup')
      return NextResponse.json(
        { error: 'Failed to create user account - no user returned' },
        { status: 500 }
      )
    }

    console.log('✅ User created successfully:', {
      userId: newUser.user.id,
      email: newUser.user.email,
      emailConfirmed: newUser.user.email_confirmed_at
    })

    // Create the brand record
    console.log('🏢 Creating brand record...')
    // Generate a slug from the brand name
    const generateSlug = (name: string) => {
      return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50) // Limit length
    }

    const brandData = {
      user_id: newUser.user.id,
      name: brandName, // Changed from brand_name to name
      slug: generateSlug(brandName), // Generate slug from brand name
      contact_email: email, // Added contact_email
      contact_phone: phone || null, // Added contact_phone
      shopify_domain: shopifyDomain,
      shopify_access_token: '', // Will be updated when they connect their private app
      commission_rate: 0.10, // Default 10% commission
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    console.log('📋 Brand data to insert:', brandData)
    
    const { data: newBrand, error: brandError } = await supabase
      .from('brands')
      .insert(brandData)
      .select()
      .single()

    if (brandError) {
      console.error('❌ Error creating brand:', brandError)
      console.error('❌ Brand error details:', {
        message: brandError.message,
        code: brandError.code,
        details: brandError.details,
        hint: brandError.hint
      })
      // Note: We can't easily delete the user account from a client-side context
      // The user will need to contact support if this happens
      
      return NextResponse.json(
        { error: 'Failed to create brand account', details: brandError.message },
        { status: 500 }
      )
    }

    console.log('✅ Brand created successfully:', {
      brandId: newBrand.id,
      brandName: newBrand.name,
      shopifyDomain: newBrand.shopify_domain
    })

    // Sign in the user to create a session
    console.log('🔑 Signing in user after creation...')
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (signInError) {
      console.error('❌ Error signing in user after creation:', signInError)
      return NextResponse.json(
        { error: 'Account created but failed to sign in automatically', details: signInError.message },
        { status: 500 }
      )
    }

    console.log('✅ User signed in successfully after creation')

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
    console.error('💥 Unexpected signup error:', error)
    console.error('💥 Error type:', typeof error)
    console.error('💥 Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
