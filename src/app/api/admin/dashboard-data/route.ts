import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Basic security check - you can enhance this with proper admin authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch comprehensive admin data
    const [
      brandsCount,
      merchantsCount,
      ordersCount,
      productsCount,
      payoutsCount,
      recentOrders,
      recentPayouts,
      recentProducts,
      systemHealth
    ] = await Promise.all([
      // Total counts
      supabase.from('brands').select('*', { count: 'exact', head: true }),
      supabase.from('merchants').select('*', { count: 'exact', head: true }),
      supabase.from('merchant_orders').select('*', { count: 'exact', head: true }),
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('payouts').select('*', { count: 'exact', head: true }),
      
      // Recent activity (last 7 days)
      supabase
        .from('merchant_orders')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      
      supabase
        .from('payouts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      
      supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      
      // System health check
      checkSystemHealth()
    ])

    // Calculate total commission earnings from merchant_orders with time-based breakdowns
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    // Get all commission data
    const commissionResult = await supabase
      .from('merchant_orders')
      .select('commission_amount, created_at')
      .not('commission_amount', 'is', null)

    let totalCommissionEarnings = 0
    let todayCommission = 0
    let thisWeekCommission = 0
    let thisMonthCommission = 0

    if (commissionResult.data) {
      commissionResult.data.forEach(order => {
        const orderDate = new Date(order.created_at)
        const commission = order.commission_amount || 0
        
        totalCommissionEarnings += commission
        
        // Today's commission
        if (orderDate >= startOfDay) {
          todayCommission += commission
        }
        
        // This week's commission
        if (orderDate >= startOfWeek) {
          thisWeekCommission += commission
        }
        
        // This month's commission
        if (orderDate >= startOfMonth) {
          thisMonthCommission += commission
        }
      })
    }

    // Compile stats
    const stats = {
      totalBrands: brandsCount.count || 0,
      totalMerchants: merchantsCount.count || 0,
      totalOrders: ordersCount.count || 0,
      totalProducts: productsCount.count || 0,
      totalPayouts: payoutsCount.count || 0,
      totalCommissionEarnings: totalCommissionEarnings,
      todayCommission: todayCommission,
      thisWeekCommission: thisWeekCommission,
      thisMonthCommission: thisMonthCommission,
      recentOrders: recentOrders.count || 0,
      recentPayouts: recentPayouts.count || 0,
      recentProducts: recentProducts.count || 0,
      databaseSize: await getDatabaseSize(),
      activeConnections: await getActiveConnections(),
      totalTables: await getTotalTables()
    }

    return NextResponse.json({
      stats,
      systemHealth,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Admin dashboard data fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch admin data' },
      { status: 500 }
    )
  }
}

async function checkSystemHealth() {
  try {
    // Check if we can connect to the database
    const { data, error } = await supabase
      .from('brands')
      .select('id')
      .limit(1)

    if (error) {
      return {
        status: 'error' as const,
        message: `Database connection error: ${error.message}`,
        lastChecked: new Date().toISOString()
      }
    }

    // Check for any critical issues
    const criticalChecks = await performCriticalChecks()
    
    if (criticalChecks.hasErrors) {
      return {
        status: 'warning' as const,
        message: `System operational with ${criticalChecks.errorCount} warnings`,
        lastChecked: new Date().toISOString()
      }
    }

    return {
      status: 'healthy' as const,
      message: 'All systems operational',
      lastChecked: new Date().toISOString()
    }

  } catch (error) {
    return {
      status: 'error' as const,
      message: `System check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      lastChecked: new Date().toISOString()
    }
  }
}

async function performCriticalChecks() {
  let errorCount = 0
  const errors: string[] = []

  try {
    // Check for orphaned records
    const { data: orphanedOrders, error: ordersError } = await supabase
      .from('merchant_orders')
      .select('id, brand_id')
      .is('brand_id', null)
      .limit(10)

    if (orphanedOrders && orphanedOrders.length > 0) {
      errorCount++
      errors.push(`${orphanedOrders.length} orders without brand association`)
    }

    // Check for recent failed webhooks (if you have a webhook_logs table)
    // Add more critical checks as needed

  } catch (error) {
    errorCount++
    errors.push('Critical checks failed')
  }

  return { hasErrors: errorCount > 0, errorCount, errors }
}

async function getDatabaseSize(): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('get_database_size')
    if (error || !data) return 'N/A'
    return data
  } catch {
    return 'N/A'
  }
}

async function getActiveConnections(): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_active_connections')
    if (error || !data) return 0
    return data
  } catch {
    return 0
  }
}

async function getTotalTables(): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_total_tables')
    if (error || !data) return 0
    return data
  } catch {
    return 0
  }
}
