'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  BeakerIcon, 
  ArrowLeftIcon,
  DocumentTextIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FunnelIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'

export default function ResultsPage() {
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterComponent, setFilterComponent] = useState('')
  const [filterTestType, setFilterTestType] = useState('')
  const router = useRouter()

  const loadResults = useCallback(async () => {
    setLoading(true)
    try {
      // First try to get from sessionStorage (from requirements page)
      const sessionData = sessionStorage.getItem('aiTestResults')
      if (sessionData && currentPage === 1) {
        const data = JSON.parse(sessionData)
        console.log('📊 Session data:', data)
        setResults(data)
        setLoading(false)
        return
      }

      // Fetch from database with pagination
      console.log('🔍 Fetching from API...')
      const response = await fetch(`/api/admin/qa/ai-test-generator/test-data?page=${currentPage}&limit=50`)
      const data = await response.json()
      
      console.log('📊 API Response:', data)
      
      if (data.success && data.testCases?.length > 0) {
        setResults({
          success: true,
          pagination: data.pagination,
          testCases: data.testCases,
          stats: data.stats,
          summary: {
            total: data.stats.total,
            highPriority: data.stats.byPriority?.find(t => t.priority === 'high')?._count?.id || 0,
            mediumPriority: data.stats.byPriority?.find(t => t.priority === 'medium')?._count?.id || 0,
            lowPriority: data.stats.byPriority?.find(t => t.priority === 'low')?._count?.id || 0
          },
          debug: data.debug
        })
      } else {
        console.log('❌ No test cases found or API failed')
        setResults({ 
          success: false, 
          message: data.error || 'No test results found',
          debug: data.debug
        })
      }
    } catch (error) {
      console.error('Failed to load results:', error)
      setResults({ success: false, message: 'Failed to load test results' })
    } finally {
      setLoading(false)
    }
  }, [currentPage])

  useEffect(() => {
    loadResults()
  }, [loadResults])

  const copyTestCase = (testCase) => {
    const testText = `
Test Case: ${testCase.title}
Description: ${testCase.description || 'No description'}
Component: ${testCase.component || 'Unknown'}
Test Type: ${testCase.testType || 'functional'}
Priority: ${testCase.priority || 'medium'}
Test ID: ${testCase.testId}

Steps:
${testCase.steps?.map((step, i) => `${i + 1}. ${step}`).join('\n') || 'No steps defined'}

Assertions:
${testCase.assertions?.map((assertion, i) => `${i + 1}. ${assertion}`).join('\n') || 'No assertions defined'}

Page URL: ${testCase.pageUrl || 'Not specified'}
Created: ${new Date(testCase.createdAt).toLocaleString()}
    `.trim()

    navigator.clipboard.writeText(testText)
    alert('Test case copied to clipboard!')
  }

  const exportAllTests = () => {
    if (!results?.testCases) return
    
    const csvContent = [
      ['Test ID', 'Title', 'Description', 'Component', 'Test Type', 'Priority', 'Steps', 'Assertions', 'Created'],
      ...results.testCases.map(test => [
        test.testId,
        test.title,
        test.description || '',
        test.component || '',
        test.testType || '',
        test.priority || '',
        test.steps?.join('; ') || '',
        test.assertions?.join('; ') || '',
        new Date(test.createdAt).toLocaleString()
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ai-test-cases-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const migrateTestCases = async () => {
    try {
      const response = await fetch('/api/admin/qa/migrate-tests', {
        method: 'POST'
      })
      const data = await response.json()
      if (data.success) {
        alert(`Migration successful! ${data.message}`)
        loadResults() // Reload to show updated data
      }
    } catch (error) {
      console.error('Migration failed:', error)
      alert('Migration failed')
    }
  }

  const createDebugTestCase = async () => {
    try {
      const response = await fetch('/api/admin/qa/ai-test-generator/test-data', {
        method: 'POST'
      })
      const data = await response.json()
      if (data.success) {
        alert('Debug test case created! Refreshing...')
        loadResults()
      } else {
        alert('Failed to create test case: ' + data.error)
      }
    } catch (error) {
      console.error('Failed to create debug test case:', error)
      alert('Failed to create debug test case')
    }
  }

  const clearAllTestCases = async () => {
    if (!confirm('⚠️ Are you sure you want to delete ALL test cases? This cannot be undone!')) {
      return
    }

    try {
      const response = await fetch('/api/admin/qa/ai-test-generator/test-data?action=clear_all', {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert(`✅ Successfully deleted ${data.deletedCount} test cases!`)
        loadResults() // Refresh to show empty state
      } else {
        alert('❌ Failed to delete test cases: ' + data.error)
      }
    } catch (error) {
      console.error('Error clearing test cases:', error)
      alert('❌ Failed to delete test cases')
    }
  }

  // Filter test cases based on search and filters
  const filteredTestCases = results?.testCases?.filter(test => {
    const matchesSearch = !searchTerm || 
      test.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.component?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesComponent = !filterComponent || test.component === filterComponent
    const matchesTestType = !filterTestType || test.testType === filterTestType
    
    return matchesSearch && matchesComponent && matchesTestType
  }) || []

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BeakerIcon className="mx-auto h-12 w-12 text-gray-400 animate-pulse" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Loading Results...</h3>
          <p className="text-xs text-gray-500">Fetching test cases from database...</p>
        </div>
      </div>
    )
  }

  if (!results?.success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              Back
            </button>
            <h1 className="text-3xl font-bold text-gray-900">🧪 Test Results</h1>
          </div>

          <div className="bg-white shadow rounded-lg p-8 text-center">
            <BeakerIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No Test Results Found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {results?.message || 'Generate some test cases first to see results here.'}
            </p>
            <div className="mt-6">
              <button
                onClick={() => router.push('/admin/qa/ai-test-generator/requirements')}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <BeakerIcon className="h-4 w-4 mr-2" />
                Generate Test Cases
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🧪 Test Results</h1>
              <p className="text-sm text-gray-600 mt-1">
                Showing {filteredTestCases.length} of {results.pagination?.total || results.testCases?.length || 0} test cases
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={createDebugTestCase}
                className="inline-flex items-center px-3 py-2 border border-blue-300 shadow-sm text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100"
              >
                🧪 Create Test Data
              </button>
              <button
                onClick={clearAllTestCases}
                className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100"
              >
                🗑️ Clear All Tests
              </button>
              <button
                onClick={exportAllTests}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <DocumentTextIcon className="h-4 w-4 mr-2" />
                Export CSV
              </button>
              <button
                onClick={loadResults}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {results?.debug && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-yellow-800 mb-2">🔍 Debug Information</h3>
            <div className="text-xs text-yellow-700 space-y-1">
              <p>Total in DB: {results.debug.totalInDb}</p>
              <p>Returned: {results.debug.returned}</p>
              <p>Query: {results.debug.queryUsed}</p>
              {results.debug.sampleData && (
                <details className="mt-2">
                  <summary className="cursor-pointer font-medium">Sample Data</summary>
                  <pre className="mt-1 text-xs bg-yellow-100 p-2 rounded overflow-auto">
                    {JSON.stringify(results.debug.sampleData, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        )}

        {/* Stats Summary */}
        {results.stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-blue-600">{results.stats.total}</div>
              <div className="text-sm text-gray-500">Total Test Cases</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-green-600">{results.stats.byComponent?.length || 0}</div>
              <div className="text-sm text-gray-500">Components Covered</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-purple-600">{results.stats.byTestType?.length || 0}</div>
              <div className="text-sm text-gray-500">Test Types</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-orange-600">{results.pagination?.totalPages || 1}</div>
              <div className="text-sm text-gray-500">Pages</div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search test cases..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <select
              value={filterComponent}
              onChange={(e) => setFilterComponent(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">All Components</option>
              {results.stats?.byComponent?.map(comp => (
                <option key={comp.component} value={comp.component}>
                  {comp.component} ({comp._count.id})
                </option>
              ))}
            </select>
            <select
              value={filterTestType}
              onChange={(e) => setFilterTestType(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">All Test Types</option>
              {results.stats?.byTestType?.map(type => (
                <option key={type.testType} value={type.testType}>
                  {type.testType} ({type._count.id})
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                setSearchTerm('')
                setFilterComponent('')
                setFilterTestType('')
              }}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Test Cases List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Generated Test Cases ({filteredTestCases.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {filteredTestCases.map((test, index) => (
              <div key={test.id || index} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="text-sm font-medium text-gray-900">{test.title}</h4>
                      <span className="text-xs text-gray-500">#{test.testId}</span>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">{test.description || 'No description'}</p>
                    
                    <div className="flex items-center space-x-4 mb-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        test.testType === 'authentication' ? 'bg-red-100 text-red-800' :
                        test.testType === 'api' ? 'bg-blue-100 text-blue-800' :
                        test.testType === 'functional' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {test.testType || 'functional'}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        test.priority === 'high' ? 'bg-red-100 text-red-800' :
                        test.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {test.priority || 'medium'} priority
                      </span>
                      {test.component && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {test.component}
                        </span>
                      )}
                    </div>

                    {/* Test Steps Preview */}
                    {test.steps && test.steps.length > 0 && (
                      <div className="mt-3 text-sm text-gray-600">
                        <p className="font-medium">Steps ({test.steps.length}):</p>
                        <ol className="list-decimal list-inside mt-1 space-y-1">
                          {test.steps.slice(0, 3).map((step, stepIndex) => (
                            <li key={stepIndex} className="text-xs">{step}</li>
                          ))}
                          {test.steps.length > 3 && (
                            <li className="text-gray-400 text-xs">... and {test.steps.length - 3} more steps</li>
                          )}
                        </ol>
                      </div>
                    )}

                    {/* Assertions Preview */}
                    {test.assertions && test.assertions.length > 0 && (
                      <div className="mt-3 text-sm text-gray-600">
                        <p className="font-medium">Assertions ({test.assertions.length}):</p>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                          {test.assertions.slice(0, 2).map((assertion, assertIndex) => (
                            <li key={assertIndex} className="text-xs">{assertion}</li>
                          ))}
                          {test.assertions.length > 2 && (
                            <li className="text-gray-400 text-xs">... and {test.assertions.length - 2} more assertions</li>
                          )}
                        </ul>
                      </div>
                    )}

                    <div className="mt-3 text-xs text-gray-400">
                      Created: {new Date(test.createdAt).toLocaleString()}
                      {test.pageUrl && ` • URL: ${test.pageUrl}`}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => copyTestCase(test)}
                    className="ml-4 text-sm text-blue-600 hover:text-blue-800"
                  >
                    Copy
                  </button>
                </div>
              </div>
            ))}

            {filteredTestCases.length === 0 && (
              <div className="p-6 text-center text-gray-500">
                <BeakerIcon className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-2">No test cases match your filters</p>
              </div>
            )}
          </div>
        </div>

        {/* Pagination */}
        {results.pagination && results.pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Page {results.pagination.page} of {results.pagination.totalPages}
              ({results.pagination.total} total test cases)
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={!results.pagination.hasPrev}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeftIcon className="h-4 w-4 mr-1" />
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={!results.pagination.hasNext}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
                <ChevronRightIcon className="h-4 w-4 ml-1" />
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 flex justify-center space-x-4">
          <button
            onClick={() => router.push('/admin/qa/ai-test-generator/requirements')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <BeakerIcon className="h-4 w-4 mr-2" />
            Generate More Tests
          </button>
          <button
            onClick={() => router.push('/admin/qa/ai-test-generator')}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <DocumentTextIcon className="h-4 w-4 mr-2" />
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}






