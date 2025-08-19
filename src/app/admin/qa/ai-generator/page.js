'use client'

import { useState } from 'react'
import { 
  BeakerIcon, 
  CpuChipIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ChartBarIcon,
  PlayIcon
} from '@heroicons/react/24/outline'

export default function AITestGenerator() {
  const [activeTab, setActiveTab] = useState('requirements')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [executing, setExecuting] = useState(false)
  const [executionResults, setExecutionResults] = useState(null)
  
  // Form states
  const [requirements, setRequirements] = useState('')
  const [userStories, setUserStories] = useState([''])
  const [feature, setFeature] = useState('')
  const [priority, setPriority] = useState('medium')
  const [riskLevel, setRiskLevel] = useState('medium')
  const [testTypes, setTestTypes] = useState(['positive', 'negative', 'edge'])

  const addUserStory = () => {
    setUserStories([...userStories, ''])
  }

  const updateUserStory = (index, value) => {
    const updated = [...userStories]
    updated[index] = value
    setUserStories(updated)
  }

  const removeUserStory = (index) => {
    setUserStories(userStories.filter((_, i) => i !== index))
  }

  const generateTestCases = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/qa/ingest-requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirements,
          userStories: userStories.filter(story => story.trim()),
          feature,
          priority,
          riskLevel
        })
      })
      
      const data = await response.json()
      if (data.success) {
        setResults(data)
        setActiveTab('results')
      } else {
        alert('Failed to generate test cases: ' + data.error)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to generate test cases')
    } finally {
      setLoading(false)
    }
  }

  const runRiskAssessment = async () => {
    if (!results?.testSuite?.testCases) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/admin/qa/risk-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testCases: results.testSuite.testCases,
          businessContext: `${feature} feature with ${priority} priority`,
          releaseTimeline: "2 weeks",
          feature
        })
      })
      
      const data = await response.json()
      if (data.success) {
        setResults(prev => ({
          ...prev,
          riskAssessment: data.riskAssessment
        }))
        setActiveTab('risk-analysis')
      }
    } catch (error) {
      console.error('Risk assessment error:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateSmartTests = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/qa/smart-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature,
          requirements,
          userStories: userStories.filter(story => story.trim()),
          testTypes,
          riskLevel,
          businessPriority: priority
        })
      })
      
      const data = await response.json()
      if (data.success) {
        setResults(prev => ({
          ...prev,
          smartTests: data
        }))
        setActiveTab('smart-results')
      }
    } catch (error) {
      console.error('Smart generation error:', error)
    } finally {
      setLoading(false)
    }
  }

  const executeAllTests = async () => {
    setExecuting(true)
    try {
      const response = await fetch('/api/admin/qa/execute-all-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concurrency: 5 }) // run in parallel with 5 workers
      })
      
      const data = await response.json()
      if (data.success) {
        setExecutionResults(data.results)
        // Refresh results to show updated statuses
        await fetchTestResults()
      }
    } catch (error) {
      console.error('Execution error:', error)
    } finally {
      setExecuting(false)
    }
  }

  const fetchTestResults = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/qa/ingest-requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirements,
          userStories: userStories.filter(story => story.trim()),
          feature,
          priority,
          riskLevel
        })
      })
      
      const data = await response.json()
      if (data.success) {
        setResults(data)
        setActiveTab('results')
      } else {
        alert('Failed to generate test cases: ' + data.error)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to generate test cases')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3">
            <CpuChipIcon className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                🎯 Sub-Initiative #3: AI Test Generator
              </h1>
              <p className="text-gray-600 mt-1">
                Ingest requirements → Generate comprehensive test cases → Prioritize by risk
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'requirements', name: '📋 Requirements Input', icon: BeakerIcon },
              { id: 'results', name: '🎯 Generated Tests', icon: CheckCircleIcon },
              { id: 'risk-analysis', name: '⚠️ Risk Analysis', icon: ExclamationTriangleIcon },
              { id: 'smart-results', name: '🧠 Smart Tests', icon: CpuChipIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Requirements Input Tab */}
        {activeTab === 'requirements' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">📋 Input Requirements & User Stories</h2>
            
            <div className="space-y-6">
              {/* Feature Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Feature Name *
                </label>
                <input
                  type="text"
                  value={feature}
                  onChange={(e) => setFeature(e.target.value)}
                  placeholder="e.g., User Authentication System"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Requirements */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Requirements *
                </label>
                <textarea
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  rows={6}
                  placeholder="Describe the functional and non-functional requirements..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* User Stories */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User Stories
                </label>
                {userStories.map((story, index) => (
                  <div key={index} className="flex items-center space-x-2 mb-2">
                    <input
                      type="text"
                      value={story}
                      onChange={(e) => updateUserStory(index, e.target.value)}
                      placeholder="As a [user], I want [goal] so that [benefit]"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {userStories.length > 1 && (
                      <button
                        onClick={() => removeUserStory(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addUserStory}
                  className="text-blue-500 hover:text-blue-700 text-sm"
                >
                  + Add User Story
                </button>
              </div>

              {/* Priority & Risk Level */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Risk Level
                  </label>
                  <select
                    value={riskLevel}
                    onChange={(e) => setRiskLevel(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              {/* Test Types */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test Categories to Generate
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['positive', 'negative', 'edge', 'integration', 'security', 'performance'].map(type => (
                    <label key={type} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={testTypes.includes(type)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setTestTypes([...testTypes, type])
                          } else {
                            setTestTypes(testTypes.filter(t => t !== type))
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="capitalize">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4 pt-4">
                <button
                  onClick={generateTestCases}
                  disabled={loading || !feature || !requirements}
                  className={`px-6 py-2 rounded-md flex items-center space-x-2 transition-all ${
                    loading || !feature || !requirements
                      ? 'bg-gray-400 cursor-not-allowed opacity-50'
                      : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                  } text-white`}
                >
                  <BeakerIcon className="h-4 w-4" />
                  <span>{loading ? 'Generating...' : 'Generate Test Cases'}</span>
                </button>
                
                <button
                  onClick={generateSmartTests}
                  disabled={loading || !feature || !requirements}
                  className={`px-6 py-2 rounded-md flex items-center space-x-2 transition-all ${
                    loading || !feature || !requirements
                      ? 'bg-gray-400 cursor-not-allowed opacity-50'
                      : 'bg-purple-600 hover:bg-purple-700 cursor-pointer'
                  } text-white`}
                >
                  <CpuChipIcon className="h-4 w-4" />
                  <span>{loading ? 'Generating...' : 'Smart Generate'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Generated Tests Results Tab */}
        {activeTab === 'results' && results && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-8 w-8 text-green-500" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Total Tests</p>
                    <p className="text-2xl font-semibold text-gray-900">{results.generated}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">High Priority</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {results.summary?.highPriority || 0}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex items-center">
                  <ChartBarIcon className="h-8 w-8 text-blue-500" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Categories</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {Object.keys(results.summary || {}).filter(k => k.includes('Tests')).length}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow">
                <button
                  onClick={runRiskAssessment}
                  disabled={loading}
                  className="w-full bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 disabled:opacity-50"
                >
                  {loading ? 'Analyzing...' : 'Run Risk Assessment'}
                </button>
              </div>
            </div>

            {/* Test Cases List */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Generated Test Cases</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {results.testSuite?.testCases?.map((test, index) => (
                  <div key={index} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">{test.title}</h4>
                        <p className="text-sm text-gray-500 mt-1">{test.description}</p>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            test.category === 'positive' ? 'bg-green-100 text-green-800' :
                            test.category === 'negative' ? 'bg-red-100 text-red-800' :
                            test.category === 'edge' ? 'bg-yellow-100 text-yellow-800' :
                            test.category === 'security' ? 'bg-purple-100 text-purple-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {test.category}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            test.priority === 'critical' ? 'bg-red-100 text-red-800' :
                            test.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                            test.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {test.priority}
                          </span>
                          <span className="text-xs text-gray-500">
                            Risk: {test.riskScore}/10
                          </span>
                        </div>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        <span className="text-sm text-gray-500">
                          {test.steps?.length || 0} steps
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Risk Analysis Tab */}
        {activeTab === 'risk-analysis' && results?.riskAssessment && (
          <div className="space-y-6">
            {/* Overall Risk Summary */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">📊 Overall Risk Assessment</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">
                    {results.riskAssessment.overallAssessment.averageRiskScore}
                  </div>
                  <div className="text-sm text-gray-500">Average Risk Score</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">
                    {results.riskAssessment.overallAssessment.criticalTests}
                  </div>
                  <div className="text-sm text-gray-500">Critical Tests</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600">
                    {results.riskAssessment.overallAssessment.highPriorityTests}
                  </div>
                  <div className="text-sm text-gray-500">High Priority Tests</div>
                </div>
              </div>
            </div>

            {/* Risk Breakdown */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">🎯 Test Risk Breakdown</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {results.riskAssessment.testAssessments?.slice(0, 10).map((assessment, index) => (
                  <div key={index} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">{assessment.testTitle}</h4>
                        <div className="mt-2 grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Business Impact:</span>
                            <span className="ml-1 font-medium">{assessment.riskBreakdown.businessImpact}/10</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Complexity:</span>
                            <span className="ml-1 font-medium">{assessment.riskBreakdown.technicalComplexity}/10</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Failure Prob:</span>
                            <span className="ml-1 font-medium">{assessment.riskBreakdown.failureProbability}/10</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Detection:</span>
                            <span className="ml-1 font-medium">{assessment.riskBreakdown.detectionDifficulty}/10</span>
                          </div>
                        </div>
                        <div className="mt-2">
                          <span className="text-xs text-gray-500">Mitigation: </span>
                          <span className="text-xs">{assessment.mitigationStrategy}</span>
                        </div>
                      </div>
                      <div className="ml-4 flex-shrink-0 text-right">
                        <div className={`text-lg font-bold ${
                          assessment.riskScore >= 8 ? 'text-red-600' :
                          assessment.riskScore >= 6 ? 'text-orange-600' :
                          assessment.riskScore >= 4 ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {assessment.riskScore}
                        </div>
                        <div className="text-xs text-gray-500">Risk Score</div>
                        <div className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          assessment.adjustedPriority === 'critical' ? 'bg-red-100 text-red-800' :
                          assessment.adjustedPriority === 'high' ? 'bg-orange-100 text-orange-800' :
                          assessment.adjustedPriority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {assessment.adjustedPriority}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Smart Tests Results Tab */}
        {activeTab === 'smart-results' && results?.smartTests && (
          <div className="space-y-6">
            {/* Smart Generation Summary */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">🧠 Smart Generation Summary</h3>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">By Category</h4>
                  {Object.entries(results.smartTests.summary.byCategory).map(([category, count]) => (
                    <div key={category} className="flex justify-between text-sm">
                      <span className="capitalize">{category}:</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">By Priority</h4>
                  {Object.entries(results.smartTests.summary.byPriority).map(([priority, count]) => (
                    <div key={priority} className="flex justify-between text-sm">
                      <span className="capitalize">{priority}:</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Automation Readiness</h4>
                  {Object.entries(results.smartTests.summary.automationReadiness).map(([level, count]) => (
                    <div key={level} className="flex justify-between text-sm">
                      <span>{level.replace('Feasibility', '')}:</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Smart Test Cases */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">🎯 Smart Generated Test Cases</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {results.smartTests.testSuite?.testCases?.map((test, index) => (
                  <div key={index} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">{test.title}</h4>
                        <p className="text-sm text-gray-500 mt-1">{test.description}</p>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            test.category === 'positive' ? 'bg-green-100 text-green-800' :
                            test.category === 'negative' ? 'bg-red-100 text-red-800' :
                            test.category === 'edge' ? 'bg-yellow-100 text-yellow-800' :
                            test.category === 'security' ? 'bg-purple-100 text-purple-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {test.category}
                          </span>
                          <span className="text-xs text-gray-500">
                            Duration: {test.estimatedDuration}
                          </span>
                          <span className="text-xs text-gray-500">
                            Automation: {test.automationFeasibility}
                          </span>
                        </div>
                        {test.tags && (
                          <div className="mt-2">
                            {test.tags.map((tag, tagIndex) => (
                              <span key={tagIndex} className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded mr-1">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="ml-4 flex-shrink-0 text-right">
                        <div className="text-sm font-medium text-gray-900">
                          Risk: {test.riskScore}/10
                        </div>
                        <div className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          test.priority === 'critical' ? 'bg-red-100 text-red-800' :
                          test.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                          test.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {test.priority}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Add execution button */}
        <button
          onClick={executeAllTests}
          disabled={executing || !results?.testCases?.length}
          className={`px-6 py-2 rounded-md flex items-center space-x-2 transition-all ${
            executing || !results?.testCases?.length
              ? 'bg-gray-400 cursor-not-allowed opacity-50'
              : 'bg-green-600 hover:bg-green-700 cursor-pointer'
          } text-white`}
        >
          <PlayIcon className="h-4 w-4" />
          <span>{executing ? 'Executing Tests...' : 'Execute All Tests'}</span>
        </button>
        {executionResults && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Execution Results</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>Mode: <span className="font-medium">{executionResults.mode}</span></div>
              <div>Concurrency: <span className="font-medium">{executionResults.concurrency}</span></div>
              <div>Wall Time: <span className="font-medium">{Math.round(executionResults.durationMs/100)/10}s</span></div>
              <div>Total: {executionResults.total} • <span className="text-green-600">Passed: {executionResults.passed}</span> • <span className="text-red-600">Failed: {executionResults.failed}</span></div>
            </div>
            <div className="mt-3">
              <div className="text-xs text-gray-600 mb-1">Sample details (showing up to 5):</div>
              <div className="text-xs bg-white rounded border divide-y">
                {(executionResults.details || []).slice(0, 5).map((d, i) => (
                  <div key={i} className="p-2 flex items-center justify-between">
                    <div className="truncate mr-2">{d.title || d.testId}</div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-0.5 rounded ${d.status === 'passed' ? 'bg-green-100 text-green-700' : d.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {d.status}
                      </span>
                      <span className="text-gray-500">{d.executionTime}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

