import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { prisma } from '../../../../../lib/prisma'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request) {
  try {
    const { 
      workflowType,
      personaCount = 10,
      useExistingPersonas = true,
      validationRules = [],
      scenarios = []
    } = await request.json()

    console.log(`🎭 Starting workflow simulation: ${workflowType}`)
    
    // Get synthetic personas from database
    const simulationPersonas = useExistingPersonas 
      ? await getSyntheticPersonas(personaCount)
      : await generateSimulationPersonas(workflowType, personaCount)
    
    if (simulationPersonas.length === 0) {
      throw new Error('No personas available for simulation')
    }

    console.log(`📊 Using ${simulationPersonas.length} personas for simulation`)
    
    // Create simulation session
    const session = await createSimulationSession(workflowType, simulationPersonas.length)
    
    // Run simulations for each persona
    const simulationResults = []
    for (const persona of simulationPersonas) {
      const result = await runPersonaSimulation(persona, workflowType, scenarios, validationRules)
      simulationResults.push(result)
      
      // Save individual result to database
      await saveSimulationResult(session.sessionId, result)
    }
    
    // Generate comprehensive discrepancy report
    const discrepancyReport = await generateDiscrepancyReport(simulationResults, workflowType)
    
    // Update session with final results
    await updateSimulationSession(session.sessionId, {
      status: 'completed',
      results: simulationResults,
      discrepancyReport
    })
    
    return NextResponse.json({
      success: true,
      sessionId: session.sessionId,
      simulationResults,
      discrepancyReport,
      summary: {
        totalSimulations: simulationResults.length,
        successfulFlows: simulationResults.filter(r => r.success).length,
        discrepanciesFound: discrepancyReport.discrepancies.length,
        criticalIssues: discrepancyReport.discrepancies.filter(d => d.severity === 'critical').length,
        personasUsed: simulationPersonas.length
      }
    })
    
  } catch (error) {
    console.error('Workflow simulation error:', error)
    return NextResponse.json(
      { error: 'Simulation failed', details: error.message },
      { status: 500 }
    )
  }
}

async function getSyntheticPersonas(count) {
  try {
    const personas = await prisma.syntheticPersona.findMany({
      where: { status: 'active' },
      take: count,
      orderBy: { createdAt: 'desc' }
    })
    
    return personas.map(persona => ({
      id: persona.personaId,
      name: persona.name,
      demographics: persona.demographics,
      business: persona.business,
      behavior: persona.behavior,
      psychographics: persona.psychographics,
      digitalBehavior: persona.digitalBehavior,
      challenges: persona.challenges,
      opportunities: persona.opportunities,
      uniqueTraits: persona.uniqueTraits,
      // Extract location data for geo-gating
      location: extractLocationData(persona),
      // Extract preferences for personalization
      preferences: extractPreferences(persona),
      // Extract business context
      businessContext: extractBusinessContext(persona)
    }))
  } catch (error) {
    console.error('Error fetching synthetic personas:', error)
    return []
  }
}

function extractLocationData(persona) {
  const demographics = persona.demographics || {}
  const business = persona.business || {}
  
  return {
    country: demographics.country || demographics.location?.country || 'US',
    state: demographics.state || demographics.location?.state || 'CA',
    city: demographics.city || demographics.location?.city || 'San Francisco',
    timezone: demographics.timezone || 'America/Los_Angeles',
    ipRegion: demographics.region || 'North America'
  }
}

function extractPreferences(persona) {
  const behavior = persona.behavior || {}
  const digital = persona.digitalBehavior || {}
  const psycho = persona.psychographics || {}
  
  return {
    contentTypes: behavior.preferredContent || ['articles', 'videos'],
    platforms: digital.platforms || ['web', 'mobile'],
    communicationStyle: psycho.communicationPreference || 'direct',
    interests: persona.uniqueTraits || [],
    devicePreference: digital.primaryDevice || 'mobile'
  }
}

