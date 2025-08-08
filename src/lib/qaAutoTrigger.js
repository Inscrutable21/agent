// Enhanced Auto-trigger QA for all components and user interactions
export async function triggerQAOnContentChange(pageUrl, content, changeType = 'update', component = null) {
  try {
    console.log(`🤖 Content change detected on ${pageUrl}, triggering QA...`)
    
    // Get base URL - works both client and server side
    let baseUrl
    if (typeof window !== 'undefined') {
      // Client side
      baseUrl = window.location.origin
    } else {
      // Server side - use environment variable or localhost
      baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
    }
    
    console.log(`Using base URL: ${baseUrl}`)
    
    const response = await fetch(`${baseUrl}/api/admin/qa/auto-trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pageUrl,
        content,
        changeType,
        component: component || detectComponentType(pageUrl, content)
      })
    })
    
    if (response.ok) {
      const result = await response.json()
      console.log('✅ QA auto-trigger successful:', result)
      return result
    } else {
      console.error('❌ QA auto-trigger failed:', response.status)
      return null
    }
  } catch (error) {
    console.error('❌ QA auto-trigger error:', error)
    return null
  }
}

// Auto-detect component type based on URL and content
function detectComponentType(pageUrl, content) {
  const url = pageUrl.toLowerCase()
  const contentStr = (content || '').toLowerCase()
  
  // Authentication flows
  if (url.includes('/auth/') || url.includes('/login') || url.includes('/signup')) {
    return 'User Authentication System'
  }
  
  // Admin flows
  if (url.includes('/admin/')) {
    if (url.includes('/dashboard')) return 'Admin Dashboard'
    if (url.includes('/billboards')) return 'Billboard Management'
    if (url.includes('/categories')) return 'Category Management'
    if (url.includes('/qa/')) return 'QA Management System'
    return 'Admin Panel'
  }
  
  // API endpoints
  if (url.includes('/api/')) {
    if (url.includes('/billboards')) return 'Billboard API'
    if (url.includes('/categories')) return 'Category API'
    if (url.includes('/analytics')) return 'Analytics API'
    if (url.includes('/auth/')) return 'Authentication API'
    return 'API Endpoint'
  }
  
  // E-commerce flows
  if (url.includes('/cart') || contentStr.includes('cart') || contentStr.includes('checkout')) {
    return 'Shopping Cart System'
  }
  
  if (url.includes('/product') || contentStr.includes('product') || contentStr.includes('billboard')) {
    return 'Product/Billboard Display'
  }
  
  // Search and filtering
  if (url.includes('/search') || contentStr.includes('search') || contentStr.includes('filter')) {
    return 'Search & Filter System'
  }
  
  // Navigation and UI
  if (contentStr.includes('navbar') || contentStr.includes('navigation') || contentStr.includes('menu')) {
    return 'Navigation System'
  }
  
  // Forms
  if (contentStr.includes('form') || contentStr.includes('input') || contentStr.includes('submit')) {
    return 'Form System'
  }
  
  // Analytics and tracking
  if (url.includes('/analytics') || contentStr.includes('analytics') || contentStr.includes('tracking')) {
    return 'Analytics System'
  }
  
  // Default fallback
  return 'Web Application Component'
}

// Trigger QA on user interactions
export async function triggerQAOnUserAction(action, element, data = {}) {
  const pageUrl = typeof window !== 'undefined' ? window.location.pathname : '/unknown'
  
  const content = JSON.stringify({
    action,
    element,
    data,
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server'
  })
  
  return await triggerQAOnContentChange(pageUrl, content, 'user_interaction', `User Interaction - ${action}`)
}

// Trigger QA on form submissions
export async function triggerQAOnFormSubmit(formName, formData, success = true) {
  const pageUrl = typeof window !== 'undefined' ? window.location.pathname : '/unknown'
  
  const content = JSON.stringify({
    action: 'form_submit',
    formName,
    formData: Object.keys(formData), // Don't log actual data for privacy
    success,
    timestamp: new Date().toISOString()
  })
  
  return await triggerQAOnContentChange(pageUrl, content, 'form_submission', `Form System - ${formName}`)
}

// Trigger QA on API calls
export async function triggerQAOnAPICall(endpoint, method, success, responseData = {}) {
  const content = JSON.stringify({
    action: 'api_call',
    endpoint,
    method,
    success,
    responseStatus: responseData.status,
    timestamp: new Date().toISOString()
  })
  
  return await triggerQAOnContentChange(endpoint, content, 'api_interaction', `API - ${endpoint}`)
}

// Trigger QA on navigation
export async function triggerQAOnNavigation(fromUrl, toUrl, trigger = 'click') {
  const content = JSON.stringify({
    action: 'navigation',
    fromUrl,
    toUrl,
    trigger,
    timestamp: new Date().toISOString()
  })
  
  return await triggerQAOnContentChange(toUrl, content, 'navigation', 'Navigation System')
}

// Hook this into your content management system (client-side)
export function setupQAAutoTrigger() {
  if (typeof window !== 'undefined') {
    const observer = new MutationObserver((mutations) => {
      const hasSignificantChanges = mutations.some(mutation => 
        mutation.type === 'childList' && mutation.addedNodes.length > 0
      )
      
      if (hasSignificantChanges) {
        clearTimeout(window.qaDebounceTimer)
        window.qaDebounceTimer = setTimeout(() => {
          triggerQAOnContentChange(
            window.location.href,
            document.documentElement.outerHTML,
            'dom_change'
          )
        }, 5000)
      }
    })
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    })
  }
}

// Auto-trigger for specific content types
export async function triggerQAForBillboard(billboard, changeType) {
  const content = {
    title: billboard.title,
    description: billboard.description,
    category: billboard.category?.name,
    city: billboard.city?.name,
    pricing: billboard.pricing,
    location: billboard.location,
    mediaType: billboard.mediaType,
    size: billboard.size
  }
  
  return await triggerQAOnContentChange(
    `/billboards/${billboard.id}`,
    JSON.stringify(content),
    changeType
  )
}


