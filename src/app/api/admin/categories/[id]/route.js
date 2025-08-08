import { NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { triggerQAOnContentChange } from '../../../../../lib/qaAutoTrigger'

export async function PUT(request, { params }) {
  try {
    const { name, comingSoon } = await request.json()
    const { id } = params

    const category = await prisma.category.update({
      where: { id },
      data: { 
        name,
        comingSoon: comingSoon || false
      },
      include: {
        subCategories: true,
        _count: {
          select: { billboards: true }
        }
      }
    })

    // Auto-trigger QA for updated category
    try {
      await triggerQAOnContentChange(
        `/categories/${category.id}`,
        JSON.stringify({
          name: category.name,
          comingSoon: category.comingSoon,
          subCategories: category.subCategories
        }),
        'category_updated'
      )
      console.log(`QA auto-triggered for updated category: ${category.name}`)
    } catch (qaError) {
      console.error('QA auto-trigger failed:', qaError)
    }

    return NextResponse.json({ category })
  } catch (error) {
    console.error('Category update error:', error)
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    )
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params

    // Check if category has billboards
    const billboardCount = await prisma.billboard.count({
      where: { categoryId: id }
    })

    if (billboardCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete category. It has ${billboardCount} associated billboards.` },
        { status: 400 }
      )
    }

    // Delete subcategories first, then category
    await prisma.subCategory.deleteMany({
      where: { categoryId: id }
    })

    await prisma.category.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Category deleted successfully' })
  } catch (error) {
    console.error('Category delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    )
  }
}
