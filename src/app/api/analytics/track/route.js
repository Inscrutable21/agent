import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'

export async function POST(request) {
  try {
    const { 
      page, 
      action, 
      element, 
      data, 
      sessionId,
      userId 
    } = await request.json()

    // Get user info from headers
    const userAgent = request.headers.get('user-agent') || ''
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'

    // Improved device detection
    const device = getDeviceType(userAgent)
    
    // Improved browser detection
    const browser = getBrowserType(userAgent)

    // Track the analytics event
    await prisma.userAnalytics.create({
      data: {
        userId: userId || null,
        sessionId,
        page,
        action,
        element,
        data,
        ipAddress,
        userAgent,
        device,
        browser
      }
    })

    // Update page views count only for page_view actions
    if (action === 'page_view') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      await prisma.pageViews.upsert({
        where: {
          page_date: {
            page,
            date: today
          }
        },
        update: {
          views: { increment: 1 }
        },
        create: {
          page,
          views: 1,
          date: today
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Analytics tracking error:', error)
    return NextResponse.json(
      { error: 'Failed to track analytics' },
      { status: 500 }
    )
  }
}

function getDeviceType(userAgent) {
  const ua = userAgent.toLowerCase()
  
  // Mobile devices
  if (ua.includes('mobile') || 
      ua.includes('android') || 
      ua.includes('iphone') || 
      ua.includes('ipod') || 
      ua.includes('blackberry') || 
      ua.includes('windows phone')) {
    return 'mobile'
  }
  
  // Tablets
  if (ua.includes('tablet') || 
      ua.includes('ipad') || 
      ua.includes('kindle') || 
      ua.includes('silk') ||
      (ua.includes('android') && !ua.includes('mobile'))) {
    return 'tablet'
  }
  
  // Everything else is desktop
  return 'desktop'
}

function getBrowserType(userAgent) {
  const ua = userAgent.toLowerCase()
  
  if (ua.includes('edg/')) return 'Edge'
  if (ua.includes('chrome/') && !ua.includes('edg/')) return 'Chrome'
  if (ua.includes('firefox/')) return 'Firefox'
  if (ua.includes('safari/') && !ua.includes('chrome/')) return 'Safari'
  if (ua.includes('opera/') || ua.includes('opr/')) return 'Opera'
  
  return 'Other'
}

