import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function useAnalytics() {
  const pathname = usePathname()

  useEffect(() => {
    // Generate session ID if not exists
    if (!sessionStorage.getItem('sessionId')) {
      sessionStorage.setItem('sessionId', Date.now().toString() + Math.random().toString(36).substr(2, 9))
    }

    // Get user ID if logged in
    const userData = localStorage.getItem('userData')
    const userId = userData ? JSON.parse(userData).id : null

    // Track page view with debouncing
    const trackPageView = () => {
      const lastPageView = sessionStorage.getItem(`lastPageView_${pathname}`)
      const now = Date.now()
      
      // Only track if last page view was more than 30 seconds ago
      if (!lastPageView || now - parseInt(lastPageView) > 30000) {
        trackEvent('page_view', pathname, null, { referrer: document.referrer })
        sessionStorage.setItem(`lastPageView_${pathname}`, now.toString())
      }
    }

    trackPageView()

    // Track scroll depth with throttling
    let maxScroll = 0
    let scrollTimeout = null
    
    const handleScroll = () => {
      if (scrollTimeout) return
      
      scrollTimeout = setTimeout(() => {
        const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100)
        
        // Only track significant scroll milestones
        if (scrollPercent > maxScroll && scrollPercent % 25 === 0) {
          maxScroll = scrollPercent
          trackEvent('scroll', pathname, null, { scrollDepth: scrollPercent })
        }
        
        scrollTimeout = null
      }, 1000) // Throttle to once per second
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (scrollTimeout) clearTimeout(scrollTimeout)
    }
  }, [pathname])

  const trackEvent = async (action, page, element = null, data = null) => {
    try {
      const sessionId = sessionStorage.getItem('sessionId')
      const userData = localStorage.getItem('userData')
      const userId = userData ? JSON.parse(userData).id : null

      // Rate limiting - max 10 events per minute per session
      const rateLimitKey = `rateLimit_${sessionId}`
      const rateLimitData = JSON.parse(sessionStorage.getItem(rateLimitKey) || '{"count": 0, "timestamp": 0}')
      const now = Date.now()
      
      if (now - rateLimitData.timestamp > 60000) {
        // Reset counter every minute
        rateLimitData.count = 0
        rateLimitData.timestamp = now
      }
      
      if (rateLimitData.count >= 10) {
        console.warn('Analytics rate limit exceeded')
        return
      }
      
      rateLimitData.count++
      sessionStorage.setItem(rateLimitKey, JSON.stringify(rateLimitData))

      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          page: page || window.location.pathname,
          element,
          data,
          sessionId,
          userId
        })
      })
    } catch (error) {
      console.error('Analytics tracking error:', error)
    }
  }

  return { trackEvent }
}




