'use client'
import { useState, useEffect } from 'react'
import {
  ShoppingBagIcon,
  EyeIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'

interface Order {
  id: string
  external_order_id?: string
  brand_id?: string
  merchant_id?: string
  total_amount: number
  status: string
  created_at: string
  updated_at: string
  payment_status?: string
  fulfillment_status?: string
  brand_name?: string
  merchant_name?: string
  items_count?: number
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/orders', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setOrders(data.orders)
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order)
    setShowModal(true)
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'fulfilled':
        return 'bg-green-100 text-green-800'
      case 'pending':
      case 'processing':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'fulfilled':
        return <CheckCircleIcon className="h-4 w-4" />
      case 'pending':
      case 'processing':
        return <ClockIcon className="h-4 w-4" />
      case 'cancelled':
      case 'failed':
        return <ExclamationTriangleIcon className="h-4 w-4" />
      default:
        return <ClockIcon className="h-4 w-4" />
    }
  }

  const filteredOrders = orders.filter(order => {
    const matchesStatus = filterStatus === 'all' || order.status.toLowerCase() === filterStatus.toLowerCase()
    const matchesSearch = searchTerm === '' || 
      order.external_order_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.brand_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.merchant_name?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesStatus && matchesSearch
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Order Management</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage and monitor all system orders
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="mt-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <table className="min-w-full divide-y divide-gray-300">
              <thead>
                <tr>
                  <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Order ID</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Brand</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Merchant</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Amount</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Items</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Date</th>
                  <th className="relative py-3.5 pl-3 pr-4 sm:pr-0">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                      {order.external_order_id || order.id.slice(0, 8)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {order.brand_name || 'N/A'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {order.merchant_name || 'N/A'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                      ${order.total_amount?.toFixed(2) || '0.00'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        <span className="ml-1">{order.status}</span>
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {order.items_count || 0}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                      <button
                        onClick={() => handleViewOrder(order)}
                        className="text-gray-900 hover:text-gray-700"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Order Detail Modal */}
      {showModal && selectedOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Order Details</h3>
              <div className="space-y-3">
                <div>
                  <span className="font-medium">Order ID:</span>
                  <span className="ml-2 text-gray-600">{selectedOrder.external_order_id || selectedOrder.id}</span>
                </div>
                <div>
                  <span className="font-medium">Brand:</span>
                  <span className="ml-2 text-gray-600">{selectedOrder.brand_name || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-medium">Merchant:</span>
                  <span className="ml-2 text-gray-600">{selectedOrder.merchant_name || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-medium">Total Amount:</span>
                  <span className="ml-2 text-gray-600">${selectedOrder.total_amount?.toFixed(2) || '0.00'}</span>
                </div>
                <div>
                  <span className="font-medium">Status:</span>
                  <span className="ml-2 text-gray-600">{selectedOrder.status}</span>
                </div>
                <div>
                  <span className="font-medium">Payment Status:</span>
                  <span className="ml-2 text-gray-600">{selectedOrder.payment_status || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-medium">Fulfillment Status:</span>
                  <span className="ml-2 text-gray-600">{selectedOrder.fulfillment_status || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-medium">Items Count:</span>
                  <span className="ml-2 text-gray-600">{selectedOrder.items_count || 0}</span>
                </div>
                <div>
                  <span className="font-medium">Created:</span>
                  <span className="ml-2 text-gray-600">{new Date(selectedOrder.created_at).toLocaleString()}</span>
                </div>
                <div>
                  <span className="font-medium">Updated:</span>
                  <span className="ml-2 text-gray-600">{new Date(selectedOrder.updated_at).toLocaleString()}</span>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-700"
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
