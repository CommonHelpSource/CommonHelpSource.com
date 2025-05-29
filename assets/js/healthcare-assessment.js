import { getLocationInfo } from './zip_utils.js';

// Cache for storing previously fetched results
const sessionCache = new Map();

// Format insurance options for the ChatGPT prompt
function formatInsuranceOptions(options) {
  console.log('Formatting insurance options:', options);
  if (!options || !Array.isArray(options)) {
    console.warn('No valid insurance options provided');
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
  console.log("Processing ZIP code:", zipCode);

  // Check if we have cached results
  if (sessionCache.has(zipCode)) {
    console.log("Using cached results for ZIP:", zipCode);
    return sessionCache.get(zipCode);
  }

  try {
    console.log("Fetching location info for ZIP:", zipCode);
    const locationInfo = await getLocationInfo(zipCode);
    console.log("Location info received:", locationInfo);

    if (locationInfo.error) {
      console.error("Location error:", locationInfo.error);
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

    console.log("Processed location result:", result);

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
  console.log('Displaying error:', message);
  const errorElement = document.getElementById('location-error');
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
  } else {
    console.warn('Error element not found in DOM');
  }
}

// Display location information in the UI
function displayLocationInfo(info) {
  console.log('Updating UI with location info:', info);
  
  const errorElement = document.getElementById('location-error');
  if (errorElement) {
    errorElement.style.display = 'none';
  }

  const stateElement = document.getElementById('state-display');
  if (stateElement) {
    stateElement.textContent = `State: ${info.state}`;
  } else {
    console.warn('State display element not found');
  }

  const optionsElement = document.getElementById('insurance-options');
  if (optionsElement) {
    optionsElement.innerHTML = info.formattedOptions.replace(/\n/g, '<br>');
  } else {
    console.warn('Insurance options element not found');
  }

  // Update hidden form fields if they exist
  const stateInput = document.getElementById('state-input');
  if (stateInput) {
    stateInput.value = info.state;
  } else {
    console.warn('State input element not found');
  }

  const insuranceInput = document.getElementById('insurance-input');
  if (insuranceInput) {
    insuranceInput.value = JSON.stringify(info.insuranceOptions);
  } else {
    console.warn('Insurance input element not found');
  }
}

// Initialize the healthcare assessment functionality
function initHealthcareAssessment() {
  console.log('Initializing healthcare assessment...');
  
  const zipInput = document.getElementById('zip-input');
  const form = document.getElementById('healthcare-form');
  if (!zipInput || !form) {
    console.error('Required elements not found:', {
      zipInput: !!zipInput,
      form: !!form
    });
    return;
  }

  // Add input event listener with debouncing
  let debounceTimer;
  zipInput.addEventListener('input', (event) => {
    clearTimeout(debounceTimer);
    const zipCode = event.target.value;
    console.log('ZIP input changed:', zipCode);
    
    // Only process if we have 5 digits
    if (zipCode.length === 5) {
      console.log('Valid ZIP length, processing...');
      debounceTimer = setTimeout(() => {
        handleZipCodeInput(zipCode);
      }, 500);
    }
  });

  // Handle form submission
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    console.log("Form submitted, generating chatbot prompt...");

    const formData = new FormData(form);
    console.log("Form data collected:", Object.fromEntries(formData));

    const locationInfo = JSON.parse(localStorage.getItem('locationInfo'));
    console.log("Retrieved location info from storage:", locationInfo);
    
    if (!locationInfo) {
      console.error('No location info found in storage');
      return;
    }

    // Show loading indicator
    const loadingIndicator = document.getElementById('loading-indicator');
    const resultsContainer = document.getElementById('results-container');
    if (loadingIndicator && resultsContainer) {
      console.log('Showing loading indicators');
      resultsContainer.style.display = 'block';
      loadingIndicator.style.display = 'block';
    } else {
      console.warn('Loading indicator elements not found:', {
        loadingIndicator: !!loadingIndicator,
        resultsContainer: !!resultsContainer
      });
    }

    // Prepare the messages for the chatbot
    const messages = [
      {
        role: 'user',
        content: `I need help with healthcare access in ZIP code ${locationInfo.zip}. Here's my situation:
        - Current insurance status: ${formData.get('has_insurance')}
        - Have primary care provider: ${formData.get('has_pcp')}
        - Urgent health needs: ${formData.get('has_urgent_needs')}
        - Mental health/substance use support needed: ${formData.get('needs_mental_health')}
        - Need insurance help: ${formData.get('needs_insurance_help')}
        - Current insurance type: ${formData.get('current_insurance')}
        
        Available insurance options in my area:
        ${locationInfo.formattedOptions}
        
        Please provide a step-by-step plan to help me access healthcare and insurance resources.`
      }
    ];

    console.log('Prepared chatbot messages:', messages);

    try {
      console.log('Sending request to chatbot API...');
      const response = await fetch('/.netlify/functions/chatgpt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          zip: locationInfo.zip,
          language: 'en'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to get response from chatbot: ${response.status} ${response.statusText}`);
      }

      console.log('Received response from chatbot API');
      const data = await response.json();
      console.log('Parsed chatbot response:', data);
      
      // Hide loading indicator and display response
      if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
      }

      const chatResponse = document.getElementById('chat-response');
      if (chatResponse && data.content) {
        console.log('Displaying chatbot response');
        try {
          const plan = JSON.parse(data.content);
          console.log('Parsed healthcare plan:', plan);
          chatResponse.innerHTML = `
            <h3>${plan.title}</h3>
            <p>${plan.introduction}</p>
            <div class="steps">
              ${plan.steps.map(step => `
                <div class="step" style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 8px;">
                  <h4>Step ${step.stepNumber}: ${step.action}</h4>
                  <p><strong>${step.organization}</strong></p>
                  <p>${step.description}</p>
                  <p><strong>Address:</strong> ${step.address}</p>
                  <p><strong>Phone:</strong> ${step.phone}</p>
                  <p><strong>Hours:</strong> ${step.hours}</p>
                  <p><strong>Requirements:</strong> ${step.requirements}</p>
                  <p><strong>Priority:</strong> ${step.priority}</p>
                </div>
              `).join('')}
            </div>
            <div class="final-step" style="margin-top: 20px;">
              <h4>${plan.finalStep.title}</h4>
              <p>${plan.finalStep.action}</p>
            </div>
          `;
        } catch (e) {
          console.error('Error parsing plan JSON:', e);
          chatResponse.innerHTML = data.content;
        }
      } else {
        console.warn('Chat response element not found or no content received:', {
          chatResponseExists: !!chatResponse,
          hasContent: !!data.content
        });
      }
    } catch (error) {
      console.error('Error getting chatbot response:', error);
      const chatResponse = document.getElementById('chat-response');
      if (chatResponse) {
        chatResponse.innerHTML = 'Sorry, there was an error generating your healthcare plan. Please try again.';
      }
      if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
      }
    }
  });

  console.log('Healthcare assessment initialization complete');
}

// Export functions for use in other modules
export {
  handleZipCodeInput,
  initHealthcareAssessment,
  formatInsuranceOptions
}; 