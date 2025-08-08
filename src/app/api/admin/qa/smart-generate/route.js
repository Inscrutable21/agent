import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { prisma } from '../../../../../lib/prisma'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Structured schema for smart test generation
const smartTestSchema = {
  type: "object",
  properties: {
    generationSummary: {
      type: "object",
      properties: {
        totalGenerated: { type: "number" },
        byCategory: {
          type: "object",
          properties: {
            positive: { type: "number" },
            negative: { type: "number" },
            edge: { type: "number" },
            integration: { type: "number" },
            security: { type: "number" },
            performance: { type: "number" }
          }
        },
        byPriority: {
          type: "object", 
          properties: {
            critical: { type: "number" },
            high: { type: "number" },
            medium: { type: "number" },
            low: { type: "number" }
          }
        },
        automationReadiness: {
          type: "object",
          properties: {
            highFeasibility: { type: "number" },
            mediumFeasibility: { type: "number" },
            lowFeasibility: { type: "number" }
          }
        }
      },
      required: ["totalGenerated", "byCategory", "byPriority"]
    },
    testCases: {
      type: "array",
      items: {
        type: "object",
        properties: {
          testId: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          category: {
            type: "string",
            enum: ["positive", "negative", "edge", "integration", "security", "performance"]
          },
          priority: {
            type: "string",
            enum: ["critical", "high", "medium", "low"]
          },
          riskScore: { type: "number", minimum: 1, maximum: 10 },
          businessImpact: {
            type: "string", 
            enum: ["critical", "high", "medium", "low"]
          },
          automationFeasibility: {
            type: "string",
            enum: ["high", "medium", "low"]
          },
          estimatedDuration: { type: "string" },
          testSteps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                stepNumber: { type: "number" },
                action: { type: "string" },
                data: { type: "string" },
                expectedResult: { type: "string" }
              },
              required: ["stepNumber", "action", "expectedResult"]
            }
          },
          assertions: {
            type: "array",
            items: {
              type: "object", 
              properties: {
                type: {
                  type: "string",
                  enum: ["ui_element", "api_response", "database", "performance", "security"]
                },
                condition: { type: "string" },
                expectedValue: { type: "string" },
                tolerance: { type: "string" }
              },
              required: ["type", "condition", "expectedValue"]
            }
          },
          prerequisites: {
            type: "array",
            items: { type: "string" }
          },
          testData: {
            type: "object",
            properties: {
              setup: { type: "object" },
              inputs: { type: "object" },
              cleanup: { type: "object" }
            }
          },
          tags: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: ["testId", "title", "description", "category", "priority", "riskScore", "testSteps", "assertions"]
      }
    }
  },
  required: ["generationSummary", "testCases"]
}

export async function POST(request) {
  try {
    const { 
      feature,
      requirements,
      userStories,
      testTypes = ['positive', 'negative', 'edge', 'integration'],
      riskLevel = 'medium',
      businessPriority = 'medium'
    } = await request.json()
    
    const smartTestSuite = await generateStructuredSmartTests(
      feature, 
      requirements, 
      userStories, 
      testTypes, 
      riskLevel, 
      businessPriority
    )
    
    // Save each test case to database
    const savedTests = []
    for (const testCase of smartTestSuite.testCases) {
      const saved = await prisma.qATestCase.create({
        data: {
          testId: testCase.testId,
          title: testCase.title,
          description: testCase.description,
          testType: testCase.category,
          priority: testCase.priority,
          steps: testCase.testSteps,
          assertions: testCase.assertions,
          component: feature,
          generatedBy: 'ai',
          metadata: {
            riskScore: testCase.riskScore,
            businessImpact: testCase.businessImpact,
            automationFeasibility: testCase.automationFeasibility,
            estimatedTime: testCase.estimatedTime,
            testData: testCase.testData,
            tags: testCase.tags,
            requirements,
            userStories,
            generatedAt: new Date().toISOString(),
            aiGenerated: true,
            smartGenerated: true
          }
        }
      })
      savedTests.push(saved)
    }
    
    return NextResponse.json({
      success: true,
      generated: savedTests.length,
      summary: smartTestSuite.generationSummary,
      testSuite: {
        ...smartTestSuite,
        testCases: savedTests
      }
    })
    
  } catch (error) {
    console.error('Smart test generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate smart test cases', details: error.message },
      { status: 500 }
    )
  }
}

async function generateStructuredSmartTests(feature, requirements, userStories, testTypes, riskLevel, businessPriority) {
  const completion = await openai.beta.chat.completions.parse({
    model: "gpt-4o-2024-08-06",
    messages: [
      {
        role: "system",
        content: `You are an AI-powered test architect that generates intelligent, comprehensive test suites using structured outputs. Focus on practical, executable test cases with proper risk assessment and automation readiness.

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

GENERATION RULES:
- Generate 3-5 test cases per requested category (focused testing)
- Ensure comprehensive coverage of user scenarios
- Assign priorities based on AI analysis of actual issue impact
- Include detailed automation-ready steps with specific selectors
- Provide realistic time estimates
- Tag tests for easy categorization and filtering
- Write complete, executable test scenarios
- Include edge cases and error conditions
- Generate realistic test data
- Create detailed assertions for validation
- Provide priority reasoning for each test case
- Focus on high-impact scenarios only`
      },
      {
        role: "user", 
        content: `Generate intelligent test cases for:

FEATURE: ${feature}
RISK LEVEL: ${riskLevel}
BUSINESS PRIORITY: ${businessPriority}
REQUESTED CATEGORIES: ${testTypes.join(', ')}

REQUIREMENTS:
${requirements}

USER STORIES:
${userStories.join('\n')}

Generate comprehensive test cases covering all requested categories with:
- Detailed execution steps with specific UI interactions
- Clear assertions and expected results
- AI-determined priorities based on actual issue impact analysis
- Priority reasoning for each test case
- Automation feasibility assessment
- Realistic time estimates
- Proper test data requirements
- Error handling scenarios
- Edge case coverage
- Performance considerations
- Security validations

For each test case, analyze the actual business impact, technical risk, user impact, scope, and frequency to determine the appropriate priority level.`
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "smart_test_suite",
        schema: smartTestSchema
      }
    },
    temperature: 0.6
  })

  const testSuite = completion.choices[0].message.parsed
  
  // Enhance with unique IDs and additional AI-generated metadata
  testSuite.testCases = testSuite.testCases.map((test, index) => ({
    ...test,
    testId: `ai_smart_${Date.now()}_${index.toString().padStart(3, '0')}`,
    aiGenerated: true,
    generationMethod: 'openai-structured',
    generatedAt: new Date().toISOString()
  }))
  
  return testSuite
}


