import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { prisma } from '../../../../../lib/prisma'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

function fixCommonJsonIssues(jsonString) {
  try {
    // First, try to extract just the JSON array part
    let fixed = jsonString.trim()
    
    // Remove markdown code blocks if present
    fixed = fixed.replace(/```json\s*/g, '').replace(/```\s*/g, '')
    
    // Find the actual JSON array
    const arrayStart = fixed.indexOf('[')
    const arrayEnd = fixed.lastIndexOf(']')
    
    if (arrayStart === -1 || arrayEnd === -1) {
      console.log('No valid array found in response')
      return '[]'
    }
    
    fixed = fixed.substring(arrayStart, arrayEnd + 1)
    
    // Basic cleanup
    fixed = fixed
      // Remove control characters
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
      // Fix common quote issues
      .replace(/'/g, '"')
      // Fix trailing commas
      .replace(/,(\s*[}\]])/g, '$1')
      // Fix missing commas between objects
      .replace(/}(\s*)"/g, '},"')
      .replace(/}(\s*){/g, '},{')
    
    // Try parsing first
    try {
      const result = JSON.parse(fixed)
      if (Array.isArray(result) && result.length > 0) {
        return fixed
      }
    } catch (e) {
      console.log('Basic fix failed, trying advanced parsing...')
    }
    
    // Advanced parsing - extract valid objects one by one
    return extractValidObjects(fixed)
    
  } catch (error) {
    console.error('JSON fix error:', error)
    return '[]'
  }
}

function extractValidObjects(jsonString) {
  try {
    const objects = []
    let current = ''
    let braceCount = 0
    let inString = false
    let escapeNext = false
    
    // Skip the opening bracket
    for (let i = 1; i < jsonString.length - 1; i++) {
      const char = jsonString[i]
      
      if (escapeNext) {
        current += char
        escapeNext = false
        continue
      }
      
      if (char === '\\') {
        escapeNext = true
        current += char
        continue
      }
      
      if (char === '"' && !escapeNext) {
        inString = !inString
      }
      
      if (!inString) {
        if (char === '{') {
          braceCount++
        } else if (char === '}') {
          braceCount--
        }
      }
      
      current += char
      
      // When we complete an object
      if (braceCount === 0 && current.trim() && !inString) {
        try {
          // Clean up the object
          let cleanObject = current.trim()
          if (cleanObject.endsWith(',')) {
            cleanObject = cleanObject.slice(0, -1)
          }
          
          // Try to parse this individual object
          const parsed = JSON.parse(cleanObject)
          if (parsed && typeof parsed === 'object') {
            objects.push(cleanObject)
          }
        } catch (e) {
          console.log('Skipping invalid object')
        }
        current = ''
      }
    }
    
    const result = '[' + objects.join(',') + ']'
    
    // Final validation
    try {
      const parsed = JSON.parse(result)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return result
      }
    } catch (e) {
      console.log('Final validation failed')
    }
    
    return '[]'
    
  } catch (error) {
    console.error('Extract valid objects error:', error)
    return '[]'
  }
}

// Remove the entire generateFallbackPersonas function - we want 100% OpenAI creativity

// Add a global variable to track stop state
let shouldStopGeneration = false

export async function POST(request) {
  try {
    const { batchSize = 25, totalPersonas = 500, shouldStop = false } = await request.json()
    
    if (shouldStop) {
      shouldStopGeneration = true
      return NextResponse.json({
        success: true,
        generated: 0,
        message: 'Generation stopped by user'
      })
    }
    
    // Reset stop flag when starting new generation
    shouldStopGeneration = false
    
    const batches = Math.ceil(totalPersonas / batchSize)
    let generatedPersonas = []
    
    for (let batch = 0; batch < batches; batch++) {
      // Check if stop was requested
      if (shouldStopGeneration) {
        console.log('Generation stopped by user request')
        break
      }
      
      console.log(`Generating batch ${batch + 1}/${batches}`)
      
      const batchPersonas = await generatePersonaBatch(batchSize, batch)
      generatedPersonas = [...generatedPersonas, ...batchPersonas]
      
      // Save batch to database
      await savePersonasBatch(batchPersonas)
      
      // Check again after saving
      if (shouldStopGeneration) {
        console.log('Generation stopped after saving batch')
        break
      }
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    
    return NextResponse.json({
      success: true,
      generated: generatedPersonas.length,
      message: shouldStopGeneration ? 
        `Generation stopped. Generated ${generatedPersonas.length} personas` :
        `Successfully generated ${generatedPersonas.length} unique personas`
    })
    
  } catch (error) {
    console.error('Persona generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate personas', details: error.message },
      { status: 500 }
    )
  }
}

