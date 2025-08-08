import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const segment = searchParams.get('segment')
    
    const skip = (page - 1) * limit
    
    const where = segment ? { segment: { contains: segment, mode: 'insensitive' } } : {}
    
    const [personas, total] = await Promise.all([
      prisma.syntheticPersona.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.syntheticPersona.count({ where })
    ])
    
    // Get unique segments for filtering
    const segments = await prisma.syntheticPersona.groupBy({
      by: ['segment'],
      _count: { segment: true },
      orderBy: { _count: { segment: 'desc' } }
    })
    
    return NextResponse.json({
      personas,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      segments: segments.map(s => ({ name: s.segment, count: s._count.segment }))
    })
    
  } catch (error) {
    console.error('Personas fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch personas', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    
    if (action === 'clear_all') {
      await prisma.syntheticPersona.deleteMany({})
      return NextResponse.json({ success: true, message: 'All personas cleared' })
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    
  } catch (error) {
    console.error('Personas delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete personas' },
      { status: 500 }
    )
  }
}