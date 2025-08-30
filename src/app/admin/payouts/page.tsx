'use client'
import { useState, useEffect } from 'react'
import {
  BanknotesIcon,
  EyeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'

interface Payout {
  id: string
  brand_id: string
  amount: number
  commission_amount: number
  status: string
  created_at: string
  updated_at: string
  stripe_payout_id?: string
  period_start: string
  period_end: string
  order_ids: string[]
  metadata?: any
  brand_name?: string
  commission_rate?: number
  order_count?: number
}

export default function AdminPayouts() {
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchPayouts()
  }, [])

  const fetchPayouts = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/payouts', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setPayouts(data.payouts)
      }
    } catch (error) {
      console.error('Failed to fetch payouts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewPayout = (payout: Payout) => {
    setSelectedPayout(payout)
    setShowModal(true)
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'pending':
      case 'processing':
        return 'bg-yellow-100 text-yellow-800'
      case 'failed':
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'paid':
        return <CheckCircleIcon className="h-4 w-4" />
      case 'pending':
      case 'processing':
        return <ClockIcon className="h-4 w-4" />
      case 'failed':
      case 'cancelled':
        return <ExclamationTriangleIcon className="h-4 w-4" />
      default:
        return <ClockIcon className="h-4 w-4" />
    }
  }

  const filteredPayouts = payouts.filter(payout => {
    const matchesStatus = filterStatus === 'all' || payout.status.toLowerCase() === filterStatus.toLowerCase()
    const matchesSearch = searchTerm === '' || 
      payout.brand_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payout.stripe_payout_id?.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-2xl font-semibold text-gray-900">Payout Management</h1>
          <p className="mt-2 text-sm text-gray-700">
            Monitor and manage brand payouts
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button className="inline-flex items-center justify-center rounded-md border border-transparent bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 sm:w-auto">
            <ArrowDownTrayIcon className="-ml-1 mr-2 h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="mt-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search payouts..."
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
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Payouts Table */}
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <table className="min-w-full divide-y divide-gray-300">
              <thead>
                <tr>
                  <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Brand</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Amount</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Commission</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Rate</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Orders</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Period</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Created</th>
                  <th className="relative py-3.5 pl-3 pr-4 sm:pr-0">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPayouts.map((payout) => (
                  <tr key={payout.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                      {payout.brand_name || 'Unknown Brand'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                      ${payout.amount?.toFixed(2) || '0.00'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      ${payout.commission_amount?.toFixed(2) || '0.00'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {payout.commission_rate?.toFixed(1) || '0.0'}%
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {payout.order_count || 0}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(payout.status)}`}>
                        {getStatusIcon(payout.status)}
                        <span className="ml-1">{payout.status}</span>
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <div>
                        <div className="text-xs">
                          {new Date(payout.period_start).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-400">
                          to {new Date(payout.period_end).toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {new Date(payout.created_at).toLocaleDateString()}
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                      <button
                        onClick={() => handleViewPayout(payout)}
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

      {/* Payout Detail Modal */}
      {showModal && selectedPayout && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Payout Details</h3>
              <div className="space-y-3">
                <div>
                  <span className="font-medium">Brand:</span>
                  <span className="ml-2 text-gray-600">{selectedPayout.brand_name || 'Unknown Brand'}</span>
                </div>
                <div>
                  <span className="font-medium">Amount:</span>
                  <span className="ml-2 text-gray-600">${selectedPayout.amount?.toFixed(2) || '0.00'}</span>
                </div>
                <div>
                  <span className="font-medium">Commission Amount:</span>
                  <span className="ml-2 text-gray-600">${selectedPayout.commission_amount?.toFixed(2) || '0.00'}</span>
                </div>
                <div>
                  <span className="font-medium">Commission Rate:</span>
                  <span className="ml-2 text-gray-600">{selectedPayout.commission_rate?.toFixed(1) || '0.0'}%</span>
                </div>
                <div>
                  <span className="font-medium">Status:</span>
                  <span className="ml-2 text-gray-600">{selectedPayout.status}</span>
                </div>
                <div>
                  <span className="font-medium">Orders Count:</span>
                  <span className="ml-2 text-gray-600">{selectedPayout.order_count || 0}</span>
                </div>
                <div>
                  <span className="font-medium">Period Start:</span>
                  <span className="ml-2 text-gray-600">{new Date(selectedPayout.period_start).toLocaleString()}</span>
                </div>
                <div>
                  <span className="font-medium">Period End:</span>
                  <span className="ml-2 text-gray-600">{new Date(selectedPayout.period_end).toLocaleString()}</span>
                </div>
                {selectedPayout.stripe_payout_id && (
                  <div>
                    <span className="font-medium">Stripe Payout ID:</span>
                    <span className="ml-2 text-gray-600">{selectedPayout.stripe_payout_id}</span>
                  </div>
                )}
                <div>
                  <span className="font-medium">Created:</span>
                  <span className="ml-2 text-gray-600">{new Date(selectedPayout.created_at).toLocaleString()}</span>
                </div>
                <div>
                  <span className="font-medium">Updated:</span>
                  <span className="ml-2 text-gray-600">{new Date(selectedPayout.updated_at).toLocaleString()}</span>
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