async function generatePersonaBatch(batchSize, batchNumber) {
  const prompt = `Create exactly ${batchSize} unique customer personas for outdoor advertising. Each persona must be completely different.

CRITICAL REQUIREMENTS:
- Return ONLY a valid JSON array
- Each persona must have different field names and structures
- Every field must contain meaningful, detailed content
- No empty values, no null values, no undefined values
- Make each persona feel like a real person
- Use creative field names that make sense for that persona type

CREATIVE FREEDOM:
- Design whatever structure makes most sense for each persona
- Some could be business-focused, others lifestyle-focused
- Include demographics, behaviors, motivations, challenges, goals
- Think about their relationship with outdoor advertising
- Consider their decision-making process and influences

EXAMPLE VARIETY (don't copy these structures):
- A tech startup founder might have: company_stage, funding_status, growth_challenges
- A restaurant owner might have: cuisine_type, customer_demographics, seasonal_patterns
- A fitness enthusiast might have: workout_preferences, health_goals, lifestyle_habits

OUTPUT: Return ONLY the JSON array. No explanations, no markdown, no extra text.`

  let retries = 3
  while (retries > 0) {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a creative market researcher. Create unique persona structures with meaningful field names. Every field must have detailed content. Return ONLY valid JSON arrays with no formatting."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 4000
      })

      let response = completion.choices[0].message.content.trim()
      console.log('Raw OpenAI response length:', response.length)
      
      // Fix JSON issues
      response = fixCommonJsonIssues(response)
      
      if (response === '[]') {
        throw new Error('No valid personas extracted from response')
      }
      
      const personas = JSON.parse(response)
      
      if (!Array.isArray(personas) || personas.length === 0) {
        throw new Error('Invalid or empty response')
      }
      
      console.log(`Successfully parsed ${personas.length} personas`)
      
      // Add only required metadata
      return personas.map((persona, index) => ({
        ...persona,
        id: `persona_${Date.now()}_${batchNumber}_${index}`,
        generatedAt: new Date(),
        status: 'active',
        batchNumber: batchNumber + 1
      }))
      
    } catch (error) {
      console.error(`OpenAI API error (attempt ${4 - retries}):`, error)
      retries--
      
      if (retries === 0) {
        // If all retries failed, try with simplified approach
        return await generateSimplifiedBatch(batchSize, batchNumber)
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }
}

