import { getLocationInfo } from './zip_utils.js';

// Cache for storing previously fetched results
const sessionCache = new Map();

// Format insurance options for the ChatGPT prompt
function formatInsuranceOptions(options) {
  if (!options || !Array.isArray(options)) {
    return 'No insurance options available for this location.';
  }

  return options
    .map(option => `- ${option}`)
    .join('\n');
}

// Handle ZIP code validation and insurance lookup
async function handleZipCodeInput(zipCode) {
  // Remove any spaces or special characters
  zipCode = zipCode.replace(/[^0-9]/g, '');

  // Check if we have cached results
  if (sessionCache.has(zipCode)) {
    return sessionCache.get(zipCode);
  }

  try {
    const locationInfo = await getLocationInfo(zipCode);

    if (locationInfo.error) {
      displayError(locationInfo.error);
      return null;
    }

    // Format the result
    const result = {
      zip: zipCode,
      state: locationInfo.state,
      insuranceOptions: locationInfo.insuranceOptions,
      formattedOptions: formatInsuranceOptions(locationInfo.insuranceOptions)
    };

    // Cache the result for this session
    sessionCache.set(zipCode, result);

    // Update the UI
    displayLocationInfo(result);
    return result;
  } catch (error) {
    console.error('Error processing ZIP code:', error);
    displayError('An error occurred while processing your request. Please try again.');
    return null;
  }
}

// Display error message to the user
function displayError(message) {
  const errorElement = document.getElementById('location-error');
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
  }
}

// Display location information in the UI
function displayLocationInfo(info) {
  const errorElement = document.getElementById('location-error');
  if (errorElement) {
    errorElement.style.display = 'none';
  }

  const stateElement = document.getElementById('state-display');
  if (stateElement) {
    stateElement.textContent = `State: ${info.state}`;
  }

  const optionsElement = document.getElementById('insurance-options');
  if (optionsElement) {
    optionsElement.innerHTML = info.formattedOptions.replace(/\n/g, '<br>');
  }

  // Update hidden form fields if they exist
  const stateInput = document.getElementById('state-input');
  if (stateInput) {
    stateInput.value = info.state;
  }

  const insuranceInput = document.getElementById('insurance-input');
  if (insuranceInput) {
    insuranceInput.value = JSON.stringify(info.insuranceOptions);
  }
}

// Initialize the healthcare assessment functionality
function initHealthcareAssessment() {
  const zipInput = document.getElementById('zip-input');
  if (!zipInput) return;

  // Add input event listener with debouncing
  let debounceTimer;
  zipInput.addEventListener('input', (event) => {
    clearTimeout(debounceTimer);
    const zipCode = event.target.value;
    
    // Only process if we have 5 digits
    if (zipCode.length === 5) {
      debounceTimer = setTimeout(() => {
        handleZipCodeInput(zipCode);
      }, 500);
    }
  });
}

// Export functions for use in other modules
export {
  handleZipCodeInput,
  initHealthcareAssessment,
  formatInsuranceOptions
}; 