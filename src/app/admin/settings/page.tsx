'use client'

import { useState, useEffect } from 'react'
import { 
  Cog6ToothIcon, 
  ShieldCheckIcon, 
  UserGroupIcon,
  CircleStackIcon as DatabaseIcon,
  BellIcon,
  KeyIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface SystemSettings {
  maintenanceMode: boolean
  debugMode: boolean
  maxLoginAttempts: number
  sessionTimeout: number
  backupFrequency: string
  emailNotifications: boolean
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<SystemSettings>({
    maintenanceMode: false,
    debugMode: false,
    maxLoginAttempts: 5,
    sessionTimeout: 30,
    backupFrequency: 'daily',
    emailNotifications: true
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSettingChange = (key: keyof SystemSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const saveSettings = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      })
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' })
      } else {
        setMessage({ type: 'error', text: 'Failed to save settings' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error saving settings' })
    } finally {
      setLoading(false)
      setTimeout(() => setMessage(null), 3000)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
          <p className="mt-2 text-gray-600">Configure system preferences and security settings</p>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border ${
            message.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center gap-3">
              {message.type === 'success' ? (
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
              ) : (
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
              )}
              <span className="font-medium">{message.text}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* System Configuration */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Cog6ToothIcon className="h-5 w-5 text-gray-600" />
                System Configuration
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Maintenance Mode</label>
                    <p className="text-xs text-gray-500">Temporarily disable system access</p>
                  </div>
                  <button
                    onClick={() => handleSettingChange('maintenanceMode', !settings.maintenanceMode)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.maintenanceMode ? 'bg-red-600' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.maintenanceMode ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Debug Mode</label>
                    <p className="text-xs text-gray-500">Enable detailed logging and debugging</p>
                  </div>
                  <button
                    onClick={() => handleSettingChange('debugMode', !settings.debugMode)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.debugMode ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.debugMode ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Backup Frequency</label>
                  <select
                    value={settings.backupFrequency}
                    onChange={(e) => handleSettingChange('backupFrequency', e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
                  >
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Security Settings */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <ShieldCheckIcon className="h-5 w-5 text-gray-600" />
                Security Settings
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Max Login Attempts</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.maxLoginAttempts}
                    onChange={(e) => handleSettingChange('maxLoginAttempts', parseInt(e.target.value))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Number of failed login attempts before account lockout</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Session Timeout (minutes)</label>
                  <input
                    type="number"
                    min="5"
                    max="480"
                    value={settings.sessionTimeout}
                    onChange={(e) => handleSettingChange('sessionTimeout', parseInt(e.target.value))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Auto-logout after inactivity</p>
                </div>
              </div>
            </div>
          </div>

          {/* Notifications & Access */}
          <div className="space-y-6">
            {/* Notification Settings */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BellIcon className="h-5 w-5 text-gray-600" />
                Notification Settings
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email Notifications</label>
                    <p className="text-xs text-gray-500">Receive system alerts via email</p>
                  </div>
                  <button
                    onClick={() => handleSettingChange('emailNotifications', !settings.emailNotifications)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.emailNotifications ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.emailNotifications ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>
            </div>

            {/* System Information */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <DatabaseIcon className="h-5 w-5 text-gray-600" />
                System Information
              </h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">System Version:</span>
                  <span className="font-medium">1.0.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Last Backup:</span>
                  <span className="font-medium">2 hours ago</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Database Size:</span>
                  <span className="font-medium">2.4 GB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Active Users:</span>
                  <span className="font-medium">24</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <KeyIcon className="h-5 w-5 text-gray-600" />
                Quick Actions
              </h3>
              
              <div className="space-y-3">
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                  Create Backup
                </button>
                <button className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">
                  Clear Cache
                </button>
                <button className="w-full px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors">
                  Test Email
                </button>
                <button className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">
                  Emergency Stop
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={saveSettings}
            disabled={loading}
            className="px-6 py-3 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <CheckCircleIcon className="h-5 w-5" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
