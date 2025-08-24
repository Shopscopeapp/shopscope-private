'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Image from 'next/image'

interface Product {
  id: string
  title: string
  price: number
  image_url: string
  upsell_status: 'active' | 'inactive'
  upsell_type: 'notification' | 'wishlist' | 'discount'
  discount_amount?: number
  notification_message?: string
  engagement_score: number
}

interface UpsellProductListProps {
  brandId: string | undefined
}

export default function UpsellProductList({ brandId }: UpsellProductListProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [credits, setCredits] = useState(0)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const loadProducts = async () => {
      if (!brandId) {
        console.log('No brandId provided')
        setIsLoading(false)
        return
      }

      try {
        console.log('Loading products for brandId:', brandId)

        // Get the brand's credits
        const { data: brandData, error: brandError } = await supabase
          .from('brands')
          .select('id, upsell_credits')
          .eq('id', brandId)
          .single()

        if (brandError) {
          console.error('Error fetching brand:', brandError)
          setIsLoading(false)
          return
        }

        console.log('Brand data found:', brandData)

        // Fetch products with their upsell status
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .eq('brand_id', brandId)
          .eq('status', 'active')
          .order('engagement_score', { ascending: false })

        if (productsError) {
          console.error('Error fetching products:', productsError)
          throw productsError
        }

        console.log('Products found:', productsData?.length || 0)
        setProducts(productsData || [])
        setCredits(brandData?.upsell_credits || 0)
      } catch (error) {
        console.error('Error loading products:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadProducts()
  }, [brandId, supabase])

  const updateUpsellStatus = async (productId: string, status: 'active' | 'inactive') => {
    if (status === 'active' && credits <= 0) {
      alert('You need to purchase more credits to activate upsells')
      return
    }

    try {
      const { error } = await supabase
        .from('products')
        .update({ upsell_status: status })
        .eq('id', productId)
        .eq('brand_id', brandId)

      if (error) throw error

      // Update credits if activating an upsell
      if (status === 'active') {
        const { error: creditsError } = await supabase
          .from('brands')
          .update({ upsell_credits: credits - 1 })
          .eq('id', brandId)

        if (creditsError) throw creditsError
        setCredits(credits - 1)
      }

      setProducts(products.map(product => 
        product.id === productId 
          ? { ...product, upsell_status: status }
          : product
      ))
    } catch (error) {
      console.error('Error updating upsell status:', error)
    }
  }

  const updateUpsellSettings = async (
    productId: string,
    settings: {
      upsell_type: 'notification' | 'wishlist' | 'discount'
      discount_amount?: number
      notification_message?: string
    }
  ) => {
    try {
      const { error } = await supabase
        .from('products')
        .update(settings)
        .eq('id', productId)

      if (error) throw error

      setProducts(products.map(product =>
        product.id === productId
          ? { ...product, ...settings }
          : product
      ))
    } catch (error) {
      console.error('Error updating upsell settings:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-shopscope-black"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Credits Section */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h3 className="text-lg font-medium">Upsell Credits</h3>
            <p className="text-sm text-shopscope-gray-600">You have {credits} credits remaining</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <button
              onClick={() => alert('Credit purchase feature coming soon!')}
              className="w-full sm:w-auto px-4 py-2 text-white rounded-lg text-sm bg-shopscope-black hover:bg-shopscope-gray-800"
            >
              Buy 50 Credits ($75)
            </button>
            <button
              onClick={() => alert('Credit purchase feature coming soon!')}
              className="w-full sm:w-auto px-4 py-2 text-white rounded-lg text-sm bg-shopscope-black hover:bg-shopscope-gray-800"
            >
              Buy 100 Credits ($120)
            </button>
          </div>
        </div>
      </div>

      {/* Products List/Table */}
      <div className="bg-white rounded-lg shadow">
        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-full divide-y divide-shopscope-gray-200">
            <thead className="bg-shopscope-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-shopscope-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-shopscope-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-shopscope-gray-500 uppercase tracking-wider">
                  Upsell Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-shopscope-gray-500 uppercase tracking-wider">
                  Engagement
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-shopscope-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-shopscope-gray-200">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-shopscope-gray-500">
                    No products found. Sync your products from Shopify first.
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          {product.image_url ? (
                            <Image
                              className="h-10 w-10 rounded-full object-cover"
                              src={product.image_url.replace(/['"]+/g, '')}
                              alt={product.title}
                              width={40}
                              height={40}
                              placeholder="blur"
                              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABQODxIPDRQSEBIXFRQdHx4eHRoaHSQtJSEkLUEwLi0tLTAtQFBGRjpGQC0uRk5ITU9OQVBXV1pXXnZ2e4aGnP/2wBDARUXFyYaJh8wMD5mbXFycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnP/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-shopscope-gray-200 flex items-center justify-center">
                              <svg className="h-6 w-6 text-shopscope-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-shopscope-black">
                            {product.title}
                          </div>
                          <div className="text-sm text-shopscope-gray-500">
                            ${product.price.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          product.upsell_status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-shopscope-gray-100 text-shopscope-gray-800'
                        }`}
                      >
                        {product.upsell_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-shopscope-gray-500">
                      {product.upsell_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-shopscope-gray-500">
                      {product.engagement_score}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => updateUpsellStatus(
                          product.id,
                          product.upsell_status === 'active' ? 'inactive' : 'active'
                        )}
                        className={`text-shopscope-black hover:text-shopscope-gray-700 ${
                          product.upsell_status === 'inactive' && credits <= 0
                            ? 'opacity-50 cursor-not-allowed'
                            : ''
                        }`}
                        disabled={product.upsell_status === 'inactive' && credits <= 0}
                      >
                        {product.upsell_status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => {
                          alert('Edit upsell settings feature coming soon!')
                        }}
                        className="ml-4 text-shopscope-black hover:text-shopscope-gray-700"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="sm:hidden divide-y divide-shopscope-gray-200">
          {products.length === 0 ? (
            <div className="p-4 text-center text-shopscope-gray-500">
              No products found. Sync your products from Shopify first.
            </div>
          ) : (
            products.map((product) => (
              <div key={product.id} className="p-4 space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 flex-shrink-0">
                    {product.image_url ? (
                      <Image
                        className="h-12 w-12 rounded-lg object-cover"
                        src={product.image_url.replace(/['"]+/g, '')}
                        alt={product.title}
                        width={48}
                        height={48}
                        placeholder="blur"
                        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABQODxIPDRQSEBIXFRQdHx4eHRoaHSQtJSEkLUEwLi0tLTAtQFBGRjpGQC0uRk5ITU9OQVBXV1pXXnZ2e4aGnP/2wBDARUXFyYaJh8wMD5mbXFycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnP/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-shopscope-gray-200 flex items-center justify-center">
                        <svg className="h-6 w-6 text-shopscope-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-shopscope-black truncate">
                      {product.title}
                    </div>
                    <div className="text-sm text-shopscope-gray-500">
                      ${product.price.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="space-y-1">
                    <div>
                      <span className="font-medium text-shopscope-gray-500">Status: </span>
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          product.upsell_status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-shopscope-gray-100 text-shopscope-gray-800'
                        }`}
                      >
                        {product.upsell_status}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-shopscope-gray-500">Type: </span>
                      <span className="text-shopscope-black">{product.upsell_type}</span>
                    </div>
                    <div>
                      <span className="font-medium text-shopscope-gray-500">Engagement: </span>
                      <span className="text-shopscope-black">{product.engagement_score}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-2">
                    <button
                      onClick={() => updateUpsellStatus(
                        product.id,
                        product.upsell_status === 'active' ? 'inactive' : 'active'
                      )}
                      className={`px-3 py-1 text-sm rounded-md bg-shopscope-black text-white ${
                        product.upsell_status === 'inactive' && credits <= 0
                          ? 'opacity-50 cursor-not-allowed'
                          : ''
                      }`}
                      disabled={product.upsell_status === 'inactive' && credits <= 0}
                    >
                      {product.upsell_status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => {
                        alert('Edit upsell settings feature coming soon!')
                      }}
                      className="px-3 py-1 text-sm rounded-md border border-shopscope-gray-300"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

