'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import {
  ShoppingBagIcon,
  PlusIcon,
  ArrowPathIcon,
  EyeIcon,
  HeartIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline'

interface Product {
  id: string
  title: string
  price: number
  compare_at_price?: number
  image_url?: string
  status: string
  shopify_product_id: string
  created_at: string
  updated_at: string
  views?: number
  likes?: number
  totalSales?: number
  totalRevenue?: number
  inventory_quantity?: number
}

export default function ProductsPage() {
  const supabase = createClientComponentClient()
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setSyncing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('updated_at')
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [brandId, setBrandId] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    draft: 0,
    archived: 0
  })

  // Fetch products and brand data
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

      // Get products with engagement data
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('brand_id', brandData.id)
        .order('updated_at', { ascending: false })

      if (productsError) throw productsError

      // Get engagement data for each product
      const productsWithEngagement = await Promise.all(
        (productsData || []).map(async (product) => {
          // Get analytics events
          const { data: events } = await supabase
            .from('brand_analytics_events')
            .select('event_type')
            .eq('brand_id', brandData.id)
            .eq('product_id', product.id)
            .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

          // Get sales data
          const { data: sales } = await supabase
            .from('order_items')
            .select('quantity, total_price')
            .eq('product_id', product.id)

          const views = events?.filter(e => e.event_type === 'product_view').length || 0
          const likes = events?.filter(e => e.event_type === 'product_swipe_right').length || 0
          const totalSales = sales?.reduce((sum, sale) => sum + (sale.quantity || 0), 0) || 0
          const totalRevenue = sales?.reduce((sum, sale) => sum + (sale.total_price || 0), 0) || 0

          return {
            ...product,
            views,
            likes,
            totalSales,
            totalRevenue
          }
        })
      )

      setProducts(productsWithEngagement)

      // Calculate stats
      const total = productsWithEngagement.length
      const active = productsWithEngagement.filter(p => p.status === 'active').length
      const draft = productsWithEngagement.filter(p => p.status === 'draft').length
      const archived = productsWithEngagement.filter(p => p.status === 'archived').length

      setStats({ total, active, draft, archived })
      setIsLoading(false)
    } catch (error) {
      console.error('Error fetching products:', error)
      setIsLoading(false)
    }
  }

  const handleSyncProducts = async () => {
    if (!brandId) return
    setSyncing(true)

    try {
      // Get brand data to get shopify_domain and access token
      const { data: brandData, error: brandError } = await supabase
        .from('brands')
        .select('shopify_domain, shopify_access_token')
        .eq('id', brandId)
        .single()

      if (brandError || !brandData) {
        throw new Error('Failed to get brand data')
      }

      if (!brandData.shopify_domain || !brandData.shopify_access_token) {
        throw new Error('Brand not connected to Shopify. Please connect your Shopify store first.')
      }

      const response = await fetch('/api/shopify/sync-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          brandId,
          shop: brandData.shopify_domain,
          accessToken: brandData.shopify_access_token
        })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to sync products')

      // Refresh data after sync
      await fetchData()
      setSyncError(null) // Clear any previous errors
    } catch (error) {
      console.error('Error syncing products:', error)
      setSyncError(error instanceof Error ? error.message : 'Failed to sync products')
    } finally {
      setSyncing(false)
    }
  }

  const handleStatusChange = async (productId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', productId)

      if (error) throw error

      // Update local state
      setProducts(prev => prev.map(p => 
        p.id === productId ? { ...p, status: newStatus } : p
      ))
    } catch (error) {
      console.error('Error updating product status:', error)
    }
  }

  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedProducts.length === 0) return

    try {
      const { error } = await supabase
        .from('products')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .in('id', selectedProducts)

      if (error) throw error

      // Update local state
      setProducts(prev => prev.map(p => 
        selectedProducts.includes(p.id) ? { ...p, status: newStatus } : p
      ))
      setSelectedProducts([])
    } catch (error) {
      console.error('Error updating product statuses:', error)
    }
  }

  // Filter and sort products
  const filteredProducts = products
    .filter(product => {
      const matchesSearch = product.title.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'all' || product.status === statusFilter
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title)
        case 'price':
          return b.price - a.price
        case 'views':
          return (b.views || 0) - (a.views || 0)
        case 'sales':
          return (b.totalSales || 0) - (a.totalSales || 0)
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      }
    })

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-shopscope-black mb-4" />
          <p className="text-shopscope-gray-600">Loading your products...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-shopscope-black mb-2">Products</h1>
          <p className="text-shopscope-gray-600">Manage your mobile marketplace product listings</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSyncProducts}
            disabled={isSyncing}
            className="btn-secondary flex items-center disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Products'}
          </button>
          <button className="btn-primary flex items-center">
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Product
          </button>
        </div>
      </div>

      {/* Sync Error Display */}
      {syncError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <ExclamationCircleIcon className="w-5 h-5 text-red-400 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Sync Error</h3>
              <p className="text-sm text-red-700 mt-1">{syncError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-shopscope-gray-600">Total Products</span>
            <ShoppingBagIcon className="w-5 h-5 text-shopscope-gray-400" />
          </div>
          <div className="text-2xl font-bold text-shopscope-black">{stats.total}</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-shopscope-gray-600">Active</span>
            <CheckCircleIcon className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-shopscope-black">{stats.active}</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-shopscope-gray-600">Draft</span>
            <PencilIcon className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="text-2xl font-bold text-shopscope-black">{stats.draft}</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-shopscope-gray-600">Archived</span>
            <XCircleIcon className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-shopscope-black">{stats.archived}</div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200 mb-8">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-shopscope-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
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
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-shopscope-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shopscope-black focus:border-transparent"
          >
            <option value="updated_at">Last Updated</option>
            <option value="title">Name</option>
            <option value="price">Price</option>
            <option value="views">Views</option>
            <option value="sales">Sales</option>
          </select>
        </div>

        {/* Bulk Actions */}
        {selectedProducts.length > 0 && (
          <div className="mt-4 p-4 bg-shopscope-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-shopscope-gray-700">
                {selectedProducts.length} product(s) selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleBulkStatusChange('active')}
                  className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded"
                >
                  Activate
                </button>
                <button
                  onClick={() => handleBulkStatusChange('draft')}
                  className="px-3 py-1 text-xs bg-yellow-100 text-yellow-800 rounded"
                >
                  Draft
                </button>
                <button
                  onClick={() => handleBulkStatusChange('archived')}
                  className="px-3 py-1 text-xs bg-red-100 text-red-800 rounded"
                >
                  Archive
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm border border-shopscope-gray-200 overflow-hidden">
        {filteredProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-shopscope-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-shopscope-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedProducts.length === filteredProducts.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProducts(filteredProducts.map(p => p.id))
                        } else {
                          setSelectedProducts([])
                        }
                      }}
                      className="rounded border-shopscope-gray-300"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-shopscope-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-shopscope-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-shopscope-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-shopscope-gray-500 uppercase tracking-wider">
                    Mobile Engagement
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-shopscope-gray-500 uppercase tracking-wider">
                    Sales
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-shopscope-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-shopscope-gray-200">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-shopscope-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProducts(prev => [...prev, product.id])
                          } else {
                            setSelectedProducts(prev => prev.filter(id => id !== product.id))
                          }
                        }}
                        className="rounded border-shopscope-gray-300"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-shopscope-gray-100 rounded-lg flex items-center justify-center mr-4">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.title}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <ShoppingBagIcon className="w-6 h-6 text-shopscope-gray-400" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-shopscope-black">{product.title}</div>
                          <div className="text-sm text-shopscope-gray-500">
                            Updated {new Date(product.updated_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={product.status}
                        onChange={(e) => handleStatusChange(product.id, e.target.value)}
                        className={`px-2 py-1 text-xs rounded-full border-none ${
                          product.status === 'active' ? 'bg-green-100 text-green-800' :
                          product.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}
                      >
                        <option value="active">Active</option>
                        <option value="draft">Draft</option>
                        <option value="archived">Archived</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-shopscope-black font-medium">
                        ${product.price.toFixed(2)}
                      </div>
                      {product.compare_at_price && product.compare_at_price > product.price && (
                        <div className="text-sm text-shopscope-gray-500 line-through">
                          ${product.compare_at_price.toFixed(2)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center text-sm text-shopscope-gray-600">
                          <EyeIcon className="w-4 h-4 mr-1" />
                          {product.views || 0}
                        </div>
                        <div className="flex items-center text-sm text-shopscope-gray-600">
                          <HeartIcon className="w-4 h-4 mr-1" />
                          {product.likes || 0}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-shopscope-black font-medium">
                        {product.totalSales || 0} sold
                      </div>
                      {(product.totalRevenue || 0) > 0 && (
                        <div className="text-sm text-green-600">
                          ${product.totalRevenue?.toFixed(2)} revenue
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button className="text-shopscope-gray-400 hover:text-shopscope-black">
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button className="text-shopscope-gray-400 hover:text-red-600">
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
            <ShoppingBagIcon className="w-12 h-12 text-shopscope-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-shopscope-black mb-2">No products found</h3>
            <p className="text-shopscope-gray-600 mb-6">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Start by syncing products from your Shopify store'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <button
                onClick={handleSyncProducts}
                disabled={isSyncing}
                className="btn-primary"
              >
                {isSyncing ? 'Syncing...' : 'Sync Products from Shopify'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 