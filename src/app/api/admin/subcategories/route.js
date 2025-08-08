import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { triggerQAOnContentChange } from '../../../../lib/qaAutoTrigger'

export async function POST(request) {
  try {
    const { name, categoryId } = await request.json()

    const subCategory = await prisma.subCategory.create({
      data: { name, categoryId },
      include: { 
        category: true,
        _count: {
          select: { billboards: true }
        }
      }
    })

    // Auto-trigger QA for new subcategory
    try {
      await triggerQAOnContentChange(
        `/categories/${subCategory.categoryId}/subcategories/${subCategory.id}`,
        JSON.stringify({
          name: subCategory.name,
          categoryName: subCategory.category.name,
          categoryId: subCategory.categoryId
        }),
        'subcategory_created'
      )
      console.log(`QA auto-triggered for new subcategory: ${subCategory.name}`)
    } catch (qaError) {
      console.error('QA auto-trigger failed:', qaError)
    }

    return NextResponse.json({ subCategory })
  } catch (error) {
    console.error('Subcategory creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create subcategory' },
      { status: 500 }
    )
  }
}
