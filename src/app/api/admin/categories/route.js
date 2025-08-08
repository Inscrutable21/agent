import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { triggerQAOnContentChange } from '../../../../lib/qaAutoTrigger'

export async function GET() {
  try {
    // Add connection retry logic
    let retries = 3;
    while (retries > 0) {
      try {
        await prisma.$connect();
        break;
      } catch (connectError) {
        retries--;
        if (retries === 0) throw connectError;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const categories = await prisma.category.findMany({
      include: {
        subCategories: true,
        _count: {
          select: { billboards: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Admin categories fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { name, comingSoon = false } = await request.json()

    const category = await prisma.category.create({
      data: { name, comingSoon },
      include: {
        subCategories: true,
        _count: {
          select: { billboards: true }
        }
      }
    })

    // Auto-trigger QA for new category
    try {
      await triggerQAOnContentChange(
        `/categories/${category.id}`,
        JSON.stringify({
          name: category.name,
          comingSoon: category.comingSoon
        }),
        'category_created'
      )
      console.log(`QA auto-triggered for new category: ${category.name}`)
    } catch (qaError) {
      console.error('QA auto-trigger failed:', qaError)
    }

    return NextResponse.json({ category })
  } catch (error) {
    console.error('Category creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    )
  }
}

