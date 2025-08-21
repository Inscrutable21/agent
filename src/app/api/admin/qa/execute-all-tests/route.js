import { NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { executeTestCaseReal } from '../../../../../lib/testRunner'

export const runtime = 'nodejs'

export async function POST(request) {
  try {
    // Read optional concurrency from request body (defaults to 5, capped 1..10)
    const body = request ? await request.json().catch(() => ({})) : {}
    const concurrency = Math.max(1, Math.min(10, Number(body?.concurrency) || 5))
    const perTestTimeoutMs = Math.max(5000, Number(process.env.QA_TEST_TIMEOUT_MS) || 60000)

    // Get tests that are pending or running
    const testCases = await prisma.qATestCase.findMany({
      where: {
        status: { in: ['pending', 'running'] }
      },
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'desc' }
      ]
    })
    

    const ids = testCases.map(t => t.id)
    if (ids.length === 0) {
      return NextResponse.json({
        success: true,
        results: {
          mode: 'parallel',
          concurrency,
          total: 0,
          executed: 0,
          passed: 0,
          failed: 0,
          startedAt: new Date().toISOString(),
          endedAt: new Date().toISOString(),
          durationMs: 0,
          details: []
        }
      })
    }

    // Mark as running
    await prisma.qATestCase.updateMany({
      where: { id: { in: ids } },
      data: { status: 'running' }
    })

    const startedAt = Date.now()
    const results = {
      mode: 'parallel',
      concurrency,
      total: testCases.length,
      executed: 0,
      passed: 0,
      failed: 0,
      startedAt: new Date(startedAt).toISOString(),
      endedAt: null,
      durationMs: 0,
      details: []
    }
    
    // chunk helper
    const chunk = (arr, size) => (arr.length ? [arr.slice(0, size), ...chunk(arr.slice(size), size)] : [])

    const withTimeout = (promise, ms) => {
      let timeoutId
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`Test timed out after ${ms}ms`)), ms)
      })
      return Promise.race([promise.finally(() => clearTimeout(timeoutId)), timeoutPromise])
    }

    for (const batch of chunk(testCases, concurrency)) {
      const runs = await Promise.all(
        batch.map(async (testCase) => {
          const started = Date.now()
          try {
            const result = await withTimeout(executeTestCaseReal(testCase), perTestTimeoutMs)

            // Persist result
            await prisma.qATestResult.create({
              data: {
                testCaseId: testCase.id,
                status: result.status,
                duration: result.duration,
                errors: result.errors,
                screenshots: [],
                logs: result.logs
              }
            })

            // Update test status and metadata
            await prisma.qATestCase.update({
              where: { id: testCase.id },
              data: {
                status: result.status,
                metadata: {
                  ...(testCase && typeof testCase.metadata === 'object' && testCase.metadata ? testCase.metadata : {}),
                  lastExecuted: new Date().toISOString(),
                  executionCount: ((testCase?.metadata?.executionCount ?? 0) + 1)
                }
              }
            })

            const ended = Date.now()
            return {
              testId: testCase.testId,
              title: testCase.title,
              status: result.status,
              executionTime: `${ended - started}ms`,
              startedAt: new Date(started).toISOString(),
              endedAt: new Date(ended).toISOString()
            }
          } catch (e) {
            // Ensure stuck tests are marked as error
            await prisma.qATestCase.update({
              where: { id: testCase.id },
              data: {
                status: 'error',
                metadata: {
                  ...(testCase && typeof testCase.metadata === 'object' && testCase.metadata ? testCase.metadata : {}),
                  lastExecuted: new Date().toISOString(),
                  executionCount: ((testCase?.metadata?.executionCount ?? 0) + 1),
                  lastError: e?.message || 'Unknown execution error'
                }
              }
            })

            const ended = Date.now()
            return {
              testId: testCase.testId,
              title: testCase.title,
              status: 'error',
              error: e?.message || 'Unknown execution error',
              executionTime: `${ended - started}ms`,
              startedAt: new Date(started).toISOString(),
              endedAt: new Date(ended).toISOString()
            }
          }
        })
      )

      for (const d of runs) {
        results.executed++
        if (d.status === 'passed') results.passed++
        if (d.status === 'failed' || d.status === 'error') results.failed++
        results.details.push(d)
      }
    }

    results.endedAt = new Date().toISOString()
    results.durationMs = Date.now() - startedAt

    return NextResponse.json({ success: true, results })
  } catch (error) {
    console.error('Batch execution error:', error)
    return NextResponse.json(
      { error: 'Failed to execute tests', details: error.message },
      { status: 500 }
    )
  }
}

function mapPriorityToSeverity(priority) {
  switch (priority) {
    case 'critical': return 'critical'
    case 'high': return 'high'
    case 'medium': return 'medium'
    default: return 'low'
  }
}