import { NextResponse } from 'next/server'
import { prisma } from '../../../../../../lib/prisma'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 50
    const skip = (page - 1) * limit

    // First, let's get ALL test cases to debug
    const allTestCases = await prisma.qATestCase.findMany({
      select: {
        id: true,
        testId: true,
        title: true,
        generatedBy: true,
        metadata: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10 // Just first 10 for debugging
    })

    console.log('🔍 Debug - All test cases:', allTestCases.map(tc => ({
      id: tc.id,
      testId: tc.testId,
      title: tc.title,
      generatedBy: tc.generatedBy,
      hasMetadata: !!tc.metadata,
      metadataKeys: tc.metadata ? Object.keys(tc.metadata) : []
    })))

    // Get total count - much simpler query
    const totalCount = await prisma.qATestCase.count()
    
    // Get AI-generated test cases - simplified query
    const aiTestCases = await prisma.qATestCase.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        testId: true,
        title: true,
        description: true,
        testType: true,
        priority: true,
        steps: true,
        assertions: true,
        component: true,
        pageUrl: true,
        metadata: true,
        generatedBy: true,
        createdAt: true
      }
    })

    console.log('🔍 Debug - Found test cases:', aiTestCases.length)
    console.log('🔍 Debug - First test case:', aiTestCases[0])

    // Get stats by component
    const componentStats = await prisma.qATestCase.groupBy({
      by: ['component'],
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    })

    // Get stats by test type
    const testTypeStats = await prisma.qATestCase.groupBy({
      by: ['testType'],
      _count: {
        id: true
      }
    })

    // Get priority stats
    const priorityStats = await prisma.qATestCase.groupBy({
      by: ['priority'],
      _count: {
        id: true
      }
    })

    return NextResponse.json({
      success: true,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1
      },
      testCases: aiTestCases,
      stats: {
        total: totalCount,
        byComponent: componentStats,
        byTestType: testTypeStats,
        byPriority: priorityStats
      },
      debug: {
        totalInDb: totalCount,
        returned: aiTestCases.length,
        queryUsed: 'All test cases (simplified)',
        sampleData: allTestCases.slice(0, 3)
      }
    })
    
  } catch (error) {
    console.error('Test data API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch test data', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST() {
  try {
    // Create a test case to verify database connection
    const testCase = await prisma.qATestCase.create({
      data: {
        testId: `debug_${Date.now()}`,
        title: 'Debug Test Case - AI Generated',
        description: 'Test case created to verify database persistence and AI generation',
        testType: 'functional',
        priority: 'medium',
        steps: [
          'Navigate to the application',
          'Verify page loads successfully', 
          'Check all elements are visible',
          'Validate functionality works as expected'
        ],
        assertions: [
          'Page loads without errors',
          'All UI elements are present',
          'Functionality works correctly',
          'Data persists after refresh'
        ],
        generatedBy: 'ai',
        component: 'Debug System',
        metadata: {
          debug: true,
          aiGenerated: true,
          requirementBased: true,
          riskScore: 5,
          generatedAt: new Date().toISOString(),
          generationMethod: 'debug-creation'
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Debug test case created successfully',
      testCase: {
        id: testCase.id,
        testId: testCase.testId,
        title: testCase.title,
        generatedBy: testCase.generatedBy
      }
    })
    
  } catch (error) {
    console.error('Debug test creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create debug test case', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    
    if (action === 'clear_all') {
      // Delete all test cases
      const deleteResult = await prisma.qATestCase.deleteMany({})
      
      return NextResponse.json({
        success: true,
        message: `Successfully deleted ${deleteResult.count} test cases`,
        deletedCount: deleteResult.count
      })
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    
  } catch (error) {
    console.error('Delete test cases error:', error)
    return NextResponse.json(
      { error: 'Failed to delete test cases', details: error.message },
      { status: 500 }
    )
  }
}




