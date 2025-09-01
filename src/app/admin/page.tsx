'use client'

import { useState, useEffect } from 'react'
import { 
  ChartBarIcon, 
  CubeIcon, 
  ShoppingBagIcon, 
  BanknotesIcon, 
  UserGroupIcon,
  CogIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

interface AdminStats {
  totalBrands: number
  totalMerchants: number
  totalOrders: number
  totalProducts: number
  totalPayouts: number
  recentOrders: number
  recentPayouts: number
  recentProducts: number
  databaseSize: string
  activeConnections: number
  totalTables: number
  totalCommissionEarnings: number
  todayCommission: number
  thisWeekCommission: number
  thisMonthCommission: number
}

interface SystemHealth {
  status: 'healthy' | 'warning' | 'error'
  message: string
  lastChecked: string
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAdminData()
  }, [])

  const fetchAdminData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/dashboard-data', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch admin data')
      }
      const data = await response.json()
      setStats(data.stats)
      setSystemHealth(data.systemHealth)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="mt-4 text-xl font-semibold text-gray-900">Error Loading Dashboard</h2>
          <p className="mt-2 text-gray-600">{error}</p>
          <button 
            onClick={fetchAdminData}
            className="mt-4 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-black rounded-lg" />
              <h1 className="text-2xl font-semibold text-gray-900">ShopScope Admin</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">System Administrator</span>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* System Health Alert */}
        {systemHealth && (
          <div className={`mb-8 p-4 rounded-lg border ${
            systemHealth.status === 'healthy' 
              ? 'bg-green-50 border-green-200 text-green-800'
              : systemHealth.status === 'warning'
              ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center gap-3">
              {systemHealth.status === 'healthy' ? (
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
              ) : systemHealth.status === 'warning' ? (
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
              ) : (
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
              )}
              <div>
                <p className="font-medium">
                  System Status: {systemHealth.status.charAt(0).toUpperCase() + systemHealth.status.slice(1)}
                </p>
                <p className="text-sm opacity-90">{systemHealth.message}</p>
                <p className="text-xs opacity-75 mt-1">Last checked: {systemHealth.lastChecked}</p>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Commission Earnings Section */}
        <div className="mb-8">
          {/* Main Commission Card */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-green-800 mb-2">Commission Earnings</h3>
                <p className="text-sm text-green-600">Total commission earned from all orders</p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-green-900">
                  ${stats?.totalCommissionEarnings?.toFixed(2) || '0.00'}
                </div>
                <div className="text-sm text-green-600 mt-1">All Time Earnings</div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <ChartBarIcon className="h-5 w-5 text-green-600" />
              <span className="text-sm text-green-700">Revenue from platform fees</span>
            </div>
          </div>

          {/* Time-based Commission Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Today's Commission */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Today</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${stats?.todayCommission?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <ChartBarIcon className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Commission earned today</p>
            </div>

            {/* This Week's Commission */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">This Week</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ${stats?.thisWeekCommission?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <ChartBarIcon className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Commission earned this week</p>
            </div>

            {/* This Month's Commission */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">This Month</p>
                  <p className="text-2xl font-bold text-purple-600">
                    ${stats?.thisMonthCommission?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <ChartBarIcon className="h-5 w-5 text-purple-600" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Commission earned this month</p>
            </div>
          </div>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Brands</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.totalBrands || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <UserGroupIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Merchants</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.totalMerchants || 0}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <UserGroupIcon className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.totalOrders || 0}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <ShoppingBagIcon className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Products</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.totalProducts || 0}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <CubeIcon className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity & System Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Activity */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-gray-600" />
              Recent Activity (7 days)
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <ShoppingBagIcon className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">New Orders</span>
                </div>
                <span className="text-lg font-semibold text-blue-600">{stats?.recentOrders || 0}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <BanknotesIcon className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">New Payouts</span>
                </div>
                <span className="text-lg font-semibold text-green-600">{stats?.recentPayouts || 0}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <CubeIcon className="h-4 w-4 text-orange-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">New Products</span>
                </div>
                <span className="text-lg font-semibold text-orange-600">{stats?.recentProducts || 0}</span>
              </div>
            </div>
          </div>

          {/* System Information */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CogIcon className="h-5 w-5 text-gray-600" />
              System Information
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <span className="text-sm font-medium text-gray-700">Database Size</span>
                <span className="text-sm font-semibold text-gray-900">{stats?.databaseSize || 'N/A'}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <span className="text-sm font-medium text-gray-700">Active Connections</span>
                <span className="text-sm font-semibold text-gray-900">{stats?.activeConnections || 0}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <span className="text-sm font-medium text-gray-700">Total Tables</span>
                <span className="text-sm font-semibold text-gray-900">{stats?.totalTables || 0}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <span className="text-sm font-medium text-gray-700">Total Payouts</span>
                <span className="text-sm font-semibold text-gray-900">{stats?.totalPayouts || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors">
              <ChartBarIcon className="h-5 w-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-900">View Analytics</span>
            </button>
            
            <button className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors">
              <CogIcon className="h-5 w-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-900">System Settings</span>
            </button>
            
            <button className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors">
              <ChartBarIcon className="h-5 w-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-900">Performance Report</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
