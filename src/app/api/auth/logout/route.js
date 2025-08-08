import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { userId, email } = await request.json()
    
    console.log('🚪 User logout:', { userId, email })
    
    // Trigger minimal AI test generation for logout flow (just 1 test)
    try {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
      const autoTriggerResponse = await fetch(`${baseUrl}/api/admin/qa/auto-trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageUrl: '/api/auth/logout',
          content: JSON.stringify({
            action: 'user_logout',
            userId: userId,
            email: email,
            timestamp: new Date().toISOString(),
            success: true
          }),
          component: 'User Authentication - Logout',
          changeType: 'user_logout'
        })
      })
      
      if (autoTriggerResponse.ok) {
        console.log('✅ Minimal AI test generation triggered for logout')
      }
    } catch (triggerError) {
      console.error('Auto-trigger failed for logout:', triggerError)
    }
    
    return NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    })
    
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
