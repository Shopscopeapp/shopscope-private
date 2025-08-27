'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  EyeIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ShoppingCartIcon
} from '@heroicons/react/24/outline'

interface Order {
  id: string
  merchant_id: string
  total_amount: number
  status: string | null
  fulfillment_status: string | null
  created_at: string
  updated_at: string
  shopify_order_id?: string
  commission_amount: number
  order_id: string
  // Tracking and shipping information
  tracking_number?: string | null
  carrier?: string | null
  shipping_status?: string | null
  // Order details fetched separately
  orders: {
    id: string
    user_id: string
    shipping_address: any
    items: any
    external_order_id?: string
    payment_status: string
  }[]
}

// Interface for RPC function result
interface BrandOrderRPC {
  merchant_order_id: string
  total_amount: number
  status: string | null
  fulfillment_status: string | null
  created_at: string
  order_id: string
  customer_name: string
  customer_email: string
  external_order_id: string | null
  payment_status: string | null
  items?: any[] // Added items to the interface
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-purple-100 text-purple-800'
}

const fulfillmentColors = {
  paid: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-purple-100 text-purple-800'
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [fulfillmentFilter, setFulfillmentFilter] = useState('all')
  const [dateRange, setDateRange] = useState('all')
  const [brandId, setBrandId] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
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

      console.log('🔍 Fetching orders for brand:', brandData.id)

                    // Try RPC function first
       let { data: ordersData, error: ordersError } = await supabase.rpc('get_brand_orders', {
         p_brand_id: brandData.id
       })

       console.log('🔍 Raw RPC response:', { ordersData, ordersError })
       console.log('🔍 ordersData type:', typeof ordersData)
       console.log('🔍 ordersData length:', ordersData?.length)

       if (ordersError || !ordersData || ordersData.length === 0) {
         console.error('RPC error or empty results, trying fallback approach:', ordersError || 'Empty array')
         
         // Fallback: Use the working SQL query we tested
         const { data: fallbackData, error: fallbackError } = await supabase
        .from('merchant_orders')
        .select(`
          id,
             merchant_id,
          total_amount,
          status,
          fulfillment_status,
          created_at,
          updated_at,
             shopify_order_id,
             commission_amount,
             order_id
        `)
        .eq('merchant_id', brandData.id)
        .order('created_at', { ascending: false })

         if (fallbackError) throw fallbackError
         
         // Now fetch order details for each order using a batch approach
         const orderIds = fallbackData?.map(o => o.order_id) || []
         let ordersWithDetails = []
         
         if (orderIds.length > 0) {
           // Batch fetch order details
           const { data: orderDetails, error: orderError } = await supabase
             .from('orders')
             .select('id, user_id, shipping_address, items, external_order_id, payment_status')
             .in('id', orderIds)

           if (!orderError && orderDetails) {
             // Create a map for quick lookup
             const orderDetailsMap = new Map(orderDetails.map(o => [o.id, o]))
             
             ordersWithDetails = fallbackData.map(order => ({
               ...order,
               orders: orderDetailsMap.has(order.order_id) ? [orderDetailsMap.get(order.order_id)] : []
             }))
           } else {
             console.log('Batch order details error:', orderError)
             ordersWithDetails = fallbackData.map(order => ({
               ...order,
               orders: []
             }))
           }
         } else {
           ordersWithDetails = fallbackData.map(order => ({
             ...order,
             orders: []
           }))
         }
         
         console.log('🔍 Fallback orders with details:', ordersWithDetails)
         setOrders(ordersWithDetails)
         ordersData = ordersWithDetails
       } else {
         console.log('📦 RPC orders data received:', ordersData)
         
         // Transform RPC data to match our Order interface
         const transformedOrders = (ordersData as BrandOrderRPC[])?.map(rpcOrder => ({
           id: rpcOrder.merchant_order_id,
           merchant_id: brandData.id,
           total_amount: rpcOrder.total_amount,
           status: rpcOrder.status,
           fulfillment_status: rpcOrder.fulfillment_status,
           created_at: rpcOrder.created_at,
           updated_at: rpcOrder.created_at, // RPC doesn't return updated_at
           shopify_order_id: undefined,
           commission_amount: 0, // RPC doesn't return commission_amount
           order_id: rpcOrder.order_id,
           orders: [{
             id: rpcOrder.order_id,
             user_id: '', // RPC doesn't return user_id
             shipping_address: { 
               name: rpcOrder.customer_name, 
               email: rpcOrder.customer_email 
             },
             items: rpcOrder.items || [], // Use the actual items from RPC
             external_order_id: rpcOrder.external_order_id,
             payment_status: rpcOrder.payment_status || 'paid'
           }]
         })) || []
         
         setOrders(transformedOrders)
         ordersData = transformedOrders
       }

      // Calculate stats
      const total = (ordersData || []).length
      const pending = (ordersData || []).filter(o => o.status === 'pending' || o.status === null).length
      const processing = (ordersData || []).filter(o => o.status === 'processing').length
      const completed = (ordersData || []).filter(o => o.status === 'fulfilled' || o.status === 'completed').length
      const totalRevenue = (ordersData || []).reduce((sum, o) => sum + (o.total_amount || 0), 0)
      const totalCommission = (ordersData || []).reduce((sum, o) => sum + (o.commission_amount || 0), 0)

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
        .from('merchant_orders')
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
        .from('merchant_orders')
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

  // Helper function to get customer info from shipping_address JSONB
  const getCustomerInfo = (order: Order) => {
    const address = order.orders?.[0]?.shipping_address
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
      order.orders?.[0]?.external_order_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerInfo.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerInfo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.slice(0, 8).toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    const matchesFulfillment = fulfillmentFilter === 'all' || order.orders?.[0]?.payment_status === fulfillmentFilter
    
    return matchesSearch && matchesStatus && matchesFulfillment
  })

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-4 h-4 text-green-600" />
      case 'processing':
        return <ClockIcon className="w-4 h-4 text-blue-600" />
      case 'pending':
      case null:
        return <XCircleIcon className="w-4 h-4 text-yellow-600" />
      case 'fulfilled':
        return <CheckCircleIcon className="w-4 h-4 text-green-600" />
      default:
        return <ClockIcon className="w-4 h-4 text-gray-600" />
    }
  }

  const getFulfillmentIcon = (status: string) => {
    switch (status) {
      case 'fulfilled':
      case 'shipped':
      case 'delivered':
        return <CheckCircleIcon className="w-4 h-4 text-green-600" />
      case 'partial':
        return <ClockIcon className="w-4 h-4 text-yellow-600" />
      default:
        return <XCircleIcon className="w-4 h-4 text-gray-600" />
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4" />
          <p className="text-gray-600">Loading orders...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Orders</h1>
          <p className="text-gray-600">Track orders from mobile shoppers</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total Orders</span>
            <ShoppingCartIcon className="w-5 h-5 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Pending</span>
            <XCircleIcon className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.pending}</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Processing</span>
            <ClockIcon className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.processing}</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Completed</span>
            <CheckCircleIcon className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.completed}</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total Revenue</span>
            <CheckCircleIcon className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">${stats.totalRevenue.toFixed(2)}</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Commission</span>
            <CheckCircleIcon className="w-5 h-5 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900">${stats.totalCommission.toFixed(2)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-8">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by order ID, customer name, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filteredOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fulfillment
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commission
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                   <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                          <div className="font-medium text-gray-900">
                            {order.orders?.[0]?.external_order_id || `ORD-${order.id.slice(0, 8)}`}
                        </div>
                          <div className="text-sm text-gray-500">
                          Mobile Order
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                          <div className="font-medium text-gray-900">
                            {getCustomerInfo(order).name}
                        </div>
                          <div className="text-sm text-gray-500">
                            {getCustomerInfo(order).email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(order.status)}
                        <select
                            value={order.status || 'pending'}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                            className={`ml-2 px-2 py-1 text-xs rounded-full border-none ${statusColors[(order.status || 'pending') as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}
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
                          {getFulfillmentIcon(order.orders?.[0]?.payment_status || 'paid')}
                        <select
                            value={order.orders?.[0]?.payment_status || 'paid'}
                          onChange={(e) => handleFulfillmentChange(order.id, e.target.value)}
                            className={`ml-2 px-2 py-1 text-xs rounded-full border-none ${fulfillmentColors[order.orders?.[0]?.payment_status || 'paid'] || 'bg-gray-100 text-gray-800'}`}
                          >
                            <option value="paid">Paid</option>
                            <option value="pending">Pending</option>
                            <option value="failed">Failed</option>
                            <option value="refunded">Refunded</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          ${(order.total_amount || 0).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          ${(order.commission_amount || 0).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                        {new Date(order.created_at).toLocaleDateString()}
                      </div>
                        <div className="text-xs text-gray-500">
                        {new Date(order.created_at).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                          <button 
                            className="text-gray-400 hover:text-gray-900" 
                            title="View Details"
                                                       onClick={() => {
                             setSelectedOrder(order);
                             setIsModalOpen(true);
                           }}
                          >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                          {order.orders?.[0]?.external_order_id && (
                            <button className="text-gray-400 hover:text-gray-900" title="View in Shopify">
                              {/* Shopify link would go here */}
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
            <ShoppingCartIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-600">
              {searchTerm || statusFilter !== 'all' || fulfillmentFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'No orders yet for the selected time period'
              }
            </p>
          </div>
        )}
      </div>

       {/* Order Details Modal */}
       {isModalOpen && selectedOrder && (
         <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50 p-4">
           <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-auto max-h-[90vh] overflow-y-auto">
             {/* Modal Header */}
             <div className="sticky top-0 bg-black text-white px-8 py-6 rounded-t-2xl">
               <div className="flex justify-between items-center">
                 <div>
                   <h3 className="text-2xl font-bold">Order Details</h3>
                   <p className="text-gray-300 mt-1">
                     {selectedOrder.orders?.[0]?.external_order_id || `ORD-${selectedOrder.id.slice(0, 8)}`}
                   </p>
                 </div>
                 <button 
                   onClick={() => setIsModalOpen(false)} 
                   className="text-white hover:text-gray-300 transition-colors duration-200 p-2 rounded-full hover:bg-white hover:bg-opacity-10"
                 >
                   <XCircleIcon className="w-8 h-8" />
                 </button>
               </div>
             </div>

             {/* Modal Content */}
             <div className="p-8">
               {/* Customer & Order Info Section */}
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                 {/* Customer Information */}
                 <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                   <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                     <div className="w-2 h-2 bg-black rounded-full mr-3"></div>
                     Customer Information
                   </h4>
                   <div className="space-y-3">
                     <div>
                       <p className="text-sm font-medium text-gray-600">Name</p>
                       <p className="text-lg text-gray-900 font-semibold">{getCustomerInfo(selectedOrder).name}</p>
                     </div>
                     <div>
                       <p className="text-sm font-medium text-gray-600">Email</p>
                       <p className="text-lg text-gray-900">{getCustomerInfo(selectedOrder).email}</p>
                     </div>
                     <div>
                       <p className="text-sm font-medium text-gray-600">Order Date</p>
                       <p className="text-lg text-gray-900">{new Date(selectedOrder.created_at).toLocaleDateString('en-US', { 
                         year: 'numeric', 
                         month: 'long', 
                         day: 'numeric',
                         hour: '2-digit',
                         minute: '2-digit'
                       })}</p>
                     </div>
                   </div>
                 </div>

                 {/* Order Summary */}
                 <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                   <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                     <div className="w-2 h-2 bg-black rounded-full mr-3"></div>
                     Order Summary
                   </h4>
                   <div className="space-y-3">
                     <div className="flex justify-between">
                       <span className="text-sm font-medium text-gray-600">Total Amount</span>
                       <span className="text-2xl font-bold text-black">${(selectedOrder.total_amount || 0).toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between">
                       <span className="text-sm font-medium text-gray-600">Commission</span>
                       <span className="text-lg font-semibold text-gray-900">${(selectedOrder.commission_amount || 0).toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between">
                       <span className="text-sm font-medium text-gray-600">Status</span>
                       <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                         selectedOrder.status === 'completed' || selectedOrder.status === 'fulfilled'
                           ? 'bg-gray-200 text-gray-800'
                           : selectedOrder.status === 'processing'
                           ? 'bg-gray-200 text-gray-800'
                           : 'bg-gray-200 text-gray-800'
                       }`}>
                         {selectedOrder.status || 'pending'}
                       </span>
                     </div>
                   </div>
                 </div>
               </div>

               {/* Payment & Fulfillment Status */}
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                 <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                   <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                     <div className="w-2 h-2 bg-black rounded-full mr-3"></div>
                     Payment Details
                   </h4>
                   <div className="space-y-3">
                     <div>
                       <p className="text-sm font-medium text-gray-600">Payment Status</p>
                       <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                         selectedOrder.orders?.[0]?.payment_status === 'paid'
                           ? 'bg-gray-200 text-gray-800'
                           : 'bg-gray-200 text-gray-800'
                       }`}>
                         {selectedOrder.orders?.[0]?.payment_status || 'N/A'}
                       </span>
                     </div>
                     <div>
                       <p className="text-sm font-medium text-gray-600">External Order ID</p>
                       <p className="text-lg text-gray-900 font-mono">{selectedOrder.orders?.[0]?.external_order_id || 'N/A'}</p>
                     </div>
                   </div>
                 </div>

                 <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                   <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                     <div className="w-2 h-2 bg-black rounded-full mr-3"></div>
                     Fulfillment Details
                   </h4>
                   <div className="space-y-3">
                     <div>
                       <p className="text-sm font-medium text-gray-600">Fulfillment Status</p>
                       <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                         selectedOrder.fulfillment_status === 'fulfilled'
                           ? 'bg-gray-200 text-gray-800'
                           : 'bg-gray-200 text-gray-800'
                       }`}>
                         {selectedOrder.fulfillment_status || 'N/A'}
                       </span>
                     </div>
                     <div>
                       <p className="text-sm font-medium text-gray-600">Last Updated</p>
                       <p className="text-lg text-gray-900">{new Date(selectedOrder.updated_at).toLocaleDateString('en-US', { 
                         year: 'numeric', 
                         month: 'long', 
                         day: 'numeric',
                         hour: '2-digit',
                         minute: '2-digit'
                       })}</p>
                     </div>
                   </div>
                 </div>
               </div>

               {/* Shipping Information */}
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                 <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                   <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                     <div className="w-2 h-2 bg-black rounded-full mr-3"></div>
                     Shipping Information
                   </h4>
                   <div className="space-y-3">
                     <div>
                       <p className="text-sm font-medium text-gray-600">Tracking Number</p>
                       <p className="text-lg text-gray-900 font-mono">
                         {selectedOrder.tracking_number || 'Not provided'}
                       </p>
                     </div>
                     <div>
                       <p className="text-sm font-medium text-gray-600">Carrier</p>
                       <p className="text-lg text-gray-900">
                         {selectedOrder.carrier || 'Not specified'}
                       </p>
                     </div>
                     <div>
                       <p className="text-sm font-medium text-gray-600">Shipping Status</p>
                       <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                         selectedOrder.shipping_status === 'shipped'
                           ? 'bg-green-100 text-green-800'
                           : selectedOrder.shipping_status === 'delivered'
                           ? 'bg-blue-100 text-blue-800'
                           : 'bg-gray-200 text-gray-800'
                       }`}>
                         {selectedOrder.shipping_status || 'pending'}
                       </span>
                     </div>
                   </div>
                 </div>

                 <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                   <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                     <div className="w-2 h-2 bg-black rounded-full mr-3"></div>
                     Shipping Address
                   </h4>
                   <div className="space-y-3">
                     {selectedOrder.orders?.[0]?.shipping_address ? (
                       <>
                         <div>
                           <p className="text-sm font-medium text-gray-600">Name</p>
                           <p className="text-lg text-gray-900">{selectedOrder.orders[0].shipping_address.name || 'N/A'}</p>
                         </div>
                         <div>
                           <p className="text-sm font-medium text-gray-600">Address</p>
                           <p className="text-lg text-gray-900">
                             {selectedOrder.orders[0].shipping_address.address1 || 'N/A'}
                             {selectedOrder.orders[0].shipping_address.address2 && (
                               <span className="block">{selectedOrder.orders[0].shipping_address.address2}</span>
                             )}
                           </p>
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                           <div>
                             <p className="text-sm font-medium text-gray-600">City</p>
                             <p className="text-lg text-gray-900">{selectedOrder.orders[0].shipping_address.city || 'N/A'}</p>
                           </div>
                           <div>
                             <p className="text-sm font-medium text-gray-600">State</p>
                             <p className="text-lg text-gray-900">{selectedOrder.orders[0].shipping_address.state || 'N/A'}</p>
                           </div>
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                           <div>
                             <p className="text-sm font-medium text-gray-600">Postal Code</p>
                             <p className="text-lg text-gray-900">{selectedOrder.orders[0].shipping_address.postal_code || 'N/A'}</p>
                           </div>
                           <div>
                             <p className="text-sm font-medium text-gray-600">Country</p>
                             <p className="text-lg text-gray-900">{selectedOrder.orders[0].shipping_address.country || 'N/A'}</p>
                           </div>
                         </div>
                       </>
                     ) : (
                       <p className="text-gray-500">No shipping address available</p>
                     )}
                   </div>
                 </div>
               </div>

               {/* Items Section */}
               <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                 <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                   <h4 className="text-xl font-semibold text-gray-900 flex items-center">
                     <ShoppingCartIcon className="w-6 h-6 mr-3 text-gray-600" />
                     Order Items
                   </h4>
                 </div>
                 <div className="overflow-x-auto">
                   <table className="w-full">
                     <thead className="bg-gray-50">
                       <tr>
                         <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                           Product ID
                         </th>
                         <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                           Quantity
                         </th>
                         <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                           Unit Price
                         </th>
                         <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                           Total Price
                         </th>
                       </tr>
                     </thead>
                     <tbody className="bg-white divide-y divide-gray-200">
                       {selectedOrder.orders?.[0]?.items?.map((item: any, index: number) => (
                         <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                           <td className="px-6 py-4 whitespace-nowrap">
                             <span className="text-sm font-medium text-gray-900 font-mono">{item.product_id || 'N/A'}</span>
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap">
                             <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-800">
                               {item.quantity || 0}
                             </span>
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                             ${(item.unit_price || 0).toFixed(2)}
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap">
                             <span className="text-lg font-semibold text-black">
                               ${((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}
                             </span>
                           </td>
                         </tr>
                       )) || (
                         <tr>
                           <td colSpan={4} className="px-6 py-12 text-center">
                             <div className="text-gray-500">
                               <ShoppingCartIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                               <p className="text-lg font-medium">No items found</p>
                               <p className="text-sm">This order doesn't have any items associated with it.</p>
                             </div>
                           </td>
                         </tr>
                       )}
                     </tbody>
                   </table>
                 </div>
               </div>

               {/* Close Button */}
               <div className="mt-8 flex justify-center">
                 <button
                   onClick={() => setIsModalOpen(false)}
                   className="px-8 py-3 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                 >
                   Close
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}
    </div>
  )
} 
