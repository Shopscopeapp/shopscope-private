'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import UpsellStats from '@/components/upsells/UpsellStats'
import UpsellProductList from '@/components/upsells/UpsellProductList'
import UpsellSettings from '@/components/upsells/UpsellSettings'

export default function UpsellsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    totalUpsells: 0,
    conversionRate: 0,
    revenue: 0,
    activePromotions: 0
  })
  const [brandId, setBrandId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'products' | 'settings'>('products')



  useEffect(() => {
    const loadUpsellStats = async () => {
      try {
        // Get user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setError('Please sign in to view upsells')
          setIsLoading(false)
          return
        }

        // Get brand by user_id
        const { data: brandData, error: brandError } = await supabase
          .from('brands')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (brandError || !brandData) {
          console.error('❌ Brand not found for user:', user.id)
          setError('Brand not found')
          setIsLoading(false)
          return
        }

        setBrandId(brandData.id)

        // Try to get upsell stats
        const { data, error } = await supabase
          .from('upsell_stats')
          .select('*')
          .eq('brand_id', brandData.id)
          .single()

        if (error) {
          // If table doesn't exist or no data found, use default values
          console.log('Upsell stats not available:', error.message)
          setStats({
            totalUpsells: 0,
            conversionRate: 0,
            revenue: 0,
            activePromotions: 0
          })
          setIsLoading(false)
          return
        }

        if (data) {
          setStats({
            totalUpsells: data.total_upsells || 0,
            conversionRate: data.conversion_rate || 0,
            revenue: data.revenue || 0,
            activePromotions: data.active_promotions || 0
          })
        }
      } catch (error) {
        console.error('Error loading upsell stats:', error)
        setError('Failed to load upsell stats')
      } finally {
        setIsLoading(false)
      }
    }

    loadUpsellStats()
  }, [supabase])

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-shopscope-black" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <h2 className="font-medium">Error</h2>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 text-sm underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-shopscope-black">Upsell Management</h1>
        <p className="mt-2 text-shopscope-gray-600">
          Manage your product upsells, view performance metrics, and optimize your campaigns
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <UpsellStats stats={stats} />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-shopscope-gray-200">
        <div className="border-b border-shopscope-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('products')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'products'
                  ? 'border-shopscope-black text-shopscope-black'
                  : 'border-transparent text-shopscope-gray-500 hover:text-shopscope-gray-700 hover:border-shopscope-gray-300'
              }`}
            >
              Products
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-shopscope-black text-shopscope-black'
                  : 'border-transparent text-shopscope-gray-500 hover:text-shopscope-gray-700 hover:border-shopscope-gray-300'
              }`}
            >
              Settings
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'products' && (
            <UpsellProductList brandId={brandId} />
          )}
          {activeTab === 'settings' && (
            <UpsellSettings brandId={brandId} />
          )}
        </div>
      </div>
    </div>
  )
} 