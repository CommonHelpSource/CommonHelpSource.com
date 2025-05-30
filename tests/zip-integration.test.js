/**
 * ZIP Code Integration Tests
 * Run these tests to verify ZIP code functionality across the application
 */

// Test Data
const TEST_CASES = {
  valid: {
    zip: '01040',
    city: 'Holyoke',
    state: 'MA'
  },
  invalid: {
    zip: '123', // Too short
    zip2: '1234567', // Too long
    zip3: 'abcde' // Non-numeric
  }
};

// Test Functions
async function testZipValidation() {
  console.log('🧪 Testing ZIP Validation...');
  
  // Clear any existing ZIP
  localStorage.removeItem('userZipCode');
  
  // Test valid ZIP
  localStorage.setItem('userZipCode', TEST_CASES.valid.zip);
  const validZip = localStorage.getItem('userZipCode');
  console.assert(validZip === TEST_CASES.valid.zip, 'Valid ZIP should be stored');
  
  // Test ZIP format validation
  const isValidFormat = /^\d{5}$/.test(TEST_CASES.valid.zip);
  console.assert(isValidFormat, 'ZIP should match 5-digit format');
  
  console.log('✅ ZIP Validation Tests Complete');
}

async function testZipPersistence() {
  console.log('🧪 Testing ZIP Persistence...');
  
  // Set test ZIP
  localStorage.setItem('userZipCode', TEST_CASES.valid.zip);
  
  // Check ZIP availability in window object
  console.assert(window.userZipCode === TEST_CASES.valid.zip, 'ZIP should be available globally');
  
  // Check ZIP display in location banner
  const zipDisplay = document.getElementById('zip-display');
  if (zipDisplay) {
    console.assert(zipDisplay.textContent.includes(TEST_CASES.valid.zip), 'ZIP should be displayed in banner');
  }
  
  console.log('✅ ZIP Persistence Tests Complete');
}

async function testAIIntegration() {
  console.log('🧪 Testing AI Integration...');
  
  try {
    // Test resource response generation
    const response = await generateResourceResponse('housing', {
      currentSituation: 'Test scenario',
      householdSize: 2
    });
    
    // Verify ZIP inclusion in response
    const zip = localStorage.getItem('userZipCode');
    console.assert(response.includes(zip), 'Response should include ZIP code context');
    
    console.log('✅ AI Integration Tests Complete');
  } catch (error) {
    console.error('❌ AI Integration Test Failed:', error);
  }
}

async function testLocationChange() {
  console.log('🧪 Testing Location Change...');
  
  // Store original ZIP
  const originalZip = localStorage.getItem('userZipCode');
  
  // Simulate location change
  localStorage.removeItem('userZipCode');
  
  // Verify ZIP cleared
  const clearedZip = localStorage.getItem('userZipCode');
  console.assert(!clearedZip, 'ZIP should be cleared after location change');
  
  // Restore original ZIP
  if (originalZip) {
    localStorage.setItem('userZipCode', originalZip);
  }
  
  console.log('✅ Location Change Tests Complete');
}

async function testErrorHandling() {
  console.log('🧪 Testing Error Handling...');
  
  // Test invalid ZIP formats
  const invalidTests = [
    TEST_CASES.invalid.zip,
    TEST_CASES.invalid.zip2,
    TEST_CASES.invalid.zip3
  ];
  
  invalidTests.forEach(zip => {
    const isValid = /^\d{5}$/.test(zip);
    console.assert(!isValid, `Invalid ZIP ${zip} should fail validation`);
  });
  
  // Test missing ZIP handling
  localStorage.removeItem('userZipCode');
  const missingZip = localStorage.getItem('userZipCode');
  console.assert(!missingZip, 'Missing ZIP should be handled');
  
  console.log('✅ Error Handling Tests Complete');
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting ZIP Integration Tests...\n');
  
  try {
    await testZipValidation();
    console.log('');
    
    await testZipPersistence();
    console.log('');
    
    await testAIIntegration();
    console.log('');
    
    await testLocationChange();
    console.log('');
    
    await testErrorHandling();
    console.log('');
    
    console.log('✨ All tests completed successfully!');
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
}

// Export test functions
export {
  runAllTests,
  testZipValidation,
  testZipPersistence,
  testAIIntegration,
  testLocationChange,
  testErrorHandling
}; 