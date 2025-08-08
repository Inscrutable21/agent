'use client'

import { useRouter } from 'next/navigation'
import { 
  CpuChipIcon, 
  BeakerIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import RealTimeStats from './components/RealTimeStats'

export default function AITestGeneratorHome() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">🤖 AI Test Generator</h1>
          <p className="mt-2 text-sm text-gray-600">
            Generate comprehensive test cases using AI-powered analysis
          </p>
        </div>

        {/* Real-time Stats */}
        <RealTimeStats />

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Requirements Input */}
          <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow cursor-pointer"
               onClick={() => router.push('/admin/qa/ai-test-generator/requirements')}>
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                  <DocumentTextIcon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    📝 Input Requirements
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Define features and user stories for test generation
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center text-sm text-blue-600">
                  <span>Start generating tests</span>
                  <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Generated Tests */}
          <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow cursor-pointer"
               onClick={() => router.push('/admin/qa/ai-test-generator/results')}>
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                  <BeakerIcon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    🎯 Generated Tests
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    View and manage generated test cases
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center text-sm text-green-600">
                  <span>View test results</span>
                  <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Remove the Advanced AI Generator card */}
          {/* This entire div block should be deleted:
          <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow cursor-pointer"
               onClick={() => router.push('/admin/qa/ai-generator')}>
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-purple-500 rounded-md p-3">
                  <SparklesIcon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    🧠 Advanced AI Generator
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Smart test generation with risk analysis
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center text-sm text-purple-600">
                  <span>Advanced features</span>
                  <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    // ... svg content
                  </svg>
                </div>
              </div>
            </div>
          </div>
          */}

        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">📈 Recent Activity</h3>
            </div>
            <div className="p-6">
              <div className="text-center text-gray-500">
                <CpuChipIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Real-time Test Generation</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Stats update automatically every 10 seconds. Start by inputting requirements to generate your first test cases.
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => router.push('/admin/qa/ai-test-generator/requirements')}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <DocumentTextIcon className="h-4 w-4 mr-2" />
                    Get Started
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}



