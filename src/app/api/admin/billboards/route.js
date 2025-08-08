import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { triggerQAOnContentChange } from '../../../../lib/qaAutoTrigger'

export async function GET() {
  try {
    const billboards = await prisma.billboard.findMany({
      include: {
        city: true,
        category: true,
        subCategory: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ billboards })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch billboards' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const data = await request.json()
    
    const billboard = await prisma.billboard.create({
      data: {
        title: data.title,
        cityId: data.cityId,
        categoryId: data.categoryId,
        subCategoryId: data.subCategoryId || null,
        mediaType: data.mediaType,
        size: data.size,
        illumination: data.illumination,
        ftf: data.ftf,
        totalArea: parseFloat(data.totalArea),
        description: data.description,
        pricing: parseFloat(data.pricing),
        offerPricing: data.offerPricing ? parseFloat(data.offerPricing) : null,
        discountPercent: data.discountPercent ? parseFloat(data.discountPercent) : null,
        images: data.images || [],
        location: data.location,
        isActive: data.isActive ?? true,
        isAvailable: data.isAvailable ?? true
      },
      include: {
        city: true,
        category: true,
        subCategory: true
      }
    })

    // Auto-trigger QA for new billboard
    try {
      await triggerQAOnContentChange(
        `/billboards/${billboard.id}`,
        JSON.stringify({
          title: billboard.title,
          description: billboard.description,
          category: billboard.category?.name,
          city: billboard.city?.name,
          pricing: billboard.pricing,
          location: billboard.location
        }),
        'billboard_created'
      )
      console.log(`QA auto-triggered for new billboard: ${billboard.title}`)
    } catch (qaError) {
      console.error('QA auto-trigger failed:', qaError)
      // Don't fail the billboard creation if QA fails
    }

    return NextResponse.json({ billboard })
  } catch (error) {
    console.error('Billboard creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create billboard' },
      { status: 500 }
    )
  }
}
