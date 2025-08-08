import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '7d'

    const days = period === '30d' ? 30 : period === '90d' ? 90 : 7
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get page views data
    const pageViews = await prisma.userAnalytics.groupBy({
      by: ['page'],
      where: {
        timestamp: { gte: startDate },
        action: 'page_view'
      },
      _count: { id: true }
    })

    // Get click analytics with user and component details
    const clickAnalytics = await prisma.userAnalytics.findMany({
      where: {
        timestamp: { gte: startDate },
        action: 'click'
      },
      select: {
        userId: true,
        element: true,
        page: true,
        timestamp: true,
        data: true,
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: { timestamp: 'desc' }
    })

    // Get scroll depth data
    const scrollData = await prisma.userAnalytics.findMany({
      where: {
        timestamp: { gte: startDate },
        action: 'scroll'
      },
      select: {
        page: true,
        data: true,
        timestamp: true,
        userId: true
      }
    })

    // Get device analytics
    const deviceStats = await prisma.userAnalytics.groupBy({
      by: ['device'],
      where: {
        timestamp: { gte: startDate }
      },
      _count: { id: true }
    })

    // Get browser analytics
    const browserStats = await prisma.userAnalytics.groupBy({
      by: ['browser'],
      where: {
        timestamp: { gte: startDate }
      },
      _count: { id: true }
    })

    // Get daily activity - Fixed to return array
    const rawDailyActivity = await prisma.userAnalytics.findMany({
      where: {
        timestamp: { gte: startDate }
      },
      select: {
        timestamp: true
      }
    })

    // Process daily activity data
    const dailyActivityMap = new Map()
    rawDailyActivity.forEach(item => {
      const date = item.timestamp.toISOString().split('T')[0]
      dailyActivityMap.set(date, (dailyActivityMap.get(date) || 0) + 1)
    })

    const dailyActivity = Array.from(dailyActivityMap.entries()).map(([date, count]) => ({
      date,
      count
    })).sort((a, b) => new Date(a.date) - new Date(b.date))

    // Get top pages
    const topPages = await prisma.userAnalytics.groupBy({
      by: ['page'],
      where: {
        timestamp: { gte: startDate },
        action: 'page_view'
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10
    })

    return NextResponse.json({
      pageViews,
      clickAnalytics,
      scrollData,
      deviceStats,
      browserStats,
      dailyActivity,
      topPages
    })
  } catch (error) {
    console.error('Analytics fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}

