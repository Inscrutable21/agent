import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { verifyPassword } from '../../../../lib/auth'

export async function POST(request) {
  try {
    const { email, password } = await request.json()
    
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    })
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }
    
    // Verify password
    const isValidPassword = await verifyPassword(password, user.password)
    
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }
    
    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    })

    // Trigger AI test generation for login flow
    try {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
      const autoTriggerResponse = await fetch(`${baseUrl}/api/admin/qa/auto-trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageUrl: '/api/auth/login',
          content: JSON.stringify({
            action: 'user_login',
            email: email,
            timestamp: new Date().toISOString(),
            userAgent: request.headers.get('user-agent'),
            success: true
          }),
          component: 'User Authentication - Login'
        })
      })
      
      if (autoTriggerResponse.ok) {
        console.log('✅ AI test generation triggered for login')
      }
    } catch (triggerError) {
      console.error('Auto-trigger failed for login:', triggerError)
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    })
    
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
