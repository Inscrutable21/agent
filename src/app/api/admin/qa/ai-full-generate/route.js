import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { prisma } from '../../../../../lib/prisma'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request) {
  try {
    const { 
      feature,
      description,
      userFlow,
      businessRules,
      technicalSpecs,
      testCount = 8
    } = await request.json()
    
    const aiGeneratedTests = await generateFullAITestSuite(
      feature, 
      description, 
      userFlow, 
      businessRules, 
      technicalSpecs,
      testCount
    )
    
    // Save all AI-generated test cases
    const savedTests = []
    for (const testCase of aiGeneratedTests) {
      const saved = await prisma.qATestCase.create({
        data: {
          testId: testCase.testId,
          title: testCase.title,
          description: testCase.description,
          testType: testCase.testType,
          priority: testCase.priority,
          steps: testCase.steps,
          assertions: testCase.assertions,
          component: feature,
          generatedBy: 'ai',
          metadata: {
            ...testCase.metadata,
            aiGenerated: true,
            fullAIGenerated: true,
            generatedAt: new Date().toISOString(),
            generationMethod: 'openai-full-suite'
          }
        }
      })
      savedTests.push(saved)
    }
    
    return NextResponse.json({
      success: true,
      generated: savedTests.length,
      testCases: savedTests,
      message: `Successfully generated ${savedTests.length} AI-powered test cases`
    })
    
  } catch (error) {
    console.error('Full AI generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate AI test suite', details: error.message },
      { status: 500 }
    )
  }
}

async function generateFullAITestSuite(feature, description, userFlow, businessRules, technicalSpecs, testCount) {
  const prompt = `You are an AI Test Architect with expertise in creating comprehensive test suites. Generate ${testCount} detailed, executable test cases for:

FEATURE: ${feature}
DESCRIPTION: ${description}
USER FLOW: ${userFlow}
BUSINESS RULES: ${businessRules}
TECHNICAL SPECS: ${technicalSpecs}

Create a complete test suite covering:

1. FUNCTIONAL TESTS (40%):
   - Core feature functionality
   - User workflows and journeys
   - Business rule validation
   - Data processing and validation

2. INTEGRATION TESTS (20%):
   - API integrations
   - Database operations
   - Third-party services
   - System interactions

3. UI/UX TESTS (15%):
   - User interface elements
   - Responsive design
   - Accessibility compliance
   - Visual regression

4. SECURITY TESTS (10%):
   - Authentication/authorization
   - Input validation
   - Data protection
   - Vulnerability checks

5. PERFORMANCE TESTS (10%):
   - Load testing
   - Response times
   - Resource optimization
   - Scalability

6. ERROR HANDLING TESTS (5%):
   - Exception scenarios
   - Recovery mechanisms
   - Graceful degradation
   - Error messaging

For each test case, provide:
- Unique identifier and title
- Comprehensive description
- Detailed step-by-step instructions
- Specific assertions and validations
- Test data requirements
- Prerequisites and setup
- Expected results
- Risk assessment
- Automation feasibility
- Execution time estimate

Generate realistic, practical test cases that a QA engineer can execute immediately.

Return as JSON array with this structure:
[
  {
    "testId": "ai_test_001",
    "title": "Descriptive test title",
    "description": "What this test validates",
    "testType": "functional|integration|ui|security|performance|error",
    "priority": "critical|high|medium|low",
    "steps": ["Detailed step 1", "Detailed step 2"],
    "assertions": ["Expected result 1", "Expected result 2"],
    "testData": {"input": "value"},
    "prerequisites": ["Setup requirement"],
    "riskScore": 8,
    "estimatedTime": "10 minutes",
    "automationFeasibility": "high",
    "metadata": {
      "category": "functional",
      "tags": ["smoke", "regression"],
      "complexity": "medium"
    }
  }
]`

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are an AI Test Architect specializing in comprehensive test suite generation. Create detailed, executable test cases that cover all aspects of software quality. Focus on practical, real-world scenarios that can be immediately executed by QA teams. Return only valid JSON."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.8,
    max_tokens: 4000
  })

  let response = completion.choices[0].message.content.trim()
  response = response.replace(/```json\s*/g, '').replace(/```\s*/g, '')
  
  const testCases = JSON.parse(response)
  
  return testCases.map((test, index) => ({
    ...test,
    testId: `ai_full_${Date.now()}_${index.toString().padStart(3, '0')}`,
    aiGenerated: true,
    generationMethod: 'openai-full-suite',
    generatedAt: new Date().toISOString()
  }))
}