function extractBusinessContext(persona) {
  const business = persona.business || {}
  
  return {
    industry: business.industry || 'Technology',
    companySize: business.size || 'Small',
    role: persona.title || 'Manager',
    budget: business.budget || 'Medium',
    decisionMaker: business.decisionMaker || false
  }
}

async function createSimulationSession(workflowType, personaCount) {
  const sessionId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  // You can store this in database if needed
  return {
    sessionId,
    workflowType,
    personaCount,
    startedAt: new Date(),
    status: 'running'
  }
}

async function runPersonaSimulation(persona, workflowType, scenarios, validationRules) {
  const simulationSteps = []
  const validationResults = []
  let currentState = { persona, context: {} }
  
  try {
    console.log(`🎯 Simulating ${workflowType} for persona: ${persona.name}`)
    
    // Get workflow-specific steps
    const workflowSteps = getWorkflowSteps(persona, workflowType, scenarios)
    
    for (const step of workflowSteps) {
      const stepResult = await simulateWorkflowStep(step, currentState, validationRules)
      simulationSteps.push(stepResult)
      currentState = { ...currentState, ...stepResult.newState }
      
      // Validate each step against rules
      const stepValidation = await validateStep(stepResult, validationRules, persona, workflowType)
      validationResults.push(stepValidation)
    }
    
    return {
      personaId: persona.id,
      persona: {
        name: persona.name,
        location: persona.location,
        preferences: persona.preferences,
        businessContext: persona.businessContext
      },
      workflowType,
      steps: simulationSteps,
      validations: validationResults,
      success: validationResults.every(v => v.allPassed),
      duration: simulationSteps.reduce((sum, step) => sum + (step.duration || 0), 0),
      completedAt: new Date()
    }
    
  } catch (error) {
    console.error(`Simulation failed for persona ${persona.name}:`, error)
    return {
      personaId: persona.id,
      persona: { name: persona.name },
      workflowType,
      steps: simulationSteps,
      validations: validationResults,
      success: false,
      error: error.message,
      completedAt: new Date()
    }
  }
}

function getWorkflowSteps(persona, workflowType, scenarios) {
  const baseSteps = {
    user_registration: [
      { id: 'landing', name: 'Visit Registration Page', type: 'navigation' },
      { id: 'form_fill', name: 'Fill Registration Form', type: 'form_interaction' },
      { id: 'validation', name: 'Form Validation', type: 'validation' },
      { id: 'geo_check', name: 'Geographic Validation', type: 'geo_validation' },
      { id: 'submit', name: 'Submit Registration', type: 'form_submission' },
      { id: 'confirmation', name: 'Registration Confirmation', type: 'confirmation' }
    ],
    checkout_process: [
      { id: 'cart_review', name: 'Review Cart', type: 'navigation' },
      { id: 'shipping_info', name: 'Enter Shipping Info', type: 'form_interaction' },
      { id: 'payment_method', name: 'Select Payment Method', type: 'form_interaction' },
      { id: 'geo_pricing', name: 'Apply Geographic Pricing', type: 'geo_validation' },
      { id: 'payment_process', name: 'Process Payment', type: 'payment' },
      { id: 'order_confirmation', name: 'Order Confirmation', type: 'confirmation' }
    ],
    content_personalization: [
      { id: 'user_identification', name: 'Identify User', type: 'identification' },
      { id: 'preference_analysis', name: 'Analyze Preferences', type: 'analysis' },
      { id: 'content_selection', name: 'Select Personalized Content', type: 'personalization' },
      { id: 'content_delivery', name: 'Deliver Content', type: 'delivery' },
      { id: 'engagement_tracking', name: 'Track Engagement', type: 'tracking' }
    ],
    geo_access_control: [
      { id: 'location_detection', name: 'Detect User Location', type: 'geo_detection' },
      { id: 'access_validation', name: 'Validate Access Rights', type: 'geo_validation' },
      { id: 'content_filtering', name: 'Filter Content by Region', type: 'content_filtering' },
      { id: 'compliance_check', name: 'Check Compliance Rules', type: 'compliance' },
      { id: 'access_decision', name: 'Grant/Deny Access', type: 'access_control' }
    ],
    conditional_workflows: [
      { id: 'condition_evaluation', name: 'Evaluate Conditions', type: 'evaluation' },
      { id: 'rule_processing', name: 'Process Business Rules', type: 'rule_processing' },
      { id: 'path_selection', name: 'Select Workflow Path', type: 'path_selection' },
      { id: 'dynamic_content', name: 'Generate Dynamic Content', type: 'content_generation' },
      { id: 'outcome_delivery', name: 'Deliver Outcome', type: 'delivery' }
    ]
  }

  return baseSteps[workflowType] || baseSteps.user_registration
}

