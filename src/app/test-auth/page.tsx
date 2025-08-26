'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestAuthPage() {
  const [user, setUser] = useState<any>(null)
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('🔍 Checking authentication...')
        
        // Check user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        console.log('getUser result:', { user: user?.email, error: userError })
        setUser(user)
        
        // Check session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        console.log('getSession result:', { session: session?.user?.email, error: sessionError })
        setSession(session)
        
        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          console.log('Auth state change:', event, session?.user?.email)
          setUser(session?.user || null)
          setSession(session)
        })
        
        setLoading(false)
        return () => subscription.unsubscribe()
      } catch (error) {
        console.error('Error checking auth:', error)
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Authentication Test Page</h1>
      
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">User State:</h2>
          <pre className="bg-gray-100 p-2 rounded">
            {user ? JSON.stringify(user, null, 2) : 'No user'}
          </pre>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold">Session State:</h2>
          <pre className="bg-gray-100 p-2 rounded">
            {session ? JSON.stringify(session, null, 2) : 'No session'}
          </pre>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold">Actions:</h2>
          <button
            onClick={handleSignOut}
            className="bg-red-500 text-white px-4 py-2 rounded"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}



