'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  ChartBarIcon, 
  UserGroupIcon, 
  ShoppingBagIcon, 
  CubeIcon,
  BanknotesIcon,
  CogIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline'

const adminNavigation = [
  { name: 'Dashboard', href: '/admin', icon: ChartBarIcon },
  { name: 'Brands', href: '/admin/brands', icon: UserGroupIcon },
  { name: 'Orders', href: '/admin/orders', icon: ShoppingBagIcon },
  { name: 'Products', href: '/admin/products', icon: CubeIcon },
  { name: 'Payouts', href: '/admin/payouts', icon: BanknotesIcon },
  { name: 'Settings', href: '/admin/settings', icon: CogIcon },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('admin_token')
      console.log('Admin layout: checking auth, token exists:', !!token)
      
      if (!token) {
        console.log('Admin layout: no token, redirecting to login')
        setLoading(false)
        router.replace('/admin/login')
        return
      }
      
      console.log('Admin layout: token found, setting authenticated')
      setIsAuthenticated(true)
      setLoading(false)
    }

    // Add a small delay to prevent immediate redirect
    const timer = setTimeout(checkAuth, 100)
    return () => clearTimeout(timer)
  }, [router])

  const handleLogout = () => {
    console.log('Admin layout: logging out')
    localStorage.removeItem('admin_token')
    setIsAuthenticated(false)
    router.push('/admin/login')
  }

  // Allow the login page to render without the admin layout/auth gating
  if (pathname === '/admin/login') {
    console.log('Admin layout: on login route, skipping auth/layout')
    return <div className="min-h-screen bg-gray-50">{children}</div>
  }

  if (loading) {
    console.log('Admin layout: showing loading state')
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    console.log('Admin layout: not authenticated, showing redirect')
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div
        className={`fixed inset-0 z-40 lg:hidden ${
          sidebarOpen ? 'block' : 'hidden'
        }`}
      >
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75"
          onClick={() => setSidebarOpen(false)}
        />

        {/* Sidebar panel */}
        <div className="fixed inset-y-0 left-0 flex w-full max-w-xs flex-col bg-white">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-black rounded-lg" />
              <span className="font-semibold text-gray-900">Admin</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-500 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-black rounded-md"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <nav className="mt-5 flex-1 space-y-1 px-3">
            {adminNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center rounded-md px-3 py-2 text-sm font-medium ${
                    isActive
                      ? 'bg-gray-100 text-black'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-black'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon
                    className={`mr-3 h-6 w-6 flex-shrink-0 ${
                      isActive ? 'text-black' : 'text-gray-400 group-hover:text-black'
                    }`}
                  />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          <div className="border-t border-gray-200 p-4">
            <button
              onClick={handleLogout}
              className="flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <ArrowRightOnRectangleIcon className="mr-3 h-6 w-6 flex-shrink-0" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-white">
          <div className="flex h-16 items-center gap-3 px-6">
            <div className="w-8 h-8 bg-black rounded-lg" />
            <span className="font-semibold text-gray-900">ShopScope Admin</span>
          </div>

          <nav className="mt-5 flex-1 space-y-1 px-3">
            {adminNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center rounded-md px-3 py-2 text-sm font-medium ${
                    isActive
                      ? 'bg-gray-100 text-black'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-black'
                  }`}
                >
                  <item.icon
                    className={`mr-3 h-6 w-6 flex-shrink-0 ${
                      isActive ? 'text-black' : 'text-gray-400 group-hover:text-black'
                    }`}
                  />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          <div className="border-t border-gray-200 p-4">
            <button
              onClick={handleLogout}
              className="flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <ArrowRightOnRectangleIcon className="mr-3 h-6 w-6 flex-shrink-0" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 lg:hidden">
          <div className="flex h-16 items-center gap-x-4 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              className="text-gray-500 hover:text-gray-600 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="sr-only">Open sidebar</span>
              <Bars3Icon className="h-6 w-6" />
            </button>

            <div className="flex flex-1">
              <h1 className="text-2xl font-semibold text-gray-900">Admin</h1>
            </div>
          </div>
        </div>

        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}
