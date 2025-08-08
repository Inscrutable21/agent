'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AnalyticsDashboard from '../../../components/admin/AnalyticsDashboard'

export default function AdminDashboard() {
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check if admin is logged in
    const token = localStorage.getItem('adminToken')
    const adminData = localStorage.getItem('adminData')

    if (!token || !adminData) {
      router.push('/admin/login')
      return
    }

    try {
      setAdmin(JSON.parse(adminData))
    } catch (error) {
      console.error('Error parsing admin data:', error)
      router.push('/admin/login')
      return
    }

    setLoading(false)
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminData')
    router.push('/admin/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Admin Dashboard
            </h1>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Welcome back!
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Logged in as: <span className="font-medium">{admin?.email}</span>
          </p>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Admin ID: <span className="font-mono text-sm">{admin?.id}</span>
          </p>
        </div>

        {/* Add your admin content here */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Manage Services
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Add, edit, or remove advertising services
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              View Analytics
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Monitor website performance and metrics
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Settings
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Configure website settings and preferences
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            User Analytics
          </h3>
          <AnalyticsDashboard />
        </div>
      </div>
    </div>
  )
}
