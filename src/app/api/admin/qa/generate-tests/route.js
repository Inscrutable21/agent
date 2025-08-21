import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { prisma } from '../../../../../lib/prisma'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request) {
  try {
    const { pageUrl, content, component, testType = 'functional', maxTests = 6, focused = false } = await request.json()
    
    console.log(`🎯 Generating ${maxTests} ${focused ? 'focused' : 'comprehensive'} tests for ${component}`)
    
    // Skip generation if tests already exist for this page
    if (pageUrl) {
      const existingCount = await prisma.qATestCase.count({ where: { pageUrl } })
      if (existingCount > 0) {
        return NextResponse.json({
          success: true,
          generated: 0,
          message: 'Tests already exist for this pageUrl. Skipping generation.',
          testCases: []
        })
      }
    }
    
    const testCases = await generateTestCases(pageUrl, content, component, testType, maxTests, focused)
    
    // Save test cases to database
    const savedTestCases = []
    for (const testCase of testCases) {
      const saved = await prisma.qATestCase.create({
        data: {
          testId: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: testCase.title,
          description: testCase.description,
          testType: testCase.testType || testType,
          priority: testCase.priority,
          steps: testCase.steps,
          assertions: testCase.assertions,
          pageUrl,
          component: component || 'Full page',
          generatedBy: 'ai',
          metadata: {
            ...testCase.metadata,
            aiGenerated: true,
            generatedAt: new Date().toISOString()
          }
        }
      })
      savedTestCases.push(saved)
    }
    
    return NextResponse.json({
      success: true,
      generated: savedTestCases.length,
      testCases: savedTestCases
    })
  } catch (error) {
    console.error('Generate tests error:', error)
    return NextResponse.json(
      { error: 'Failed to generate tests', details: error.message },
      { status: 500 }
    )
  }
}

async function generateTestCases(pageUrl, content, component, testType, maxTests = 6, focused = false) {
  // Detect content type and generate contextual test scenarios
  const isBillboard = pageUrl.includes('/billboards/') || (content && content.includes('title') && content.includes('pricing'))
  const isCity = pageUrl.includes('/cities/') || (content && content.includes('state') && content.includes('country'))
  const isCategory = pageUrl.includes('/categories/') || (content && content.includes('comingSoon'))
  const isAuth = pageUrl.includes('/auth/') || component.toLowerCase().includes('auth')
  
  let prompt = `You are a senior QA automation expert with 15+ years of experience. Generate EXACTLY ${maxTests} ${focused ? 'focused, high-impact' : 'comprehensive, detailed'} test cases for:

PAGE URL: ${pageUrl}
COMPONENT: ${component}
TEST TYPE: ${testType}
CONTENT TYPE: ${isBillboard ? 'Billboard' : isCity ? 'City' : isCategory ? 'Category' : isAuth ? 'Authentication' : 'General Web Component'}
FOCUSED TESTING: ${focused ? 'YES - Generate only high-impact, critical test cases' : 'NO - Generate comprehensive coverage'}

CONTENT DATA:
${content}

PRIORITY ASSIGNMENT RULES:
Analyze each test case individually and assign priority based on ACTUAL ISSUE IMPACT:

CRITICAL (Score 8-10): 
- Issues that could cause data loss, security breaches, or business failure
- Payment processing failures, authentication bypasses, data corruption
- System-wide crashes or complete functionality loss
- Compliance violations or legal issues

HIGH (Score 6-7):
- Core functionality that users depend on daily
- Business-critical features that affect revenue or user experience
- Security vulnerabilities that could lead to unauthorized access
- Performance issues that significantly impact user workflow

MEDIUM (Score 4-5):
- Important features but not critical to core business
- UI/UX issues that affect user experience but don't break functionality
- Performance optimizations and enhancements
- Integration issues with non-critical systems

LOW (Score 1-3):
- Edge cases and minor enhancements
- Cosmetic issues that don't affect functionality
- Nice-to-have features and optimizations
- Documentation or minor UI improvements

For each test case, analyze:
1. Business Impact: How much does this affect revenue, users, or operations?
2. Technical Risk: What's the potential for data loss, security issues, or system failure?
3. User Impact: How many users are affected and how severely?
4. Scope: Is this a system-wide issue or limited to specific features?
5. Frequency: How often will this issue occur?

REQUIREMENTS:
- Generate EXACTLY ${maxTests} test cases with AI-determined priorities based on actual impact analysis
${focused ? '- Focus ONLY on high-impact, critical scenarios:' : '- Provide comprehensive coverage including:'}
  * Positive scenarios (happy path)
  * Negative scenarios (error handling)
  ${focused ? '' : '* Edge cases and boundary conditions'}
  * Security testing
  ${focused ? '' : '* Performance considerations'}
  ${focused ? '' : '* Accessibility compliance'}
  ${focused ? '' : '* Cross-browser compatibility'}
  ${focused ? '' : '* Mobile responsiveness'}
  * Data validation
  ${focused ? '' : '* Integration testing'}
  * User experience flows
  * Error recovery scenarios

For each test case, provide:
- Clear, detailed title
- Comprehensive description (2-3 sentences)
- 5-8 detailed steps with specific actions
- 3-5 comprehensive assertions
- AI-determined priority level based on actual impact analysis
- Test category (functional, security, performance, accessibility, etc.)
- Risk assessment
- Expected execution time
- Prerequisites and test data requirements
- Priority reason (why this priority was assigned)

Focus on:
${focused ? `1. Critical business functionality (most important)
2. Security vulnerabilities (high priority)
3. Data integrity (essential)
4. User experience issues (core functionality only)` : `1. Critical business functionality
2. Security vulnerabilities
3. Performance bottlenecks
4. User experience issues
5. Data integrity
6. System reliability
7. Compliance requirements
8. Integration points`}

Return ONLY a valid JSON array with exactly ${maxTests} detailed test cases with AI-analyzed priorities.`

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // Using more powerful model for detailed analysis
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4000, // Increased for detailed responses
      temperature: 0.6, // Slightly lower for more consistent quality
    })

    let response = completion.choices[0].message.content.trim()
    response = response.replace(/```json\s*/g, '').replace(/```\s*/g, '')
    
    const testCases = JSON.parse(response)
    
    // Use AI-determined priorities, don't override them
    const limitedTestCases = testCases.slice(0, maxTests).map(test => ({
      ...test,
      priority: test.priority || 'medium', // Use AI-determined priority
      testType: test.testType || testType,
      aiGenerated: true,
      generationMethod: 'openai-comprehensive',
      generatedAt: new Date().toISOString(),
      metadata: {
        ...test.metadata,
        pageUrl,
        component,
        contentType: isBillboard ? 'billboard' : isCity ? 'city' : isCategory ? 'category' : isAuth ? 'authentication' : 'general',
        maxTestsRequested: maxTests,
        comprehensiveAnalysis: true,
        riskAssessment: test.riskAssessment || 'medium',
        executionTime: test.executionTime || '5-10 minutes',
        testCategory: test.testCategory || 'functional',
        securityFocused: test.securityFocused || false,
        performanceFocused: test.performanceFocused || false,
        accessibilityFocused: test.accessibilityFocused || false,
        aiDeterminedPriority: test.priority,
        priorityReason: test.priorityReason || 'AI-analyzed based on issue impact'
      }
    }))
    
    return limitedTestCases
  } catch (error) {
    console.error('OpenAI API error:', error)
    // Return fallback comprehensive test cases
    return generateFallbackComprehensiveTests(pageUrl, component, testType, maxTests)
  }
}

