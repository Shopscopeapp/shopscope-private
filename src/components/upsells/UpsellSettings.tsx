'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface UpsellSettings {
  notification_frequency: number // hours
  max_daily_notifications: number
  default_discount_percentage: number
  min_engagement_score: number
  budget_limit: number
  cost_per_action: number
}

interface UpsellSettingsProps {
  brandId: string | undefined
}

export default function UpsellSettings({ brandId }: UpsellSettingsProps) {
  const [settings, setSettings] = useState<UpsellSettings>({
    notification_frequency: 24,
    max_daily_notifications: 2,
    default_discount_percentage: 10,
    min_engagement_score: 50,
    budget_limit: 100,
    cost_per_action: 1.50
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const loadSettings = async () => {
      if (!brandId) return

      try {
        const { data, error } = await supabase
          .from('upsell_settings')
          .select('*')
          .eq('brand_id', brandId)
          .single()

        if (error) {
          // If table doesn't exist, use default values
          console.log('Upsell settings not available:', error.message)
          setIsLoading(false)
          return
        }

        if (data) {
          setSettings(data)
        }
      } catch (error) {
        console.error('Error loading settings:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [brandId, supabase])

  const handleSave = async () => {
    if (!brandId) return

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('upsell_settings')
        .upsert({
          brand_id: brandId,
          ...settings
        })

      if (error) throw error
      
      alert('Settings saved successfully!')
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Failed to save settings. Please try again.')
    } finally {
      setIsSaving(false)
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
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-medium text-shopscope-black mb-6">Upsell Configuration</h2>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-shopscope-gray-700">
            Notification Frequency (hours)
          </label>
          <input
            type="number"
            min="1"
            max="72"
            value={settings.notification_frequency}
            onChange={(e) => setSettings({
              ...settings,
              notification_frequency: parseInt(e.target.value)
            })}
            className="mt-1 block w-full rounded-md border-shopscope-gray-300 shadow-sm focus:border-shopscope-black focus:ring-shopscope-black sm:text-sm"
          />
          <p className="mt-1 text-sm text-shopscope-gray-500">
            Minimum hours between notifications for the same user
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-shopscope-gray-700">
            Maximum Daily Notifications
          </label>
          <input
            type="number"
            min="1"
            max="10"
            value={settings.max_daily_notifications}
            onChange={(e) => setSettings({
              ...settings,
              max_daily_notifications: parseInt(e.target.value)
            })}
            className="mt-1 block w-full rounded-md border-shopscope-gray-300 shadow-sm focus:border-shopscope-black focus:ring-shopscope-black sm:text-sm"
          />
          <p className="mt-1 text-sm text-shopscope-gray-500">
            Maximum number of notifications per user per day
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-shopscope-gray-700">
            Default Discount Percentage
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={settings.default_discount_percentage}
            onChange={(e) => setSettings({
              ...settings,
              default_discount_percentage: parseInt(e.target.value)
            })}
            className="mt-1 block w-full rounded-md border-shopscope-gray-300 shadow-sm focus:border-shopscope-black focus:ring-shopscope-black sm:text-sm"
          />
          <p className="mt-1 text-sm text-shopscope-gray-500">
            Default discount percentage for upsell offers
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-shopscope-gray-700">
            Minimum Engagement Score
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={settings.min_engagement_score}
            onChange={(e) => setSettings({
              ...settings,
              min_engagement_score: parseInt(e.target.value)
            })}
            className="mt-1 block w-full rounded-md border-shopscope-gray-300 shadow-sm focus:border-shopscope-black focus:ring-shopscope-black sm:text-sm"
          />
          <p className="mt-1 text-sm text-shopscope-gray-500">
            Minimum engagement score required for upsell eligibility
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-shopscope-gray-700">
            Daily Budget Limit ($)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={settings.budget_limit}
            onChange={(e) => setSettings({
              ...settings,
              budget_limit: parseFloat(e.target.value)
            })}
            className="mt-1 block w-full rounded-md border-shopscope-gray-300 shadow-sm focus:border-shopscope-black focus:ring-shopscope-black sm:text-sm"
          />
          <p className="mt-1 text-sm text-shopscope-gray-500">
            Maximum daily spend on upsell actions
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-shopscope-gray-700">
            Cost per Action ($)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={settings.cost_per_action}
            onChange={(e) => setSettings({
              ...settings,
              cost_per_action: parseFloat(e.target.value)
            })}
            className="mt-1 block w-full rounded-md border-shopscope-gray-300 shadow-sm focus:border-shopscope-black focus:ring-shopscope-black sm:text-sm"
          />
          <p className="mt-1 text-sm text-shopscope-gray-500">
            Cost per upsell action (notification, wishlist boost, or discount)
          </p>
        </div>

        <div className="pt-4">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-shopscope-black hover:bg-shopscope-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-shopscope-black"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
