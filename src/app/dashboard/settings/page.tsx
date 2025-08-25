'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Cog6ToothIcon,
  LinkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  CreditCardIcon,
  BuildingStorefrontIcon,
  UserIcon,
  BellIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
  TrashIcon,
  PencilIcon,
  EyeIcon,
  EyeSlashIcon,
  TruckIcon
} from '@heroicons/react/24/outline'

interface BrandSettings {
  id: string
  name: string
  email: string
  shopify_domain?: string
  shopify_connected: boolean
  stripe_connect_id?: string
  created_at: string
  commission_rate: number
  notification_preferences: {
    orders: boolean
    payouts: boolean
    products: boolean
    marketing: boolean
  }
}

interface ShippingZone {
  id: string
  name: string
  countries: string[]
  provinces: string[]
  created_at: string
  updated_at: string
}

interface ShippingRate {
  id: string
  name: string
  price: number
  min_order_amount?: number
  max_order_amount?: number
  min_weight?: number
  max_weight?: number
  zone_id: string
  created_at: string
  updated_at: string
}

export default function SettingsPage() {

  const [settings, setSettings] = useState<BrandSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const [showApiKey, setShowApiKey] = useState(false)
  const [isConnectingStripe, setIsConnectingStripe] = useState(false)
  const [isSyncingShipping, setIsSyncingShipping] = useState(false)
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>([])
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([])
  const [isLoadingShipping, setIsLoadingShipping] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    notifications: {
      orders: true,
      payouts: true,
      products: false,
      marketing: false
    }
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  useEffect(() => {
    if (activeTab === 'shipping' && settings?.id) {
      fetchShippingData()
    }
  }, [activeTab, settings?.id])

  const fetchShippingData = async () => {
    if (activeTab !== 'shipping') return
    
    setIsLoadingShipping(true)
    try {
      console.log('Fetching shipping data for brand:', settings?.id)
      
      // Fetch shipping zones
      const { data: zones, error: zonesError } = await supabase
        .from('shipping_zones')
        .select('*')
        .eq('brand_id', settings?.id)

      if (zonesError) {
        console.error('Error fetching zones:', zonesError)
        throw zonesError
      }

      console.log('Fetched zones:', zones)

      // Fetch shipping rates
      const { data: rates, error: ratesError } = await supabase
        .from('shipping_rates')
        .select('*')

      if (ratesError) {
        console.error('Error fetching rates:', ratesError)
        throw ratesError
      }

      console.log('Fetched rates:', rates)

      setShippingZones(zones || [])
      setShippingRates(rates || [])
    } catch (error) {
      console.error('Error fetching shipping data:', error)
    } finally {
      setIsLoadingShipping(false)
    }
  }

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: brandData, error } = await supabase
        .from('brands')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error) throw error

      const brandSettings: BrandSettings = {
        ...brandData,
        email: user.email || '',
        commission_rate: 10, // 10% default
        notification_preferences: {
          orders: true,
          payouts: true,
          products: false,
          marketing: false
        }
      }

      setSettings(brandSettings)
      setFormData({
        name: brandSettings.name,
        email: brandSettings.email,
        notifications: brandSettings.notification_preferences
      })

      setIsLoading(false)
    } catch (error) {
      console.error('Error fetching settings:', error)
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!settings) return
    setSaving(true)

    try {
      const { error } = await supabase
        .from('brands')
        .update({
          name: formData.name,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings.id)

      if (error) throw error

      setSettings(prev => prev ? { ...prev, name: formData.name } : null)
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleConnectStripe = async () => {
    setIsConnectingStripe(true)
    try {
      const response = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      window.location.href = data.url
    } catch (error) {
      console.error('Error connecting Stripe:', error)
      setIsConnectingStripe(false)
    }
  }

  const handleDisconnectStripe = async () => {
    if (!confirm('Are you sure you want to disconnect Stripe? This will stop all payouts.')) return

    try {
      const { error } = await supabase
        .from('brands')
        .update({ 
          stripe_connect_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings?.id)

      if (error) throw error

      setSettings(prev => prev ? { ...prev, stripe_connect_id: undefined } : null)
    } catch (error) {
      console.error('Error disconnecting Stripe:', error)
    }
  }

  const handleSyncShipping = async () => {
    if (!settings) return
    setIsSyncingShipping(true)

    try {
      const response = await fetch('/api/shopify/sync-shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId: settings.id })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      alert('Shipping zones synced successfully!')
    } catch (error) {
      console.error('Error syncing shipping:', error)
      alert('Failed to sync shipping zones')
    } finally {
      setIsSyncingShipping(false)
    }
  }

  const handleDisconnectShopify = async () => {
    if (!confirm('Are you sure you want to disconnect Shopify? This will stop product and order sync.')) return

    try {
      const { error } = await supabase
        .from('brands')
        .update({ 
          shopify_connected: false,
          shopify_domain: null,
          shopify_access_token: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings?.id)

      if (error) throw error

      setSettings(prev => prev ? { 
        ...prev, 
        shopify_connected: false, 
        shopify_domain: undefined 
      } : null)
    } catch (error) {
      console.error('Error disconnecting Shopify:', error)
    }
  }

  const tabs = [
    { id: 'general', name: 'General', icon: UserIcon },
    { id: 'integrations', name: 'Integrations', icon: LinkIcon },
    { id: 'shipping', name: 'Shipping', icon: TruckIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon }
  ]

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-shopscope-black mb-4" />
          <p className="text-shopscope-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  // Group rates by zone for display
  const getRatesForZone = (zoneId: string) => {
    return shippingRates.filter(rate => rate.zone_id === zoneId)
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-shopscope-black mb-2">Settings</h1>
        <p className="text-shopscope-gray-600">Manage your mobile marketplace configuration</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-shopscope-black text-white'
                      : 'text-shopscope-gray-700 hover:bg-shopscope-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {tab.name}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200">
                <h3 className="text-lg font-semibold text-shopscope-black mb-4">Brand Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-shopscope-gray-700 mb-1">
                      Brand Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="input-field"
                      placeholder="Your brand name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-shopscope-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      disabled
                      className="input-field opacity-50"
                      placeholder="your@email.com"
                    />
                    <p className="text-xs text-shopscope-gray-500 mt-1">
                      Email cannot be changed. Contact support if needed.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-shopscope-gray-700 mb-1">
                      Brand ID
                    </label>
                    <div className="flex">
                      <input
                        type="text"
                        value={settings?.id || ''}
                        disabled
                        className="input-field font-mono text-sm opacity-50"
                      />
                    </div>
                    <p className="text-xs text-shopscope-gray-500 mt-1">
                      Use this ID for API integrations
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="btn-primary disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200">
                <h3 className="text-lg font-semibold text-shopscope-black mb-4">Commission Rate</h3>
                <div className="flex items-center justify-between p-4 bg-shopscope-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-shopscope-black">ShopScope Commission</p>
                    <p className="text-sm text-shopscope-gray-600">Commission rate for mobile sales</p>
                  </div>
                  <div className="text-2xl font-bold text-shopscope-black">10%</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="space-y-6">
              {/* Shopify Integration */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <BuildingStorefrontIcon className="w-8 h-8 text-shopscope-black mr-3" />
                    <div>
                      <h3 className="text-lg font-semibold text-shopscope-black">Shopify Store</h3>
                      <p className="text-sm text-shopscope-gray-600">Connect your Shopify store to sync products and orders</p>
                    </div>
                  </div>
                  {settings?.shopify_connected ? (
                    <CheckCircleIcon className="w-6 h-6 text-green-500" />
                  ) : (
                    <XCircleIcon className="w-6 h-6 text-red-500" />
                  )}
                </div>
                
                {settings?.shopify_connected ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-sm text-green-800">
                        <strong>Connected:</strong> {settings.shopify_domain}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        Products and orders are syncing automatically
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleSyncShipping}
                        disabled={isSyncingShipping}
                        className="btn-secondary disabled:opacity-50"
                      >
                        <ArrowPathIcon className={`w-4 h-4 mr-2 ${isSyncingShipping ? 'animate-spin' : ''}`} />
                        {isSyncingShipping ? 'Syncing...' : 'Sync Shipping'}
                      </button>
                      <button
                        onClick={handleDisconnectShopify}
                        className="btn-outline border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <TrashIcon className="w-4 h-4 mr-2" />
                        Disconnect
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-sm text-yellow-800 mb-3">
                      Your Shopify store is not connected. Connect it to start syncing products and orders.
                    </p>
                    <button className="btn-primary">
                      <LinkIcon className="w-4 h-4 mr-2" />
                      Connect Shopify Store
                    </button>
                  </div>
                )}
              </div>

              {/* Stripe Integration */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <CreditCardIcon className="w-8 h-8 text-shopscope-black mr-3" />
                    <div>
                      <h3 className="text-lg font-semibold text-shopscope-black">Stripe Payments</h3>
                      <p className="text-sm text-shopscope-gray-600">Connect Stripe to receive payouts from mobile sales</p>
                    </div>
                  </div>
                  {settings?.stripe_connect_id ? (
                    <CheckCircleIcon className="w-6 h-6 text-green-500" />
                  ) : (
                    <XCircleIcon className="w-6 h-6 text-red-500" />
                  )}
                </div>
                
                {settings?.stripe_connect_id ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-sm text-green-800">
                        <strong>Connected:</strong> Stripe account linked
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        Ready to receive payouts from mobile sales
                      </p>
                    </div>
                    <button
                      onClick={handleDisconnectStripe}
                      className="btn-outline border-red-300 text-red-600 hover:bg-red-50"
                    >
                      <TrashIcon className="w-4 h-4 mr-2" />
                      Disconnect Stripe
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-sm text-yellow-800 mb-3">
                      Connect your Stripe account to receive payouts from mobile marketplace sales.
                    </p>
                    <button
                      onClick={handleConnectStripe}
                      disabled={isConnectingStripe}
                      className="btn-primary disabled:opacity-50"
                    >
                      <CreditCardIcon className="w-4 h-4 mr-2" />
                      {isConnectingStripe ? 'Connecting...' : 'Connect Stripe'}
                    </button>
                  </div>
                )}
              </div>

              {/* Shopify Custom API Information */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Cog6ToothIcon className="w-8 h-8 text-shopscope-black mr-3" />
                    <div>
                      <h3 className="text-lg font-semibold text-shopscope-black">Shopify Custom API Setup</h3>
                      <p className="text-sm text-shopscope-gray-600">Configure your private Shopify app for ShopScope integration</p>
                    </div>
                  </div>
                  <ExclamationTriangleIcon className="w-6 h-6 text-yellow-500" />
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-2">Setup Instructions</h4>
                    <div className="text-sm text-blue-800 space-y-2">
                      <p><strong>1. Create Private App:</strong> In your Shopify admin, go to Apps → Develop apps → Create an app</p>
                      <p><strong>2. Configure Permissions:</strong> Enable the following scopes:</p>
                      <ul className="ml-4 list-disc space-y-1">
                        <li>read_products, write_products</li>
                        <li>read_orders, write_orders</li>
                        <li>read_inventory, write_inventory</li>
                        <li>read_shipping, write_shipping</li>
                      </ul>
                      <p><strong>3. Get API Credentials:</strong> Copy your API key and secret from the app settings</p>
                      <p><strong>4. Configure Webhooks:</strong> Add webhook endpoints for real-time updates</p>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-2">Required Webhook Endpoints</h4>
                    <div className="text-sm text-gray-700 space-y-2">
                      <p><strong>Orders:</strong> <code className="bg-gray-200 px-1 rounded">https://your-shopscope-domain.com/api/webhooks/orders</code></p>
                      <p><strong>Products:</strong> <code className="bg-gray-200 px-1 rounded">https://your-shopscope-domain.com/api/webhooks/products</code></p>
                      <p><strong>Inventory:</strong> <code className="bg-gray-200 px-1 rounded">https://your-shopscope-domain.com/api/webhooks/inventory</code></p>
                    </div>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-medium text-green-900 mb-2">Integration Status</h4>
                    <div className="text-sm text-green-800">
                      <p><strong>Store Domain:</strong> {settings?.shopify_domain || 'Not configured'}</p>
                      <p><strong>Connection Status:</strong> {settings?.shopify_connected ? 'Connected' : 'Not connected'}</p>
                      <p><strong>Last Sync:</strong> {settings?.shopify_connected ? 'Active' : 'Never'}</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button className="btn-secondary">
                      <LinkIcon className="w-4 h-4 mr-2" />
                      View Documentation
                    </button>
                    <button className="btn-outline">
                      <Cog6ToothIcon className="w-4 h-4 mr-2" />
                      Test Connection
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'shipping' && (
            <div className="space-y-6">
              {/* Shipping Overview */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <TruckIcon className="w-8 h-8 text-shopscope-black mr-3" />
                    <div>
                      <h3 className="text-lg font-semibold text-shopscope-black">Shipping Zones & Rates</h3>
                      <p className="text-sm text-shopscope-gray-600">Manage your shipping configuration for mobile orders</p>
                    </div>
                  </div>
                  <button
                    onClick={handleSyncShipping}
                    disabled={isSyncingShipping}
                    className="btn-secondary disabled:opacity-50"
                  >
                    <ArrowPathIcon className={`w-4 h-4 mr-2 ${isSyncingShipping ? 'animate-spin' : ''}`} />
                    {isSyncingShipping ? 'Syncing...' : 'Sync from Shopify'}
                  </button>
                </div>

                {settings?.shopify_connected ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-medium text-blue-900 mb-2">Shipping Sync Status</h4>
                      <div className="text-sm text-blue-800">
                        <p><strong>Last Sync:</strong> {shippingZones.length > 0 ? 'Recently synced' : 'Never synced'}</p>
                        <p><strong>Source:</strong> Shopify store shipping zones</p>
                        <p><strong>Auto-sync:</strong> Enabled (updates when shipping changes in Shopify)</p>
                      </div>
                    </div>

                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <h4 className="font-medium text-green-900 mb-2">Mobile Order Shipping</h4>
                      <div className="text-sm text-green-800">
                        <p>Your Shopify shipping zones and rates are automatically applied to mobile orders.</p>
                        <p className="mt-1">Customers will see the same shipping options they see in your Shopify store.</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handleSyncShipping}
                        disabled={isSyncingShipping}
                        className="btn-primary disabled:opacity-50"
                      >
                        <ArrowPathIcon className={`w-4 h-4 mr-2 ${isSyncingShipping ? 'animate-spin' : ''}`} />
                        {isSyncingShipping ? 'Syncing Shipping...' : 'Sync Shipping Now'}
                      </button>
                      <button 
                        onClick={fetchShippingData}
                        disabled={isLoadingShipping}
                        className="btn-outline"
                      >
                        <ArrowPathIcon className={`w-4 h-4 mr-2 ${isLoadingShipping ? 'animate-spin' : ''}`} />
                        Refresh Data
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-sm text-yellow-800 mb-3">
                      Connect your Shopify store to sync shipping zones and rates for mobile orders.
                    </p>
                    <button className="btn-primary">
                      <LinkIcon className="w-4 h-4 mr-2" />
                      Connect Shopify Store
                    </button>
                  </div>
                )}
              </div>

              {/* Shipping Rates Display */}
              {shippingRates.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Shipping Rates</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {shippingRates.map((rate) => (
                      <div key={rate.id} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{rate.name}</h4>
                          <span className="text-lg font-bold text-shopscope-black">
                            ${rate.price.toFixed(2)}
                          </span>
                        </div>
                        {rate.min_order_amount && rate.min_order_amount > 0 && (
                          <p className="text-sm text-gray-600">
                            Min order: ${rate.min_order_amount.toFixed(2)}
                          </p>
                        )}
                        {rate.max_order_amount && (
                          <p className="text-sm text-gray-600">
                            Max order: ${rate.max_order_amount.toFixed(2)}
                          </p>
                        )}
                        {rate.price === 0 && (
                          <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                            Free Shipping
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Shipping Configuration */}
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Shipping Configuration</h3>
                
                {/* Domestic Shipping */}
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Domestic Shipping (Australia)</h4>
                  <div className="space-y-2">
                    {getRatesForZone('27aab88d-2dd3-44a5-8404-bc0c86686c2c').map((rate) => (
                      <div key={rate.id} className="flex items-center justify-between py-2 border-b">
                        <span className="text-gray-700">{rate.name}</span>
                        <span className="font-medium">
                          {rate.price === 0 ? 'Free' : `$${rate.price.toFixed(2)}`}
                          {rate.min_order_amount && rate.min_order_amount > 0 && 
                            ` (over $${rate.min_order_amount.toFixed(2)})`
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* International Shipping */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">International Shipping</h4>
                  <div className="space-y-2">
                    {getRatesForZone('d5f6da16-2bd5-458b-a7c6-62ab9699249d').map((rate) => (
                      <div key={rate.id} className="flex items-center justify-between py-2 border-b">
                        <span className="text-gray-700">{rate.name}</span>
                        <span className="font-medium">${rate.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Shipping Zones Table */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200">
                <h3 className="text-lg font-semibold text-shopscope-black mb-4">Current Shipping Zones</h3>
                
                {isLoadingShipping ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-shopscope-black"></div>
                    <span className="ml-3 text-shopscope-gray-600">Loading shipping data...</span>
                  </div>
                ) : shippingZones.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-shopscope-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-shopscope-gray-500 uppercase tracking-wider">
                            Zone Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-shopscope-gray-500 uppercase tracking-wider">
                            Countries
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-shopscope-gray-500 uppercase tracking-wider">
                            Shipping Methods
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-shopscope-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-shopscope-gray-200">
                        {shippingZones.map((zone) => {
                          const zoneRates = shippingRates.filter(rate => rate.zone_id === zone.id)
                          return (
                            <tr key={zone.id} className="hover:bg-shopscope-gray-50">
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="font-medium text-shopscope-black">{zone.name}</div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="text-sm text-shopscope-gray-600">
                                  {zone.countries.length > 0 ? `${zone.countries.length} countries` : 'Not specified'}
                                </div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="text-sm text-shopscope-gray-600">
                                  {zoneRates.length > 0 ? (
                                    <div className="space-y-1">
                                      {zoneRates.map(rate => (
                                        <div key={rate.id} className="flex items-center justify-between">
                                          <span>{rate.name}</span>
                                          <span className="font-medium text-shopscope-black">${rate.price.toFixed(2)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    'No rates configured'
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Active
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <TruckIcon className="w-12 h-12 text-shopscope-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-shopscope-black mb-2">No shipping zones found</h3>
                    <p className="text-shopscope-gray-600 mb-4">
                      Sync your shipping configuration from Shopify to see your shipping zones and rates here.
                    </p>
                    <button
                      onClick={handleSyncShipping}
                      disabled={isSyncingShipping}
                      className="btn-primary disabled:opacity-50"
                    >
                      <ArrowPathIcon className={`w-4 h-4 mr-2 ${isSyncingShipping ? 'animate-spin' : ''}`} />
                      {isSyncingShipping ? 'Syncing...' : 'Sync Shipping'}
                    </button>
                  </div>
                )}

                <div className="mt-4 text-sm text-shopscope-gray-600">
                  <p>Note: Shipping zones are automatically synced from your Shopify store. To modify shipping rates, update them in your Shopify admin.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200">
              <h3 className="text-lg font-semibold text-shopscope-black mb-4">Notification Preferences</h3>
              <div className="space-y-4">
                {Object.entries(formData.notifications).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between py-3 border-b border-shopscope-gray-200 last:border-b-0">
                    <div>
                      <h4 className="font-medium text-shopscope-black capitalize">
                        {key === 'orders' ? 'Order Updates' :
                         key === 'payouts' ? 'Payout Notifications' :
                         key === 'products' ? 'Product Sync' :
                         'Marketing Updates'}
                      </h4>
                      <p className="text-sm text-shopscope-gray-600">
                        {key === 'orders' ? 'Get notified about new mobile orders' :
                         key === 'payouts' ? 'Receive updates about payout status' :
                         key === 'products' ? 'Notifications about product sync status' :
                         'Promotional emails and feature updates'}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          notifications: {
                            ...prev.notifications,
                            [key]: e.target.checked
                          }
                        }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-shopscope-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-shopscope-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-shopscope-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-shopscope-black"></div>
                    </label>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="btn-primary disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200">
                <h3 className="text-lg font-semibold text-shopscope-black mb-4">Account Security</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-shopscope-gray-200">
                    <div>
                      <h4 className="font-medium text-shopscope-black">Password</h4>
                      <p className="text-sm text-shopscope-gray-600">Last updated: Never</p>
                    </div>
                    <button className="btn-secondary">
                      <PencilIcon className="w-4 h-4 mr-2" />
                      Change Password
                    </button>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-shopscope-gray-200">
                    <div>
                      <h4 className="font-medium text-shopscope-black">Two-Factor Authentication</h4>
                      <p className="text-sm text-shopscope-gray-600">Add an extra layer of security</p>
                    </div>
                    <button className="btn-outline">
                      <ShieldCheckIcon className="w-4 h-4 mr-2" />
                      Enable 2FA
                    </button>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <h4 className="font-medium text-shopscope-black">Active Sessions</h4>
                      <p className="text-sm text-shopscope-gray-600">Manage your active sessions</p>
                    </div>
                    <button className="btn-secondary">
                      <EyeIcon className="w-4 h-4 mr-2" />
                      View Sessions
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-shopscope-gray-200">
                <h3 className="text-lg font-semibold text-shopscope-black mb-4">Data & Privacy</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-shopscope-gray-200">
                    <div>
                      <h4 className="font-medium text-shopscope-black">Export Data</h4>
                      <p className="text-sm text-shopscope-gray-600">Download your account data</p>
                    </div>
                    <button className="btn-secondary">
                      <ArrowPathIcon className="w-4 h-4 mr-2" />
                      Export Data
                    </button>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <h4 className="font-medium text-red-600">Delete Account</h4>
                      <p className="text-sm text-shopscope-gray-600">Permanently delete your account and data</p>
                    </div>
                    <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
                      <TrashIcon className="w-4 h-4 mr-2" />
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 