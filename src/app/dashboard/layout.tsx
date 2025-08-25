'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  HomeIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  ChartBarIcon,
  BanknotesIcon,
  Cog6ToothIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  TagIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Products', href: '/dashboard/products', icon: ShoppingBagIcon },
  { name: 'Orders', href: '/dashboard/orders', icon: ShoppingCartIcon },
  { name: 'Analytics', href: '/dashboard/analytics', icon: ChartBarIcon },
  { name: 'Discounts', href: '/dashboard/discounts', icon: TagIcon },
  { name: 'Upsells', href: '/dashboard/upsells', icon: ArrowTrendingUpIcon },
  { name: 'Payouts', href: '/dashboard/payouts', icon: BanknotesIcon },
  { name: 'Settings', href: '/dashboard/settings', icon: Cog6ToothIcon },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      try {
        // Add a small delay to give session time to establish after login
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // First try to get the current user
        let { data: { user }, error } = await supabase.auth.getUser()
        console.log('getUser result:', { user: user?.email, error })
        
        if (error || !user) {
          // Try to refresh the session
          const { data: { session }, error: refreshError } = await supabase.auth.getSession()
          console.log('getSession result:', { session: session?.user?.email, error: refreshError })
          
          if (refreshError || !session?.user) {
            console.log('No valid session found, redirecting to login')
            // Add a small delay before redirecting to give session time to establish
            setTimeout(() => {
              router.push('/auth/login')
            }, 1000)
            return
          }
          
          user = session.user
        }
        
        setUser(user)
        setIsLoading(false)
        
        // Set up session listener to handle auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log('Auth state change:', event, session?.user?.email)
            if (event === 'SIGNED_OUT') {
              router.push('/auth/login')
            } else if (session?.user) {
              setUser(session.user)
            }
          }
        )
        
        return () => subscription.unsubscribe()
      } catch (error) {
        console.error('Error checking user:', error)
        // Add a small delay before redirecting
        setTimeout(() => {
          router.push('/auth/login')
        }, 1000)
      }
    }

    checkUser()
  }, [router])


  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/auth/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-shopscope-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-shopscope-black mb-4" />
          <p className="text-shopscope-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-shopscope-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-shopscope-gray-600">Please log in to continue</p>
          <button 
            onClick={() => window.location.href = '/auth/login'}
            className="mt-4 bg-shopscope-black text-white px-4 py-2 rounded-lg hover:bg-shopscope-gray-800"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-shopscope-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-shopscope-black/50" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl">
          <div className="flex h-full flex-col">
            {/* Logo */}
            <div className="flex h-16 items-center justify-between px-6 border-b border-shopscope-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-shopscope-black rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">S</span>
                </div>
                <div>
                  <h1 className="text-lg font-bold text-shopscope-black">ShopScope</h1>
                  <p className="text-xs text-shopscope-gray-600">Mobile Marketplace</p>
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-shopscope-gray-400 hover:text-shopscope-black">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-6 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-shopscope-black text-white'
                        : 'text-shopscope-gray-700 hover:bg-shopscope-gray-100 hover:text-shopscope-black'
                    }`}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>

            {/* User menu */}
            <div className="border-t border-shopscope-gray-200 p-3">
              <div className="flex items-center px-3 py-2 text-sm text-shopscope-gray-700">
                <UserCircleIcon className="w-5 h-5 mr-3" />
                <span>Premium Brand</span>
              </div>
              <button 
                onClick={handleSignOut}
                className="flex w-full items-center px-3 py-2 text-sm text-shopscope-gray-700 hover:bg-shopscope-gray-100 rounded-lg transition-colors"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5 mr-3" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:w-64 lg:bg-white lg:border-r lg:border-shopscope-gray-200 lg:flex lg:flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center px-6 border-b border-shopscope-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-shopscope-black rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">S</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-shopscope-black">ShopScope</h1>
              <p className="text-xs text-shopscope-gray-600">Mobile Marketplace</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-shopscope-black text-white'
                    : 'text-shopscope-gray-700 hover:bg-shopscope-gray-100 hover:text-shopscope-black'
                }`}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* User menu */}
        <div className="border-t border-shopscope-gray-200 p-3">
          <div className="flex items-center px-3 py-2 text-sm text-shopscope-gray-700">
            <UserCircleIcon className="w-5 h-5 mr-3" />
            <span>Premium Brand</span>
          </div>
          <button 
            onClick={handleSignOut}
            className="flex w-full items-center px-3 py-2 text-sm text-shopscope-gray-700 hover:bg-shopscope-gray-100 rounded-lg transition-colors"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5 mr-3" />
            Sign out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-white border-b border-shopscope-gray-200">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-shopscope-gray-400 hover:text-shopscope-black"
            >
              <Bars3Icon className="w-6 h-6" />
            </button>
            
            <div className="flex items-center space-x-4">
              <div className="hidden sm:block text-sm text-shopscope-gray-600">
                Mobile Marketplace Dashboard
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main>
          {children}
        </main>
      </div>
    </div>
  )
} 