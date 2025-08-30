'use client'
import { useState, useEffect } from 'react'
import {
  CubeIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

interface Product {
  id: string
  title: string
  brand_id?: string
  status: string
  created_at: string
  updated_at: string
  description?: string
  price?: number
  sale_price?: number
  inventory_count?: number
  category?: string
  brand?: string
  published_to_shopscope?: boolean
  validation_status?: string
  brand_name?: string
  variant_count?: number
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/products', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setProducts(data.products)
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product)
    setShowModal(true)
  }

  const handleEditProduct = (product: Product) => {
    setEditingProduct({ ...product })
    setShowEditModal(true)
  }

  const handleDeleteProduct = (product: Product) => {
    setDeletingProduct(product)
    setShowDeleteModal(true)
  }

  const confirmDeleteProduct = async () => {
    if (!deletingProduct) return

    try {
      setActionLoading(true)
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`/api/admin/products/${deletingProduct.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        // Remove product from local state
        setProducts(products.filter(p => p.id !== deletingProduct.id))
        setShowDeleteModal(false)
        setDeletingProduct(null)
      } else {
        console.error('Failed to delete product')
      }
    } catch (error) {
      console.error('Error deleting product:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!editingProduct) return

    try {
      setActionLoading(true)
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`/api/admin/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingProduct)
      })

      if (response.ok) {
        // Update product in local state
        setProducts(products.map(p => 
          p.id === editingProduct.id ? editingProduct : p
        ))
        setShowEditModal(false)
        setEditingProduct(null)
      } else {
        console.error('Failed to update product')
      }
    } catch (error) {
      console.error('Error updating product:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'published':
        return 'bg-green-100 text-green-800'
      case 'pending':
      case 'draft':
        return 'bg-yellow-100 text-yellow-800'
      case 'inactive':
      case 'archived':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'published':
        return <CheckCircleIcon className="h-4 w-4" />
      case 'pending':
      case 'draft':
        return <ClockIcon className="h-4 w-4" />
      case 'inactive':
      case 'archived':
        return <ExclamationTriangleIcon className="h-4 w-4" />
      default:
        return <ClockIcon className="h-4 w-4" />
    }
  }

  const filteredProducts = products.filter(product => {
    const matchesStatus = filterStatus === 'all' || product.status.toLowerCase() === filterStatus.toLowerCase()
    const matchesSearch = searchTerm === '' || 
      product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brand_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-2xl font-semibold text-gray-900">Product Management</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage and monitor all system products
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button className="inline-flex items-center justify-center rounded-md border border-transparent bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 sm:w-auto">
            <PlusIcon className="-ml-1 mr-2 h-4 w-4" />
            Add Product
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
              placeholder="Search products..."
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
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="draft">Draft</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="mt-8 flow-root">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-gray-300">
              <thead>
                <tr>
                  <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 w-64">Product</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 w-32">Brand</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 w-24">Price</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 w-20">Status</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 w-20">Variants</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 w-24">Published</th>
                  <th className="relative py-3.5 pl-3 pr-4 sm:pr-0 w-20">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="py-4 pl-4 pr-3">
                      <div className="max-w-xs">
                        <div className="text-sm font-medium text-gray-900 truncate">{product.title}</div>
                        {product.description && (
                          <div className="text-sm text-gray-500 truncate">
                            {product.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500">
                      <div className="max-w-24 truncate">
                        {product.brand_name || product.brand || 'N/A'}
                      </div>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-900">
                      <div className="text-sm font-medium">${product.price?.toFixed(2) || '0.00'}</div>
                      {product.sale_price && product.sale_price < (product.price || 0) && (
                        <div className="text-sm text-red-600 line-through">
                          ${product.sale_price.toFixed(2)}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(product.status)}`}>
                        {getStatusIcon(product.status)}
                        <span className="ml-1">{product.status}</span>
                      </span>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500">
                      {product.variant_count || 0}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        product.published_to_shopscope ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {product.published_to_shopscope ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="relative py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleViewProduct(product)}
                          className="text-gray-900 hover:text-gray-700 p-1 rounded hover:bg-gray-100"
                          title="View Product"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleEditProduct(product)}
                          className="text-gray-900 hover:text-gray-700 p-1 rounded hover:bg-gray-100" 
                          title="Edit Product"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteProduct(product)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50" 
                          title="Delete Product"
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

      {/* Product Detail Modal */}
      {showModal && selectedProduct && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Product Details</h3>
              <div className="space-y-3">
                <div>
                  <span className="font-medium">Title:</span>
                  <span className="ml-2 text-gray-600">{selectedProduct.title}</span>
                </div>
                <div>
                  <span className="font-medium">Brand:</span>
                  <span className="ml-2 text-gray-600">{selectedProduct.brand_name || selectedProduct.brand || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-medium">Category:</span>
                  <span className="ml-2 text-gray-600">{selectedProduct.category || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-medium">Price:</span>
                  <span className="ml-2 text-gray-600">${selectedProduct.price?.toFixed(2) || '0.00'}</span>
                </div>
                {selectedProduct.sale_price && (
                  <div>
                    <span className="font-medium">Sale Price:</span>
                    <span className="ml-2 text-red-600">${selectedProduct.sale_price.toFixed(2)}</span>
                  </div>
                )}
                <div>
                  <span className="font-medium">Inventory:</span>
                  <span className="ml-2 text-gray-600">{selectedProduct.inventory_count || 0}</span>
                </div>
                <div>
                  <span className="font-medium">Status:</span>
                  <span className="ml-2 text-gray-600">{selectedProduct.status}</span>
                </div>
                <div>
                  <span className="font-medium">Variants:</span>
                  <span className="ml-2 text-gray-600">{selectedProduct.variant_count || 0}</span>
                </div>
                <div>
                  <span className="font-medium">Published:</span>
                  <span className="ml-2 text-gray-600">{selectedProduct.published_to_shopscope ? 'Yes' : 'No'}</span>
                </div>
                <div>
                  <span className="font-medium">Validation:</span>
                  <span className="ml-2 text-gray-600">{selectedProduct.validation_status || 'N/A'}</span>
                </div>
                {selectedProduct.description && (
                  <div>
                    <span className="font-medium">Description:</span>
                    <div className="mt-1 text-sm text-gray-600 max-h-20 overflow-y-auto">
                      {selectedProduct.description}
                    </div>
                  </div>
                )}
                <div>
                  <span className="font-medium">Created:</span>
                  <span className="ml-2 text-gray-600">{new Date(selectedProduct.created_at).toLocaleString()}</span>
                </div>
                <div>
                  <span className="font-medium">Updated:</span>
                  <span className="ml-2 text-gray-600">{new Date(selectedProduct.updated_at).toLocaleString()}</span>
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

      {/* Edit Product Modal */}
      {showEditModal && editingProduct && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Product</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Title</label>
                  <input
                    type="text"
                    value={editingProduct.title}
                    onChange={(e) => setEditingProduct({...editingProduct, title: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={editingProduct.status}
                    onChange={(e) => setEditingProduct({...editingProduct, status: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="pending">Pending</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingProduct.price || ''}
                    onChange={(e) => setEditingProduct({...editingProduct, price: parseFloat(e.target.value) || 0})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Inventory Count</label>
                  <input
                    type="number"
                    value={editingProduct.inventory_count || ''}
                    onChange={(e) => setEditingProduct({...editingProduct, inventory_count: parseInt(e.target.value) || 0})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <input
                    type="text"
                    value={editingProduct.category || ''}
                    onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingProduct && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Delete</h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete "{deletingProduct.title}"? This action cannot be undone.
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteProduct}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Deleting...' : 'Delete Product'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
