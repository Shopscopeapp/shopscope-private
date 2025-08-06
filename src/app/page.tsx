'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  ShoppingBagIcon, 
  ChartBarIcon, 
  CreditCardIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'

export default function LandingPage() {
  const [showOnboarding, setShowOnboarding] = useState(false)

  const features = [
    {
      icon: ShoppingBagIcon,
      title: 'Mobile-First Discovery',
      description: 'Your products featured in a mobile app designed for brand discovery'
    },
    {
      icon: ChartBarIcon,
      title: 'Engaged Mobile Audience',
      description: 'Reach active mobile shoppers who spend more time browsing and buying'
    },
    {
      icon: CreditCardIcon,
      title: 'Seamless Mobile Checkout',
      description: 'Optimized mobile purchase experience increases conversion rates'
    },
    {
      icon: ShieldCheckIcon,
      title: 'Brand Showcase',
      description: 'Beautiful mobile product displays that highlight your brand story'
    }
  ]

  const steps = [
    {
      step: 1,
      title: 'Join the Platform',
      description: 'Create your brand account and connect your Shopify store seamlessly',
      action: 'Quick setup process'
    },
    {
      step: 2,
      title: 'Launch on Mobile',
      description: 'Your products go live on our mobile app for thousands of shoppers to discover',
      action: 'Instant visibility'
    },
    {
      step: 3,
      title: 'Grow Your Sales',
      description: 'Track performance and watch your mobile sales grow with detailed analytics',
      action: 'Real-time insights'
    }
  ]

  return (
    <div className="min-h-screen section-gradient">
      {/* Header */}
      <header className="px-6 py-4 border-b border-shopscope-gray-200 bg-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-shopscope-black rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-shopscope-black">ShopScope</h1>
              <p className="text-sm text-shopscope-gray-600">Mobile Marketplace</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/auth/login" className="text-shopscope-gray-600 hover:text-shopscope-black transition-colors">
              Sign In
            </Link>
            <Link 
              href="/auth/signup"
              className="btn-primary"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 py-20">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl font-bold text-shopscope-black mb-6">
              Reach Mobile Customers on{' '}
              <span className="underline decoration-4 underline-offset-8">ShopScope Mobile</span>
            </h1>
            <p className="text-xl text-shopscope-gray-600 mb-8 max-w-3xl mx-auto">
              Connect your Shopify store to our mobile marketplace and reach thousands of 
              engaged mobile shoppers actively discovering new brands.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setShowOnboarding(true)}
                className="bg-shopscope-black text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-shopscope-gray-800 transition-colors flex items-center justify-center shadow-lg hover-lift"
              >
                Launch on Mobile
                <ArrowRightIcon className="w-5 h-5 ml-2" />
              </button>
              <Link
                href="/demo"
                className="btn-outline px-8 py-4 text-lg font-semibold shadow-lg hover-lift"
              >
                View Demo
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-shopscope-black mb-4">
              Why Brands Choose ShopScope Mobile
            </h2>
            <p className="text-shopscope-gray-600 text-lg">
              Join the mobile commerce revolution and grow your brand
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center p-6 rounded-xl border border-shopscope-gray-200 hover:border-shopscope-black hover:shadow-lg transition-all hover-lift"
              >
                <div className="w-12 h-12 bg-shopscope-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-6 h-6 text-shopscope-black" />
                </div>
                <h3 className="text-lg font-semibold text-shopscope-black mb-2">
                  {feature.title}
                </h3>
                <p className="text-shopscope-gray-600">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-20 bg-shopscope-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-shopscope-black mb-4">
              Launch Your Brand on Mobile
            </h2>
            <p className="text-shopscope-gray-600 text-lg">
              From setup to sales in just 3 simple steps
            </p>
          </div>
          <div className="grid lg:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="relative bg-white p-8 rounded-xl border border-shopscope-gray-200 hover:shadow-lg transition-all hover-lift"
              >
                <div className="w-12 h-12 bg-shopscope-black text-white rounded-lg flex items-center justify-center font-bold text-lg mb-4">
                  {step.step}
                </div>
                <h3 className="text-xl font-semibold text-shopscope-black mb-3">
                  {step.title}
                </h3>
                <p className="text-shopscope-gray-600 mb-4">
                  {step.description}
                </p>
                <div className="text-sm text-shopscope-black font-medium">
                  {step.action}
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <ArrowRightIcon className="w-8 h-8 text-shopscope-gray-300" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-shopscope-black mb-6">
                Why ShopScope Mobile Works for Brands
              </h2>
              <div className="space-y-4">
                {[
                  'Access to engaged mobile shoppers actively seeking new brands',
                  'Higher conversion rates with mobile-optimized shopping experience',
                  'Brand discovery through curated collections and recommendations',
                  'Built-in social features that amplify your brand reach',
                  'Real-time analytics showing mobile shopping behaviors',
                  'Dedicated mobile customer support for your shoppers'
                ].map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircleIcon className="w-5 h-5 text-shopscope-black flex-shrink-0" />
                    <span className="text-shopscope-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card-dark p-8 rounded-2xl">
              <h3 className="text-2xl font-bold mb-4">Ready to Grow on Mobile?</h3>
              <p className="mb-6 text-shopscope-gray-300">
                Join hundreds of brands reaching new customers through ShopScope mobile
              </p>
              <Link
                href="/auth/signup"
                className="inline-flex items-center bg-white text-shopscope-black px-6 py-3 rounded-lg font-semibold hover:bg-shopscope-gray-100 transition-colors shadow-lg hover-lift"
              >
                Create Account
                <ArrowRightIcon className="w-4 h-4 ml-2" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Commission Structure */}
      <section className="px-6 py-20 bg-shopscope-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="bg-shopscope-black text-white rounded-2xl p-8 mb-16">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-4">10% Commission</h2>
                <p className="text-lg mb-4 text-shopscope-gray-200">
                  Simple, transparent pricing with no hidden fees
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Payment processing included
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Customer acquisition & marketing
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Mobile app hosting & maintenance
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Weekly payouts every Friday
                  </li>
                </ul>
              </div>
              <div className="text-center">
                <div className="bg-white/10 rounded-xl p-6">
                  <div className="text-4xl font-bold mb-2">You Keep</div>
                  <div className="text-6xl font-bold text-green-400">90%</div>
                  <div className="text-lg">of every sale</div>
                </div>
                <div className="mt-4 text-sm text-shopscope-gray-300">
                  Simple pricing, no contracts required
                </div>
              </div>
            </div>
          </div>

          {/* What's Included */}
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-shopscope-black mb-4">
              What's Included in Your Commission
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl border border-shopscope-gray-200">
              <h3 className="text-lg font-semibold text-shopscope-black mb-3">Mobile Shopping Experience</h3>
              <ul className="space-y-2 text-shopscope-gray-600 text-sm">
                <li>• Swipe-based product discovery</li>
                <li>• Mobile app installation & updates</li>
                <li>• iOS & Android compatibility</li>
                <li>• Push notifications & engagement</li>
              </ul>
            </div>
            <div className="bg-white p-6 rounded-xl border border-shopscope-gray-200">
              <h3 className="text-lg font-semibold text-shopscope-black mb-3">Analytics & Insights</h3>
              <ul className="space-y-2 text-shopscope-gray-600 text-sm">
                <li>• Detailed engagement metrics</li>
                <li>• Mobile shopping behavior data</li>
                <li>• Sales performance tracking</li>
                <li>• Customer demographics</li>
              </ul>
            </div>
            <div className="bg-white p-6 rounded-xl border border-shopscope-gray-200">
              <h3 className="text-lg font-semibold text-shopscope-black mb-3">Payment & Support</h3>
              <ul className="space-y-2 text-shopscope-gray-600 text-sm">
                <li>• Secure payment processing</li>
                <li>• Weekly automatic payouts</li>
                <li>• Customer support for shoppers</li>
                <li>• Technical integration support</li>
              </ul>
            </div>
          </div>

          {/* No Hidden Fees */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-8 mt-12">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-green-800 mb-4">No Hidden Fees</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 text-green-700">
                <div className="text-center">
                  <div className="text-3xl font-bold">$0</div>
                  <div className="text-sm">Setup Fees</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">$0</div>
                  <div className="text-sm">Monthly Fees</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">$0</div>
                  <div className="text-sm">Listing Fees</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">$0</div>
                  <div className="text-sm">Payment Fees</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">$0</div>
                  <div className="text-sm">Cancellation</div>
                </div>
              </div>
              <p className="text-sm text-green-600 mt-4">
                Just one simple 10% commission on completed sales
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 bg-shopscope-black text-white">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <span className="text-shopscope-black font-bold">S</span>
            </div>
            <span className="text-xl font-bold">ShopScope</span>
          </div>
          <p className="text-shopscope-gray-400 mb-6">
            Connecting brands with mobile shoppers through our innovative marketplace app
          </p>
          <div className="flex flex-wrap justify-center gap-8">
            <Link href="/privacy" className="text-shopscope-gray-400 hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="text-shopscope-gray-400 hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/support" className="text-shopscope-gray-400 hover:text-white transition-colors">Support</Link>
            <Link href="/contact" className="text-shopscope-gray-400 hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
      </footer>

      {/* Onboarding Modal */}
      {showOnboarding && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-8 max-w-md w-full"
          >
            <h3 className="text-2xl font-bold text-shopscope-black mb-4">
              Ready to Reach Mobile Shoppers?
            </h3>
            <p className="text-shopscope-gray-600 mb-6">
              Join ShopScope mobile marketplace and start growing your brand.
            </p>
            <div className="space-y-3">
              <Link
                href="/auth/signup"
                className="block w-full btn-primary text-center py-3"
              >
                Create New Account
              </Link>
              <Link
                href="/auth/login"
                className="block w-full btn-secondary text-center py-3"
              >
                Sign In to Existing Account
              </Link>
            </div>
            <button
              onClick={() => setShowOnboarding(false)}
              className="w-full mt-4 text-shopscope-gray-500 hover:text-shopscope-gray-700 transition-colors"
            >
              Not now
            </button>
          </motion.div>
        </div>
      )}
    </div>
  )
} 