async function simulateWorkflowStep(step, currentState, validationRules) {
  const { persona } = currentState
  const startTime = Date.now()
  
  // Simulate step execution based on type
  let stepResult = {
    stepId: step.id,
    stepName: step.name,
    stepType: step.type,
    startTime: new Date(startTime),
    duration: Math.random() * 2000 + 500, // 0.5-2.5 seconds
    success: true,
    data: {},
    newState: {}
  }

  try {
    switch (step.type) {
      case 'navigation':
        stepResult.data = {
          url: `/workflow/${step.id}`,
          loadTime: Math.random() * 1000 + 200,
          userAgent: persona.preferences?.devicePreference || 'desktop'
        }
        break

      case 'form_interaction':
        stepResult.data = {
          formData: generateFormData(persona, step.id),
          inputTime: Math.random() * 5000 + 1000,
          validationErrors: Math.random() > 0.8 ? ['Invalid email format'] : []
        }
        break

      case 'geo_validation':
        stepResult.data = {
          detectedLocation: persona.location,
          allowedRegions: ['US', 'CA', 'EU'],
          accessGranted: isLocationAllowed(persona.location),
          geoMethod: 'IP_GEOLOCATION'
        }
        stepResult.success = stepResult.data.accessGranted
        break

      case 'personalization':
        stepResult.data = {
          selectedContent: generatePersonalizedContent(persona),
          personalizationScore: Math.random() * 100,
          contentVariant: selectContentVariant(persona)
        }
        break

      case 'payment':
        stepResult.data = {
          paymentMethod: persona.businessContext?.budget === 'High' ? 'premium_card' : 'standard_card',
          amount: calculateAmount(persona),
          currency: getCurrencyByLocation(persona.location),
          processingTime: Math.random() * 3000 + 1000
        }
        stepResult.success = Math.random() > 0.05 // 95% success rate
        break

      default:
        stepResult.data = {
          genericResult: `Completed ${step.name}`,
          timestamp: new Date()
        }
    }

    stepResult.endTime = new Date(startTime + stepResult.duration)
    stepResult.newState = {
      lastStep: step.id,
      stepData: stepResult.data,
      context: { ...currentState.context, [step.id]: stepResult.data }
    }

  } catch (error) {
    stepResult.success = false
    stepResult.error = error.message
  }

  return stepResult
}

function generateFormData(persona, stepId) {
  const formData = {
    name: persona.name,
    email: `${persona.name.toLowerCase().replace(' ', '.')}@example.com`,
    location: persona.location
  }

  if (stepId === 'shipping_info') {
    formData.address = `${Math.floor(Math.random() * 9999)} Main St`
    formData.city = persona.location.city
    formData.state = persona.location.state
    formData.zipCode = Math.floor(Math.random() * 90000) + 10000
  }

  return formData
}

function isLocationAllowed(location) {
  const restrictedCountries = ['CN', 'RU', 'IR']
  return !restrictedCountries.includes(location.country)
}

