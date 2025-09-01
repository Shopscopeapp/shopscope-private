'use client'

import { useState, useEffect } from 'react'
import { 
  UserGroupIcon, 
  ShoppingBagIcon, 
  BanknotesIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon
} from '@heroicons/react/24/outline'

interface Brand {
  id: string
  name: string
  merchant_id: string
  created_at: string
  updated_at: string
  status: string
  commission_rate: number
  logo_url?: string
  description?: string
  website_url?: string
  contact_email?: string
  contact_phone?: string
  shopify_domain?: string
  shopify_connected?: boolean
  shopify_private_app_secret?: string
  stripe_connect_id?: string
  products_count?: number
  published_products_count?: number
  total_orders: number
  total_revenue: number
  total_payouts: number
  stripe_connected: boolean
}

export default function AdminBrands() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editFormData, setEditFormData] = useState<Partial<Brand>>({})
  const [brandToDelete, setBrandToDelete] = useState<Brand | null>(null)

  useEffect(() => {
    fetchBrands()
  }, [])

  const fetchBrands = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/brands', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setBrands(data.brands)
      }
    } catch (error) {
      console.error('Failed to fetch brands:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewBrand = (brand: Brand) => {
    setSelectedBrand(brand)
    setShowModal(true)
  }

  const handleEditBrand = (brand: Brand) => {
    setEditFormData(brand)
    setShowEditModal(true)
  }

  const handleDeleteBrand = (brand: Brand) => {
    setBrandToDelete(brand)
    setShowDeleteModal(true)
  }

  const handleSaveEdit = async () => {
    if (!editFormData.id) return
    
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`/api/admin/brands/${editFormData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editFormData)
      })

      if (response.ok) {
        await fetchBrands()
        setShowEditModal(false)
        setEditFormData({})
      }
    } catch (error) {
      console.error('Failed to update brand:', error)
    }
  }

  const confirmDeleteBrand = async () => {
    if (!brandToDelete) return
    
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`/api/admin/brands/${brandToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        await fetchBrands()
        setShowDeleteModal(false)
        setBrandToDelete(null)
      }
    } catch (error) {
      console.error('Failed to delete brand:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading brands...</p>
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
              <h1 className="text-2xl font-semibold text-gray-900">Brand Management</h1>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors">
              <PlusIcon className="h-5 w-5" />
              Add Brand
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Brands</p>
                <p className="text-3xl font-bold text-gray-900">{brands.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <UserGroupIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Brands</p>
                <p className="text-3xl font-bold text-gray-900">
                  {brands.filter(b => b.status === 'active').length}
                </p>
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
                <p className="text-3xl font-bold text-gray-900">
                  {brands.reduce((sum, brand) => sum + (brand.total_orders || 0), 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <ShoppingBagIcon className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-3xl font-bold text-gray-900">
                  ${brands.reduce((sum, brand) => sum + (brand.total_revenue || 0), 0).toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <BanknotesIcon className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Brands Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">All Brands</h3>
          </div>
          
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <table className="min-w-[1200px] divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Brand
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Merchant ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Products
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Integrations
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commission
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Orders
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {brands.map((brand) => (
                  <tr key={brand.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                          <span className="text-white text-sm font-semibold">
                            {brand.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{brand.name}</div>
                          <div className="text-sm text-gray-500">
                            Created {new Date(brand.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {brand.merchant_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        brand.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {brand.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="text-sm text-gray-900">
                        {brand.products_count || 0} total
                      </div>
                      <div className="text-xs text-gray-500">
                        {brand.published_products_count || 0} published
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                            brand.stripe_connected 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            Stripe {brand.stripe_connected ? '✓' : '✗'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                            brand.shopify_connected 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            Shopify {brand.shopify_connected ? '✓' : '✗'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {brand.commission_rate}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {brand.total_orders || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${(brand.total_revenue || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewBrand(brand)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEditBrand(brand)}
                          className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-50"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBrand(brand)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Brand Detail Modal */}
      {showModal && selectedBrand && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Brand Details</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Brand Name</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedBrand.name}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Merchant ID</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedBrand.merchant_id}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Commission Rate</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedBrand.commission_rate}%</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total Orders</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedBrand.total_orders || 0}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total Revenue</label>
                  <p className="mt-1 text-sm text-gray-900">${(selectedBrand.total_revenue || 0).toLocaleString()}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Created</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(selectedBrand.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Brand Modal */}
      {showEditModal && editFormData && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Edit Brand</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Brand Name</label>
                  <input
                    type="text"
                    value={editFormData.name || ''}
                    onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Commission Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editFormData.commission_rate || ''}
                    onChange={(e) => setEditFormData({...editFormData, commission_rate: parseFloat(e.target.value)})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={editFormData.status || ''}
                    onChange={(e) => setEditFormData({...editFormData, status: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Brand Modal */}
      {showDeleteModal && brandToDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Delete Brand</h3>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Are you sure you want to delete the brand "{brandToDelete.name}"? This action cannot be undone.
                </p>
                
                <div className="flex justify-end gap-2 pt-4">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeleteBrand}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                  >
                    Delete Brand
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
