import { triggerQAOnAPICall } from '../lib/qaAutoTrigger'

// Middleware to track all API calls
export function withQAAPITracking(handler) {
  return async function trackedHandler(request) {
    const startTime = Date.now()
    const method = request.method
    const url = request.url || request.nextUrl?.pathname || 'unknown'
    
    try {
      // Call the original handler
      const response = await handler(request)
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Track successful API call
      await triggerQAOnAPICall(url, method, true, {
        status: response.status,
        duration,
        timestamp: new Date().toISOString()
      })
      
      return response
    } catch (error) {
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Track failed API call
      await triggerQAOnAPICall(url, method, false, {
        error: error.message,
        duration,
        timestamp: new Date().toISOString()
      })
      
      throw error
    }
  }
}

// Enhanced fetch wrapper for client-side API tracking
export function createTrackedFetch() {
  const originalFetch = fetch
  
  return async function trackedFetch(url, options = {}) {
    const startTime = Date.now()
    const method = options.method || 'GET'
    
    try {
      const response = await originalFetch(url, options)
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Track API call
      await triggerQAOnAPICall(url, method, response.ok, {
        status: response.status,
        duration,
        timestamp: new Date().toISOString()
      })
      
      return response
    } catch (error) {
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Track failed API call
      await triggerQAOnAPICall(url, method, false, {
        error: error.message,
        duration,
        timestamp: new Date().toISOString()
      })
      
      throw error
    }
  }
}