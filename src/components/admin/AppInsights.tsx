'use client'

import { useState, useEffect } from 'react'
import { 
  UserGroupIcon, 
  ChartBarIcon, 
  HeartIcon, 
  ShoppingBagIcon,
  EyeIcon,
  ChatBubbleLeftIcon,
  UserPlusIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon as TrendingUpIcon,
  CubeIcon
} from '@heroicons/react/24/outline'

interface AppInsights {
  userAnalytics: {
    totalUsers: number
    newUsersThisMonth: number
    newUsersThisWeek: number
    dailyActiveUsers: number
    profileCompletionRate: number
    avatarRate: number
  }
  ecommerceAnalytics: {
    totalRevenue: number
    monthlyRevenue: number
    totalOrders: number
    monthlyOrders: number
    averageOrderValue: number
    topProducts: Array<{
      title: string
      quantity: number
      revenue: number
      price: number
    }>
  }
  appUsageAnalytics: {
    postsThisMonth: number
    topWishlistedProducts: Array<{
      title: string
      count: number
    }>
    avgLikes: number
    avgComments: number
  }
  socialEngagement: {
    totalFollows: number
    totalPosts: number
  }
  brandPerformance: {
    topBrands: Array<{
      name: string
      orders: number
      revenue: number
      products: number
    }>
  }
}

export default function AppInsights() {
  const [insights, setInsights] = useState<AppInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAppInsights()
  }, [])

  const fetchAppInsights = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/app-analytics', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch app insights')
      }
      const data = await response.json()
      setInsights(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="text-center text-red-600">
          <p>Error loading app insights: {error}</p>
          <button 
            onClick={fetchAppInsights}
            className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!insights) return null

  return (
    <div className="space-y-8">
      {/* User Analytics */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <UserGroupIcon className="h-5 w-5 text-blue-600" />
          User Analytics
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-3xl font-bold text-blue-600">{insights.userAnalytics.totalUsers}</div>
            <div className="text-sm text-blue-600 mt-1">Total Users</div>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-3xl font-bold text-green-600">{insights.userAnalytics.dailyActiveUsers}</div>
            <div className="text-sm text-green-600 mt-1">Daily Active Users</div>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-3xl font-bold text-purple-600">{insights.userAnalytics.profileCompletionRate}%</div>
            <div className="text-sm text-purple-600 mt-1">Profile Completion</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
            <div className="flex items-center gap-3">
              <UserPlusIcon className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-gray-900">New Users This Month</span>
            </div>
            <span className="text-lg font-semibold text-green-600">{insights.userAnalytics.newUsersThisMonth}</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
            <div className="flex items-center gap-3">
              <EyeIcon className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-900">Avatar Rate</span>
            </div>
            <span className="text-lg font-semibold text-blue-600">{insights.userAnalytics.avatarRate}%</span>
          </div>
        </div>
      </div>

      {/* E-commerce Analytics */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <CurrencyDollarIcon className="h-5 w-5 text-green-600" />
          E-commerce Analytics
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">${insights.ecommerceAnalytics.totalRevenue.toFixed(2)}</div>
            <div className="text-sm text-green-600 mt-1">Total Revenue</div>
          </div>
          
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">${insights.ecommerceAnalytics.monthlyRevenue.toFixed(2)}</div>
            <div className="text-sm text-blue-600 mt-1">Monthly Revenue</div>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{insights.ecommerceAnalytics.totalOrders}</div>
            <div className="text-sm text-purple-600 mt-1">Total Orders</div>
          </div>
          
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">${insights.ecommerceAnalytics.averageOrderValue.toFixed(2)}</div>
            <div className="text-sm text-orange-600 mt-1">Avg Order Value</div>
          </div>
        </div>

        {/* Top Products */}
        {insights.ecommerceAnalytics.topProducts.length > 0 && (
          <div className="mt-6">
            <h4 className="text-md font-semibold text-gray-900 mb-4">Top Selling Products</h4>
            <div className="space-y-2">
              {insights.ecommerceAnalytics.topProducts.slice(0, 5).map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-semibold text-blue-600">
                      {index + 1}
                    </div>
                    <span className="text-sm font-medium text-gray-900">{product.title}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">{product.quantity} sold</div>
                    <div className="text-xs text-gray-500">${product.revenue.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* App Usage Analytics */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <ChartBarIcon className="h-5 w-5 text-purple-600" />
          App Usage Analytics
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-3xl font-bold text-purple-600">{insights.appUsageAnalytics.postsThisMonth}</div>
            <div className="text-sm text-purple-600 mt-1">Posts This Month</div>
          </div>
          
          <div className="text-center p-4 bg-pink-50 rounded-lg">
            <div className="text-3xl font-bold text-pink-600">{insights.appUsageAnalytics.avgLikes}</div>
            <div className="text-sm text-pink-600 mt-1">Avg Likes per Post</div>
          </div>
          
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-3xl font-bold text-blue-600">{insights.appUsageAnalytics.avgComments}</div>
            <div className="text-sm text-blue-600 mt-1">Avg Comments per Post</div>
          </div>
        </div>

        {/* Top Wishlisted Products */}
        {insights.appUsageAnalytics.topWishlistedProducts.length > 0 && (
          <div className="mt-6">
            <h4 className="text-md font-semibold text-gray-900 mb-4">Most Wishlisted Products</h4>
            <div className="space-y-2">
              {insights.appUsageAnalytics.topWishlistedProducts.slice(0, 5).map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div className="flex items-center gap-3">
                    <HeartIcon className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium text-gray-900">{product.title}</span>
                  </div>
                  <span className="text-sm font-semibold text-red-600">{product.count} wishes</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Social Engagement */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <ChatBubbleLeftIcon className="h-5 w-5 text-indigo-600" />
          Social Engagement
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="text-center p-4 bg-indigo-50 rounded-lg">
            <div className="text-3xl font-bold text-indigo-600">{insights.socialEngagement.totalFollows}</div>
            <div className="text-sm text-indigo-600 mt-1">Total Follows</div>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-3xl font-bold text-green-600">{insights.socialEngagement.totalPosts}</div>
            <div className="text-sm text-green-600 mt-1">Total Posts</div>
          </div>
        </div>
      </div>

      {/* Brand Performance */}
      {insights.brandPerformance.topBrands.length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <TrendingUpIcon className="h-5 w-5 text-emerald-600" />
            Top Performing Brands
          </h3>
          
          <div className="space-y-3">
            {insights.brandPerformance.topBrands.slice(0, 5).map((brand, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-sm font-semibold text-emerald-600">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{brand.name}</div>
                    <div className="text-sm text-gray-500">{brand.products} products</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">{brand.orders} orders</div>
                  <div className="text-sm text-emerald-600">${brand.revenue.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
