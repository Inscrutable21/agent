import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { triggerQAOnContentChange } from '../../../../lib/qaAutoTrigger'

export async function GET() {
  try {
    const cities = await prisma.city.findMany({
      include: {
        _count: {
          select: { billboards: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ cities })
  } catch (error) {
    console.error('Cities fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cities' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const { name, state, country = 'India' } = await request.json()

    // Check if city already exists
    const existingCity = await prisma.city.findFirst({
      where: { name, state, country }
    })

    if (existingCity) {
      return NextResponse.json(
        { error: 'City already exists in this state' },
        { status: 400 }
      )
    }

    const city = await prisma.city.create({
      data: { name, state, country },
      include: {
        _count: {
          select: { billboards: true }
        }
      }
    })

    // Auto-trigger QA for new city
    try {
      await triggerQAOnContentChange(
        `/cities/${city.id}`,
        JSON.stringify({
          name: city.name,
          state: city.state,
          country: city.country
        }),
        'city_created'
      )
      console.log(`QA auto-triggered for new city: ${city.name}`)
    } catch (qaError) {
      console.error('QA auto-trigger failed:', qaError)
    }

    return NextResponse.json({ city })
  } catch (error) {
    console.error('City creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create city' },
      { status: 500 }
    )
  }
}
