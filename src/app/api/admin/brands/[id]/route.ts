import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Basic security check
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, commission_rate, status } = await request.json()
    const brandId = params.id

    // Update brand in database
    const { data, error } = await supabase
      .from('brands')
      .update({
        name,
        commission_rate,
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', brandId)
      .select()

    if (error) {
      console.error('Error updating brand:', error)
      return NextResponse.json(
        { error: 'Failed to update brand' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      brand: data[0],
      message: 'Brand updated successfully' 
    })

  } catch (error) {
    console.error('Brand update error:', error)
    return NextResponse.json(
      { error: 'Failed to update brand' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Basic security check
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const brandId = params.id

    // Check if brand has associated data that should prevent deletion
    const { data: merchantOrders } = await supabase
      .from('merchant_orders')
      .select('id')
      .eq('brand_id', brandId)
      .limit(1)

    if (merchantOrders && merchantOrders.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete brand with existing orders' },
        { status: 400 }
      )
    }

    // Delete brand from database
    const { error } = await supabase
      .from('brands')
      .delete()
      .eq('id', brandId)

    if (error) {
      console.error('Error deleting brand:', error)
      return NextResponse.json(
        { error: 'Failed to delete brand' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: 'Brand deleted successfully' 
    })

  } catch (error) {
    console.error('Brand deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete brand' },
      { status: 500 }
    )
  }
}
