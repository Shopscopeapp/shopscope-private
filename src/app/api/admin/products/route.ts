import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface Product {
  id: string
  title: string
  brand_id?: string
  status: string
  created_at: string
  updated_at: string
  description?: string
  price?: number
  sale_price?: number
  inventory_count?: number
  category?: string
  brand?: string
  published_to_shopscope?: boolean
  validation_status?: string
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch products with correct field names
    const { data: products, error } = await supabase
      .from('products')
      .select(`id, title, brand_id, status, created_at, updated_at, description, price, sale_price, inventory_count, category, brand, published_to_shopscope, validation_status`)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Get brand names for enrichment
    const brandIds = Array.from(new Set(products?.map(p => p.brand_id).filter(Boolean) || []))
    
    const { data: brands } = await supabase
      .from('brands')
      .select('id, name')
      .in('id', brandIds)

    const brandMap = new Map<string, string>()
    brands?.forEach(b => brandMap.set(b.id, b.name))

    // Get variant counts for each product
    const productsWithVariants = await Promise.all((products || []).map(async (product: Product) => {
      const { count: variantCount } = await supabase
        .from('product_variants')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', product.id)

      return {
        ...product,
        brand_name: product.brand_id ? brandMap.get(product.brand_id) : product.brand || null,
        variant_count: variantCount || 0
      }
    }))

    return NextResponse.json({ 
      products: productsWithVariants, 
      timestamp: new Date().toISOString() 
    })

  } catch (error) {
    console.error('Admin products fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch products data' }, { status: 500 })
  }
}
