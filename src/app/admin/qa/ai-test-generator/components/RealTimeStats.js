'use client'

import { useState, useEffect } from 'react'
import { 
  DocumentTextIcon,
  BeakerIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  ArrowPathIcon,
  BugAntIcon
} from '@heroicons/react/24/outline'

export default function RealTimeStats() {
  const [stats, setStats] = useState({
    totalRequirements: 0,
    totalTestCases: 0,
    avgRiskScore: 0,
    lastGenerated: null
  })
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [debugMode, setDebugMode] = useState(false)
  const [debugData, setDebugData] = useState(null)

  const loadStats = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/qa/ai-test-generator/stats')
      const data = await response.json()
      if (data.success) {
        setStats(data.stats)
        setLastUpdated(new Date())
      } else {
        console.error('Stats API error:', data.error)
      }
    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadDebugData = async () => {
    try {
      const response = await fetch('/api/admin/qa/ai-test-generator/test-data')
      const data = await response.json()
      if (data.success) {
        setDebugData(data.debug)
      }
    } catch (error) {
      console.error('Failed to load debug data:', error)
    }
  }

  const createTestData = async () => {
    try {
      const response = await fetch('/api/admin/qa/ai-test-generator/test-data', {
        method: 'POST'
      })
      const data = await response.json()
      if (data.success) {
        alert('Debug test case created! Refresh to see updated stats.')
        loadStats()
        loadDebugData()
      }
    } catch (error) {
      console.error('Failed to create test data:', error)
    }
  }

  useEffect(() => {
    // Load initial stats
    loadStats()
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(loadStats, 10000)
    
    return () => clearInterval(interval)
  }, [])

  const refreshStats = () => {
    loadStats()
    if (debugMode) {
      loadDebugData()
    }
  }

  return (
    <div className="mb-8">
      {/* Debug Toggle */}
      <div className="mb-4 flex items-center justify-between">
        <div></div>
        <button
          onClick={() => {
            setDebugMode(!debugMode)
            if (!debugMode) loadDebugData()
          }}
          className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800"
        >
          <BugAntIcon className="h-4 w-4" />
          <span>{debugMode ? 'Hide Debug' : 'Show Debug'}</span>
        </button>
      </div>

      {/* Debug Panel */}
      {debugMode && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-yellow-800">🐛 Debug Information</h3>
            <div className="space-x-2">
              <button
                onClick={loadDebugData}
                className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded"
              >
                Refresh Debug
              </button>
              <button
                onClick={createTestData}
                className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded"
              >
                Create Test Data
              </button>
            </div>
          </div>
          {debugData ? (
            <div className="text-xs text-yellow-700 space-y-1">
              <p><strong>Total in DB:</strong> {debugData.totalInDb}</p>
              <p><strong>AI Generated:</strong> {debugData.aiGenerated}</p>
              <p><strong>Recent Tests:</strong> {debugData.recentTests?.length || 0}</p>
              {debugData.recentAiTests?.length > 0 && (
                <div>
                  <p><strong>Latest AI Test:</strong></p>
                  <p className="ml-2">• {debugData.recentAiTests[0].title}</p>
                  <p className="ml-2">• Created: {new Date(debugData.recentAiTests[0].createdAt).toLocaleString()}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-yellow-700">Loading debug data...</p>
          )}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Total Requirements */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DocumentTextIcon className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Requirements Processed
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {loading ? '...' : stats.totalRequirements}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 px-5 py-3">
            <div className="text-sm">
              <span className="text-blue-600 font-medium">
                {stats.totalRequirements > 0 ? 'Active' : 'Ready'}
              </span>
            </div>
          </div>
        </div>

        {/* Total Test Cases */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BeakerIcon className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Test Cases Generated
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {loading ? '...' : stats.totalTestCases}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-green-50 px-5 py-3">
            <div className="text-sm">
              <span className="text-green-600 font-medium">
                {stats.totalTestCases > 0 ? `${stats.totalTestCases} Generated` : 'None yet'}
              </span>
            </div>
          </div>
        </div>

        {/* Average Risk Score */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className={`h-6 w-6 ${
                  stats.avgRiskScore >= 7 ? 'text-red-400' : 
                  stats.avgRiskScore >= 4 ? 'text-yellow-400' : 'text-green-400'
                }`} />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Avg Risk Score
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {loading ? '...' : `${stats.avgRiskScore}/10`}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className={`px-5 py-3 ${
            stats.avgRiskScore >= 7 ? 'bg-red-50' : 
            stats.avgRiskScore >= 4 ? 'bg-yellow-50' : 'bg-green-50'
          }`}>
            <div className="text-sm">
              <span className={`font-medium ${
                stats.avgRiskScore >= 7 ? 'text-red-600' : 
                stats.avgRiskScore >= 4 ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {stats.avgRiskScore >= 7 ? 'High Risk' : 
                 stats.avgRiskScore >= 4 ? 'Medium Risk' : 'Low Risk'}
              </span>
            </div>
          </div>
        </div>

        {/* Last Generated */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <SparklesIcon className="h-6 w-6 text-purple-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Last Generated
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {loading ? '...' : (
                      stats.lastGenerated 
                        ? new Date(stats.lastGenerated).toLocaleDateString()
                        : 'Never'
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 px-5 py-3">
            <div className="flex items-center justify-between">
              <span className="text-purple-600 font-medium text-sm">
                {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Loading...'}
              </span>
              <button
                onClick={refreshStats}
                disabled={loading}
                className="text-purple-600 hover:text-purple-800 disabled:opacity-50"
              >
                <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
