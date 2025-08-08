import { NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'

export async function GET() {
  try {
    const issues = await prisma.qAIssue.findMany({
      orderBy: { detectedAt: 'desc' }
    })
    
    return NextResponse.json({
      success: true,
      issues
    })
  } catch (error) {
    console.error('Fetch issues error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch issues' },
      { status: 500 }
    )
  }
}