async function generateSimplifiedBatch(batchSize, batchNumber) {
  const prompt = `Create ${batchSize} diverse and innovative customer personas for outdoor advertising.

TOTAL CREATIVE CONTROL: Design whatever persona structure makes the most sense to you. There are no rules or templates to follow.

MISSION: Help outdoor advertising professionals understand their potential customers through genuinely insightful and unique personas.

CREATIVE GUIDELINES:
- Each persona should feel like a real, complex human being
- Think beyond basic demographics - what really drives these people?
- Consider their relationship with outdoor spaces, commuting patterns, visual attention
- What are their business challenges, personal motivations, lifestyle choices?
- How do they make purchasing decisions? What influences them?
- What are their media consumption habits, technology comfort levels?
- Include whatever details YOU think would be most valuable
- CRITICAL: Fill every field with rich, meaningful content - no empty values allowed
- Make every persona complete and detailed

INNOVATION ENCOURAGED:
- Experiment with different data structures for different personas
- Some might be business-focused, others lifestyle-focused
- Mix traditional demographics with modern behavioral insights
- Consider seasonal patterns, location preferences, social influences
- Think about emotional triggers, aspirations, fears, and goals

MANDATORY: Every field must contain meaningful, detailed information. No empty strings, no null values.

Return ONLY a valid JSON array. No explanations, no markdown. Let your expertise and creativity guide the structure and content.`

  let retries = 3
  while (retries > 0) {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a visionary market research expert with unlimited creative freedom to design customer personas. Your goal is to create the most insightful, innovative, and useful persona structures possible for outdoor advertising professionals. Each persona should be a masterpiece of customer understanding with every field filled with meaningful content. Return only valid JSON arrays."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.85,
        max_tokens: 3500
      })

      let response = completion.choices[0].message.content.trim()
      
      // Clean response aggressively
      response = response.replace(/```json\s*/g, '')
      response = response.replace(/```\s*/g, '')
      response = response.replace(/^```/g, '')
      response = response.replace(/```$/g, '')
      
      // Extract JSON array
      const jsonStart = response.indexOf('[')
      const jsonEnd = response.lastIndexOf(']')
      
      if (jsonStart !== -1 && jsonEnd !== -1) {
        response = response.substring(jsonStart, jsonEnd + 1)
      }
      
      // Fix common JSON issues
      response = fixCommonJsonIssues(response)
      
      const personas = JSON.parse(response)
      
      if (!Array.isArray(personas) || personas.length === 0) {
        throw new Error('Invalid or empty response')
      }
      
      return personas.map((persona, index) => ({
        ...persona,
        id: `persona_${Date.now()}_${batchNumber}_${index}`,
        generatedAt: new Date(),
        status: 'active',
        batchNumber: batchNumber + 1
      }))
      
    } catch (error) {
      console.error(`Simplified generation failed (attempt ${4 - retries}):`, error)
      retries--
      
      if (retries === 0) {
        throw new Error('Failed to generate personas after all retries')
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
}

async function savePersonasBatch(personas) {
  if (personas.length === 0) return
  
  try {
    const personaRecords = personas.map(persona => {
      // Get all possible field names from the persona object
      const allFields = Object.keys(persona)
      console.log('Available fields:', allFields)
      console.log('Persona data:', persona)
      
      // More aggressive field extraction
      let extractedName = null
      let extractedTitle = null
      let extractedCompany = null
      let extractedSegment = null
      let extractedChallenges = []
      let extractedOpportunities = []
      let extractedTraits = []
      
      // Extract name from various possible fields
      for (const field of allFields) {
        const value = persona[field]
        const fieldLower = field.toLowerCase()
        
        if (!extractedName && typeof value === 'string' && value.length > 0) {
          if (fieldLower.includes('name') || fieldLower.includes('person') || fieldLower.includes('individual')) {
            extractedName = value
          }
        }
        
        if (!extractedTitle && typeof value === 'string' && value.length > 0) {
          if (fieldLower.includes('title') || fieldLower.includes('role') || fieldLower.includes('position') || 
              fieldLower.includes('job') || fieldLower.includes('occupation') || fieldLower.includes('profession')) {
            extractedTitle = value
          }
        }
        
        if (!extractedCompany && typeof value === 'string' && value.length > 0) {
          if (fieldLower.includes('company') || fieldLower.includes('business') || fieldLower.includes('organization') || 
              fieldLower.includes('firm') || fieldLower.includes('employer')) {
            extractedCompany = value
          }
        }
        
        if (!extractedSegment && typeof value === 'string' && value.length > 0) {
          if (fieldLower.includes('segment') || fieldLower.includes('industry') || fieldLower.includes('sector') || 
              fieldLower.includes('category') || fieldLower.includes('type') || fieldLower.includes('field')) {
            extractedSegment = value
          }
        }
        
        // Extract arrays
        if (Array.isArray(value) && value.length > 0) {
          if (fieldLower.includes('challenge') || fieldLower.includes('problem') || fieldLower.includes('pain') || fieldLower.includes('issue')) {
            extractedChallenges = value
          } else if (fieldLower.includes('opportunit') || fieldLower.includes('goal') || fieldLower.includes('objective') || fieldLower.includes('aspiration')) {
            extractedOpportunities = value
          } else if (fieldLower.includes('trait') || fieldLower.includes('characteristic') || fieldLower.includes('feature') || fieldLower.includes('attribute')) {
            extractedTraits = value
          }
        }
      }
      
      // If still no name found, look in nested objects
      if (!extractedName) {
        for (const field of allFields) {
          if (typeof persona[field] === 'object' && persona[field] !== null && !Array.isArray(persona[field])) {
            const nestedFields = Object.keys(persona[field])
            for (const nestedField of nestedFields) {
              const nestedValue = persona[field][nestedField]
              if (typeof nestedValue === 'string' && nestedValue.length > 0 && nestedField.toLowerCase().includes('name')) {
                extractedName = nestedValue
                break
              }
            }
            if (extractedName) break
          }
        }
      }
      
      // Generate meaningful fallbacks
      const fallbackName = `${['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn'][Math.floor(Math.random() * 8)]} ${['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'][Math.floor(Math.random() * 8)]}`
      const fallbackTitle = ['Marketing Director', 'Business Owner', 'Operations Manager', 'Sales Executive', 'Brand Manager', 'Creative Director'][Math.floor(Math.random() * 6)]
      const fallbackCompany = ['Local Business', 'Growing Enterprise', 'Established Company', 'Startup Venture', 'Family Business'][Math.floor(Math.random() * 5)]
      const fallbackSegment = ['Retail', 'Healthcare', 'Technology', 'Food & Beverage', 'Professional Services', 'Entertainment'][Math.floor(Math.random() * 6)]
      
      // Generate fallback arrays if empty
      if (extractedChallenges.length === 0) {
        extractedChallenges = [
          'Limited marketing budget',
          'Reaching target audience effectively',
          'Measuring advertising ROI'
        ]
      }
      
      if (extractedOpportunities.length === 0) {
        extractedOpportunities = [
          'Expand brand awareness',
          'Increase customer engagement',
          'Drive more foot traffic'
        ]
      }
      
      if (extractedTraits.length === 0) {
        extractedTraits = [
          'Data-driven decision maker',
          'Values authentic messaging',
          'Focuses on customer experience'
        ]
      }
      
      return {
        personaId: persona.id,
        name: extractedName || fallbackName,
        title: extractedTitle || fallbackTitle,
        company: extractedCompany || fallbackCompany,
        segment: extractedSegment || fallbackSegment,
        demographics: persona.demographics || persona.demo || persona.personal || {
          age: `${25 + Math.floor(Math.random() * 20)}-${35 + Math.floor(Math.random() * 20)}`,
          location: 'Urban area',
          income: '$50,000-$100,000'
        },
        business: persona.business || persona.work || persona.professional || {
          size: '10-50 employees',
          revenue: '$1M-$5M annually',
          stage: 'Growth phase'
        },
        advertising: persona.advertising || persona.marketing || persona.ads || {
          budget: '$5,000-$15,000 monthly',
          channels: ['Digital', 'Outdoor', 'Social Media'],
          goals: 'Brand awareness and lead generation'
        },
        behavior: persona.behavior || persona.habits || persona.preferences || {
          mediaConsumption: 'Digital-first with outdoor exposure',
          decisionMaking: 'Research-based with peer input',
          shoppingHabits: 'Online research, offline purchase'
        },
        psychographics: persona.psychographics || persona.psychology || {
          values: ['Quality', 'Authenticity', 'Innovation'],
          lifestyle: 'Busy professional seeking efficiency',
          motivations: 'Success and recognition'
        },
        digitalBehavior: persona.digitalBehavior || persona.digital || {
          platforms: ['LinkedIn', 'Instagram', 'Google'],
          deviceUsage: 'Mobile-first, desktop for work',
          onlineTime: '3-4 hours daily'
        },
        challenges: extractedChallenges,
        opportunities: extractedOpportunities,
        uniqueTraits: extractedTraits,
        status: 'active',
        generatedAt: persona.generatedAt,
        batchNumber: persona.batchNumber
      }
    })

    for (const record of personaRecords) {
      try {
        await prisma.syntheticPersona.create({
          data: record
        })
      } catch (error) {
        if (error.code === 'P2002') {
          console.log(`Skipping duplicate persona: ${record.personaId}`)
          continue
        }
        throw error
      }
    }
    
    console.log(`Saved ${personaRecords.length} personas to database`)
    
  } catch (error) {
    console.error('Database save error:', error)
    throw error
  }
}



