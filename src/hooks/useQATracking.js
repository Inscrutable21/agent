'use client'
import { useEffect, useCallback } from 'react'
import { triggerQAOnUserAction, triggerQAOnFormSubmit, triggerQAOnNavigation } from '../lib/qaAutoTrigger'

export function useQATracking(componentName = 'Unknown Component') {
  // Track user interactions
  const trackUserAction = useCallback(async (action, element, data = {}) => {
    try {
      await triggerQAOnUserAction(action, element, { ...data, component: componentName })
    } catch (error) {
      console.error('QA tracking error:', error)
    }
  }, [componentName])

  // Track form submissions
  const trackFormSubmit = useCallback(async (formName, formData, success = true) => {
    try {
      await triggerQAOnFormSubmit(`${componentName} - ${formName}`, formData, success)
    } catch (error) {
      console.error('QA form tracking error:', error)
    }
  }, [componentName])

  // Track navigation
  const trackNavigation = useCallback(async (toUrl, trigger = 'click') => {
    try {
      const fromUrl = window.location.pathname
      await triggerQAOnNavigation(fromUrl, toUrl, trigger)
    } catch (error) {
      console.error('QA navigation tracking error:', error)
    }
  }, [])

  // Auto-track common interactions
  useEffect(() => {
    const handleClick = (event) => {
      const element = event.target
      const tagName = element.tagName.toLowerCase()
      const elementInfo = {
        tag: tagName,
        id: element.id,
        className: element.className,
        text: element.textContent?.slice(0, 50)
      }

      // Track button clicks
      if (tagName === 'button' || element.type === 'submit') {
        trackUserAction('button_click', 'button', elementInfo)
      }
      // Track link clicks
      else if (tagName === 'a') {
        trackUserAction('link_click', 'link', { ...elementInfo, href: element.href })
      }
      // Track input focus
      else if (['input', 'textarea', 'select'].includes(tagName)) {
        trackUserAction('input_focus', 'form_field', elementInfo)
      }
    }

    const handleSubmit = (event) => {
      const form = event.target
      const formData = new FormData(form)
      const formFields = {}
      
      for (let [key, value] of formData.entries()) {
        formFields[key] = typeof value === 'string' ? value.slice(0, 20) : '[file]'
      }

      trackFormSubmit(form.id || 'unnamed_form', formFields, true)
    }

    // Add event listeners
    document.addEventListener('click', handleClick)
    document.addEventListener('submit', handleSubmit)

    // Cleanup
    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('submit', handleSubmit)
    }
  }, [trackUserAction, trackFormSubmit])

  return {
    trackUserAction,
    trackFormSubmit,
    trackNavigation
  }
}

// Higher-order component for automatic QA tracking
export function withQATracking(WrappedComponent, componentName) {
  return function QATrackedComponent(props) {
    const qaTracking = useQATracking(componentName)
    
    return <WrappedComponent {...props} qaTracking={qaTracking} />
  }
}