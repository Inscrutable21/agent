'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  DocumentTextIcon,
  BeakerIcon,
  SparklesIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'

export default function RequirementsInput() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    feature: '',
    requirements: '',
    userStories: [''],
    priority: 'medium',
    riskLevel: 'medium',
    testTypes: ['positive', 'negative', 'edge']
  })

  const addUserStory = () => {
    setFormData(prev => ({
      ...prev,
      userStories: [...prev.userStories, '']
    }))
  }

  const updateUserStory = (index, value) => {
    setFormData(prev => ({
      ...prev,
      userStories: prev.userStories.map((story, i) => i === index ? value : story)
    }))
  }

  const removeUserStory = (index) => {
    setFormData(prev => ({
      ...prev,
      userStories: prev.userStories.filter((_, i) => i !== index)
    }))
  }

  const loadDemoData = () => {
    setFormData({
      feature: "User Authentication System",
      requirements: "Users must be able to register with email/password, login securely, reset passwords via email, maintain session state, and handle concurrent login attempts. System must validate email formats, enforce password complexity (8+ chars, special chars), implement rate limiting, and provide secure logout functionality.",
      userStories: [
        "As a new user, I want to register with my email and password so I can access the platform",
        "As a returning user, I want to login quickly and securely with my credentials",
        "As a user who forgot my password, I want to reset it via email verification",
        "As a security-conscious user, I want my session to expire after 30 minutes of inactivity"
      ],
      priority: "high",
      riskLevel: "high",
      testTypes: ['positive', 'negative', 'edge', 'security']
    })
  }

  const generateTests = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/qa/ingest-requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          userStories: formData.userStories.filter(story => story.trim())
        })
      })
      
      const data = await response.json()
      if (data.success) {
        // Store results in sessionStorage for navigation
        sessionStorage.setItem('aiTestResults', JSON.stringify(data))
        router.push('/admin/qa/ai-test-generator/results')
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to AI Test Generator
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="bg-blue-500 p-2 rounded-lg">
              <DocumentTextIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                📋 Requirements Input
              </h1>
              <p className="text-gray-600 mt-1">
                Input structured requirements and user stories to generate comprehensive test cases
              </p>
            </div>
          </div>
        </div>

        {/* Demo Data Button */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-blue-900">🚀 Try Demo Data</h3>
              <p className="text-sm text-blue-700 mt-1">
                Load sample authentication system requirements to see how it works
              </p>
            </div>
            <button
              onClick={loadDemoData}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
            >
              Load Demo
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="space-y-6">
            {/* Feature Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Feature Name *
              </label>
              <input
                type="text"
                value={formData.feature}
                onChange={(e) => setFormData(prev => ({ ...prev, feature: e.target.value }))}
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
                value={formData.requirements}
                onChange={(e) => setFormData(prev => ({ ...prev, requirements: e.target.value }))}
                rows={6}
                placeholder="Describe the functional and non-functional requirements in detail..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* User Stories */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User Stories
              </label>
              {formData.userStories.map((story, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <input
                    type="text"
                    value={story}
                    onChange={(e) => updateUserStory(index, e.target.value)}
                    placeholder="As a [user], I want [goal] so that [benefit]"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {formData.userStories.length > 1 && (
                    <button
                      onClick={() => removeUserStory(index)}
                      className="text-red-500 hover:text-red-700 p-2"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addUserStory}
                className="text-blue-500 hover:text-blue-700 text-sm font-medium"
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
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
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
                  value={formData.riskLevel}
                  onChange={(e) => setFormData(prev => ({ ...prev, riskLevel: e.target.value }))}
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
                      checked={formData.testTypes.includes(type)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData(prev => ({ ...prev, testTypes: [...prev.testTypes, type] }))
                        } else {
                          setFormData(prev => ({ ...prev, testTypes: prev.testTypes.filter(t => t !== type) }))
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="capitalize text-sm">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4 pt-6 border-t">
              <button
                onClick={generateTests}
                disabled={loading || !formData.feature || !formData.requirements}
                className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2 font-medium"
              >
                <BeakerIcon className="h-5 w-5" />
                <span>{loading ? 'Generating Tests...' : 'Generate Test Cases'}</span>
              </button>
              
              <button
                onClick={() => router.push('/admin/qa/ai-test-generator/smart-tests')}
                disabled={loading || !formData.feature || !formData.requirements}
                className="bg-purple-600 text-white px-6 py-3 rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center space-x-2 font-medium"
              >
                <SparklesIcon className="h-5 w-5" />
                <span>Smart Generate</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}