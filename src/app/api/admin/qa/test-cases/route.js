import { NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'

export async function GET() {
  try {
    const testCases = await prisma.qATestCase.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        testResults: {
          orderBy: { runAt: 'desc' },
          take: 1
        }
      }
    })
    
    return NextResponse.json({
      success: true,
      testCases
    })
  } catch (error) {
    console.error('Fetch test cases error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch test cases' },
      { status: 500 }
    )
  }
}