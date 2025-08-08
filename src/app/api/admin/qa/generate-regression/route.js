import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { prisma } from '../../../../../lib/prisma'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request) {
  try {
    const { component, testCases, framework = 'playwright' } = await request.json()
    
    const regressionScript = await generateRegressionScript(component, testCases, framework)
    
    return NextResponse.json({
      success: true,
      script: regressionScript,
      framework,
      component
    })
    
  } catch (error) {
    console.error('Regression script generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate regression script', details: error.message },
      { status: 500 }
    )
  }
}

async function generateRegressionScript(component, testCases, framework) {
  const prompt = `Generate a comprehensive regression test script for reusable component testing.

COMPONENT: ${component}
FRAMEWORK: ${framework}
TEST CASES: ${JSON.stringify(testCases, null, 2)}

Generate a complete ${framework} test script that:

1. Tests component in isolation
2. Tests component integration
3. Validates props/state changes
4. Checks accessibility
5. Verifies visual regression
6. Tests responsive behavior
7. Validates performance

Include:
- Setup and teardown
- Page object patterns
- Reusable helper functions
- Data-driven test cases
- Screenshot comparisons
- Error handling
- Parallel execution support

Make the script modular and reusable across different pages/contexts.

Return the complete test script code.`

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a test automation expert specializing in ${framework}. Generate production-ready, maintainable test scripts with best practices. Include proper error handling, logging, and documentation.`
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.4,
    max_tokens: 4000
  })

  return completion.choices[0].message.content.trim()
}