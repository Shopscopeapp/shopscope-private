'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    try {
      // Call the login API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Login failed')
      }

      console.log('Login successful:', result)
      
      // Redirect to dashboard
      window.location.href = '/dashboard'
      
    } catch (error) {
      console.error('Login error:', error)
      setErrors({ submit: error instanceof Error ? error.message : 'Invalid email or password. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen section-gradient flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center text-shopscope-black hover:text-shopscope-gray-700 transition-colors mb-6">
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-shopscope-black rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-shopscope-black">ShopScope</h1>
              <p className="text-sm text-shopscope-gray-600">Mobile Marketplace</p>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-shopscope-black mb-2">Welcome Back</h2>
          <p className="text-shopscope-gray-600">Sign in to your ShopScope account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-shopscope-black mb-4 flex items-center">
              <LockClosedIcon className="w-5 h-5 mr-2 text-shopscope-black" />
              Account Sign In
            </h3>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-shopscope-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`input-field ${errors.email ? 'border-red-500' : ''}`}
                  placeholder="your@email.com"
                  autoComplete="email"
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-shopscope-gray-700 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`input-field pr-10 ${errors.password ? 'border-red-500' : ''}`}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-shopscope-gray-400 hover:text-shopscope-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="w-4 h-4" />
                    ) : (
                      <EyeIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-shopscope-black border-shopscope-gray-300 rounded focus:ring-shopscope-black focus:ring-2"
                  />
                  <label htmlFor="rememberMe" className="ml-2 text-sm text-shopscope-gray-600">
                    Remember me
                  </label>
                </div>
                <Link 
                  href="/auth/forgot-password" 
                  className="text-sm text-shopscope-black hover:text-shopscope-gray-700 font-medium underline"
                >
                  Forgot password?
                </Link>
              </div>
            </div>
          </div>

          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <p className="text-red-600 text-sm">{errors.submit}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover-lift"
          >
            {loading ? 'Signing In...' : 'Sign In to Dashboard'}
          </button>

          <div className="text-center">
            <p className="text-shopscope-gray-600">
              Don't have an account?{' '}
              <Link href="/auth/signup" className="text-shopscope-black hover:text-shopscope-gray-700 font-medium underline">
                Create Account
              </Link>
            </p>
          </div>
        </form>

        {/* Alternative Sign In Options */}
        <div className="mt-8">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-shopscope-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-shopscope-gray-500">Alternative Options</span>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <button
              type="button"
              className="w-full btn-secondary py-3 text-center hover-lift"
              onClick={() => alert('Demo account feature coming soon')}
            >
              Try Demo Account
            </button>
            <div className="text-center">
              <Link 
                href="/support" 
                className="text-sm text-shopscope-gray-500 hover:text-shopscope-black transition-colors"
              >
                Need help signing in?
              </Link>
            </div>
          </div>
        </div>

        {/* Terms */}
        <div className="mt-8 text-center">
          <p className="text-xs text-shopscope-gray-500">
            By signing in, you agree to our{' '}
            <Link href="/terms" className="text-shopscope-black hover:text-shopscope-gray-700 underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-shopscope-black hover:text-shopscope-gray-700 underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
} 