import { NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { triggerQAOnContentChange } from '../../../../../lib/qaAutoTrigger'

export async function PUT(request, { params }) {
  try {
    const { name, state, country } = await request.json()
    const { id } = params

    // Check if updated city already exists
    const existingCity = await prisma.city.findFirst({
      where: {
        name,
        state,
        country: country || 'India',
        NOT: { id }
      }
    })

    if (existingCity) {
      return NextResponse.json(
        { error: 'City already exists in this state' },
        { status: 400 }
      )
    }

    const city = await prisma.city.update({
      where: { id },
      data: {
        name,
        state,
        country: country || 'India'
      },
      include: {
        _count: {
          select: { billboards: true }
        }
      }
    })

    // Auto-trigger QA for updated city
    try {
      await triggerQAOnContentChange(
        `/cities/${city.id}`,
        JSON.stringify({
          name: city.name,
          state: city.state,
          country: city.country
        }),
        'city_updated'
      )
      console.log(`QA auto-triggered for updated city: ${city.name}`)
    } catch (qaError) {
      console.error('QA auto-trigger failed:', qaError)
    }

    return NextResponse.json({ city })
  } catch (error) {
    console.error('City update error:', error)
    return NextResponse.json(
      { error: 'Failed to update city' },
      { status: 500 }
    )
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params

    // Check if city has billboards
    const billboardCount = await prisma.billboard.count({
      where: { cityId: id }
    })

    if (billboardCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete city. It has ${billboardCount} associated billboards.` },
        { status: 400 }
      )
    }

    await prisma.city.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'City deleted successfully' })
  } catch (error) {
    console.error('City delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete city' },
      { status: 500 }
    )
  }
}
