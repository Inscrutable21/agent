import { NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { executeTestCaseReal } from '../../../../../lib/testRunner'

export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const { testId } = await request.json()
    
    const testCase = await prisma.qATestCase.findUnique({
      where: { testId }
    })
    
    if (!testCase) {
      return NextResponse.json({ error: 'Test case not found' }, { status: 404 })
    }
    
    // Run real execution with timeout
    let result
    try {
      const perTestTimeoutMs = Math.max(5000, Number(process.env.QA_TEST_TIMEOUT_MS) || 60000)
      const withTimeout = (promise, ms) => {
        let timeoutId
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error(`Test timed out after ${ms}ms`)), ms)
        })
        return Promise.race([promise.finally(() => clearTimeout(timeoutId)), timeoutPromise])
      }
      result = await withTimeout(executeTestCaseReal(testCase), perTestTimeoutMs)
    } catch (e) {
      // Ensure failure is captured rather than throwing
      result = {
        status: 'error',
        duration: 0,
        errors: [{ message: e?.message || 'Execution error' }],
        logs: [{ type: 'error', message: e?.message || 'Execution error' }]
      }
    }

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
          executionCount: ((testCase?.metadata?.executionCount ?? 0) + 1),
          lastError: result.status !== 'passed' ? (result.errors?.[0]?.message || 'Execution failure') : undefined
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