function generatePersonalizedContent(persona) {
  const contentTypes = {
    'Technology': ['tech-articles', 'product-demos', 'case-studies'],
    'Healthcare': ['health-tips', 'medical-news', 'wellness-guides'],
    'Finance': ['market-updates', 'investment-tips', 'financial-planning']
  }
  
  const industry = persona.businessContext?.industry || 'Technology'
  const availableContent = contentTypes[industry] || contentTypes['Technology']
  
  return availableContent[Math.floor(Math.random() * availableContent.length)]
}

function selectContentVariant(persona) {
  const variants = ['A', 'B', 'C']
  const hash = persona.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
  return variants[hash % variants.length]
}

function calculateAmount(persona) {
  const baseAmount = 99.99
  const multiplier = persona.businessContext?.budget === 'High' ? 2.5 : 
                    persona.businessContext?.budget === 'Medium' ? 1.5 : 1.0
  return Math.round(baseAmount * multiplier * 100) / 100
}

function getCurrencyByLocation(location) {
  const currencyMap = {
    'US': 'USD',
    'CA': 'CAD',
    'GB': 'GBP',
    'EU': 'EUR'
  }
  return currencyMap[location.country] || 'USD'
}

async function validateStep(stepResult, validationRules, persona, workflowType) {
  const validations = []
  
  // Geographic validation
  if (stepResult.stepType === 'geo_validation') {
    validations.push({
      type: 'geographic_access',
      expected: isLocationAllowed(persona.location),
      actual: stepResult.data.accessGranted,
      passed: stepResult.data.accessGranted === isLocationAllowed(persona.location),
      rule: 'Users from restricted countries should be blocked'
    })
  }

  // Personalization validation
  if (stepResult.stepType === 'personalization') {
    const expectedContent = generatePersonalizedContent(persona)
    validations.push({
      type: 'content_personalization',
      expected: persona.businessContext?.industry,
      actual: stepResult.data.selectedContent,
      passed: stepResult.data.selectedContent.includes(persona.businessContext?.industry?.toLowerCase() || 'tech'),
      rule: 'Content should match user industry'
    })
  }

  // Payment validation
  if (stepResult.stepType === 'payment') {
    const expectedCurrency = getCurrencyByLocation(persona.location)
    validations.push({
      type: 'currency_localization',
      expected: expectedCurrency,
      actual: stepResult.data.currency,
      passed: stepResult.data.currency === expectedCurrency,
      rule: 'Currency should match user location'
    })
  }

  return {
    stepId: stepResult.stepId,
    validations,
    allPassed: validations.every(v => v.passed),
    failedValidations: validations.filter(v => !v.passed)
  }
}

async function generateDiscrepancyReport(simulationResults, workflowType) {
  const discrepancies = []
  const patterns = {}
  
  for (const result of simulationResults) {
    for (const validation of result.validations) {
      for (const failedValidation of validation.failedValidations) {
        discrepancies.push({
          personaId: result.personaId,
          personaName: result.persona.name,
          stepId: validation.stepId,
          validationType: failedValidation.type,
          expected: failedValidation.expected,
          actual: failedValidation.actual,
          rule: failedValidation.rule,
          severity: determineSeverity(failedValidation.type),
          impact: determineImpact(failedValidation.type, workflowType),
          timestamp: new Date()
        })
        
        // Track patterns
        const patternKey = `${failedValidation.type}_${validation.stepId}`
        patterns[patternKey] = (patterns[patternKey] || 0) + 1
      }
    }
  }

  return {
    discrepancies,
    patterns,
    summary: {
      totalDiscrepancies: discrepancies.length,
      criticalIssues: discrepancies.filter(d => d.severity === 'critical').length,
      highIssues: discrepancies.filter(d => d.severity === 'high').length,
      mediumIssues: discrepancies.filter(d => d.severity === 'medium').length,
      lowIssues: discrepancies.filter(d => d.severity === 'low').length,
      mostCommonIssue: Object.keys(patterns).reduce((a, b) => patterns[a] > patterns[b] ? a : b, ''),
      affectedPersonas: [...new Set(discrepancies.map(d => d.personaId))].length
    },
    recommendations: generateRecommendations(discrepancies, patterns)
  }
}

