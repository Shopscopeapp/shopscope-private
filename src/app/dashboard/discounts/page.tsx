'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import {
  TagIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ClipboardDocumentIcon,
  CalendarIcon,
  PercentBadgeIcon,
  UsersIcon,
  ShoppingCartIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

interface Discount {
  id: string
  code: string
  type: 'percentage' | 'fixed'
  value: number
  minimum_amount?: number
  usage_limit?: number
  used_count: number
  active: boolean
  starts_at: string
  expires_at?: string
  created_at: string
  updated_at: string
  shopify_discount_id?: string
}

const statusColors = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  expired: 'bg-red-100 text-red-800',
  scheduled: 'bg-blue-100 text-blue-800'
}

export default function DiscountsPage() {
  const supabase = createClientComponentClient()
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [brandId, setBrandId] = useState<string | null>(null)
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    totalUses: 0,
    totalSavings: 0
  })

  const [newDiscount, setNewDiscount] = useState({
    code: '',
    type: 'percentage' as 'percentage' | 'fixed',
    value: 0,
    minimum_amount: '',
    usage_limit: '',
    expires_at: '',
    active: true
  })

  useEffect(() => {
    fetchData()
  }, [])

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

      // Fetch discount codes
      const { data: discountsData, error: discountsError } = await supabase
        .from('discount_codes')
        .select('*')
        .eq('brand_id', brandData.id)
        .order('created_at', { ascending: false })

      if (discountsError) {
        console.error('Discounts error:', discountsError)
        setDiscounts([])
      } else {
        setDiscounts(discountsData || [])
      }

      // Calculate stats
      const total = discountsData?.length || 0
      const active = discountsData?.filter(d => d.active).length || 0
      const totalUses = discountsData?.reduce((sum, d) => sum + d.used_count, 0) || 0
      const totalSavings = discountsData?.reduce((sum, d) => {
        if (d.type === 'percentage') {
          // This is a rough estimate - would need order data for accurate calculation
          return sum + (d.used_count * d.value * 10) // Assuming $100 average order
        } else {
          return sum + (d.used_count * d.value)
        }
      }, 0) || 0

      setStats({ total, active, totalUses, totalSavings })
      setIsLoading(false)
    } catch (error) {
      console.error('Error fetching discounts:', error)
      setIsLoading(false)
    }
  }

  const handleCreateDiscount = async () => {
    if (!brandId || !newDiscount.code) return

    try {
      const discountData = {
        brand_id: brandId,
        code: newDiscount.code.toUpperCase(),
        type: newDiscount.type,
        value: newDiscount.value,
        minimum_amount: newDiscount.minimum_amount ? parseFloat(newDiscount.minimum_amount) : null,
        usage_limit: newDiscount.usage_limit ? parseInt(newDiscount.usage_limit) : null,
        expires_at: newDiscount.expires_at || null,
        active: newDiscount.active,
        used_count: 0,
        starts_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('discount_codes')
        .insert(discountData)

      if (error) throw error

      // Reset form and refresh data
      setNewDiscount({
        code: '',
        type: 'percentage',
        value: 0,
        minimum_amount: '',
        usage_limit: '',
        expires_at: '',
        active: true
      })
      setShowCreateModal(false)
      await fetchData()
    } catch (error) {
      console.error('Error creating discount:', error)
    }
  }

  const handleToggleStatus = async (discountId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('discount_codes')
        .update({ 
          active: !currentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', discountId)

      if (error) throw error

      // Update local state
      setDiscounts(prev => prev.map(d => 
        d.id === discountId ? { ...d, active: !currentStatus } : d
      ))
    } catch (error) {
      console.error('Error toggling discount status:', error)
    }
  }

  const handleDeleteDiscount = async (discountId: string) => {
    if (!confirm('Are you sure you want to delete this discount code?')) return

    try {
      const { error } = await supabase
        .from('discount_codes')
        .delete()
        .eq('id', discountId)

      if (error) throw error

      setDiscounts(prev => prev.filter(d => d.id !== discountId))
    } catch (error) {
      console.error('Error deleting discount:', error)
    }
  }

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
    // You could add a toast notification here
  }

  const getDiscountStatus = (discount: Discount) => {
    const now = new Date()
    const startsAt = new Date(discount.starts_at)
    const expiresAt = discount.expires_at ? new Date(discount.expires_at) : null
    
    if (!discount.active) return 'inactive'
    if (expiresAt && now > expiresAt) return 'expired'
    if (startsAt > now) return 'scheduled'
    return 'active'
  }

  const filteredDiscounts = discounts.filter(discount => {
    const matchesSearch = discount.code.toLowerCase().includes(searchTerm.toLowerCase())
    const status = getDiscountStatus(discount)
    const matchesStatus = statusFilter === 'all' || status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-shopscope-black mb-4" />
          <p className="text-shopscope-gray-600">Loading discount codes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-shopscope-black mb-2">Discount Codes</h1>
          <p className="text-shopscope-gray-600">Create and manage discount codes for mobile shoppers</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Create Discount
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-shopscope-gray-600">Total Codes</span>
            <TagIcon className="w-5 h-5 text-shopscope-gray-400" />
          </div>
          <div className="text-2xl font-bold text-shopscope-black">{stats.total}</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-shopscope-gray-600">Active Codes</span>
            <CheckCircleIcon className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-shopscope-black">{stats.active}</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-shopscope-gray-600">Total Uses</span>
            <UsersIcon className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-shopscope-black">{stats.totalUses}</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-shopscope-gray-600">Total Savings</span>
            <ShoppingCartIcon className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-shopscope-black">${stats.totalSavings.toFixed(0)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200 mb-8">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-shopscope-gray-400" />
            <input
              type="text"
              placeholder="Search discount codes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-shopscope-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shopscope-black focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-shopscope-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shopscope-black focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="expired">Expired</option>
            <option value="scheduled">Scheduled</option>
          </select>
        </div>
      </div>

      {/* Discounts Table */}
      <div className="bg-white rounded-xl shadow-sm border border-shopscope-gray-200 overflow-hidden">
        {filteredDiscounts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-shopscope-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-shopscope-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-shopscope-gray-500 uppercase tracking-wider">
                    Type & Value
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-shopscope-gray-500 uppercase tracking-wider">
                    Usage
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-shopscope-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-shopscope-gray-500 uppercase tracking-wider">
                    Expires
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-shopscope-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-shopscope-gray-200">
                {filteredDiscounts.map((discount) => {
                  const status = getDiscountStatus(discount)
                  return (
                    <tr key={discount.id} className="hover:bg-shopscope-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="font-mono font-bold text-shopscope-black bg-shopscope-gray-100 px-2 py-1 rounded">
                            {discount.code}
                          </div>
                          <button
                            onClick={() => copyToClipboard(discount.code)}
                            className="ml-2 text-shopscope-gray-400 hover:text-shopscope-black"
                            title="Copy code"
                          >
                            <ClipboardDocumentIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-medium text-shopscope-black">
                            {discount.type === 'percentage' ? `${discount.value}% off` : `$${discount.value} off`}
                          </div>
                          {discount.minimum_amount && (
                            <div className="text-sm text-shopscope-gray-500">
                              Min. ${discount.minimum_amount}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-medium text-shopscope-black">
                            {discount.used_count} uses
                          </div>
                          {discount.usage_limit && (
                            <div className="text-sm text-shopscope-gray-500">
                              Limit: {discount.usage_limit}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${statusColors[status as keyof typeof statusColors]}`}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-shopscope-gray-600">
                          {discount.expires_at 
                            ? new Date(discount.expires_at).toLocaleDateString()
                            : 'Never'
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleToggleStatus(discount.id, discount.active)}
                            className={`text-sm px-2 py-1 rounded ${
                              discount.active 
                                ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {discount.active ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            onClick={() => handleDeleteDiscount(discount.id)}
                            className="text-shopscope-gray-400 hover:text-red-600"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <TagIcon className="w-12 h-12 text-shopscope-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-shopscope-black mb-2">No discount codes</h3>
            <p className="text-shopscope-gray-600 mb-6">
              Create your first discount code to start offering promotions to mobile shoppers
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              Create Discount Code
            </button>
          </div>
        )}
      </div>

      {/* Create Discount Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-shopscope-black mb-6">Create Discount Code</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-shopscope-gray-700 mb-1">
                  Discount Code
                </label>
                <input
                  type="text"
                  value={newDiscount.code}
                  onChange={(e) => setNewDiscount(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  className="input-field font-mono"
                  placeholder="e.g. MOBILE20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-shopscope-gray-700 mb-1">
                  Discount Type
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="percentage"
                      checked={newDiscount.type === 'percentage'}
                      onChange={(e) => setNewDiscount(prev => ({ ...prev, type: e.target.value as 'percentage' }))}
                      className="mr-2"
                    />
                    Percentage
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="fixed"
                      checked={newDiscount.type === 'fixed'}
                      onChange={(e) => setNewDiscount(prev => ({ ...prev, type: e.target.value as 'fixed' }))}
                      className="mr-2"
                    />
                    Fixed Amount
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-shopscope-gray-700 mb-1">
                  Value {newDiscount.type === 'percentage' ? '(%)' : '($)'}
                </label>
                <input
                  type="number"
                  value={newDiscount.value}
                  onChange={(e) => setNewDiscount(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                  className="input-field"
                  placeholder={newDiscount.type === 'percentage' ? '20' : '10.00'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-shopscope-gray-700 mb-1">
                  Minimum Order Amount (optional)
                </label>
                <input
                  type="number"
                  value={newDiscount.minimum_amount}
                  onChange={(e) => setNewDiscount(prev => ({ ...prev, minimum_amount: e.target.value }))}
                  className="input-field"
                  placeholder="50.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-shopscope-gray-700 mb-1">
                  Usage Limit (optional)
                </label>
                <input
                  type="number"
                  value={newDiscount.usage_limit}
                  onChange={(e) => setNewDiscount(prev => ({ ...prev, usage_limit: e.target.value }))}
                  className="input-field"
                  placeholder="100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-shopscope-gray-700 mb-1">
                  Expiry Date (optional)
                </label>
                <input
                  type="datetime-local"
                  value={newDiscount.expires_at}
                  onChange={(e) => setNewDiscount(prev => ({ ...prev, expires_at: e.target.value }))}
                  className="input-field"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={newDiscount.active}
                  onChange={(e) => setNewDiscount(prev => ({ ...prev, active: e.target.checked }))}
                  className="mr-2"
                />
                <label className="text-sm font-medium text-shopscope-gray-700">
                  Active immediately
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={handleCreateDiscount}
                className="flex-1 btn-primary"
              >
                Create Discount
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 