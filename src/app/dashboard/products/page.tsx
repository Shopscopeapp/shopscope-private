'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getAIStatus, checkAIServiceHealth } from '@/lib/ai-integration'

// Product Variants Details Component
function ProductVariantsDetails({ productId }: { productId: string }) {
  const [variants, setVariants] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchVariants = async () => {
      try {
        const { data, error } = await supabase
          .from('product_variants')
          .select('*')
          .eq('product_id', productId)
          .order('price', { ascending: true })

        if (error) throw error
        setVariants(data || [])
      } catch (error) {
        console.error('Error fetching variants:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchVariants()
  }, [productId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-shopscope-black" />
      </div>
    )
  }

  if (variants.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-shopscope-gray-500">
        No variants found
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-shopscope-black">Product Variants</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {variants.map((variant) => (
          <div key={variant.id} className="bg-white p-4 rounded-lg border border-shopscope-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h5 className="font-medium text-shopscope-black">{variant.title}</h5>
              <span className={`px-2 py-1 text-xs rounded-full ${
                variant.inventory_quantity > 0 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {variant.inventory_quantity > 0 ? 'In Stock' : 'Out of Stock'}
              </span>
            </div>
            
            <div className="space-y-2 text-sm">
              {variant.sku && (
                <div className="text-shopscope-gray-600">
                  <span className="font-medium">SKU:</span> {variant.sku}
                </div>
              )}
              
              {variant.size && (
                <div className="text-shopscope-gray-600">
                  <span className="font-medium">Size:</span> {variant.size}
                </div>
              )}
              
              {variant.option1_name && variant.option1_value && (
                <div className="text-shopscope-gray-600">
                  <span className="font-medium">{variant.option1_name}:</span> {variant.option1_value}
                </div>
              )}
              
              {variant.option2_name && variant.option2_value && (
                <div className="text-shopscope-gray-600">
                  <span className="font-medium">{variant.option2_name}:</span> {variant.option2_value}
                </div>
              )}
              
              {variant.option3_name && variant.option3_value && (
                <div className="text-shopscope-gray-600">
                  <span className="font-medium">{variant.option3_name}:</span> {variant.option3_value}
                </div>
              )}
              
              <div className="flex items-center justify-between pt-2 border-t border-shopscope-gray-100">
                <div className="text-shopscope-black font-medium">
                  ${parseFloat(variant.price).toFixed(2)}
                </div>
                <div className="text-shopscope-gray-500">
                  Stock: {variant.inventory_quantity}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

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
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'

interface Product {
  id: string
  title: string
  price: number
  sale_price?: number
  image_url?: string
  images?: Array<{ src: string; alt?: string }>
  status: string
  shopify_product_id: string
  created_at: string
  updated_at: string
  views_count?: number
  likes_count?: number
  inventory_count?: number
  category?: string
  brand?: string
  variant_count?: number
  variant_sizes?: string[]
}

export default function ProductsPage() {

  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('updated_at')
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [expandedProducts, setExpandedProducts] = useState<string[]>([])
  const [brandId, setBrandId] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    draft: 0,
    archived: 0
  })
  const [aiStatus, setAiStatus] = useState<any>(null)
  const [aiServiceHealth, setAiServiceHealth] = useState<{ status: string; message?: string; error?: string } | null>(null)

  // Fetch products and brand data
  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (products.length > 0) {
      fetchAIStatus();
    }
  }, [products]);

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

      // Get variant information for each product
      const productsWithVariants = await Promise.all(
        (productsData || []).map(async (product) => {
          const { data: variants, error: variantsError } = await supabase
            .from('product_variants')
            .select('size, option1_value, option1, option2_value')
            .eq('product_id', product.id)

          if (variantsError) {
            console.error('Error fetching variants:', variantsError)
            return { ...product, variant_count: 0, variant_sizes: [] }
          }

          const variantSizes = variants
            ?.map(v => v.size || v.option1_value || v.option1)
            .filter(Boolean)
            .filter((size, index, arr) => arr.indexOf(size) === index) // Remove duplicates

          // Debug logging for size extraction
          console.log(`Product ${product.title} variants:`, variants?.map(v => ({
            size: v.size,
            option1_value: v.option1_value,
            option1: v.option1,
            extracted_sizes: variantSizes
          })))

          return {
            ...product,
            variant_count: variants?.length || 0,
            variant_sizes: variantSizes || []
          }
        })
      )

      if (productsError) throw productsError

      // Get engagement data for each product
      const productsWithEngagement = await Promise.all(
        productsWithVariants.map(async (product) => {
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

          // Note: We'll use the existing views_count and likes_count from the database
          // For now, we'll skip the complex analytics calculation
          return {
            ...product
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
    setIsSyncing(true)

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
      setIsSyncing(false)
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

  const toggleProductExpansion = (productId: string) => {
    setExpandedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
  }

  const fetchAIStatus = async () => {
    try {
      // Get brand ID from the state variable
      if (brandId) {
        console.log('🔍 Fetching AI status for brand:', brandId);
        const status = await getAIStatus(brandId);
        console.log('🔍 AI status result:', status);
        setAiStatus(status);
      }
      
      // Check AI service health
      console.log('🔍 Checking AI service health...');
      const health = await checkAIServiceHealth();
      console.log('🔍 AI service health result:', health);
      setAiServiceHealth(health);
    } catch (error) {
      console.error('Error fetching AI status:', error);
      setAiServiceHealth({ status: 'unhealthy', error: 'Failed to check health' });
    }
  };

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
          return (b.views_count || 0) - (a.views_count || 0)
        case 'sales':
          return 0 // We don't have sales data in the current schema
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

      {/* AI Status Section */}
      <div className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-200">
        <div className="flex items-center mb-4">
          <SparklesIcon className="h-6 w-6 text-purple-600 mr-2" />
          <h2 className="text-lg font-semibold text-purple-900">AI/ML Integration Status</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* AI Service Health */}
          <div className="bg-white rounded-lg p-4 border">
            <div className="flex items-center mb-2">
              {aiServiceHealth?.status === 'healthy' ? (
                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
              ) : aiServiceHealth?.status === 'unhealthy' ? (
                <XCircleIcon className="h-5 w-5 text-red-500 mr-2" />
              ) : (
                <ArrowPathIcon className="h-5 w-5 text-gray-400 mr-2 animate-spin" />
              )}
              <span className="font-medium">AI Service</span>
            </div>
            <p className="text-sm text-gray-600">
              {aiServiceHealth?.status === 'healthy' ? 'Healthy' : 
               aiServiceHealth?.status === 'unhealthy' ? 'Unavailable' : 'Checking...'}
            </p>
            {aiServiceHealth?.status === 'unhealthy' && (
              <p className="text-xs text-red-600 mt-1">
                {aiServiceHealth.message || aiServiceHealth.error || 'Service may be down'}
              </p>
            )}
          </div>

          {/* Products with Embeddings */}
          <div className="bg-white rounded-lg p-4 border">
            <div className="flex items-center mb-2">
              <SparklesIcon className="h-5 w-5 text-blue-500 mr-2" />
              <span className="font-medium">AI Processed</span>
            </div>
            <p className="text-sm text-gray-600">
              {aiStatus ? `${aiStatus.products_with_embeddings || 0} / ${aiStatus.total_products || 0}` : 
               aiServiceHealth?.status === 'unhealthy' ? 'Service Unavailable' : 'Loading...'}
            </p>
          </div>

          {/* Embedding Coverage */}
          <div className="bg-white rounded-lg p-4 border">
            <div className="flex items-center mb-2">
              <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
              <span className="font-medium">Coverage</span>
            </div>
            <p className="text-sm text-gray-600">
              {aiStatus ? aiStatus.embedding_coverage || '0%' : 
               aiServiceHealth?.status === 'unhealthy' ? 'N/A' : 'Loading...'}
            </p>
        </div>
        </div>

        {aiServiceHealth?.status === 'unhealthy' ? (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2" />
              <div>
                <p className="text-sm text-yellow-800 font-medium">AI Service Temporarily Unavailable</p>
                <p className="text-xs text-yellow-700">
                  {aiServiceHealth.message || aiServiceHealth.error || 'Your products will still sync to the database. AI processing will resume when the service is back online.'}
                </p>
              </div>
            </div>
          </div>
        ) : aiStatus ? (
          <div className="mt-4 text-sm text-gray-600">
            <p>Products are automatically synced to our AI service for enhanced recommendations and search capabilities.</p>
          </div>
        ) : (
          <div className="mt-4 text-sm text-gray-600">
            <p>Checking AI integration status...</p>
          </div>
        )}
      </div>

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
                    Variants
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
                           {product.images && product.images.length > 0 && product.images[0]?.src ? (
                            <img
                               src={product.images[0].src}
                               alt={product.images[0].alt || product.title}
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
                                             {product.sale_price && product.sale_price > product.price && (
                        <div className="text-sm text-shopscope-gray-500 line-through">
                           ${product.sale_price.toFixed(2)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-shopscope-gray-600">
                        <div className="font-medium">{product.variant_count || 0} variants</div>
                        {product.variant_count > 0 && (
                          <button
                            onClick={() => toggleProductExpansion(product.id)}
                            className="text-xs text-blue-600 hover:text-blue-800 underline cursor-pointer"
                          >
                            {expandedProducts.includes(product.id) ? 'Hide details' : 'Show details'}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center text-sm text-shopscope-gray-600">
                          <EyeIcon className="w-4 h-4 mr-1" />
                           {product.views_count || 0}
                        </div>
                        <div className="flex items-center text-sm text-shopscope-gray-600">
                          <HeartIcon className="w-4 h-4 mr-1" />
                           {product.likes_count || 0}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-shopscope-black font-medium">
                         {/* Sales data not available in current schema */}
                         No sales data
                        </div>
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
                
                {/* Expanded Variant Details Rows */}
                {filteredProducts.map((product) => 
                  expandedProducts.includes(product.id) && product.variant_count > 0 ? (
                    <tr key={`${product.id}-variants`} className="bg-gray-50">
                      <td colSpan={8} className="px-6 py-4">
                        <ProductVariantsDetails productId={product.id} />
                      </td>
                    </tr>
                  ) : null
                )}
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