function determineSeverity(validationType) {
  const severityMap = {
    'geographic_access': 'critical',
    'currency_localization': 'high',
    'content_personalization': 'medium',
    'form_validation': 'medium',
    'payment_processing': 'critical'
  }
  return severityMap[validationType] || 'low'
}

function determineImpact(validationType, workflowType) {
  const impactMap = {
    'geographic_access': ['Legal compliance risk', 'Revenue loss', 'User experience degradation'],
    'currency_localization': ['Pricing confusion', 'Conversion rate impact', 'User trust issues'],
    'content_personalization': ['Reduced engagement', 'Lower conversion rates', 'Poor user experience'],
    'form_validation': ['Data quality issues', 'User frustration', 'Abandonment risk'],
    'payment_processing': ['Revenue loss', 'Transaction failures', 'Customer dissatisfaction']
  }
  return impactMap[validationType] || ['Minor user experience impact']
}

function generateRecommendations(discrepancies, patterns) {
  const recommendations = []
  
  if (patterns['geographic_access_geo_validation'] > 0) {
    recommendations.push({
      priority: 'high',
      category: 'Geographic Access',
      issue: 'Geographic access control failures detected',
      recommendation: 'Review and update geo-blocking rules. Implement more robust IP geolocation service.',
      affectedCount: patterns['geographic_access_geo_validation']
    })
  }
  
  if (patterns['currency_localization_payment'] > 0) {
    recommendations.push({
      priority: 'medium',
      category: 'Localization',
      issue: 'Currency localization inconsistencies',
      recommendation: 'Implement automatic currency detection based on user location. Add currency conversion API.',
      affectedCount: patterns['currency_localization_payment']
    })
  }
  
  if (patterns['content_personalization_personalization'] > 0) {
    recommendations.push({
      priority: 'medium',
      category: 'Personalization',
      issue: 'Content personalization not matching user profiles',
      recommendation: 'Enhance user profiling algorithm. Improve content categorization and matching logic.',
      affectedCount: patterns['content_personalization_personalization']
    })
  }
  
  return recommendations
}

async function saveSimulationResult(sessionId, result) {
  // In a real implementation, you would save to database
  console.log(`💾 Saving simulation result for session ${sessionId}:`, {
    personaId: result.personaId,
    success: result.success,
    stepsCompleted: result.steps?.length || 0,
    validationsPassed: result.validations?.filter(v => v.allPassed).length || 0
  })
}

async function updateSimulationSession(sessionId, updates) {
  // In a real implementation, you would update the database record
  console.log(`📝 Updating simulation session ${sessionId}:`, {
    status: updates.status,
    totalResults: updates.results?.length || 0,
    discrepanciesFound: updates.discrepancyReport?.summary?.totalDiscrepancies || 0
  })
}

async function generateSimulationPersonas(workflowType, count) {
  // Fallback if no existing personas - generate simple ones
  const personas = []
  for (let i = 0; i < count; i++) {
    personas.push({
      id: `generated_${i}`,
      name: `Test User ${i + 1}`,
      location: {
        country: ['US', 'CA', 'GB', 'DE', 'FR'][Math.floor(Math.random() * 5)],
        state: 'CA',
        city: 'San Francisco'
      },
      preferences: {
        devicePreference: Math.random() > 0.5 ? 'mobile' : 'desktop'
      },
      businessContext: {
        industry: ['Technology', 'Healthcare', 'Finance'][Math.floor(Math.random() * 3)],
        budget: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)]
      }
    })
  }
  return personas
}

