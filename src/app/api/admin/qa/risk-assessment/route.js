import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { prisma } from '../../../../../lib/prisma'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Structured schema for risk assessment
const riskAssessmentSchema = {
  type: "object",
  properties: {
    overallAssessment: {
      type: "object",
      properties: {
        averageRiskScore: { type: "number", minimum: 1, maximum: 10 },
        totalTests: { type: "number" },
        criticalTests: { type: "number" },
        highPriorityTests: { type: "number" },
        mediumPriorityTests: { type: "number" },
        lowPriorityTests: { type: "number" },
        recommendedExecutionOrder: {
          type: "array",
          items: { type: "string" }
        },
        estimatedExecutionTime: { type: "string" },
        resourceRequirements: {
          type: "object",
          properties: {
            automationEngineers: { type: "number" },
            manualTesters: { type: "number" },
            testEnvironments: { type: "number" }
          }
        }
      },
      required: ["averageRiskScore", "totalTests", "criticalTests", "highPriorityTests"]
    },
    testAssessments: {
      type: "array",
      items: {
        type: "object",
        properties: {
          testId: { type: "string" },
          testTitle: { type: "string" },
          currentPriority: {
            type: "string",
            enum: ["critical", "high", "medium", "low"]
          },
          adjustedPriority: {
            type: "string", 
            enum: ["critical", "high", "medium", "low"]
          },
          riskScore: { type: "number", minimum: 1, maximum: 10 },
          riskBreakdown: {
            type: "object",
            properties: {
              businessImpact: { type: "number", minimum: 1, maximum: 10 },
              technicalComplexity: { type: "number", minimum: 1, maximum: 10 },
              failureProbability: { type: "number", minimum: 1, maximum: 10 },
              detectionDifficulty: { type: "number", minimum: 1, maximum: 10 }
            },
            required: ["businessImpact", "technicalComplexity", "failureProbability", "detectionDifficulty"]
          },
          riskFactors: {
            type: "array",
            items: { type: "string" }
          },
          mitigationStrategy: { type: "string" },
          executionRecommendation: {
            type: "object",
            properties: {
              when: { type: "string" },
              frequency: { type: "string" },
              environment: { type: "string" },
              automationPriority: {
                type: "string",
                enum: ["high", "medium", "low"]
              }
            }
          }
        },
        required: ["testId", "testTitle", "riskScore", "riskBreakdown", "adjustedPriority"]
      }
    }
  },
  required: ["overallAssessment", "testAssessments"]
}

export async function POST(request) {
  try {
    const { testCases, businessContext, releaseTimeline, feature } = await request.json()
    
    const riskAssessment = await generateStructuredRiskAssessment(
      testCases, 
      businessContext, 
      releaseTimeline,
      feature
    )
    
    // Save risk assessment to database
    const savedAssessment = await prisma.qARiskAssessment.create({
      data: {
        assessmentId: `risk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        feature,
        overallRiskScore: riskAssessment.overallAssessment.averageRiskScore,
        businessContext,
        releaseTimeline,
        criticalTests: riskAssessment.overallAssessment.criticalTests,
        highPriorityTests: riskAssessment.overallAssessment.highPriorityTests,
        mediumPriorityTests: riskAssessment.overallAssessment.mediumPriorityTests,
        lowPriorityTests: riskAssessment.overallAssessment.lowPriorityTests,
        recommendations: riskAssessment.overallAssessment.recommendedExecutionOrder
      }
    })
    
    // Update test cases with risk scores
    for (const assessment of riskAssessment.testAssessments) {
      await prisma.qATestCase.updateMany({
        where: { testId: assessment.testId },
        data: {
          priority: assessment.adjustedPriority,
          riskScore: assessment.riskScore,
          metadata: {
            riskBreakdown: assessment.riskBreakdown,
            riskFactors: assessment.riskFactors,
            mitigationStrategy: assessment.mitigationStrategy,
            executionRecommendation: assessment.executionRecommendation
          }
        }
      })
    }
    
    return NextResponse.json({
      success: true,
      riskAssessment,
      savedAssessmentId: savedAssessment.id
    })
    
  } catch (error) {
    console.error('Risk assessment error:', error)
    return NextResponse.json(
      { error: 'Failed to assess risk', details: error.message },
      { status: 500 }
    )
  }
}

async function generateStructuredRiskAssessment(testCases, businessContext, releaseTimeline, feature) {
  const completion = await openai.beta.chat.completions.parse({
    model: "gpt-4o-2024-08-06",
    messages: [
      {
        role: "system",
        content: `You are a senior risk assessment expert specializing in software testing strategy. Analyze test cases and provide data-driven risk assessments for optimal test execution planning.

RISK CALCULATION FORMULA:
Risk Score = (Business Impact × 0.4) + (Technical Complexity × 0.2) + (Failure Probability × 0.3) + (Detection Difficulty × 0.1)

PRIORITY ADJUSTMENT RULES:
- Risk Score 8-10: Critical Priority
- Risk Score 6-7.9: High Priority  
- Risk Score 4-5.9: Medium Priority
- Risk Score 1-3.9: Low Priority

Consider business context, release timeline, and resource constraints in your assessment.`
      },
      {
        role: "user",
        content: `Analyze risk for these test cases:

FEATURE: ${feature}
BUSINESS CONTEXT: ${businessContext}
RELEASE TIMELINE: ${releaseTimeline}

TEST CASES TO ANALYZE:
${JSON.stringify(testCases.slice(0, 20), null, 2)}

Provide comprehensive risk assessment with:
1. Individual test risk scores and breakdowns
2. Priority adjustments based on business context
3. Execution recommendations and timeline
4. Resource requirements and mitigation strategies
5. Overall risk summary and recommendations`
      }
    ],
    response_format: {
      type: "json_schema", 
      json_schema: {
        name: "risk_assessment",
        schema: riskAssessmentSchema
      }
    },
    temperature: 0.2
  })

  return completion.choices[0].message.parsed
}
