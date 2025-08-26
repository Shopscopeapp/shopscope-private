'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  CogIcon,
  KeyIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  DocumentDuplicateIcon,
  ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline'

export default function ConnectShopifyPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [apiCredentials, setApiCredentials] = useState({
    apiKey: '',
    apiSecret: '',
    accessToken: ''
  })
  const [copied, setCopied] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const requiredPermissions = [
    'read_products',
    'write_products',
    'read_orders',
    'write_orders',
    'read_customers',
    'read_inventory',
    'write_inventory',
    'read_fulfillments',
    'write_fulfillments',
    'read_shipping',
    'write_shipping'
  ]

  const steps = [
    {
      id: 1,
      title: 'Create Private App',
      description: 'Set up a private app in your Shopify admin',
      status: currentStep > 1 ? 'completed' : currentStep === 1 ? 'current' : 'upcoming'
    },
    {
      id: 2,
      title: 'Configure Permissions',
      description: 'Add required API permissions',
      status: currentStep > 2 ? 'completed' : currentStep === 2 ? 'current' : 'upcoming'
    },
    {
      id: 3,
      title: 'Get API Credentials',
      description: 'Copy your API keys and access token',
      status: currentStep > 3 ? 'completed' : currentStep === 3 ? 'current' : 'upcoming'
    },
    {
      id: 4,
      title: 'Connect to ShopScope',
      description: 'Enter credentials to complete setup',
      status: currentStep > 4 ? 'completed' : currentStep === 4 ? 'current' : 'upcoming'
    }
  ]

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setApiCredentials(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const validateAndConnect = async () => {
    if (!apiCredentials.apiKey || !apiCredentials.apiSecret || !apiCredentials.accessToken) {
      alert('Please fill in all API credentials')
      return
    }

    setLoading(true)
    try {
      // Get the current user's brand ID from the session
      const response = await fetch('/api/auth/validate-session')
      const sessionData = await response.json()
      
      if (!response.ok || !sessionData.success || !sessionData.brand) {
        throw new Error('No active session or brand found. Please sign in again.')
      }

      // Call our API to connect the private app
      const connectResponse = await fetch('/api/shopify/connect-private-app', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandId: sessionData.brand.id,
          shopifyDomain: sessionData.brand.shopify_domain,
          apiKey: apiCredentials.apiKey,
          apiSecret: apiCredentials.apiSecret,
          accessToken: apiCredentials.accessToken
        })
      })

      const connectData = await connectResponse.json()
      
      if (!connectResponse.ok) {
        throw new Error(connectData.error || 'Failed to connect Shopify app')
      }

      console.log('✅ Shopify private app connected successfully:', connectData)
      
      // Redirect to dashboard
      window.location.href = '/dashboard'
      
    } catch (error) {
      console.error('Connection error:', error)
      alert(error instanceof Error ? error.message : 'Failed to connect. Please check your credentials and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen section-gradient">
      {/* Header */}
      <header className="px-6 py-4 border-b border-shopscope-gray-200 bg-white">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-shopscope-black rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-shopscope-black">ShopScope</h1>
              <p className="text-sm text-shopscope-gray-600">Mobile Platform Setup</p>
            </div>
          </div>
          <Link href="/auth/login" className="text-shopscope-gray-600 hover:text-shopscope-black transition-colors">
            Sign In Later
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                    step.status === 'completed' 
                      ? 'bg-shopscope-black text-white' 
                      : step.status === 'current'
                      ? 'bg-shopscope-gray-800 text-white'
                      : 'bg-shopscope-gray-200 text-shopscope-gray-500'
                  }`}>
                    {step.status === 'completed' ? (
                      <CheckCircleIcon className="w-6 h-6" />
                    ) : (
                      step.id
                    )}
                  </div>
                  <div className="text-center mt-2">
                    <p className={`text-sm font-medium ${
                      step.status === 'current' ? 'text-shopscope-black' : 'text-shopscope-gray-600'
                    }`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-shopscope-gray-500">{step.description}</p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-4 ${
                    step.status === 'completed' ? 'bg-shopscope-black' : 'bg-shopscope-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Instructions */}
          <div className="space-y-6">
            {currentStep === 1 && (
              <div className="card">
                <h2 className="text-2xl font-bold text-shopscope-black mb-4 flex items-center">
                  <CogIcon className="w-6 h-6 mr-3 text-shopscope-black" />
                  Step 1: Create Private App
                </h2>
                <div className="space-y-4">
                  <p className="text-gray-600">
                    First, you'll need to create a private app in your Shopify admin. This gives ShopScope secure access to your store data.
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-shopscope-dark mb-2">Instructions:</h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                      <li>Go to your Shopify admin</li>
                      <li>Navigate to Settings → Apps and sales channels</li>
                      <li>Click "Develop apps for your store"</li>
                      <li>Click "Create an app"</li>
                      <li>Name your app "ShopScope Integration"</li>
                      <li>Click "Create app"</li>
                    </ol>
                  </div>
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="btn-primary flex items-center"
                  >
                    I've Created the App
                    <ArrowRightIcon className="w-4 h-4 ml-2" />
                  </button>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="card">
                <h2 className="text-2xl font-bold text-shopscope-black mb-4 flex items-center">
                  <KeyIcon className="w-6 h-6 mr-3 text-shopscope-black" />
                  Step 2: Configure Permissions
                </h2>
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Now you need to configure the API permissions for your private app.
                  </p>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-yellow-800 mb-1">Important</h3>
                        <p className="text-sm text-yellow-700">
                          Make sure to add ALL the permissions listed below for full functionality.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <ExclamationTriangleIcon className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-blue-800 mb-1">Critical Permission</h3>
                        <p className="text-sm text-blue-700">
                          <strong>read_customers</strong> is required for order processing and customer data access. 
                          Without this permission, you'll get API errors when syncing orders.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-shopscope-dark mb-3">Required Admin API Permissions:</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {requiredPermissions.map(permission => (
                        <div key={permission} className="flex items-center text-sm">
                          <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                          <code className="bg-white px-2 py-1 rounded text-xs">{permission}</code>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-shopscope-dark mb-2">Instructions:</h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                      <li>In your private app, click "Configure Admin API scopes"</li>
                      <li>Search for and enable each permission listed above</li>
                      <li>Click "Save" to apply the permissions</li>
                    </ol>
                  </div>

                  <button
                    onClick={() => setCurrentStep(3)}
                    className="btn-primary flex items-center"
                  >
                    Permissions Configured
                    <ArrowRightIcon className="w-4 h-4 ml-2" />
                  </button>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="card">
                <h2 className="text-2xl font-bold text-shopscope-black mb-4">
                  Step 3: Get API Credentials
                </h2>
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Now you'll need to install your private app and copy the API credentials.
                  </p>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-shopscope-dark mb-2">Instructions:</h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                      <li>Click "Install app" to activate your private app</li>
                      <li>Go to the "API credentials" tab</li>
                      <li>Copy the "Admin API access token"</li>
                      <li>Copy the "API key" and "API secret key"</li>
                      <li>Enter them in the form on the right</li>
                    </ol>
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-red-800 mb-1">Security Note</h3>
                        <p className="text-sm text-red-700">
                          Keep these credentials secure. Never share them publicly or store them in unsecured locations.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="card">
                <h2 className="text-2xl font-bold text-shopscope-black mb-4">
                  Step 4: Almost Done!
                </h2>
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Great! Your credentials look good. Click the button below to complete the setup and start syncing your products.
                  </p>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <CheckCircleIcon className="w-5 h-5 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-green-800 mb-1">Ready to Connect</h3>
                        <p className="text-sm text-green-700">
                          Your Shopify store will be connected to ShopScope and we'll start syncing your products automatically.
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={validateAndConnect}
                    disabled={loading}
                    className="btn-primary text-lg py-3 px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Connecting...' : 'Complete Setup & Go to Dashboard'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Credentials Form */}
          {currentStep >= 3 && (
            <div className="card">
              <h3 className="text-xl font-semibold text-shopscope-black mb-4">
                Enter API Credentials
              </h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="accessToken" className="block text-sm font-medium text-gray-700 mb-1">
                    Admin API Access Token *
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      id="accessToken"
                      name="accessToken"
                      value={apiCredentials.accessToken}
                      onChange={handleApiKeyChange}
                      className="input-field pr-10"
                      placeholder="shpat_..."
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(apiCredentials.accessToken, 'accessToken')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {copied === 'accessToken' ? (
                        <ClipboardDocumentCheckIcon className="w-4 h-4 text-green-500" />
                      ) : (
                        <DocumentDuplicateIcon className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    This starts with "shpat_" and is found in the API credentials tab
                  </p>
                </div>

                <div>
                  <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
                    API Key *
                  </label>
                  <input
                    type="text"
                    id="apiKey"
                    name="apiKey"
                    value={apiCredentials.apiKey}
                    onChange={handleApiKeyChange}
                    className="input-field"
                    placeholder="Your API Key"
                  />
                </div>

                <div>
                  <label htmlFor="apiSecret" className="block text-sm font-medium text-gray-700 mb-1">
                    API Secret Key *
                  </label>
                  <input
                    type="password"
                    id="apiSecret"
                    name="apiSecret"
                    value={apiCredentials.apiSecret}
                    onChange={handleApiKeyChange}
                    className="input-field"
                    placeholder="Your API Secret"
                  />
                </div>

                {apiCredentials.accessToken && apiCredentials.apiKey && apiCredentials.apiSecret && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center">
                      <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2" />
                      <span className="text-sm text-green-700 font-medium">
                        All credentials entered
                      </span>
                    </div>
                  </div>
                )}

                {currentStep === 3 && apiCredentials.accessToken && apiCredentials.apiKey && apiCredentials.apiSecret && (
                  <button
                    onClick={() => setCurrentStep(4)}
                    className="w-full btn-primary"
                  >
                    Validate Credentials
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-4">
            Need help with the setup process?
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/support" className="text-shopscope-blue hover:text-blue-700 font-medium">
              Contact Support
            </Link>
            <Link href="/docs/private-app-setup" className="text-shopscope-blue hover:text-blue-700 font-medium">
              View Documentation
            </Link>
            <Link href="/demo" className="text-shopscope-blue hover:text-blue-700 font-medium">
              Watch Video Guide
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
} 