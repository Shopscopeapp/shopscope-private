'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import {
  ShoppingCartIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  TruckIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  BanknotesIcon,
  UserIcon,
  CalendarIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline'

interface Order {
  id: string
  order_number: string
  shopify_order_id?: string
  total_amount: number
  commission_amount: number
  status: string
  fulfillment_status?: string
  created_at: string
  updated_at: string
  shipping_address?: any
  line_items?: any[]
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-purple-100 text-purple-800'
}

const fulfillmentColors = {
  unfulfilled: 'bg-gray-100 text-gray-800',
  partial: 'bg-yellow-100 text-yellow-800',
  fulfilled: 'bg-green-100 text-green-800',
  shipped: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800'
}

export default function OrdersPage() {
  const supabase = createClientComponentClient()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [fulfillmentFilter, setFulfillmentFilter] = useState('all')
  const [dateRange, setDateRange] = useState('30')
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [brandId, setBrandId] = useState<string | null>(null)
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    totalRevenue: 0,
    totalCommission: 0
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

      // Calculate date range
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - parseInt(dateRange))

      // Fetch orders from the orders table
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          shopify_order_id,
          total_amount,
          commission_amount,
          status,
          fulfillment_status,
          created_at,
          updated_at,
          shipping_address,
          line_items
        `)
        .eq('brand_id', brandData.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false })

      if (ordersError) throw ordersError

      setOrders(ordersData || [])

      // Calculate stats
      const total = ordersData?.length || 0
      const pending = ordersData?.filter(o => o.status === 'pending').length || 0
      const processing = ordersData?.filter(o => o.status === 'processing').length || 0
      const completed = ordersData?.filter(o => o.status === 'completed').length || 0
      const totalRevenue = ordersData?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0
      const totalCommission = ordersData?.reduce((sum, o) => sum + (o.commission_amount || 0), 0) || 0

      setStats({ total, pending, processing, completed, totalRevenue, totalCommission })
      setIsLoading(false)
    } catch (error) {
      console.error('Error fetching orders:', error)
      setIsLoading(false)
    }
  }

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId)

      if (error) throw error

      // Update local state
      setOrders(prev => prev.map(o => 
        o.id === orderId ? { ...o, status: newStatus } : o
      ))
    } catch (error) {
      console.error('Error updating order status:', error)
    }
  }

  const handleFulfillmentChange = async (orderId: string, newFulfillment: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ fulfillment_status: newFulfillment, updated_at: new Date().toISOString() })
        .eq('id', orderId)

      if (error) throw error

      // Update local state
      setOrders(prev => prev.map(o => 
        o.id === orderId ? { ...o, fulfillment_status: newFulfillment } : o
      ))
    } catch (error) {
      console.error('Error updating fulfillment status:', error)
    }
  }

  // Helper function to extract customer info from shipping_address
  const getCustomerInfo = (order: Order) => {
    const address = order.shipping_address
    if (!address) return { name: 'Guest Customer', email: 'No email' }
    
    const email = address.email || 'No email'
    let name = 'Guest Customer'
    
    if (address.name) {
      name = address.name
    } else if (address.first_name || address.last_name) {
      const firstName = address.first_name || ''
      const lastName = address.last_name || ''
      name = `${firstName} ${lastName}`.trim() || 'Guest Customer'
    }
    
    return { name, email }
  }

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const customerInfo = getCustomerInfo(order)
    const matchesSearch = 
      order.shopify_order_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerInfo.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerInfo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    const matchesFulfillment = fulfillmentFilter === 'all' || order.fulfillment_status === fulfillmentFilter
    
    return matchesSearch && matchesStatus && matchesFulfillment
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-4 h-4 text-green-600" />
      case 'processing':
        return <ClockIcon className="w-4 h-4 text-blue-600" />
      case 'pending':
        return <ExclamationCircleIcon className="w-4 h-4 text-yellow-600" />
      default:
        return <ClockIcon className="w-4 h-4 text-gray-600" />
    }
  }

  const getFulfillmentIcon = (status: string) => {
    switch (status) {
      case 'fulfilled':
      case 'shipped':
      case 'delivered':
        return <TruckIcon className="w-4 h-4 text-green-600" />
      case 'partial':
        return <ClockIcon className="w-4 h-4 text-yellow-600" />
      default:
        return <ExclamationCircleIcon className="w-4 h-4 text-gray-600" />
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-shopscope-black mb-4" />
          <p className="text-shopscope-gray-600">Loading mobile orders...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-shopscope-black mb-2">Orders</h1>
          <p className="text-shopscope-gray-600">Track orders from mobile shoppers</p>
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
            <option value="365">Last year</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-shopscope-gray-600">Total Orders</span>
            <ShoppingCartIcon className="w-5 h-5 text-shopscope-gray-400" />
          </div>
          <div className="text-2xl font-bold text-shopscope-black">{stats.total}</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-shopscope-gray-600">Pending</span>
            <ExclamationCircleIcon className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="text-2xl font-bold text-shopscope-black">{stats.pending}</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-shopscope-gray-600">Processing</span>
            <ClockIcon className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-shopscope-black">{stats.processing}</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-shopscope-gray-600">Completed</span>
            <CheckCircleIcon className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-shopscope-black">{stats.completed}</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-shopscope-gray-600">Total Revenue</span>
            <BanknotesIcon className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-shopscope-black">${stats.totalRevenue.toFixed(2)}</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-shopscope-gray-600">Commission</span>
            <BanknotesIcon className="w-5 h-5 text-shopscope-gray-400" />
          </div>
          <div className="text-2xl font-bold text-shopscope-black">${stats.totalCommission.toFixed(2)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200 mb-8">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-shopscope-gray-400" />
            <input
              type="text"
              placeholder="Search by order ID, customer name, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-shopscope-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shopscope-black focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-shopscope-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shopscope-black focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>

          {/* Fulfillment Filter */}
          <select
            value={fulfillmentFilter}
            onChange={(e) => setFulfillmentFilter(e.target.value)}
            className="px-4 py-2 border border-shopscope-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shopscope-black focus:border-transparent"
          >
            <option value="all">All Fulfillment</option>
            <option value="unfulfilled">Unfulfilled</option>
            <option value="partial">Partial</option>
            <option value="fulfilled">Fulfilled</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-sm border border-shopscope-gray-200 overflow-hidden">
        {filteredOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-shopscope-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-shopscope-gray-500 uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-shopscope-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-shopscope-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-shopscope-gray-500 uppercase tracking-wider">
                    Fulfillment
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-shopscope-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-shopscope-gray-500 uppercase tracking-wider">
                    Commission
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-shopscope-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-shopscope-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-shopscope-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-shopscope-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-medium text-shopscope-black">
                          {order.shopify_order_id || `ORD-${order.order_number.slice(0, 8)}`}
                        </div>
                        <div className="text-sm text-shopscope-gray-500">
                          Mobile Order
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-medium text-shopscope-black">
                          {getCustomerInfo(order).name}
                        </div>
                        <div className="text-sm text-shopscope-gray-500">
                          {getCustomerInfo(order).email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(order.status)}
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          className={`ml-2 px-2 py-1 text-xs rounded-full border-none ${statusColors[order.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}
                        >
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="refunded">Refunded</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getFulfillmentIcon(order.fulfillment_status || 'unfulfilled')}
                        <select
                          value={order.fulfillment_status || 'unfulfilled'}
                          onChange={(e) => handleFulfillmentChange(order.id, e.target.value)}
                          className={`ml-2 px-2 py-1 text-xs rounded-full border-none ${fulfillmentColors[(order.fulfillment_status || 'unfulfilled') as keyof typeof fulfillmentColors]}`}
                        >
                          <option value="unfulfilled">Unfulfilled</option>
                          <option value="partial">Partial</option>
                          <option value="fulfilled">Fulfilled</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-shopscope-black">
                        ${(order.total_amount || 0).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-shopscope-black">
                        ${(order.commission_amount || 0).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-shopscope-gray-600">
                        {new Date(order.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-shopscope-gray-500">
                        {new Date(order.created_at).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button className="text-shopscope-gray-400 hover:text-shopscope-black" title="View Details">
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        {order.shopify_order_id && (
                          <button className="text-shopscope-gray-400 hover:text-shopscope-black" title="View in Shopify">
                            <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <ShoppingCartIcon className="w-12 h-12 text-shopscope-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-shopscope-black mb-2">No orders found</h3>
            <p className="text-shopscope-gray-600">
              {searchTerm || statusFilter !== 'all' || fulfillmentFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'No mobile orders yet for the selected time period'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  )
} 