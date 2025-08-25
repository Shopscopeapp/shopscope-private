'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  ChartBarIcon,
  EyeIcon,
  HeartIcon,
  ShoppingCartIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  DevicePhoneMobileIcon,
  CalendarIcon,
  UserGroupIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'

interface AnalyticsData {
  date: string
  views: number
  likes: number
  orders: number
  revenue: number
}

interface ProductMetrics {
  id: string
  title: string
  views: number
  likes: number
  conversion_rate: number
  sales: number
  revenue: number
  image_url?: string
}

export default function AnalyticsPage() {

  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30')
  const [brandId, setBrandId] = useState<string | null>(null)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([])
  const [topProducts, setTopProducts] = useState<ProductMetrics[]>([])
  
  const [summary, setSummary] = useState({
    totalViews: 0,
    totalLikes: 0,
    totalOrders: 0,
    totalRevenue: 0,
    avgConversionRate: 0,
    avgEngagementRate: 0,
    viewsGrowth: 0,
    likesGrowth: 0,
    ordersGrowth: 0,
    revenueGrowth: 0
  })

  useEffect(() => {
    fetchData()
  }, [dateRange])

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get brand data
      const { data: brandData, error: brandError } = await supabase
        .from('brands')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (brandError || !brandData) return
      setBrandId(brandData.id)

      // Calculate date ranges
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - parseInt(dateRange))
      
      const prevEndDate = new Date(startDate)
      const prevStartDate = new Date(startDate)
      prevStartDate.setDate(prevStartDate.getDate() - parseInt(dateRange))

      // Fetch analytics events for current period
      const { data: currentEvents, error: eventsError } = await supabase
        .from('brand_analytics_events')
        .select('event_type, created_at, product_id')
        .eq('brand_id', brandData.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      if (eventsError) throw eventsError

      // Fetch analytics events for previous period (for comparison)
      const { data: prevEvents } = await supabase
        .from('brand_analytics_events')
        .select('event_type')
        .eq('brand_id', brandData.id)
        .gte('created_at', prevStartDate.toISOString())
        .lte('created_at', prevEndDate.toISOString())

      // Fetch orders for current period
      const { data: currentOrders } = await supabase
        .from('merchant_orders')
        .select('total_amount, created_at')
        .eq('merchant_id', brandData.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      // Fetch orders for previous period
      const { data: prevOrders } = await supabase
        .from('merchant_orders')
        .select('total_amount')
        .eq('merchant_id', brandData.id)
        .gte('created_at', prevStartDate.toISOString())
        .lte('created_at', prevEndDate.toISOString())

      // Process current period data
      const currentViews = currentEvents?.filter(e => e.event_type === 'product_view').length || 0
      const currentLikes = currentEvents?.filter(e => e.event_type === 'product_swipe_right').length || 0
      const currentOrdersCount = currentOrders?.length || 0
      const currentRevenue = currentOrders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0

      // Process previous period data
      const prevViews = prevEvents?.filter(e => e.event_type === 'product_view').length || 0
      const prevLikes = prevEvents?.filter(e => e.event_type === 'product_swipe_right').length || 0
      const prevOrdersCount = prevOrders?.length || 0
      const prevRevenue = prevOrders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0

      // Calculate growth rates
      const viewsGrowth = prevViews > 0 ? ((currentViews - prevViews) / prevViews) * 100 : 0
      const likesGrowth = prevLikes > 0 ? ((currentLikes - prevLikes) / prevLikes) * 100 : 0
      const ordersGrowth = prevOrdersCount > 0 ? ((currentOrdersCount - prevOrdersCount) / prevOrdersCount) * 100 : 0
      const revenueGrowth = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0

      // Calculate rates
      const avgConversionRate = currentViews > 0 ? (currentOrdersCount / currentViews) * 100 : 0
      const avgEngagementRate = currentViews > 0 ? (currentLikes / currentViews) * 100 : 0

      setSummary({
        totalViews: currentViews,
        totalLikes: currentLikes,
        totalOrders: currentOrdersCount,
        totalRevenue: currentRevenue,
        avgConversionRate,
        avgEngagementRate,
        viewsGrowth,
        likesGrowth,
        ordersGrowth,
        revenueGrowth
      })

      // Generate daily analytics data
      const dailyData: AnalyticsData[] = []
      for (let i = parseInt(dateRange) - 1; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        
        const dayEvents = currentEvents?.filter(e => 
          e.created_at.split('T')[0] === dateStr
        ) || []
        
        const dayOrders = currentOrders?.filter(o => 
          o.created_at.split('T')[0] === dateStr
        ) || []

        dailyData.push({
          date: dateStr,
          views: dayEvents.filter(e => e.event_type === 'product_view').length,
          likes: dayEvents.filter(e => e.event_type === 'product_swipe_right').length,
          orders: dayOrders.length,
          revenue: dayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
        })
      }
      setAnalyticsData(dailyData)

      // Get top products analytics
      const { data: products } = await supabase
        .from('products')
        .select('id, title, image_url')
        .eq('brand_id', brandData.id)

      const productMetrics = await Promise.all(
        (products || []).map(async (product) => {
          const productEvents = currentEvents?.filter(e => e.product_id === product.id) || []
          const views = productEvents.filter(e => e.event_type === 'product_view').length
          const likes = productEvents.filter(e => e.event_type === 'product_swipe_right').length

          // Get sales data
          const { data: sales } = await supabase
            .from('order_items')
            .select('quantity, total_price')
            .eq('product_id', product.id)
            .gte('created_at', startDate.toISOString())

          const salesCount = sales?.reduce((sum, s) => sum + (s.quantity || 0), 0) || 0
          const revenue = sales?.reduce((sum, s) => sum + (s.total_price || 0), 0) || 0
          const conversionRate = views > 0 ? (salesCount / views) * 100 : 0

          return {
            ...product,
            views,
            likes,
            conversion_rate: conversionRate,
            sales: salesCount,
            revenue
          }
        })
      )

      // Sort by views and take top 10
      const sortedProducts = productMetrics
        .sort((a, b) => b.views - a.views)
        .slice(0, 10)

      setTopProducts(sortedProducts)
      setIsLoading(false)
    } catch (error) {
      console.error('Error fetching analytics:', error)
      setIsLoading(false)
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const GrowthIndicator = ({ value }: { value: number }) => (
    <div className={`flex items-center text-xs ${value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
      {value >= 0 ? (
        <ArrowTrendingUpIcon className="w-3 h-3 mr-1" />
      ) : (
        <ArrowTrendingDownIcon className="w-3 h-3 mr-1" />
      )}
      {Math.abs(value).toFixed(1)}%
    </div>
  )

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-shopscope-black mb-4" />
          <p className="text-shopscope-gray-600">Loading mobile analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-shopscope-black mb-2">Mobile Analytics</h1>
          <p className="text-shopscope-gray-600">Track your mobile marketplace performance</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-shopscope-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shopscope-black"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-shopscope-gray-600">Mobile Views</span>
            <EyeIcon className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-shopscope-black mb-2">
            {formatNumber(summary.totalViews)}
          </div>
          <GrowthIndicator value={summary.viewsGrowth} />
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-shopscope-gray-600">Mobile Likes</span>
            <HeartIcon className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-shopscope-black mb-2">
            {formatNumber(summary.totalLikes)}
          </div>
          <GrowthIndicator value={summary.likesGrowth} />
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-shopscope-gray-600">Mobile Orders</span>
            <ShoppingCartIcon className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-shopscope-black mb-2">
            {summary.totalOrders}
          </div>
          <GrowthIndicator value={summary.ordersGrowth} />
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-shopscope-gray-600">Mobile Revenue</span>
            <CurrencyDollarIcon className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-shopscope-black mb-2">
            ${summary.totalRevenue.toFixed(0)}
          </div>
          <GrowthIndicator value={summary.revenueGrowth} />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200">
          <h3 className="text-lg font-semibold text-shopscope-black mb-4">Conversion Rate</h3>
          <div className="text-4xl font-bold text-shopscope-black mb-2">
            {summary.avgConversionRate.toFixed(2)}%
          </div>
          <p className="text-sm text-shopscope-gray-600">
            Views that resulted in mobile purchases
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200">
          <h3 className="text-lg font-semibold text-shopscope-black mb-4">Engagement Rate</h3>
          <div className="text-4xl font-bold text-shopscope-black mb-2">
            {summary.avgEngagementRate.toFixed(2)}%
          </div>
          <p className="text-sm text-shopscope-gray-600">
            Views that resulted in likes/saves
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Views & Likes Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200">
          <h3 className="text-lg font-semibold text-shopscope-black mb-6">Mobile Engagement</h3>
          <div className="h-64 flex items-end justify-between space-x-1">
            {analyticsData.map((day, index) => {
              const maxValue = Math.max(...analyticsData.map(d => Math.max(d.views, d.likes)))
              const viewHeight = maxValue > 0 ? (day.views / maxValue) * 100 : 0
              const likeHeight = maxValue > 0 ? (day.likes / maxValue) * 100 : 0
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center space-y-1">
                  <div className="w-full flex space-x-1">
                    <div 
                      className="bg-blue-500 rounded-t flex-1 transition-all duration-300"
                      style={{ height: `${viewHeight}%` }}
                      title={`${day.views} views`}
                    />
                    <div 
                      className="bg-red-500 rounded-t flex-1 transition-all duration-300"
                      style={{ height: `${likeHeight}%` }}
                      title={`${day.likes} likes`}
                    />
                  </div>
                  <span className="text-xs text-shopscope-gray-500">
                    {new Date(day.date).getDate()}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-center space-x-6 mt-4">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded mr-2" />
              <span className="text-sm text-shopscope-gray-600">Views</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded mr-2" />
              <span className="text-sm text-shopscope-gray-600">Likes</span>
            </div>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200">
          <h3 className="text-lg font-semibold text-shopscope-black mb-6">Mobile Revenue</h3>
          <div className="h-64 flex items-end justify-between space-x-1">
            {analyticsData.map((day, index) => {
              const maxRevenue = Math.max(...analyticsData.map(d => d.revenue))
              const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div 
                    className="bg-green-500 rounded-t w-full transition-all duration-300"
                    style={{ height: `${height}%` }}
                    title={`$${day.revenue.toFixed(2)}`}
                  />
                  <span className="text-xs text-shopscope-gray-500 mt-1">
                    {new Date(day.date).getDate()}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="mt-4 text-center">
            <span className="text-sm text-shopscope-gray-600">Daily mobile revenue</span>
          </div>
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200">
        <h3 className="text-lg font-semibold text-shopscope-black mb-6">Top Performing Products</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-shopscope-gray-200">
                <th className="text-left py-3 px-4 font-medium text-shopscope-gray-600">Product</th>
                <th className="text-left py-3 px-4 font-medium text-shopscope-gray-600">Views</th>
                <th className="text-left py-3 px-4 font-medium text-shopscope-gray-600">Likes</th>
                <th className="text-left py-3 px-4 font-medium text-shopscope-gray-600">Sales</th>
                <th className="text-left py-3 px-4 font-medium text-shopscope-gray-600">Revenue</th>
                <th className="text-left py-3 px-4 font-medium text-shopscope-gray-600">Conversion</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((product, index) => (
                <tr key={product.id} className="border-b border-shopscope-gray-100 hover:bg-shopscope-gray-50">
                  <td className="py-4 px-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-shopscope-gray-100 rounded-lg flex items-center justify-center mr-3">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.title}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <ChartBarIcon className="w-5 h-5 text-shopscope-gray-400" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-shopscope-black truncate max-w-xs">
                          {product.title}
                        </div>
                        <div className="text-sm text-shopscope-gray-500">#{index + 1}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-shopscope-black">{product.views}</td>
                  <td className="py-4 px-4 text-shopscope-black">{product.likes}</td>
                  <td className="py-4 px-4 text-shopscope-black">{product.sales}</td>
                  <td className="py-4 px-4 text-shopscope-black">${product.revenue.toFixed(2)}</td>
                  <td className="py-4 px-4 text-shopscope-black">{product.conversion_rate.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {topProducts.length === 0 && (
          <div className="text-center py-8">
            <ChartBarIcon className="w-12 h-12 text-shopscope-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-shopscope-black mb-2">No analytics data yet</h3>
            <p className="text-shopscope-gray-600">
              Mobile engagement data will appear here once customers start viewing your products
            </p>
          </div>
        )}
      </div>
    </div>
  )
} 