'use client'
import { useState, useEffect } from 'react'

export default function PersonasPage() {
  const [personas, setPersonas] = useState([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [shouldStop, setShouldStop] = useState(false)
  const [stats, setStats] = useState({ total: 0, segments: [] })
  const [batchSize, setBatchSize] = useState(25)
  const [totalPersonas, setTotalPersonas] = useState(500)

  useEffect(() => {
    fetchPersonas()
  }, [])

  const fetchPersonas = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/personas')
      const data = await response.json()
      setPersonas(data.personas || [])
      setStats({
        total: data.total || 0,
        segments: data.segments || []
      })
    } catch (error) {
      console.error('Error fetching personas:', error)
    } finally {
      setLoading(false)
    }
  }

  const generatePersonas = async () => {
    setGenerating(true)
    setShouldStop(false)
    try {
      const response = await fetch('/api/admin/personas/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSize, totalPersonas, shouldStop: false })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        alert(`Successfully generated ${data.generated} personas!`)
        fetchPersonas()
      } else {
        alert(data.error || 'Failed to generate personas')
      }
    } catch (error) {
      console.error('Error generating personas:', error)
      alert('Failed to generate personas')
    } finally {
      setGenerating(false)
      setShouldStop(false)
    }
  }

  const stopGeneration = async () => {
    try {
      setShouldStop(true)
      
      // Send stop request to API
      const response = await fetch('/api/admin/personas/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shouldStop: true })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        alert(data.message || 'Generation stopped successfully')
        fetchPersonas() // Refresh the list
      }
    } catch (error) {
      console.error('Error stopping generation:', error)
      alert('Failed to stop generation')
    } finally {
      setGenerating(false)
      setShouldStop(false)
    }
  }

  const clearAllPersonas = async () => {
    if (!confirm('Are you sure you want to delete all personas? This cannot be undone.')) {
      return
    }

    try {
      const response = await fetch('/api/admin/personas?action=clear_all', {
        method: 'DELETE'
      })
      
      if (response.ok) {
        alert('All personas cleared successfully!')
        fetchPersonas()
      } else {
        alert('Failed to clear personas')
      }
    } catch (error) {
      console.error('Error clearing personas:', error)
      alert('Failed to clear personas')
    }
  }

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Synthetic Personas</h1>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Total Personas</h3>
            <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Unique Segments</h3>
            <p className="text-3xl font-bold text-green-600">{stats.segments.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Status</h3>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              {generating ? 'Generating...' : 'Ready'}
            </p>
          </div>
        </div>

        {/* Generation Controls */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Generate New Personas</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Batch Size (personas per batch)
              </label>
              <input
                type="number"
                value={batchSize}
                onChange={(e) => setBatchSize(parseInt(e.target.value) || 25)}
                min="10"
                max="50"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Recommended: 25</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Total Personas to Generate
              </label>
              <input
                type="number"
                value={totalPersonas}
                onChange={(e) => setTotalPersonas(parseInt(e.target.value) || 500)}
                min="25"
                max="1000"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Max: 1000</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={generatePersonas}
                disabled={generating}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-md font-medium transition-colors duration-200 flex items-center justify-center"
              >
                {generating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  'Generate Personas'
                )}
              </button>
              
              {generating && (
                <button
                  onClick={stopGeneration}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-md font-medium transition-colors duration-200 flex items-center justify-center animate-pulse"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"></path>
                  </svg>
                  STOP GENERATION
                </button>
              )}
            </div>
            
            {generating && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                  <strong>Generation in progress...</strong> Click STOP GENERATION to halt the process.
                </p>
              </div>
            )}
          </div>

          <button
            onClick={clearAllPersonas}
            disabled={generating}
            className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-6 py-3 rounded-md font-medium transition-colors duration-200"
          >
            Clear All Personas
          </button>
        </div>

        {/* Personas List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Generated Personas</h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Loading personas...</p>
            </div>
          ) : personas.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <div className="text-6xl mb-4">👥</div>
              <p className="text-lg">No personas generated yet.</p>
              <p className="text-sm">Click &ldquo;Generate Personas&rdquo; to start.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {personas.slice(0, 10).map((persona) => (
                <div key={persona.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{persona.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {persona.title} at {persona.company}
                      </p>
                      <div className="flex items-center mt-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {persona.segment}
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500 dark:text-gray-400 ml-4">
                      <p className="font-medium">Batch #{persona.batchNumber}</p>
                      <p>{new Date(persona.generatedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              ))}
              
              {personas.length > 10 && (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700">
                  <p>... and {personas.length - 10} more personas</p>
                  <button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium mt-2">
                    View All Personas
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}





