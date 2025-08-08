import { NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { triggerQAOnContentChange } from '../../../../../lib/qaAutoTrigger'

export async function PUT(request, { params }) {
  try {
    const data = await request.json()
    const { id } = params

    const billboard = await prisma.billboard.update({
      where: { id },
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

    // Auto-trigger QA for updated billboard
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
        'billboard_updated'
      )
      console.log(`QA auto-triggered for updated billboard: ${billboard.title}`)
    } catch (qaError) {
      console.error('QA auto-trigger failed:', qaError)
    }

    return NextResponse.json({ billboard })
  } catch (error) {
    console.error('Billboard update error:', error)
    return NextResponse.json(
      { error: 'Failed to update billboard' },
      { status: 500 }
    )
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params

    await prisma.billboard.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Billboard deleted successfully' })
  } catch (error) {
    console.error('Billboard delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete billboard' },
      { status: 500 }
    )
  }
}
