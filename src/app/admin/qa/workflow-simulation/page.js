'use client'
import { useState, useEffect } from 'react'
import { 
  PlayIcon, 
  StopIcon, 
  DocumentTextIcon,
  CogIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

export default function WorkflowSimulationPage() {
  const [simulations, setSimulations] = useState([])
  const [activeSimulation, setActiveSimulation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [simulationConfig, setSimulationConfig] = useState({
    workflowType: 'user_registration',
    personaCount: 10,
    scenarios: [],
    validationRules: []
  })

  const startSimulation = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/qa/workflow-simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(simulationConfig)
      })
      
      const result = await response.json()
      if (result.success) {
        setActiveSimulation(result)
        setSimulations(prev => [result, ...prev])
      }
    } catch (error) {
      console.error('Simulation error:', error)
    } finally {
      setLoading(false)
    }
  }

  const workflowTypes = [
    { value: 'user_registration', label: '👤 User Registration', description: 'Test signup and onboarding flows' },
    { value: 'checkout_process', label: '🛒 Checkout Process', description: 'Test e-commerce purchase flows' },
    { value: 'content_personalization', label: '🎯 Content Personalization', description: 'Test user-specific content delivery' },
    { value: 'geo_access_control', label: '🌍 Geo Access Control', description: 'Test location-based restrictions' },
    { value: 'conditional_workflows', label: '🔀 Conditional Workflows', description: 'Test complex business logic flows' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-blue-500 p-3 rounded-lg">
              <CogIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                🎭 AI Workflow Simulation
              </h1>
              <p className="mt-2 text-gray-600">
                Persona-driven workflow validation with intelligent discrepancy detection
              </p>
            </div>
          </div>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <ChartBarIcon className="h-8 w-8 text-blue-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Total Simulations</p>
                  <p className="text-2xl font-semibold text-gray-900">{simulations.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <CheckCircleIcon className="h-8 w-8 text-green-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Success Rate</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {simulations.length > 0 ? Math.round((simulations.filter(s => s.summary?.successfulFlows > 0).length / simulations.length) * 100) : 0}%
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Issues Found</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {simulations.reduce((sum, s) => sum + (s.summary?.discrepanciesFound || 0), 0)}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <DocumentTextIcon className="h-8 w-8 text-purple-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Active Session</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {loading ? 'Running...' : activeSimulation ? '✓' : 'None'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Simulation Configuration */}
        <div className="bg-white shadow-sm rounded-lg border mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <CogIcon className="h-5 w-5 mr-2 text-blue-500" />
              Simulation Configuration
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Configure your workflow simulation parameters and validation rules
            </p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Basic Config */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Workflow Type *
                  </label>
                  <div className="space-y-2">
                    {workflowTypes.map((type) => (
                      <div key={type.value} className="relative">
                        <input
                          type="radio"
                          id={type.value}
                          name="workflowType"
                          value={type.value}
                          checked={simulationConfig.workflowType === type.value}
                          onChange={(e) => setSimulationConfig(prev => ({
                            ...prev, 
                            workflowType: e.target.value
                          }))}
                          className="sr-only"
                        />
                        <label
                          htmlFor={type.value}
                          className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                            simulationConfig.workflowType === type.value
                              ? 'border-blue-500 bg-blue-50 text-blue-900'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="font-medium">{type.label}</div>
                          <div className="text-sm text-gray-600 mt-1">{type.description}</div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column - Advanced Config */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Personas *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={simulationConfig.personaCount}
                      onChange={(e) => setSimulationConfig(prev => ({
                        ...prev, 
                        personaCount: parseInt(e.target.value) || 1
                      }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                      min="1"
                      max="100"
                      placeholder="Enter number of personas"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className="text-gray-400 text-sm">personas</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Recommended: 5-20 personas for comprehensive testing
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Validation Focus
                  </label>
                  <div className="space-y-2">
                    {[
                      { id: 'geo', label: '🌍 Geo-location Validation', desc: 'Test location-based restrictions' },
                      { id: 'personalization', label: '🎯 Personalization Logic', desc: 'Test user-specific content' },
                      { id: 'conditional', label: '🔀 Conditional Flows', desc: 'Test business rule execution' },
                      { id: 'security', label: '🔒 Security Checks', desc: 'Test access controls' }
                    ].map((focus) => (
                      <label key={focus.id} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          defaultChecked={focus.id === 'geo'}
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{focus.label}</div>
                          <div className="text-sm text-gray-500">{focus.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {loading ? (
                    <span className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                      Simulation in progress...
                    </span>
                  ) : (
                    `Ready to simulate ${simulationConfig.personaCount} personas for ${workflowTypes.find(t => t.value === simulationConfig.workflowType)?.label}`
                  )}
                </div>
                
                <button
                  onClick={startSimulation}
                  disabled={loading}
                  className={`px-8 py-3 rounded-lg font-semibold flex items-center space-x-2 transition-all ${
                    loading
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg transform hover:scale-105'
                  }`}
                >
                  {loading ? (
                    <>
                      <StopIcon className="h-5 w-5" />
                      <span>Running Simulation...</span>
                    </>
                  ) : (
                    <>
                      <PlayIcon className="h-5 w-5" />
                      <span>Start Simulation</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Active Simulation Results */}
        {activeSimulation && (
          <div className="bg-white shadow-sm rounded-lg border mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <ChartBarIcon className="h-5 w-5 mr-2 text-green-500" />
                Latest Simulation Results
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Session: {activeSimulation.sessionId}
              </p>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">
                    {activeSimulation.summary?.totalSimulations || 0}
                  </div>
                  <div className="text-sm text-blue-600 font-medium">Total Simulations</div>
                </div>
                
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">
                    {activeSimulation.summary?.successfulFlows || 0}
                  </div>
                  <div className="text-sm text-green-600 font-medium">Successful Flows</div>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                  <div className="text-3xl font-bold text-yellow-600">
                    {activeSimulation.summary?.discrepanciesFound || 0}
                  </div>
                  <div className="text-sm text-yellow-600 font-medium">Discrepancies Found</div>
                </div>
                
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                  <div className="text-3xl font-bold text-red-600">
                    {activeSimulation.summary?.criticalIssues || 0}
                  </div>
                  <div className="text-sm text-red-600 font-medium">Critical Issues</div>
                </div>
              </div>

              {/* Discrepancy Report */}
              {activeSimulation.discrepancyReport?.discrepancies?.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-red-500" />
                    Discrepancies Detected
                  </h3>
                  <div className="space-y-4">
                    {activeSimulation.discrepancyReport.discrepancies.slice(0, 5).map((discrepancy, index) => (
                      <div key={index} className="border-l-4 border-red-400 bg-red-50 p-4 rounded-r-lg">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-semibold text-red-800 text-lg">
                              {discrepancy.validationType.replace('_', ' ').toUpperCase()}
                            </p>
                            <div className="mt-2 space-y-1">
                              <p className="text-sm text-red-700">
                                <span className="font-medium">Expected:</span> {JSON.stringify(discrepancy.expected)}
                              </p>
                              <p className="text-sm text-red-700">
                                <span className="font-medium">Actual:</span> {JSON.stringify(discrepancy.actual)}
                              </p>
                            </div>
                            {discrepancy.impact && (
                              <div className="mt-2">
                                <p className="text-sm text-red-600">
                                  <span className="font-medium">Impact:</span> {discrepancy.impact.join(', ')}
                                </p>
                              </div>
                            )}
                          </div>
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                            discrepancy.severity === 'critical' ? 'bg-red-100 text-red-800' :
                            discrepancy.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                            discrepancy.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {discrepancy.severity?.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Simulation History */}
        <div className="bg-white shadow-sm rounded-lg border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <DocumentTextIcon className="h-5 w-5 mr-2 text-purple-500" />
              Simulation History
            </h2>
          </div>
          
          <div className="p-6">
            {simulations.length === 0 ? (
              <div className="text-center py-12">
                <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No simulations yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Start your first simulation above to see results here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {simulations.map((sim, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          Session: {sim.sessionId}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {sim.summary?.totalSimulations} simulations • 
                          {sim.summary?.discrepanciesFound} discrepancies found • 
                          {sim.summary?.criticalIssues} critical issues
                        </p>
                        <div className="flex items-center mt-2 space-x-4">
                          <span className="text-xs text-gray-500">
                            {new Date().toLocaleDateString()}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            sim.summary?.criticalIssues > 0 ? 'bg-red-100 text-red-800' :
                            sim.summary?.discrepanciesFound > 0 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {sim.summary?.criticalIssues > 0 ? 'Critical Issues' :
                             sim.summary?.discrepanciesFound > 0 ? 'Issues Found' :
                             'All Passed'}
                          </span>
                        </div>
                      </div>
                      <button className="text-blue-600 hover:text-blue-800 flex items-center text-sm font-medium">
                        <DocumentTextIcon className="h-4 w-4 mr-1" />
                        View Report
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


