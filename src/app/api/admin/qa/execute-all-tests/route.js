import { NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { executeTestCaseReal } from '../../../../../lib/testRunner'

export async function POST(request) {
  try {
    // Read optional concurrency from request body (defaults to 5, capped 1..10)
    const body = request ? await request.json().catch(() => ({})) : {}
    const concurrency = Math.max(1, Math.min(10, Number(body?.concurrency) || 5))

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

    for (const batch of chunk(testCases, concurrency)) {
      const runs = await Promise.allSettled(
        batch.map(async (testCase) => {
          const started = Date.now()
          const result = await executeTestCaseReal(testCase)

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
        })
      )

      for (const r of runs) {
        if (r.status === 'fulfilled') {
          const d = r.value
          results.executed++
          if (d.status === 'passed') results.passed++
          if (d.status === 'failed') results.failed++
          results.details.push(d)
        } else {
          results.executed++
          results.failed++
          results.details.push({
            testId: 'unknown',
            title: 'Execution error',
            status: 'error',
            error: r.reason?.message || 'Unknown error'
          })
        }
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