function generateFallbackComprehensiveTests(pageUrl, component, testType, maxTests) {
  const baseTests = [
    {
      title: `${component} - Comprehensive Functionality Validation`,
      description: `Validate all core functionality of ${component} works correctly under normal conditions with proper data flow and user interactions.`,
      priority: 'high',
      testType: 'functional',
      steps: [
        'Navigate to the component page',
        'Verify all UI elements load correctly',
        'Test primary functionality with valid inputs',
        'Validate data persistence and state management',
        'Check responsive design across devices',
        'Verify accessibility compliance',
        'Test keyboard navigation',
        'Validate error handling mechanisms'
      ],
      assertions: [
        'All UI elements render without errors',
        'Primary functionality works as expected',
        'Data persists correctly across sessions',
        'Component is accessible via keyboard',
        'Error states display appropriate messages'
      ],
      testCategory: 'functional',
      riskAssessment: 'high',
      executionTime: '8-12 minutes'
    },
    {
      title: `${component} - Security Vulnerability Assessment`,
      description: `Comprehensive security testing including input validation, XSS prevention, CSRF protection, and authentication bypass attempts.`,
      priority: 'high',
      testType: 'security',
      steps: [
        'Test SQL injection in all input fields',
        'Attempt XSS attacks with malicious scripts',
        'Verify CSRF token validation',
        'Test authentication bypass scenarios',
        'Check for sensitive data exposure',
        'Validate input sanitization',
        'Test authorization controls',
        'Verify secure data transmission'
      ],
      assertions: [
        'No SQL injection vulnerabilities exist',
        'XSS attacks are properly blocked',
        'CSRF protection is active',
        'Authentication cannot be bypassed',
        'Sensitive data is not exposed'
      ],
      testCategory: 'security',
      riskAssessment: 'critical',
      executionTime: '15-20 minutes'
    },
    {
      title: `${component} - Performance and Load Testing`,
      description: `Evaluate component performance under various load conditions, response times, and resource utilization patterns.`,
      priority: 'high',
      testType: 'performance',
      steps: [
        'Measure initial page load time',
        'Test with concurrent user sessions',
        'Monitor memory usage patterns',
        'Evaluate database query performance',
        'Test with large datasets',
        'Check network request optimization',
        'Validate caching mechanisms',
        'Monitor CPU and memory consumption'
      ],
      assertions: [
        'Page loads within 3 seconds',
        'Component handles 100+ concurrent users',
        'Memory usage remains stable',
        'Database queries are optimized',
        'Caching improves performance'
      ],
      testCategory: 'performance',
      riskAssessment: 'high',
      executionTime: '20-25 minutes'
    }
  ]

  // Generate additional tests to reach maxTests
  const additionalTests = []
  for (let i = baseTests.length; i < maxTests; i++) {
    additionalTests.push({
      title: `${component} - Advanced Test Case ${i + 1}`,
      description: `Detailed testing scenario ${i + 1} covering edge cases, integration points, and comprehensive validation.`,
      priority: 'high',
      testType: testType,
      steps: [
        'Execute advanced test scenario',
        'Validate complex business logic',
        'Test integration with external systems',
        'Verify data consistency',
        'Check error recovery mechanisms'
      ],
      assertions: [
        'Advanced functionality works correctly',
        'Integration points are stable',
        'Data remains consistent',
        'Error recovery is effective'
      ],
      testCategory: 'integration',
      riskAssessment: 'medium',
      executionTime: '10-15 minutes'
    })
  }

  return [...baseTests, ...additionalTests].slice(0, maxTests).map(test => ({
    ...test,
    aiGenerated: true,
    generationMethod: 'fallback-comprehensive',
    generatedAt: new Date().toISOString()
  }))
}

