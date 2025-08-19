import { NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { executeTestCaseReal } from '../../../../../lib/testRunner'

export async function POST(request) {
  try {
    const { testId } = await request.json()
    
    const testCase = await prisma.qATestCase.findUnique({
      where: { testId }
    })
    
    if (!testCase) {
      return NextResponse.json({ error: 'Test case not found' }, { status: 404 })
    }
    
    // Run real HTTP-based execution
    const result = await executeTestCaseReal(testCase)

    // Save result
    const saved = await prisma.qATestResult.create({
      data: {
        testCaseId: testCase.id,
        status: result.status,
        duration: result.duration,
        errors: result.errors,
        screenshots: [],
        logs: result.logs
      }
    })

    // Update test case status and metadata
    const updatedTest = await prisma.qATestCase.update({
      where: { testId },
      data: {
        status: result.status,
        metadata: {
          ...(testCase.metadata || {}),
          lastExecuted: new Date().toISOString(),
          executionCount: ((testCase?.metadata?.executionCount ?? 0) + 1)
        }
      }
    })
    
    return NextResponse.json({
      success: true,
      testCase: updatedTest,
      executionResult: saved
    })
    
  } catch (error) {
    console.error('Test execution error:', error)
    return NextResponse.json(
      { error: 'Failed to execute test', details: error.message },
      { status: 500 }
    )
  }
}