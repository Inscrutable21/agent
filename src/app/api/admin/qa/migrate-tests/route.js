import { NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'

export async function POST() {
  try {
    // Update all existing test cases to mark them as AI-generated
    const updateResult = await prisma.qATestCase.updateMany({
      where: {
        OR: [
          { generatedBy: null },
          { generatedBy: { not: 'ai' } }
        ]
      },
      data: {
        generatedBy: 'ai'
      }
    })

    // Also update metadata for test cases that don't have aiGenerated flag
    const testCasesWithoutFlag = await prisma.qATestCase.findMany({
      where: {
        OR: [
          { metadata: { path: ['aiGenerated'], equals: null } },
          { metadata: { path: ['aiGenerated'], equals: false } }
        ]
      }
    })

    for (const testCase of testCasesWithoutFlag) {
      await prisma.qATestCase.update({
        where: { id: testCase.id },
        data: {
          metadata: {
            ...testCase.metadata,
            aiGenerated: true,
            generatedAt: testCase.metadata?.generatedAt || testCase.createdAt.toISOString()
          }
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updateResult.count} test cases to mark as AI-generated`,
      metadataUpdated: testCasesWithoutFlag.length
    })

  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json(
      { error: 'Failed to migrate test cases', details: error.message },
      { status: 500 }
    )
  }
}