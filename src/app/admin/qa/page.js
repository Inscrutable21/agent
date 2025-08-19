'use client'

import { useState, useEffect } from 'react'

export default function QADashboard() {
  const [testCases, setTestCases] = useState([])
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('tests')
  const [autoTriggerEnabled, setAutoTriggerEnabled] = useState(true)
  const [execLoading, setExecLoading] = useState(false)
  const [execResults, setExecResults] = useState(null)
  const [recentResults, setRecentResults] = useState([])

  const loadRecentResults = async () => {
    try {
      const res = await fetch('/api/admin/qa/results?limit=25')
      const data = await res.json()
      if (data.success) setRecentResults(data.results)
    } catch (e) {
      console.error('Load results failed:', e)
    }
  }

  useEffect(() => {
    // Load test cases and issues on mount, and refresh periodically if enabled
    fetchTestCases()
    fetchIssues()

    const interval = setInterval(() => {
      if (autoTriggerEnabled) {
        fetchTestCases()
        fetchIssues()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [autoTriggerEnabled])

  useEffect(() => {
    if (execLoading) {
      const t = setInterval(() => loadRecentResults(), 1500)
      return () => clearInterval(t)
    }
  }, [execLoading])

  const fetchTestCases = async () => {
    try {
      const response = await fetch('/api/admin/qa/test-cases')
      const data = await response.json()
      if (data.success) {
        setTestCases(data.testCases)
      }
    } catch (error) {
      console.error('Error fetching test cases:', error)
    }
  }

  const fetchIssues = async () => {
    try {
      const response = await fetch('/api/admin/qa/issues')
      const data = await response.json()
      if (data.success) {
        setIssues(data.issues)
      }
    } catch (error) {
      console.error('Error fetching issues:', error)
    }
  }

  const triggerAutoQA = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/qa/auto-trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageUrl: 'https://example.com',
          content: 'Sample page content',
          changeType: 'manual_trigger'
        })
      })
      
      const data = await response.json()
      if (response.ok) {
        alert(`Auto-QA completed! Generated ${data.testsGenerated} tests, detected ${data.issuesDetected} issues`)
        fetchTestCases()
        fetchIssues()
      }
    } catch (error) {
      console.error('Error triggering auto QA:', error)
    } finally {
      setLoading(false)
    }
  }

  // Execute all tests in parallel (handled by API)
  const executeAllTests = async (concurrency = 5) => {
    setExecLoading(true)
    try {
      const res = await fetch('/api/admin/qa/execute-all-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concurrency })
      })
      const data = await res.json()
      if (data.success) {
        setExecResults(data.results)
        await fetchTestCases()
        await fetchIssues()
      } else {
        alert('Failed to execute tests')
      }
    } catch (e) {
      console.error('Execute tests failed:', e)
    } finally {
      setExecLoading(false)
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100'
      case 'high': return 'text-orange-600 bg-orange-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'passed': return 'bg-green-100 text-green-700'
      case 'failed': return 'bg-red-100 text-red-700'
      case 'running': return 'bg-blue-100 text-blue-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const statusCounts = testCases.reduce((acc, t) => {
    acc[t.status || 'pending'] = (acc[t.status || 'pending'] || 0) + 1
    return acc
  }, { passed: 0, failed: 0, running: 0, pending: 0 })

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            AI QA Dashboard
          </h1>
          
          <div className="flex items-center gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={autoTriggerEnabled}
                onChange={(e) => setAutoTriggerEnabled(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">Auto-refresh</span>
            </label>
            
            <div className="flex gap-3 text-sm">
              <span className="text-gray-500">Tests: {testCases.length}</span>
              <span className="text-green-600">Passed: {statusCounts.passed}</span>
              <span className="text-red-600">Failed: {statusCounts.failed}</span>
              <span className="text-blue-600">Running: {statusCounts.running}</span>
              <span className="text-gray-600">Pending: {statusCounts.pending}</span>
              <span className="text-gray-500">Issues: {issues.length}</span>
              <a href="/admin/qa/executions" className="ml-3 inline-flex items-center px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white">View Executions</a>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-wrap gap-4">
            <button
              onClick={triggerAutoQA}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-6 py-3 rounded-md font-medium flex items-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Running Auto-QA...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                  Trigger Auto-QA
                </>
              )}
            </button>
            
            <button
              onClick={() => executeAllTests(5)}
              disabled={execLoading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-6 py-3 rounded-md font-medium"
            >
              {execLoading ? 'Executing Tests…' : 'Execute All Tests (parallel)'}
            </button>
            
            <div className="text-sm text-gray-500 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Auto-triggers on content changes
            </div>
          </div>

          {execResults && (
            <div className="mt-4 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4 text-sm">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>Mode: <span className="font-medium">{execResults.mode}</span></div>
                <div>Concurrency: <span className="font-medium">{execResults.concurrency}</span></div>
                <div>Wall Time: <span className="font-medium">{Math.round(execResults.durationMs/100)/10}s</span></div>
                <div>Total: {execResults.total} • <span className="text-green-600">Passed: {execResults.passed}</span> • <span className="text-red-600">Failed: {execResults.failed}</span></div>
              </div>
              <div className="mt-3">
                <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">Recent results:</div>
                <div className="text-xs bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
                  {(execResults.details || []).slice(0, 10).map((d, i) => (
                    <div key={i} className="p-2 flex items-center justify-between">
                      <div className="truncate mr-2 text-gray-800 dark:text-gray-200">{d.title || d.testId}</div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded ${getStatusColor(d.status)}`}>{d.status}</span>
                        <span className="text-gray-500 dark:text-gray-400">{d.executionTime}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('tests')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'tests'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Test Cases ({testCases.length})
              </button>
              <button
                onClick={() => setActiveTab('issues')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'issues'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Issues ({issues.length})
              </button>
              <button
                onClick={() => setActiveTab('scripts')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'scripts'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Regression Scripts
              </button>
            </nav>
          </div>
          
          <div className="p-6">
            {activeTab === 'tests' && (
              <div>
                <h3 className="text-lg font-medium mb-4">Generated Test Cases</h3>
                {testCases.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    No test cases generated yet. Trigger Auto-QA to start.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {testCases.map((test) => (
                      <div key={test.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-900 dark:text-white">{test.title}</h4>
                          <div className="flex gap-2 items-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(test.priority)}`}>
                              {test.priority}
                            </span>
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-600">
                              {test.testType}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(test.status)}`}>
                              {test.status || 'pending'}
                            </span>
                          </div>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">{test.description}</p>
                        <div className="text-xs text-gray-500">
                          <span>Steps: {test.steps.length}</span>
                          <span className="mx-2">•</span>
                          <span>Assertions: {test.assertions.length}</span>
                          <span className="mx-2">•</span>
                          <span>Created: {new Date(test.createdAt).toLocaleDateString()}</span>
                          {test.metadata?.lastExecuted && (
                            <>
                              <span className="mx-2">•</span>
                              <span>Last Run: {new Date(test.metadata.lastExecuted).toLocaleString()}</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'issues' && (
              <div>
                <h3 className="text-lg font-medium mb-4">Detected Issues</h3>
                {issues.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    No issues detected. Great job!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {issues.map((issue) => (
                      <div key={issue.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-900 dark:text-white">{issue.title}</h4>
                          <div className="flex gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(issue.severity)}`}>
                              {issue.severity}
                            </span>
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              {issue.type}
                            </span>
                          </div>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">{issue.description}</p>
                        <div className="text-xs text-gray-500">
                          <span>Page: {issue.pageUrl}</span>
                          <span className="mx-2">•</span>
                          <span>Detected: {new Date(issue.detectedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'scripts' && (
              <div>
                <h3 className="text-lg font-medium mb-4">Regression Scripts</h3>
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
                  </svg>
                  Regression scripts will be generated based on test cases.
                </div>
              </div>
            )}

            {/* Detailed recent execution results */}
            <div className="mt-8">
              <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">Recent Executions</h3>
              {recentResults.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">No executions yet.</div>
              ) : (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
                  {recentResults.map((r, i) => (
                    <details key={i} className="p-4">
                      <summary className="cursor-pointer flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{r.testCase?.title}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            #{r.testCase?.testId} • {r.testCase?.testType} • priority {r.testCase?.priority} • {new Date(r.runAt).toLocaleString()}
                          </div>
                        </div>
                        <span className={`ml-3 px-2 py-0.5 rounded text-xs ${getStatusColor(r.status)}`}>{r.status}</span>
                      </summary>
                      <div className="mt-3 text-xs space-y-2">
                        <div className="text-gray-600 dark:text-gray-300">Duration: {r.duration}ms</div>
                        {r.errors && r.errors.length > 0 && (
                          <div className="text-red-600 dark:text-red-400">Errors: {JSON.stringify(r.errors)}</div>
                        )}
                        {r.logs && r.logs.length > 0 && (
                          <div className="text-gray-700 dark:text-gray-200">
                            <div className="font-medium mb-1">Steps:</div>
                            <ol className="list-decimal list-inside space-y-1">
                              {r.logs.map((l, idx) => (
                                <li key={idx}>
                                  {typeof l === 'object' ? `${l.step || JSON.stringify(l)}${l.status ? ` – ${l.status}` : ''}` : String(l)}
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}