import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    // Basic admin authentication - you should enhance this with proper security
    const adminUsername = process.env.ADMIN_USERNAME || 'admin'
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'

    if (username === adminUsername && password === adminPassword) {
      // Generate a simple token (in production, use proper JWT)
      const token = Buffer.from(`${username}:${Date.now()}`).toString('base64')
      
      return NextResponse.json({ 
        success: true, 
        token,
        message: 'Login successful' 
      })
    } else {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json(
      { success: false, message: 'Login failed' },
      { status: 500 }
    )
  }
}
