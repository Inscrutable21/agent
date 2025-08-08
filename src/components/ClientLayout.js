'use client'

import { useEffect } from 'react'
import { useAnalytics } from '../hooks/useAnalytics'

export default function ClientLayout({ children }) {
  const { trackEvent } = useAnalytics()

  // Add click tracking
  useEffect(() => {
    const handleClick = (e) => {
      const element = e.target.tagName.toLowerCase()
      const elementId = e.target.id
      const elementClass = e.target.className
      
      // Safely handle className - it could be a string or DOMTokenList
      const classString = typeof elementClass === 'string' 
        ? elementClass 
        : elementClass?.toString() || ''
      
      trackEvent('click', window.location.pathname, `${element}${elementId ? '#' + elementId : ''}${classString ? '.' + classString.split(' ')[0] : ''}`)
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [trackEvent])

  return <>{children}</>
}
