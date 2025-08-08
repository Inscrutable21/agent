import { NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'

export async function POST(request) {
  try {
    const { pageUrl, content, component, changeType = 'update' } = await request.json()
    
    console.log(`🤖 Auto-triggering AI test generation for: ${component} at ${pageUrl}`)
    console.log(`📊 Change type: ${changeType}, Content length: ${content?.length || 0}`)
    
    // Determine how many tests to generate based on action importance
    const testConfig = getTestConfigForAction(pageUrl, component, changeType)
    
    console.log(`⚙️ Test config: ${testConfig.maxTests} tests, focused: ${testConfig.focused}, skip: ${testConfig.skip}`)
    
    if (testConfig.skip) {
      console.log(`⏭️ Skipping test generation for routine action: ${component}`)
      return NextResponse.json({
        success: true,
        message: 'Auto-trigger skipped for routine action',
        pageUrl,
        component,
        changeType,
        generated: 0
      })
    }

    let testData = null
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    
    // Generate focused test cases based on importance
    try {
      const { testType, enhancedContent } = enhanceContentForTesting(pageUrl, content, component)
      
      console.log(`🎯 Generating ${testConfig.maxTests} focused tests for ${component}`)
      
      const testResponse = await fetch(`${baseUrl}/api/admin/qa/generate-tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageUrl,
          content: enhancedContent,
          component: component || 'Web Application Component',
          testType,
          maxTests: testConfig.maxTests,
          priority: testConfig.priority,
          focused: testConfig.focused
        })
      })
      
      if (testResponse.ok) {
        const testText = await testResponse.text()
        if (testText.trim()) {
          testData = JSON.parse(testText)
          console.log(`✅ Generated ${testData.generated || 0} test cases for ${component}`)
        }
      }
    } catch (testError) {
      console.error('Test generation error:', testError)
    }
    
    return NextResponse.json({
      success: true,
      message: 'Auto-trigger completed',
      pageUrl,
      component,
      changeType,
      testData: testData ? {
        generated: testData.generated,
        testCases: testData.testCases?.length || 0
      } : null
    })
    
  } catch (error) {
    console.error('Auto-trigger error:', error)
    return NextResponse.json(
      { error: 'Auto-trigger failed', details: error.message },
      { status: 500 }
    )
  }
}

// Enhanced content based on component type
function enhanceContentForTesting(pageUrl, content, component) {
  const url = pageUrl.toLowerCase()
  const comp = (component || '').toLowerCase()
  let testType = 'functional'
  let testScenarios = []
  
  // Authentication flows
  if (comp.includes('authentication') || url.includes('/auth/')) {
    testType = 'authentication'
    if (url.includes('/login')) {
      testScenarios = [
        'Valid login credentials',
        'Invalid email format',
        'Wrong password',
        'Empty fields validation',
        'SQL injection attempts',
        'Rate limiting tests',
        'Session management',
        'Remember me functionality'
      ]
    } else if (url.includes('/logout')) {
      testScenarios = [
        'Successful logout',
        'Session cleanup',
        'Redirect after logout',
        'Multiple tab logout',
        'Token invalidation',
        'Logout without login',
        'Concurrent session handling'
      ]
    } else if (url.includes('/signup')) {
      testScenarios = [
        'Valid registration',
        'Duplicate email handling',
        'Password complexity validation',
        'Email format validation',
        'Terms acceptance',
        'Account activation flow'
      ]
    }
  }
  
  // Admin panel flows
  else if (comp.includes('admin') || url.includes('/admin/')) {
    testType = 'admin'
    if (comp.includes('dashboard')) {
      testScenarios = [
        'Dashboard loading performance',
        'Data visualization accuracy',
        'Real-time updates',
        'Permission-based access',
        'Mobile responsiveness',
        'Export functionality'
      ]
    } else if (comp.includes('billboard') || comp.includes('category')) {
      testScenarios = [
        'CRUD operations',
        'Data validation',
        'File upload handling',
        'Bulk operations',
        'Search and filtering',
        'Pagination',
        'Data export/import'
      ]
    }
  }
  
  // API endpoints
  else if (comp.includes('api') || url.includes('/api/')) {
    testType = 'api'
    testScenarios = [
      'Valid request handling',
      'Invalid request validation',
      'Authentication/authorization',
      'Rate limiting',
      'Error handling',
      'Response format validation',
      'Performance under load',
      'Security vulnerabilities'
    ]
  }
  
  // E-commerce flows
  else if (comp.includes('cart') || comp.includes('checkout')) {
    testType = 'ecommerce'
    testScenarios = [
      'Add to cart functionality',
      'Cart persistence',
      'Quantity updates',
      'Price calculations',
      'Checkout process',
      'Payment integration',
      'Order confirmation',
      'Inventory management'
    ]
  }
  
  // Search and filtering
  else if (comp.includes('search') || comp.includes('filter')) {
    testType = 'search'
    testScenarios = [
      'Basic search functionality',
      'Advanced filtering',
      'Search result accuracy',
      'Empty search handling',
      'Special character handling',
      'Performance with large datasets',
      'Auto-suggestions',
      'Search history'
    ]
  }
  
  // Navigation system
  else if (comp.includes('navigation') || comp.includes('navbar')) {
    testType = 'navigation'
    testScenarios = [
      'Menu item functionality',
      'Mobile menu behavior',
      'Breadcrumb navigation',
      'Active state indication',
      'Dropdown menus',
      'Keyboard navigation',
      'Accessibility compliance',
      'Cross-browser compatibility'
    ]
  }
  
  // Form systems
  else if (comp.includes('form')) {
    testType = 'form'
    testScenarios = [
      'Field validation',
      'Required field handling',
      'Form submission',
      'Error message display',
      'Auto-save functionality',
      'File upload validation',
      'Cross-site scripting prevention',
      'Form accessibility'
    ]
  }
  
  // Analytics system
  else if (comp.includes('analytics')) {
    testType = 'analytics'
    testScenarios = [
      'Event tracking accuracy',
      'Data collection validation',
      'Privacy compliance',
      'Performance impact',
      'Real-time data updates',
      'Report generation',
      'Data export functionality',
      'Dashboard visualization'
    ]
  }
  
  // Default scenarios for general components
  else {
    testScenarios = [
      'Component loading',
      'User interaction handling',
      'Error state management',
      'Loading state display',
      'Responsive design',
      'Accessibility features',
      'Performance optimization',
      'Cross-browser compatibility'
    ]
  }
  
  const enhancedContent = JSON.stringify({
    ...JSON.parse(content || '{}'),
    testScenarios,
    componentType: component,
    testType,
    priority: getPriorityLevel(component, pageUrl)
  })
  
  return { testType, enhancedContent, testScenarios }
}

// Determine if smart generation should be used
function shouldUseSmartGeneration(component, pageUrl) {
  const highPriorityComponents = [
    'authentication',
    'payment',
    'checkout',
    'admin',
    'api',
    'security',
    'user data'
  ]
  
  const comp = (component || '').toLowerCase()
  const url = pageUrl.toLowerCase()
  
  return highPriorityComponents.some(priority => 
    comp.includes(priority) || url.includes(priority)
  )
}

// Build smart generation payload
function buildSmartGenerationPayload(component, pageUrl, content) {
  const comp = (component || '').toLowerCase()
  
  let userStories = []
  let riskLevel = 'medium'
  let businessPriority = 'medium'
  
  if (comp.includes('authentication')) {
    userStories = [
      'As a user, I want to securely authenticate',
      'As a system, I want to prevent unauthorized access',
      'As a user, I want my session to be managed properly'
    ]
    riskLevel = 'high'
    businessPriority = 'high'
  } else if (comp.includes('admin')) {
    userStories = [
      'As an admin, I want to manage system data',
      'As an admin, I want to monitor system health',
      'As a system, I want to ensure data integrity'
    ]
    riskLevel = 'high'
    businessPriority = 'high'
  } else if (comp.includes('api')) {
    userStories = [
      'As a client, I want reliable API responses',
      'As a system, I want to handle errors gracefully',
      'As a developer, I want consistent API behavior'
    ]
    riskLevel = 'high'
    businessPriority = 'high'
  } else if (comp.includes('cart') || comp.includes('checkout')) {
    userStories = [
      'As a customer, I want to manage my cart',
      'As a customer, I want a smooth checkout process',
      'As a business, I want accurate order processing'
    ]
    riskLevel = 'high'
    businessPriority = 'critical'
  } else {
    userStories = [
      'As a user, I want the feature to work correctly',
      'As a user, I want a good user experience',
      'As a system, I want to handle edge cases'
    ]
  }
  
  return {
    feature: component || 'Web Application Feature',
    requirements: `Testing for ${component} at ${pageUrl}. ${content}`,
    userStories,
    testTypes: ['positive', 'negative', 'edge', 'performance'],
    riskLevel,
    businessPriority
  }
}

// Get priority level based on component
function getPriorityLevel(component, pageUrl) {
  const comp = (component || '').toLowerCase()
  const url = pageUrl.toLowerCase()
  
  const criticalComponents = ['payment', 'checkout', 'authentication', 'security']
  const highComponents = ['admin', 'api', 'user data', 'cart']
  
  if (criticalComponents.some(c => comp.includes(c) || url.includes(c))) {
    return 'critical'
  } else if (highComponents.some(c => comp.includes(c) || url.includes(c))) {
    return 'high'
  } else {
    return 'medium'
  }
}

function shouldSkipAutoGeneration(pageUrl, content, component) {
  // Skip for routine authentication actions
  if (pageUrl?.includes('/auth/logout') || component?.includes('Logout')) {
    return true
  }
  
  if (pageUrl?.includes('/auth/login') || component?.includes('Login')) {
    return true
  }

  // Skip for API endpoints that are called frequently
  const frequentEndpoints = ['/api/auth/', '/api/user/', '/api/session/']
  if (frequentEndpoints.some(endpoint => pageUrl?.includes(endpoint))) {
    return true
  }

  // Skip if content is too minimal
  if (!content || (typeof content === 'string' && content.length < 50)) {
    return true
  }

  return false
}

// Smart configuration based on action type and importance
function getTestConfigForAction(pageUrl, component, changeType) {
  const url = pageUrl?.toLowerCase() || ''
  const comp = (component || '').toLowerCase()
  
  // Simple content updates - minimal testing
  if (changeType.includes('_updated') || changeType === 'update') {
    // For simple updates, generate only 3-5 focused tests
    return {
      maxTests: 5,
      priority: 'ai-determined',
      skip: false,
      focused: true
    }
  }
  
  // Content creation - moderate testing
  if (changeType.includes('_created') || changeType === 'create') {
    return {
      maxTests: 8,
      priority: 'ai-determined',
      skip: false,
      focused: true
    }
  }
  
  // Authentication actions - focused testing
  if (comp.includes('authentication') || comp.includes('login') || comp.includes('logout')) {
    return {
      maxTests: 6,
      priority: 'ai-determined',
      skip: false,
      focused: true
    }
  }
  
  // Critical business operations - comprehensive testing
  if (comp.includes('payment') || comp.includes('checkout') || url.includes('/payment')) {
    return {
      maxTests: 10,
      priority: 'ai-determined',
      skip: false,
      focused: true
    }
  }
  
  // API endpoints - focused testing
  if (url.includes('/api/')) {
    return {
      maxTests: 6,
      priority: 'ai-determined',
      skip: false,
      focused: true
    }
  }
  
  // Admin operations - moderate testing
  if (comp.includes('admin') || url.includes('/admin/')) {
    return {
      maxTests: 8,
      priority: 'ai-determined',
      skip: false,
      focused: true
    }
  }
  
  // Default for other actions - minimal testing
  return {
    maxTests: 4,
    priority: 'ai-determined',
    skip: false,
    focused: true
  }
}




