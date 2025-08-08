// Test script to verify persistence after logout/login
export async function testPersistence() {
  console.log('🔍 Testing Sub-Initiative #3 Persistence...')
  
  // Step 1: Check current data
  console.log('📊 Step 1: Checking current data...')
  const initialResponse = await fetch('/api/admin/qa/ai-test-generator/test-data')
  const initialData = await initialResponse.json()
  console.log('Initial data:', initialData.debug)
  
  // Step 2: Generate test data if none exists
  if (initialData.debug.aiGenerated === 0) {
    console.log('📋 Step 2: No data found, generating test cases...')
    const testData = {
      feature: "User Authentication System",
      requirements: "Test persistence requirements",
      userStories: ["As a user, I want persistence after logout/login"],
      priority: "high",
      riskLevel: "high"
    }
    
    const response = await fetch('/api/admin/qa/ingest-requirements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    })
    
    const result = await response.json()
    console.log(`✅ Generated ${result.generated} test cases`)
  }
  
  // Step 3: Simulate logout (clear localStorage)
  console.log('🚪 Step 3: Simulating logout...')
  localStorage.removeItem('adminData')
  
  // Step 4: Simulate login (restore admin data)
  console.log('🔑 Step 4: Simulating login...')
  localStorage.setItem('adminData', JSON.stringify({
    id: 'admin123',
    email: 'admin@test.com',
    name: 'Test Admin'
  }))
  
  // Step 5: Check if data persists
  console.log('📊 Step 5: Checking data persistence...')
  const statsResponse = await fetch('/api/admin/qa/ai-test-generator/stats')
  const statsData = await statsResponse.json()
  
  const debugResponse = await fetch('/api/admin/qa/ai-test-generator/test-data')
  const debugData = await debugResponse.json()
  
  if (statsData.success && statsData.stats.totalTestCases > 0) {
    console.log('✅ PERSISTENCE TEST PASSED!')
    console.log(`📈 Stats after logout/login:`)
    console.log(`   - Total Test Cases: ${statsData.stats.totalTestCases}`)
    console.log(`   - Avg Risk Score: ${statsData.stats.avgRiskScore}`)
    console.log(`   - Last Generated: ${statsData.stats.lastGenerated}`)
    console.log(`📊 Debug info:`)
    console.log(`   - Total in DB: ${debugData.debug.totalInDb}`)
    console.log(`   - AI Generated: ${debugData.debug.aiGenerated}`)
    return true
  } else {
    console.log('❌ PERSISTENCE TEST FAILED!')
    console.log('Stats data:', statsData)
    console.log('Debug data:', debugData)
    return false
  }
}

// Auto-run test in browser console
if (typeof window !== 'undefined') {
  window.testPersistence = testPersistence
  console.log('🧪 Persistence test loaded. Run: testPersistence()')
}
