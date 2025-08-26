'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { 
  ShoppingBagIcon,
  ChartBarIcon,
  CreditCardIcon,
  Cog6ToothIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  EyeIcon,
  PlusIcon,
  BanknotesIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  HeartIcon,
  ShoppingCartIcon,
  LinkIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'

// Types
interface BrandProfile {
  id: string
  name: string
  stripe_connect_id: string | null
  shopify_connected: boolean
  products_count: number
  shopify_domain?: string
  shopify_access_token?: string
}

interface Order {
  id: string
  order_id: string
  shopify_order_id?: string
  total_amount: number
  commission_amount: number
  status: string
  fulfillment_status?: string
  created_at: string
  shipping_address?: any
}

interface Product {
  id: string
  title: string
  price: number
  image_url?: string
  created_at: string
  views?: number
  likes?: number
  totalSales?: number
  totalRevenue?: number
  engagementScore?: number
}

// Setup Checklist Component
interface SetupChecklistProps {
  hasProducts: boolean
  hasShipping: boolean
  hasStripeConnected: boolean
  hasShopifyConnected: boolean
  onRefresh: () => void
}

const SetupChecklist = ({ hasProducts, hasShipping, hasStripeConnected, hasShopifyConnected, onRefresh }: SetupChecklistProps) => {
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)

  const completedItems = [hasProducts, hasShipping, hasStripeConnected, hasShopifyConnected].filter(Boolean).length
  const totalItems = 4
  const isComplete = completedItems === totalItems

  const handleSyncShipping = async () => {
    setIsSyncing(true)
    setSyncError(null)
    setSyncMessage(null)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: brandData, error } = await supabase
        .from('brands')
        .select('id, shopify_access_token, shopify_domain')
        .eq('user_id', user.id)
        .single()

      if (error || !brandData) throw new Error('Brand not found')

      const response = await fetch('/api/shopify/sync-shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: brandData.id,
          accessToken: brandData.shopify_access_token,
          shop: brandData.shopify_domain,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to sync shipping zones')

      setSyncMessage('Shipping synced successfully!')
      setTimeout(() => setSyncMessage(null), 3000)
      onRefresh()
    } catch (error) {
      console.error('Error syncing shipping:', error)
      setSyncError(error instanceof Error ? error.message : 'Failed to sync shipping zones')
      setTimeout(() => setSyncError(null), 5000)
    } finally {
      setIsSyncing(false)
    }
  }

  const handleStripeConnect = async () => {
    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }

      const response = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to create Stripe Connect link')

      window.location.href = data.url
    } catch (error) {
      console.error('Error connecting Stripe:', error)
      setSyncError(error instanceof Error ? error.message : 'Failed to connect Stripe')
    }
  }

  if (isComplete) {
    return (
      <div className="bg-shopscope-gray-50 border border-shopscope-gray-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 bg-shopscope-black rounded-full animate-pulse" />
          <h3 className="font-semibold text-shopscope-black">Ready to Sell on Mobile!</h3>
        </div>
        <p className="text-xs text-shopscope-gray-600">Your brand is live on ShopScope mobile marketplace.</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-shopscope-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-shopscope-black">Setup Progress</h3>
        <span className="text-xs bg-shopscope-gray-100 text-shopscope-gray-600 px-2 py-1 rounded-full">
          {completedItems}/{totalItems}
        </span>
      </div>
      
      {syncMessage && (
        <div className="mb-3 p-2 bg-shopscope-gray-50 border border-shopscope-gray-200 rounded-lg">
          <p className="text-xs text-shopscope-black">{syncMessage}</p>
        </div>
      )}

      {syncError && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-red-700">{syncError}</p>
        </div>
      )}
      
      <div className="space-y-3">
        <ChecklistItem
          completed={hasShopifyConnected}
          title="Connect Shopify"
          description="Sync orders & inventory"
          href="/auth/connect-shopify"
          icon={<LinkIcon className="w-4 h-4" />}
        />
        
        <ChecklistItem
          completed={hasProducts}
          title="Sync Products"
          description="Import products from Shopify"
          href="/dashboard/products"
          icon={<ShoppingBagIcon className="w-4 h-4" />}
        />
        
        <ChecklistItem
          completed={hasShipping}
          title={isSyncing ? "Syncing..." : "Configure Shipping"}
          description="Set up shipping rates"
          href="/dashboard/settings"
          onClick={!hasShipping ? handleSyncShipping : undefined}
          isLoading={isSyncing}
          icon={<LinkIcon className="w-4 h-4" />}
        />
        
        <ChecklistItem
          completed={hasStripeConnected}
          title="Connect Stripe"
          description="Receive mobile payments"
          href="/dashboard/settings"
          onClick={!hasStripeConnected ? handleStripeConnect : undefined}
          icon={<CreditCardIcon className="w-4 h-4" />}
        />
      </div>
      
      {/* Progress Bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-shopscope-gray-500 mb-1">
          <span>Setup Progress</span>
          <span>{Math.round((completedItems / totalItems) * 100)}%</span>
        </div>
        <div className="w-full bg-shopscope-gray-200 rounded-full h-1.5">
          <div 
            className="bg-shopscope-black h-1.5 rounded-full transition-all duration-300" 
            style={{ width: `${(completedItems / totalItems) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}

interface ChecklistItemProps {
  completed: boolean
  title: string
  description: string
  href: string
  icon: React.ReactNode
  onClick?: () => void
  isLoading?: boolean
}

const ChecklistItem = ({ completed, title, description, href, icon, onClick, isLoading }: ChecklistItemProps) => {
  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      window.location.href = href
    }
  }

  if (completed) {
    return (
      <div className="flex items-center gap-3 p-2 rounded-lg bg-shopscope-gray-50">
        <div className="w-5 h-5 bg-shopscope-black rounded-full flex items-center justify-center flex-shrink-0">
          <CheckCircleIcon className="w-3 h-3 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-shopscope-black">{title}</div>
          <div className="text-xs text-shopscope-gray-600">{description}</div>
        </div>
      </div>
    )
  }

  return (
    <button 
      onClick={handleClick}
      disabled={isLoading}
      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-shopscope-gray-50 transition-colors group disabled:opacity-50"
    >
      <div className="w-5 h-5 border-2 border-shopscope-gray-300 rounded-full flex items-center justify-center flex-shrink-0 group-hover:border-shopscope-black">
        <div className="text-shopscope-gray-400 group-hover:text-shopscope-black">
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-shopscope-gray-600" />
          ) : (
            icon
          )}
        </div>
      </div>
      <div className="flex-1 min-w-0 text-left">
        <div className="text-sm font-medium text-shopscope-black group-hover:text-shopscope-black">{title}</div>
        <div className="text-xs text-shopscope-gray-500">{description}</div>
      </div>
      <ArrowRightIcon className="w-4 h-4 text-shopscope-gray-400 group-hover:text-shopscope-black" />
    </button>
  )
}

// StatCard Component
const StatCard = ({ 
  title, 
  value, 
  icon,
  trend
}: { 
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: { value: number; isPositive: boolean }
}) => (
  <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm text-shopscope-gray-600 font-medium">{title}</span>
      <div className="text-shopscope-gray-400">{icon}</div>
    </div>
    <div className="text-2xl font-bold text-shopscope-black mb-2">{value}</div>
    {trend && (
      <div className="flex items-center text-xs">
        {trend.isPositive ? (
          <ArrowTrendingUpIcon className="w-3 h-3 text-green-600 mr-1" />
        ) : (
          <ArrowTrendingDownIcon className="w-3 h-3 text-red-600 mr-1" />
        )}
        <span className={trend.isPositive ? 'text-green-600' : 'text-red-600'}>
          {Math.abs(trend.value)}% from last month
        </span>
      </div>
    )}
  </div>
)

// QuickActionCard Component
const QuickActionCard = ({
  title,
  description,
  icon,
  href
}: {
  title: string
  description: string
  icon: React.ReactNode
  href: string
}) => (
  <Link href={href} className="block group">
    <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200 hover:border-shopscope-black hover:shadow-md transition-all">
      <div className="flex items-center gap-4 mb-3">
        <div className="text-shopscope-gray-400 group-hover:text-shopscope-black transition-colors">
          {icon}
        </div>
        <h3 className="font-medium text-shopscope-black group-hover:text-shopscope-black">{title}</h3>
      </div>
      <p className="text-sm text-shopscope-gray-600">{description}</p>
    </div>
  </Link>
)

// AlertBanner Component
const AlertBanner = ({ 
  message, 
  actionText, 
  actionHref,
  type = 'warning'
}: { 
  message: string
  actionText: string
  actionHref: string
  type?: 'warning' | 'info'
}) => (
  <div className={`border-l-4 p-4 mb-4 rounded-r-lg ${
    type === 'warning' 
      ? 'bg-yellow-50 border-yellow-400' 
      : 'bg-blue-50 border-blue-400'
  }`}>
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <ExclamationTriangleIcon className={`h-5 w-5 mr-3 ${
          type === 'warning' ? 'text-yellow-600' : 'text-blue-600'
        }`} />
        <p className={`text-sm ${
          type === 'warning' ? 'text-yellow-800' : 'text-blue-800'
        }`}>{message}</p>
      </div>
      <Link
        href={actionHref}
        className={`ml-4 text-sm font-medium underline hover:no-underline transition-all ${
          type === 'warning' ? 'text-yellow-800' : 'text-blue-800'
        }`}
      >
        {actionText} →
      </Link>
    </div>
  </div>
)

export default function DashboardPage() {
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [topProducts, setTopProducts] = useState<Product[]>([])
  const [hasShipping, setHasShipping] = useState(false)
  const [setupChecklistKey, setSetupChecklistKey] = useState(0)

  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalSales: 0,
    commission: 0,
    netRevenue: 0,
    productLikes: 0,
    productViews: 0,
    totalProducts: 0,
    pendingPayouts: 0,
    monthlyRevenue: {
      current: 0,
      previous: 0
    }
  })

  const refreshSetupChecklist = () => {
    setSetupChecklistKey(prev => prev + 1)
  }

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // First try to get the current user
        let { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          // Try to refresh the session
          const { data: { session }, error: refreshError } = await supabase.auth.getSession()
          
          if (refreshError || !session?.user) {
            console.error('Authentication failed:', userError)
            setAuthError('Not authenticated. Please sign in.')
            setIsLoading(false)
            return
          }
          
          user = session.user
        }

        console.log('✅ User authenticated:', user.email)

        // Check for pending Stripe connection and complete it
        try {
          const response = await fetch('/api/stripe/connect', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
            }
          })
          
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.stripe_connect_id) {
              console.log('✅ Completed pending Stripe connection:', data.stripe_connect_id)
              // Refresh the page to show updated status
              window.location.reload()
              return
            }
          }
        } catch (error) {
          console.log('No pending Stripe connection or error:', error)
        }

        // Get brand data
        const { data: brandData, error: brandError } = await supabase
          .from('brands')
          .select('id, name, stripe_connect_id, shopify_connected, shopify_domain, shopify_access_token, user_id')
          .eq('user_id', user.id)
          .single()

        if (brandError || !brandData) {
          setAuthError('Brand not found. Please complete your setup.')
          setIsLoading(false)
          return
        }

        // Check if brand is properly set up
        if (!brandData.name) {
          console.log('⚠️ Brand not properly set up, redirecting to setup')
          window.location.href = '/dashboard/settings'
          return
        }

        // Get products count
        const { count: productsCount, error: productsError } = await supabase
          .from('products')
          .select('id', { count: 'exact' })
          .eq('brand_id', brandData.id)

        if (productsError) throw productsError

        // Get analytics summary for engagement stats - 30 days
        const endDate = new Date().toISOString().split('T')[0]
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        
        const { data: analyticsData, error: analyticsError } = await supabase
          .rpc('get_brand_analytics_summary', {
            p_brand_id: brandData.id,
            p_start_date: startDate,
            p_end_date: endDate
          })

        const summary = analyticsData?.[0] || {
          total_revenue: 0,
          total_sales: 0,
          product_views: 0,
          product_likes: 0
        }

        // Fallback: Get data directly from events table if functions don't return data
        let fallbackSummary = summary
        if (!summary.product_views && !summary.product_likes) {
          const { data: events, error: eventsError } = await supabase
            .from('brand_analytics_events')
            .select('event_type, created_at')
            .eq('brand_id', brandData.id)
            .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

          if (!eventsError && events) {
            const viewEvents = events.filter((e: any) => e.event_type === 'product_view')
            const likeEvents = events.filter((e: any) => e.event_type === 'product_swipe_right')
            
            fallbackSummary = {
              ...summary,
              product_views: viewEvents.length,
              product_likes: likeEvents.length
            }
          }
        }

        const productViews = fallbackSummary.product_views || 0
        const productLikes = fallbackSummary.product_likes || 0

        // Get monthly revenue using merchant_orders
        const now = new Date()
        const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0)

        // Get merchant orders for current month
        const { data: currentMonthMerchantOrders, error: currentMonthError } = await supabase
          .from('merchant_orders')
          .select('order_id, total_amount')
          .eq('merchant_id', brandData.id)
          .gte('created_at', startOfCurrentMonth.toISOString())
          .lte('created_at', now.toISOString())

        // Get merchant orders for previous month
        const { data: previousMonthMerchantOrders, error: previousMonthError } = await supabase
          .from('merchant_orders')
          .select('order_id, total_amount')
          .eq('merchant_id', brandData.id)
          .gte('created_at', startOfPreviousMonth.toISOString())
          .lte('created_at', endOfPreviousMonth.toISOString())

        if (currentMonthError || previousMonthError) {
          console.error('Monthly orders error:', currentMonthError || previousMonthError)
        }

        // Get pending payouts
        const { data: pendingPayouts, error: payoutsError } = await supabase
          .rpc('get_pending_payout_amount', { brand_id: brandData.id })

        if (payoutsError) {
          console.error('Payouts error:', payoutsError)
        }

        // Get recent orders
        const { data: recentMerchantOrders } = await supabase
          .from('merchant_orders')
          .select(`
            id,
            order_id,
            shopify_order_id,
            total_amount,
            commission_amount,
            status,
            fulfillment_status,
            created_at,
            shipping_address
          `)
          .eq('merchant_id', brandData.id)
          .order('created_at', { ascending: false })
          .limit(5)

        // Get top products with engagement data
        const { data: products } = await supabase
          .from('products')
          .select(`
            id,
            title,
            price,
            image_url,
            created_at
          `)
          .eq('brand_id', brandData.id)
          .limit(10)

        // Calculate engagement for products
        let productsWithEngagement: Product[] = []
        if (products && products.length > 0) {
          const productIds = products.map(p => p.id)
          
          // Get analytics events for these products
          const { data: productEvents } = await supabase
            .from('brand_analytics_events')
            .select('product_id, event_type')
            .eq('brand_id', brandData.id)
            .in('product_id', productIds)
            .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

          // Get order items for sales data
          const { data: productSales } = await supabase
            .from('order_items')
            .select('product_id, quantity, total_price')
            .in('product_id', productIds)

          // Calculate engagement metrics for each product
          productsWithEngagement = products.map((product: any) => {
            const events = productEvents?.filter(e => e.product_id === product.id) || []
            const sales = productSales?.filter(s => s.product_id === product.id) || []
            
            const views = events.filter(e => e.event_type === 'product_view').length
            const likes = events.filter(e => e.event_type === 'product_swipe_right').length
            const totalSales = sales.reduce((sum, sale) => sum + (sale.quantity || 0), 0)
            const totalRevenue = sales.reduce((sum, sale) => sum + (sale.total_price || 0), 0)
            
            // Calculate engagement score (views + likes*2 + sales*5)
            const engagementScore = views + (likes * 2) + (totalSales * 5)
            
            return {
              ...product,
              views,
              likes,
              totalSales,
              totalRevenue,
              engagementScore
            }
          })

          // Sort by engagement score and take top 5
          productsWithEngagement.sort((a, b) => b.engagementScore - a.engagementScore)
          productsWithEngagement = productsWithEngagement.slice(0, 5)
        }

        // Calculate monthly revenue
        let currentMonthRevenue = 0
        let previousMonthRevenue = 0

        if (currentMonthMerchantOrders && currentMonthMerchantOrders.length > 0) {
          currentMonthRevenue = currentMonthMerchantOrders.reduce((sum: number, mo: any) => sum + (mo.total_amount || 0), 0)
        }

        if (previousMonthMerchantOrders && previousMonthMerchantOrders.length > 0) {
          previousMonthRevenue = previousMonthMerchantOrders.reduce((sum: number, mo: any) => sum + (mo.total_amount || 0), 0)
        }

        // Calculate total revenue from all merchant orders
        const { data: allMerchantOrders } = await supabase
          .from('merchant_orders')
          .select('order_id, total_amount')
          .eq('merchant_id', brandData.id)

        let totalRevenue = 0
        let totalOrders = 0
        
        if (allMerchantOrders && allMerchantOrders.length > 0) {
          totalRevenue = allMerchantOrders.reduce((sum: number, mo: any) => sum + (mo.total_amount || 0), 0)
          totalOrders = allMerchantOrders.length
        }

        const commission = totalRevenue * 0.10 // 10% commission
        const netRevenue = totalRevenue - commission

        setBrandProfile({
          id: brandData.id,
          name: brandData.name,
          stripe_connect_id: brandData.stripe_connect_id,
          shopify_connected: brandData.shopify_connected,
          products_count: productsCount || 0
        })

        setStats({
          totalRevenue,
          totalSales: totalOrders,
          commission,
          netRevenue,
          productLikes: productLikes,
          productViews: productViews,
          totalProducts: productsCount || 0,
          pendingPayouts: (payoutsError ? 0 : pendingPayouts) || 0,
          monthlyRevenue: {
            current: currentMonthRevenue,
            previous: previousMonthRevenue
          }
        })

        setRecentOrders(recentMerchantOrders || [])
        setTopProducts(productsWithEngagement)
        setIsLoading(false)

      } catch (error) {
        console.error('Error fetching dashboard data:', error)
        setAuthError('Failed to load dashboard data. Please try again.')
        setIsLoading(false)
      }
    }

    fetchDashboardData()

    // Set up session refresh every 5 minutes
    const sessionRefreshInterval = setInterval(async () => {
      try {
        await supabase.auth.refreshSession()
      } catch (error) {
        console.error('Error refreshing session:', error)
      }
    }, 5 * 60 * 1000) // 5 minutes

    return () => clearInterval(sessionRefreshInterval)
  }, [])

  // Check shipping zones whenever brand profile changes
  useEffect(() => {
    async function checkShippingZones() {
      if (!brandProfile?.id) return
      
      try {
        const { data: shippingZones, error } = await supabase
          .from('shipping_zones')
          .select('id')
          .eq('brand_id', brandProfile.id)
          .limit(1)

        if (error) {
          console.error('Error checking shipping zones:', error)
          setHasShipping(false)
          return
        }

        setHasShipping(shippingZones && shippingZones.length > 0)
      } catch (error) {
        console.error('Error checking shipping zones:', error)
        setHasShipping(false)
      }
    }

    checkShippingZones()
  }, [brandProfile?.id, setupChecklistKey])

  // Show authentication error if any
  if (authError) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl max-w-md">
          <h2 className="font-medium mb-2">Authentication Error</h2>
          <p className="mb-4">{authError}</p>
          <div className="flex gap-2">
            <button 
              onClick={() => window.location.reload()} 
              className="text-sm underline hover:no-underline"
            >
              Try again
            </button>
            <span className="text-sm">or</span>
            <button 
              onClick={() => window.location.href = '/auth/login'} 
              className="text-sm underline hover:no-underline"
            >
              Sign in
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-shopscope-black mb-4" />
          <p className="text-shopscope-gray-600">Loading your mobile marketplace data...</p>
        </div>
      </div>
    )
  }

  // Calculate growth trends
  const revenueGrowth = stats.monthlyRevenue.previous > 0 
    ? ((stats.monthlyRevenue.current - stats.monthlyRevenue.previous) / stats.monthlyRevenue.previous) * 100
    : 0

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-shopscope-black mb-2">Welcome, {brandProfile?.name}</h1>
          <p className="text-shopscope-gray-600">Here's how your mobile presence is performing on ShopScope</p>
        </div>
        
        {/* Setup Checklist - Top Right */}
        <SetupChecklist 
          key={setupChecklistKey}
          hasProducts={(brandProfile?.products_count || 0) > 0}
          hasShipping={hasShipping}
          hasStripeConnected={!!brandProfile?.stripe_connect_id}
          hasShopifyConnected={!!brandProfile?.shopify_connected}
          onRefresh={refreshSetupChecklist}
        />
      </div>

      {/* Alert Banners */}
      <div className="mb-8">
        {(brandProfile?.products_count || 0) === 0 && (
          <AlertBanner
            message="You haven't synced any products yet. Sync your products to start selling on ShopScope mobile."
            actionText="Sync Products"
            actionHref="/dashboard/products"
            type="warning"
          />
        )}
        
        {!brandProfile?.stripe_connect_id && (
          <AlertBanner
            message="Connect your Stripe account to receive payments from mobile shoppers."
            actionText="Connect Stripe"
            actionHref="/dashboard/settings"
            type="warning"
          />
        )}
        
        {brandProfile?.products_count && brandProfile.products_count > 0 && brandProfile?.stripe_connect_id && (
          <AlertBanner
            message="Your products are now live on ShopScope mobile! Track your mobile engagement below."
            actionText="View Mobile App"
            actionHref="/demo"
            type="info"
          />
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Revenue"
          value={`$${stats.totalRevenue.toFixed(2)}`}
          icon={<BanknotesIcon className="w-5 h-5" />}
          trend={revenueGrowth !== 0 ? { value: Math.abs(revenueGrowth), isPositive: revenueGrowth > 0 } : undefined}
        />
        <StatCard
          title="Total Orders"
          value={`${stats.totalSales} orders`}
          icon={<ShoppingCartIcon className="w-5 h-5" />}
        />
        <StatCard
          title="Commission (10%)"
          value={`$${stats.commission.toFixed(2)}`}
          icon={<ChartBarIcon className="w-5 h-5" />}
        />
        <StatCard
          title="Net Revenue"
          value={`$${stats.netRevenue.toFixed(2)}`}
          icon={<ArrowTrendingUpIcon className="w-5 h-5" />}
        />
        <StatCard
          title="Mobile Likes"
          value={stats.productLikes.toLocaleString()}
          icon={<HeartIcon className="w-5 h-5" />}
        />
        <StatCard
          title="Mobile Views"
          value={stats.productViews.toLocaleString()}
          icon={<EyeIcon className="w-5 h-5" />}
        />
        <StatCard
          title="Total Products"
          value={stats.totalProducts.toLocaleString()}
          icon={<ShoppingBagIcon className="w-5 h-5" />}
        />
        <StatCard
          title="Pending Payouts"
          value={`$${stats.pendingPayouts.toFixed(2)}`}
          icon={<ClockIcon className="w-5 h-5" />}
        />
      </div>

      {/* Monthly Revenue Chart */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200 mb-8">
        <h2 className="text-xl font-semibold text-shopscope-black mb-6">Monthly Mobile Revenue</h2>
        <div className="flex items-center gap-8 text-sm text-shopscope-gray-600 mb-6">
          <div>
            <span className="block mb-1">This Month</span>
            <div className="font-bold text-2xl text-shopscope-black">${stats.monthlyRevenue.current.toFixed(2)}</div>
          </div>
          <div>
            <span className="block mb-1">Last Month</span>
            <div className="font-bold text-2xl text-shopscope-black">${stats.monthlyRevenue.previous.toFixed(2)}</div>
          </div>
          {revenueGrowth !== 0 && (
            <div className={`flex items-center ${revenueGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {revenueGrowth > 0 ? (
                <ArrowTrendingUpIcon className="w-4 h-4 mr-1" />
              ) : (
                <ArrowTrendingDownIcon className="w-4 h-4 mr-1" />
              )}
              <span className="font-medium">{Math.abs(revenueGrowth).toFixed(1)}% {revenueGrowth > 0 ? 'growth' : 'decline'}</span>
            </div>
          )}
        </div>
        <div className="h-[120px] flex items-end justify-between gap-4">
          <div className="flex-1 flex flex-col items-center">
            <div 
              className="w-full bg-shopscope-black rounded-t transition-all duration-500" 
              style={{ 
                height: `${Math.max(stats.monthlyRevenue.current, stats.monthlyRevenue.previous) > 0 
                  ? (stats.monthlyRevenue.current / Math.max(stats.monthlyRevenue.current, stats.monthlyRevenue.previous)) * 100 
                  : 10}%` 
              }}
            />
            <span className="text-xs text-shopscope-gray-500 mt-2">This Month</span>
          </div>
          <div className="flex-1 flex flex-col items-center">
            <div 
              className="w-full bg-shopscope-gray-300 rounded-t transition-all duration-500" 
              style={{ 
                height: `${Math.max(stats.monthlyRevenue.current, stats.monthlyRevenue.previous) > 0 
                  ? (stats.monthlyRevenue.previous / Math.max(stats.monthlyRevenue.current, stats.monthlyRevenue.previous)) * 100 
                  : 10}%` 
              }}
            />
            <span className="text-xs text-shopscope-gray-500 mt-2">Last Month</span>
          </div>
        </div>
      </div>

      {/* Recent Orders & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-shopscope-black">Recent Mobile Orders</h2>
            <Link href="/dashboard/orders" className="text-sm text-shopscope-gray-600 hover:text-shopscope-black font-medium">
              View all →
            </Link>
          </div>
          {recentOrders.length > 0 ? (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between py-3 border-b border-shopscope-gray-100 last:border-b-0">
                  <div>
                    <div className="font-medium text-sm text-shopscope-black">
                      {order.shopify_order_id || `ORD-${order.order_id.slice(0, 8)}`}
                    </div>
                    <div className="text-xs text-shopscope-gray-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-sm text-shopscope-black">
                      ${(order.total_amount || 0).toFixed(2)}
                    </div>
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      order.status === 'completed' ? 'bg-green-100 text-green-800' :
                      order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                      'bg-shopscope-gray-100 text-shopscope-gray-800'
                    }`}>
                      {order.status || 'pending'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-shopscope-gray-600 text-center py-8">
              No orders yet from mobile shoppers
            </div>
          )}
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-shopscope-black">Top Mobile Products</h2>
            <Link href="/dashboard/products" className="text-sm text-shopscope-gray-600 hover:text-shopscope-black font-medium">
              View all →
            </Link>
          </div>
          {topProducts.length > 0 ? (
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div key={product.id} className="flex items-center gap-4 py-3 border-b border-shopscope-gray-100 last:border-b-0">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-shopscope-gray-100 rounded-lg flex items-center justify-center border border-shopscope-gray-200">
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.title}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <ShoppingBagIcon className="w-6 h-6 text-shopscope-gray-400" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-shopscope-black truncate">
                      {product.title}
                    </div>
                    <div className="text-xs text-shopscope-gray-500">
                      ${product.price?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-shopscope-gray-500 mb-1">
                      {product.views || 0} views • {product.likes || 0} likes
                    </div>
                    <div className="font-medium text-sm text-shopscope-black">
                      {product.totalSales || 0} sold
                    </div>
                    {(product.totalRevenue || 0) > 0 && (
                      <div className="text-xs text-green-600">
                        ${product.totalRevenue?.toFixed(2)} revenue
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-shopscope-gray-600 text-center py-8">
              {brandProfile?.products_count === 0 ? (
                <div>
                  <p className="mb-2">No products synced yet</p>
                  <Link 
                    href="/dashboard/products" 
                    className="text-shopscope-black hover:underline font-medium"
                  >
                    Sync your first product →
                  </Link>
                </div>
              ) : (
                'No engagement data yet from mobile users'
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-shopscope-black mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <QuickActionCard
            title="Manage Products"
            description="View and optimize your mobile product listings"
            href="/dashboard/products"
            icon={<ShoppingBagIcon className="w-6 h-6" />}
          />
          <QuickActionCard
            title="Track Mobile Orders"
            description="Monitor orders from mobile shoppers"
            href="/dashboard/orders"
            icon={<ShoppingCartIcon className="w-6 h-6" />}
          />
          <QuickActionCard
            title="Mobile Analytics"
            description="View detailed mobile engagement metrics"
            href="/dashboard/analytics"
            icon={<ChartBarIcon className="w-6 h-6" />}
          />
        </div>
      </div>

      {/* Mobile Performance CTA */}
      <div className="card-dark rounded-xl p-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold mb-2">Ready to reach mobile shoppers?</h3>
            <p className="text-shopscope-gray-300 mb-4">
              Your products are featured in our mobile app where engaged customers discover new brands daily.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link 
                href="/dashboard/analytics" 
                className="bg-white text-shopscope-black px-6 py-3 rounded-lg font-medium hover:bg-shopscope-gray-100 transition-colors shadow-lg"
              >
                View Mobile Analytics
              </Link>
              <Link 
                href="/dashboard/products" 
                className="bg-shopscope-gray-800 text-white px-6 py-3 rounded-lg font-medium hover:bg-shopscope-gray-700 transition-colors"
              >
                Launch Products
              </Link>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
              <ArrowTrendingUpIcon className="w-10 h-10 text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 