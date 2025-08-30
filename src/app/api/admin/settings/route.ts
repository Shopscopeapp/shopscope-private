import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch current system settings from database
    const { data: settings, error } = await supabase
      .from('system_settings')
      .select('*')
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      throw error
    }

    // Return default settings if none exist
    const defaultSettings = {
      maintenanceMode: false,
      debugMode: false,
      maxLoginAttempts: 5,
      sessionTimeout: 30,
      backupFrequency: 'daily',
      emailNotifications: true
    }

    return NextResponse.json({ 
      settings: settings || defaultSettings,
      timestamp: new Date().toISOString() 
    })
  } catch (error) {
    console.error('Admin settings fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch settings data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const settings = await request.json()

    // Validate settings
    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'Invalid settings data' }, { status: 400 })
    }

    // Check if settings table exists, if not create it
    const { data: tableExists } = await supabase
      .from('system_settings')
      .select('id')
      .limit(1)

    if (!tableExists || tableExists.length === 0) {
      // Create the system_settings table if it doesn't exist
      const { error: createError } = await supabase.rpc('create_system_settings_table')
      if (createError) {
        console.warn('Could not create system_settings table:', createError)
      }
    }

    // Upsert settings
    const { error: upsertError } = await supabase
      .from('system_settings')
      .upsert({
        id: 1, // Single row for system settings
        ...settings,
        updated_at: new Date().toISOString()
      })

    if (upsertError) {
      throw upsertError
    }

    return NextResponse.json({ 
      success: true,
      message: 'Settings saved successfully',
      timestamp: new Date().toISOString() 
    })
  } catch (error) {
    console.error('Admin settings save error:', error)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}
