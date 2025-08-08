import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request) {
  try {
    const { simulationResults, validationRules } = await request.json()
    
    const discrepancyReport = await analyzeDiscrepancies(simulationResults, validationRules)
    
    return NextResponse.json({
      success: true,
      discrepancyReport
    })
    
  } catch (error) {
    console.error('Discrepancy analysis error:', error)
    return NextResponse.json(
      { error: 'Analysis failed', details: error.message },
      { status: 500 }
    )
  }
}

async function analyzeDiscrepancies(simulationResults, validationRules) {
  const discrepancies = []
  const patterns = []
  
  // Collect all validation failures
  for (const result of simulationResults) {
    for (const validation of result.validations || []) {
      if (!validation.passed) {
        discrepancies.push({
          personaId: result.personaId,
          persona: result.persona,
          validationType: validation.type,
          expected: validation.expected,
          actual: validation.actual,
          severity: determineSeverity(validation, validationRules),
          impact: assessImpact(validation, result.persona),
          details: validation.details
        })
      }
    }
  }
  
  // Use AI to identify patterns in discrepancies
  if (discrepancies.length > 0) {
    const patternAnalysis = await analyzeDiscrepancyPatterns(discrepancies)
    patterns.push(...patternAnalysis.patterns)
  }
  
  // Generate recommendations
  const recommendations = await generateRecommendations(discrepancies, patterns)
  
  return {
    discrepancies,
    patterns,
    recommendations,
    summary: {
      totalDiscrepancies: discrepancies.length,
      criticalIssues: discrepancies.filter(d => d.severity === 'critical').length,
      highIssues: discrepancies.filter(d => d.severity === 'high').length,
      mediumIssues: discrepancies.filter(d => d.severity === 'medium').length,
      lowIssues: discrepancies.filter(d => d.severity === 'low').length,
      affectedPersonas: [...new Set(discrepancies.map(d => d.personaId))].length,
      mostCommonIssues: getMostCommonIssues(discrepancies)
    }
  }
}

async function analyzeDiscrepancyPatterns(discrepancies) {
  const prompt = `Analyze these workflow simulation discrepancies and identify patterns:

${JSON.stringify(discrepancies, null, 2)}

Identify:
1. Common failure patterns across personas
2. Geo-location related issues
3. Personalization logic failures
4. Conditional logic problems
5. Edge cases that consistently fail

For each pattern, provide:
- Pattern description
- Affected persona characteristics
- Root cause hypothesis
- Business impact assessment

Return JSON with patterns array.`

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are a workflow analysis expert. Identify patterns in simulation failures and provide actionable insights."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.3,
    max_tokens: 2000
  })

  let response = completion.choices[0].message.content.trim()
  response = response.replace(/```json\s*/g, '').replace(/```\s*/g, '')
  
  return JSON.parse(response)
}

function determineSeverity(validation, validationRules) {
  const rule = validationRules.find(r => r.type === validation.type)
  if (rule?.severity) return rule.severity
  
  // Default severity logic
  if (validation.type.includes('security') || validation.type.includes('payment')) return 'critical'
  if (validation.type.includes('geo') || validation.type.includes('access')) return 'high'
  if (validation.type.includes('personalization')) return 'medium'
  return 'low'
}

function assessImpact(validation, persona) {
  // Assess business impact based on validation type and persona
  const impacts = []
  
  if (validation.type === 'geo_access' && !validation.passed) {
    impacts.push('User access denied inappropriately')
  }
  
  if (validation.type === 'personalized_recommendations' && !validation.passed) {
    impacts.push('Poor user experience, reduced engagement')
  }
  
  if (validation.type === 'conditional_logic' && !validation.passed) {
    impacts.push('Workflow logic failure, potential data corruption')
  }
  
  return impacts
}