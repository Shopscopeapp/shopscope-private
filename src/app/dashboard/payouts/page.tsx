'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import {
  BanknotesIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarIcon,
  CreditCardIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

interface Payout {
  id: string
  amount: number
  status: string
  created_at: string
  processed_at?: string
  stripe_transfer_id?: string
  description?: string
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800'
}

export default function PayoutsPage() {
  const supabase = createClientComponentClient()
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRequesting, setIsRequesting] = useState(false)
  const [brandId, setBrandId] = useState<string | null>(null)
  const [stripeConnected, setStripeConnected] = useState(false)
  const [dateRange, setDateRange] = useState('90')
  
  const [stats, setStats] = useState({
    pendingAmount: 0,
    totalPaid: 0,
    thisMonthEarnings: 0,
    lastPayoutDate: null as string | null,
    minimumPayout: 10.00 // $10 minimum payout
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
        .select('id, stripe_connect_id')
        .eq('user_id', user.id)
        .single()

      if (brandError || !brandData) return
      setBrandId(brandData.id)
      setStripeConnected(!!brandData.stripe_connect_id)

      // Calculate date range
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - parseInt(dateRange))

      // Fetch payouts
      const { data: payoutsData, error: payoutsError } = await supabase
        .from('payouts')
        .select('*')
        .eq('brand_id', brandData.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })

      if (payoutsError) {
        console.error('Payouts error:', payoutsError)
        // Continue even if payouts table doesn't exist yet
      } else {
        setPayouts(payoutsData || [])
      }

      // Get pending payout amount
      const { data: pendingAmount, error: pendingError } = await supabase
        .rpc('get_pending_payout_amount', { brand_id: brandData.id })

      if (pendingError) {
        console.error('Pending amount error:', pendingError)
      }

      // Calculate this month's earnings
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { data: monthlyOrders } = await supabase
        .from('merchant_orders')
        .select('total_amount, commission_amount')
        .eq('merchant_id', brandData.id)
        .gte('created_at', startOfMonth.toISOString())
        .eq('status', 'completed')

      const thisMonthEarnings = monthlyOrders?.reduce((sum, order) => {
        return sum + (order.total_amount - order.commission_amount)
      }, 0) || 0

      // Calculate total paid amount
      const totalPaid = payoutsData?.filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0) || 0

      // Get last payout date
      const lastPayout = payoutsData?.find(p => p.status === 'completed')
      const lastPayoutDate = lastPayout?.processed_at || null

      setStats({
        pendingAmount: pendingAmount || 0,
        totalPaid,
        thisMonthEarnings,
        lastPayoutDate,
        minimumPayout: 10.00
      })

      setIsLoading(false)
    } catch (error) {
      console.error('Error fetching payouts data:', error)
      setIsLoading(false)
    }
  }

  const handleRequestPayout = async () => {
    if (!brandId || !stripeConnected || stats.pendingAmount < stats.minimumPayout) return
    
    setIsRequesting(true)
    try {
      const response = await fetch('/api/payouts/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to request payout')

      // Refresh data after requesting
      await fetchData()
    } catch (error) {
      console.error('Error requesting payout:', error)
    } finally {
      setIsRequesting(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-4 h-4 text-green-600" />
      case 'processing':
        return <ClockIcon className="w-4 h-4 text-blue-600" />
      case 'pending':
        return <ClockIcon className="w-4 h-4 text-yellow-600" />
      case 'failed':
        return <XCircleIcon className="w-4 h-4 text-red-600" />
      default:
        return <ClockIcon className="w-4 h-4 text-gray-600" />
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-shopscope-black mb-4" />
          <p className="text-shopscope-gray-600">Loading payout information...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-shopscope-black mb-2">Payouts</h1>
          <p className="text-shopscope-gray-600">Manage your mobile marketplace earnings</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-shopscope-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shopscope-black"
          >
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="180">Last 6 months</option>
            <option value="365">Last year</option>
          </select>
        </div>
      </div>

      {/* Stripe Connection Alert */}
      {!stripeConnected && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8 rounded-r-lg">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-3" />
            <div>
              <p className="text-sm text-yellow-800">
                <strong>Stripe account required:</strong> Connect your Stripe account to receive payouts from mobile sales.
              </p>
              <button className="mt-2 text-sm font-medium text-yellow-800 underline hover:no-underline">
                Connect Stripe Account →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-shopscope-gray-600">Pending Amount</span>
            <ClockIcon className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="text-3xl font-bold text-shopscope-black mb-2">
            ${stats.pendingAmount.toFixed(2)}
          </div>
          <p className="text-xs text-shopscope-gray-500">
            Min. ${stats.minimumPayout.toFixed(2)} for payout
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-shopscope-gray-600">Total Paid</span>
            <CheckCircleIcon className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-shopscope-black mb-2">
            ${stats.totalPaid.toFixed(2)}
          </div>
          <p className="text-xs text-shopscope-gray-500">All time earnings</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-shopscope-gray-600">This Month</span>
            <BanknotesIcon className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-shopscope-black mb-2">
            ${stats.thisMonthEarnings.toFixed(2)}
          </div>
          <p className="text-xs text-shopscope-gray-500">Mobile earnings</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-shopscope-gray-600">Last Payout</span>
            <CalendarIcon className="w-5 h-5 text-shopscope-gray-400" />
          </div>
          <div className="text-lg font-bold text-shopscope-black mb-2">
            {stats.lastPayoutDate 
              ? new Date(stats.lastPayoutDate).toLocaleDateString()
              : 'Never'
            }
          </div>
          <p className="text-xs text-shopscope-gray-500">Last payment date</p>
        </div>
      </div>

      {/* Payout Request */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200 mb-8">
        <h3 className="text-lg font-semibold text-shopscope-black mb-4">Request Payout</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-shopscope-gray-600 mb-2">
              Available for payout: <span className="font-semibold text-shopscope-black">${stats.pendingAmount.toFixed(2)}</span>
            </p>
            <p className="text-sm text-shopscope-gray-500">
              {stats.pendingAmount < stats.minimumPayout
                ? `Minimum payout amount is $${stats.minimumPayout.toFixed(2)}`
                : 'Funds will be transferred to your connected Stripe account'
              }
            </p>
          </div>
          <button
            onClick={handleRequestPayout}
            disabled={isRequesting || !stripeConnected || stats.pendingAmount < stats.minimumPayout}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
            {isRequesting ? 'Requesting...' : 'Request Payout'}
          </button>
        </div>
      </div>

      {/* Payout History */}
      <div className="bg-white rounded-xl shadow-sm border border-shopscope-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-shopscope-gray-200">
          <h3 className="text-lg font-semibold text-shopscope-black">Payout History</h3>
        </div>
        
        {payouts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-shopscope-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-shopscope-gray-500 uppercase tracking-wider">
                    Date Requested
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-shopscope-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-shopscope-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-shopscope-gray-500 uppercase tracking-wider">
                    Processed Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-shopscope-gray-500 uppercase tracking-wider">
                    Transfer ID
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-shopscope-gray-200">
                {payouts.map((payout) => (
                  <tr key={payout.id} className="hover:bg-shopscope-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-shopscope-black">
                        {new Date(payout.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-shopscope-gray-500">
                        {new Date(payout.created_at).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-shopscope-black">
                        ${payout.amount.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(payout.status)}
                        <span className={`ml-2 px-2 py-1 text-xs rounded-full ${statusColors[payout.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
                          {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-shopscope-black">
                        {payout.processed_at
                          ? new Date(payout.processed_at).toLocaleDateString()
                          : '-'
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-shopscope-gray-600 font-mono">
                        {payout.stripe_transfer_id || '-'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <BanknotesIcon className="w-12 h-12 text-shopscope-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-shopscope-black mb-2">No payouts yet</h3>
            <p className="text-shopscope-gray-600 mb-6">
              Your payout history will appear here once you request your first payout
            </p>
            {!stripeConnected && (
              <button className="btn-primary">
                Connect Stripe to Enable Payouts
              </button>
            )}
          </div>
        )}
      </div>

      {/* Information Box */}
      <div className="mt-8 bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
        <div className="flex items-start">
          <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-blue-800 mb-2">Payout Information</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Payouts are processed within 2-3 business days</li>
              <li>• Minimum payout amount is ${stats.minimumPayout.toFixed(2)}</li>
              <li>• Funds are transferred directly to your Stripe account</li>
              <li>• Earnings are calculated after ShopScope's 10% commission</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
} 