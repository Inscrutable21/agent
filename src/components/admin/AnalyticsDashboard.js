'use client'

import { useState, useEffect, useCallback } from 'react'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('7d')

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/analytics?period=${period}`)
      const data = await response.json()
      setAnalytics(data)
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const deviceChartData = {
    labels: analytics?.deviceStats?.map(d => d.device) || [],
    datasets: [{
      data: analytics?.deviceStats?.map(d => d._count.id) || [],
      backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'],
      borderWidth: 0
    }]
  }

  const browserChartData = {
    labels: analytics?.browserStats?.map(b => b.browser) || [],
    datasets: [{
      data: analytics?.browserStats?.map(b => b._count.id) || [],
      backgroundColor: ['#8B5CF6', '#06B6D4', '#84CC16', '#F97316'],
      borderWidth: 0
    }]
  }

  const dailyActivityData = {
    labels: Array.isArray(analytics?.dailyActivity) ? analytics.dailyActivity.map(d => d.date) : [],
    datasets: [{
      label: 'Daily Activity',
      data: Array.isArray(analytics?.dailyActivity) ? analytics.dailyActivity.map(d => d.count) : [],
      borderColor: '#3B82F6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.4
    }]
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          User Analytics
        </h2>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Page Views</h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {analytics?.pageViews?.reduce((sum, pv) => sum + pv._count.id, 0) || 0}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Unique page visits
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Unique Sessions</h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {analytics?.uniqueSessions || 0}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Distinct user sessions
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Mobile Users</h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {analytics?.deviceStats?.find(d => d.device === 'mobile')?._count.id || 0}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Mobile device visits
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Desktop Users</h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {analytics?.deviceStats?.find(d => d.device === 'desktop')?._count.id || 0}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Desktop/laptop visits
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Activity Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Daily Activity
          </h3>
          <Line data={dailyActivityData} options={{ responsive: true }} />
        </div>

        {/* Device Distribution */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Device Distribution
          </h3>
          <Doughnut data={deviceChartData} options={{ responsive: true }} />
        </div>

        {/* Browser Distribution */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Browser Distribution
          </h3>
          <Doughnut data={browserChartData} options={{ responsive: true }} />
        </div>

        {/* Top Pages */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top Pages
          </h3>
          <div className="space-y-3">
            {analytics?.topPages?.slice(0, 5).map((page, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400 truncate">
                  {page.page}
                </span>
                <span className="text-gray-900 dark:text-white font-semibold">
                  {page._count.id}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          User Activity Heatmap
        </h3>
        <div className="grid grid-cols-7 gap-1">
          {/* Simple heatmap representation */}
          {Array.from({ length: 168 }, (_, i) => (
            <div
              key={i}
              className="w-4 h-4 bg-gray-100 dark:bg-gray-700 rounded-sm"
              style={{
                backgroundColor: `rgba(59, 130, 246, ${Math.random() * 0.8 + 0.1})`
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}


