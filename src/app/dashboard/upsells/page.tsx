'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import {
  ArrowTrendingUpIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ShoppingBagIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  StarIcon,
  FireIcon
} from '@heroicons/react/24/outline'

interface UpsellCampaign {
  id: string
  name: string
  type: 'product_recommendation' | 'bundle' | 'upgrade'
  trigger_product_id?: string
  recommended_product_ids: string[]
  active: boolean
  conversion_rate: number
  total_revenue: number
  total_views: number
  total_conversions: number
  created_at: string
  updated_at: string
  settings: {
    discount_percentage?: number
    position: 'checkout' | 'product_page' | 'cart'
    title: string
    description: string
  }
}

interface Product {
  id: string
  title: string
  price: number
  image_url?: string
}

const campaignTypeColors = {
  product_recommendation: 'bg-blue-100 text-blue-800',
  bundle: 'bg-green-100 text-green-800',
  upgrade: 'bg-purple-100 text-purple-800'
}

const positionLabels = {
  checkout: 'At Checkout',
  product_page: 'Product Page',
  cart: 'Shopping Cart'
}

export default function UpsellsPage() {
  const supabase = createClientComponentClient()
  const [campaigns, setCampaigns] = useState<UpsellCampaign[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [brandId, setBrandId] = useState<string | null>(null)
  
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalRevenue: 0,
    avgConversionRate: 0,
    totalViews: 0,
    totalConversions: 0
  })

  const [newCampaign, setNewCampaign] = useState({
    name: '',
    type: 'product_recommendation' as 'product_recommendation' | 'bundle' | 'upgrade',
    trigger_product_id: '',
    recommended_product_ids: [] as string[],
    active: true,
    settings: {
      discount_percentage: 0,
      position: 'checkout' as 'checkout' | 'product_page' | 'cart',
      title: '',
      description: ''
    }
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

      // Fetch products for the dropdowns
      const { data: productsData } = await supabase
        .from('products')
        .select('id, title, price, image_url')
        .eq('brand_id', brandData.id)
        .eq('status', 'active')

      setProducts(productsData || [])

      // Fetch upsell campaigns (this table might not exist yet, so handle gracefully)
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('upsell_campaigns')
        .select('*')
        .eq('brand_id', brandData.id)
        .order('created_at', { ascending: false })

      if (campaignsError) {
        console.error('Upsells error:', campaignsError)
        // If table doesn't exist, create some mock data for demonstration
        setCampaigns([])
      } else {
        setCampaigns(campaignsData || [])
      }

      // Calculate stats from campaigns
      const totalCampaigns = campaignsData?.length || 0
      const activeCampaigns = campaignsData?.filter(c => c.active).length || 0
      const totalRevenue = campaignsData?.reduce((sum, c) => sum + (c.total_revenue || 0), 0) || 0
      const totalViews = campaignsData?.reduce((sum, c) => sum + (c.total_views || 0), 0) || 0
      const totalConversions = campaignsData?.reduce((sum, c) => sum + (c.total_conversions || 0), 0) || 0
      const avgConversionRate = totalViews > 0 ? (totalConversions / totalViews) * 100 : 0

      setStats({
        totalCampaigns,
        activeCampaigns,
        totalRevenue,
        avgConversionRate,
        totalViews,
        totalConversions
      })

      setIsLoading(false)
    } catch (error) {
      console.error('Error fetching upsells data:', error)
      setIsLoading(false)
    }
  }

  const handleCreateCampaign = async () => {
    if (!brandId || !newCampaign.name) return

    try {
      const campaignData = {
        brand_id: brandId,
        name: newCampaign.name,
        type: newCampaign.type,
        trigger_product_id: newCampaign.trigger_product_id || null,
        recommended_product_ids: newCampaign.recommended_product_ids,
        active: newCampaign.active,
        settings: newCampaign.settings,
        conversion_rate: 0,
        total_revenue: 0,
        total_views: 0,
        total_conversions: 0
      }

      const { error } = await supabase
        .from('upsell_campaigns')
        .insert(campaignData)

      if (error) throw error

      // Reset form and refresh data
      setNewCampaign({
        name: '',
        type: 'product_recommendation',
        trigger_product_id: '',
        recommended_product_ids: [],
        active: true,
        settings: {
          discount_percentage: 0,
          position: 'checkout',
          title: '',
          description: ''
        }
      })
      setShowCreateModal(false)
      await fetchData()
    } catch (error) {
      console.error('Error creating upsell campaign:', error)
    }
  }

  const handleToggleStatus = async (campaignId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('upsell_campaigns')
        .update({ 
          active: !currentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignId)

      if (error) throw error

      setCampaigns(prev => prev.map(c => 
        c.id === campaignId ? { ...c, active: !currentStatus } : c
      ))
    } catch (error) {
      console.error('Error toggling campaign status:', error)
    }
  }

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this upsell campaign?')) return

    try {
      const { error } = await supabase
        .from('upsell_campaigns')
        .delete()
        .eq('id', campaignId)

      if (error) throw error

      setCampaigns(prev => prev.filter(c => c.id !== campaignId))
    } catch (error) {
      console.error('Error deleting campaign:', error)
    }
  }

  const getProductName = (productId: string) => {
    const product = products.find(p => p.id === productId)
    return product?.title || 'Unknown Product'
  }

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === 'all' || campaign.type === typeFilter
    return matchesSearch && matchesType
  })

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-shopscope-black mb-4" />
          <p className="text-shopscope-gray-600">Loading upsell campaigns...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-shopscope-black mb-2">Upsell Campaigns</h1>
          <p className="text-shopscope-gray-600">Boost mobile revenue with targeted product recommendations</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Create Campaign
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-shopscope-gray-600">Total Campaigns</span>
            <ArrowTrendingUpIcon className="w-5 h-5 text-shopscope-gray-400" />
          </div>
          <div className="text-2xl font-bold text-shopscope-black">{stats.totalCampaigns}</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-shopscope-gray-600">Active</span>
            <CheckCircleIcon className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-shopscope-black">{stats.activeCampaigns}</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-shopscope-gray-600">Total Views</span>
            <EyeIcon className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-shopscope-black">{stats.totalViews.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-shopscope-gray-600">Conversions</span>
            <StarIcon className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="text-2xl font-bold text-shopscope-black">{stats.totalConversions}</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-shopscope-gray-600">Conversion Rate</span>
            <ChartBarIcon className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-shopscope-black">{stats.avgConversionRate.toFixed(1)}%</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-shopscope-gray-600">Upsell Revenue</span>
            <CurrencyDollarIcon className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-shopscope-black">${stats.totalRevenue.toFixed(0)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200 mb-8">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-shopscope-gray-400" />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-shopscope-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shopscope-black focus:border-transparent"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-shopscope-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shopscope-black focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="product_recommendation">Product Recommendation</option>
            <option value="bundle">Bundle Offer</option>
            <option value="upgrade">Product Upgrade</option>
          </select>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-xl shadow-sm border border-shopscope-gray-200 overflow-hidden">
        {filteredCampaigns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-shopscope-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-shopscope-gray-500 uppercase tracking-wider">
                    Campaign
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-shopscope-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-shopscope-gray-500 uppercase tracking-wider">
                    Trigger Product
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-shopscope-gray-500 uppercase tracking-wider">
                    Performance
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-shopscope-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-shopscope-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-shopscope-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-shopscope-gray-200">
                {filteredCampaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-shopscope-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-medium text-shopscope-black">{campaign.name}</div>
                        <div className="text-sm text-shopscope-gray-500">
                          {positionLabels[campaign.settings.position]}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${campaignTypeColors[campaign.type]}`}>
                        {campaign.type.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-shopscope-black">
                        {campaign.trigger_product_id 
                          ? getProductName(campaign.trigger_product_id)
                          : 'Any Product'
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-shopscope-black">
                          {campaign.conversion_rate.toFixed(1)}% conversion
                        </div>
                        <div className="text-xs text-shopscope-gray-500">
                          {campaign.total_views} views • {campaign.total_conversions} conversions
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-shopscope-black">
                        ${campaign.total_revenue.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {campaign.active ? (
                          <CheckCircleIcon className="w-4 h-4 text-green-500 mr-1" />
                        ) : (
                          <XCircleIcon className="w-4 h-4 text-red-500 mr-1" />
                        )}
                        <span className={`text-sm ${campaign.active ? 'text-green-800' : 'text-red-800'}`}>
                          {campaign.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleToggleStatus(campaign.id, campaign.active)}
                          className={`text-sm px-2 py-1 rounded ${
                            campaign.active 
                              ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {campaign.active ? 'Disable' : 'Enable'}
                        </button>
                        <button className="text-shopscope-gray-400 hover:text-shopscope-black">
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCampaign(campaign.id)}
                          className="text-shopscope-gray-400 hover:text-red-600"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <ArrowTrendingUpIcon className="w-12 h-12 text-shopscope-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-shopscope-black mb-2">No upsell campaigns</h3>
            <p className="text-shopscope-gray-600 mb-6">
              Create your first upsell campaign to boost revenue from mobile shoppers
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              Create Upsell Campaign
            </button>
          </div>
        )}
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-shopscope-black mb-6">Create Upsell Campaign</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-shopscope-gray-700 mb-1">
                  Campaign Name
                </label>
                <input
                  type="text"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign(prev => ({ ...prev, name: e.target.value }))}
                  className="input-field"
                  placeholder="e.g. Premium Headphones Upsell"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-shopscope-gray-700 mb-1">
                  Campaign Type
                </label>
                <select
                  value={newCampaign.type}
                  onChange={(e) => setNewCampaign(prev => ({ ...prev, type: e.target.value as any }))}
                  className="input-field"
                >
                  <option value="product_recommendation">Product Recommendation</option>
                  <option value="bundle">Bundle Offer</option>
                  <option value="upgrade">Product Upgrade</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-shopscope-gray-700 mb-1">
                  Trigger Product (Optional)
                </label>
                <select
                  value={newCampaign.trigger_product_id}
                  onChange={(e) => setNewCampaign(prev => ({ ...prev, trigger_product_id: e.target.value }))}
                  className="input-field"
                >
                  <option value="">Any Product</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.title} (${product.price})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-shopscope-gray-700 mb-1">
                  Display Position
                </label>
                <select
                  value={newCampaign.settings.position}
                  onChange={(e) => setNewCampaign(prev => ({ 
                    ...prev, 
                    settings: { ...prev.settings, position: e.target.value as any }
                  }))}
                  className="input-field"
                >
                  <option value="checkout">At Checkout</option>
                  <option value="product_page">Product Page</option>
                  <option value="cart">Shopping Cart</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-shopscope-gray-700 mb-1">
                  Upsell Title
                </label>
                <input
                  type="text"
                  value={newCampaign.settings.title}
                  onChange={(e) => setNewCampaign(prev => ({ 
                    ...prev, 
                    settings: { ...prev.settings, title: e.target.value }
                  }))}
                  className="input-field"
                  placeholder="e.g. Complete your setup with these items"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-shopscope-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newCampaign.settings.description}
                  onChange={(e) => setNewCampaign(prev => ({ 
                    ...prev, 
                    settings: { ...prev.settings, description: e.target.value }
                  }))}
                  className="input-field"
                  rows={3}
                  placeholder="Describe the upsell offer..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-shopscope-gray-700 mb-1">
                  Discount Percentage (Optional)
                </label>
                <input
                  type="number"
                  value={newCampaign.settings.discount_percentage}
                  onChange={(e) => setNewCampaign(prev => ({ 
                    ...prev, 
                    settings: { ...prev.settings, discount_percentage: parseInt(e.target.value) || 0 }
                  }))}
                  className="input-field"
                  placeholder="10"
                  min="0"
                  max="50"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={newCampaign.active}
                  onChange={(e) => setNewCampaign(prev => ({ ...prev, active: e.target.checked }))}
                  className="mr-2"
                />
                <label className="text-sm font-medium text-shopscope-gray-700">
                  Active immediately
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={handleCreateCampaign}
                className="flex-1 btn-primary"
              >
                Create Campaign
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