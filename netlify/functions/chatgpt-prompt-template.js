/**
 * Generates a structured prompt for the ChatGPT API based on assessment responses
 * @param {Object} locationInfo - Contains ZIP code and location details
 * @param {Object} responses - The user's assessment responses
 * @returns {string} Formatted prompt for ChatGPT
 */
function generatePrompt(locationInfo, responses) {
  // Start with the case manager role definition
  let prompt = `You are a case management assistant helping someone connect with support services in ${locationInfo.city}, ${locationInfo.state} (ZIP code: ${locationInfo.zip}).

This person completed a full Social Determinants of Health (SDOH) assessment. Here are the areas they identified needing support in, along with their answers:

`;

  // Add each assessment section where help was requested
  if (responses.housingResponses && responses.housingResponses.needsHelp === 'yes') {
    prompt += `[SECTION: Housing Assistance]\n`;
    prompt += formatResponses(responses.housingResponses);
    prompt += '\n\n';
  }

  if (responses.foodResponses && responses.foodResponses.needsHelp === 'yes') {
    prompt += `[SECTION: Food Support]\n`;
    prompt += formatResponses(responses.foodResponses);
    prompt += '\n\n';
  }

  if (responses.healthResponses && responses.healthResponses.needsHelp === 'yes') {
    prompt += `[SECTION: Healthcare Access]\n`;
    prompt += formatResponses(responses.healthResponses);
    prompt += '\n\n';
  }

  if (responses.idResponses && responses.idResponses.needsHelp === 'yes') {
    prompt += `[SECTION: ID & Documentation]\n`;
    prompt += formatResponses(responses.idResponses);
    prompt += '\n\n';
  }

  if (responses.utilityResponses && responses.utilityResponses.needsHelp === 'yes') {
    prompt += `[SECTION: Utility Assistance]\n`;
    prompt += formatResponses(responses.utilityResponses);
    prompt += '\n\n';
  }

  if (responses.internetResponses && responses.internetResponses.needsHelp === 'yes') {
    prompt += `[SECTION: Internet & Digital Access]\n`;
    prompt += formatResponses(responses.internetResponses);
    prompt += '\n\n';
  }

  if (responses.transportationResponses && responses.transportationResponses.needsHelp === 'yes') {
    prompt += `[SECTION: Transportation Help]\n`;
    prompt += formatResponses(responses.transportationResponses);
    prompt += '\n\n';
  }

  if (responses.employmentResponses && responses.employmentResponses.needsHelp === 'yes') {
    prompt += `[SECTION: Employment Support]\n`;
    prompt += formatResponses(responses.employmentResponses);
    prompt += '\n\n';
  }

  if (responses.childcareResponses && responses.childcareResponses.needsHelp === 'yes') {
    prompt += `[SECTION: Childcare & Education]\n`;
    prompt += formatResponses(responses.childcareResponses);
    prompt += '\n\n';
  }

  // Add the action steps request
  prompt += `Based on this information and the person's location in ${locationInfo.city}, ${locationInfo.state}:

1. Identify the **top 4 most urgent or impactful action steps** they can take right now.
2. For each recommendation, include:
   - What the person should do
   - Program or agency name (if applicable)
   - Eligibility criteria (based on their answers)
   - Step-by-step instructions for accessing help
   - Address (if available), phone number, website link, and hours of operation
3. Be clear and direct, as if explaining to someone who may be under stress.

Format each recommendation in an easy-to-read way with bullet points and clear sections.

At the end, include this note:
> "You can choose to view more suggestions if you'd like to take additional steps."

Make all recommendations as specific as possible to ${locationInfo.city}, ${locationInfo.state} ${locationInfo.zip}. Include real, verified local resources and accurate contact information.`;

  return prompt;
}

/**
 * Formats assessment responses into a readable format
 * @param {Object} responses - The responses for a specific assessment section
 * @returns {string} Formatted responses
 */
function formatResponses(responses) {
  let output = '';
  for (const [key, value] of Object.entries(responses)) {
    // Skip the needsHelp field since we've already used it
    if (key === 'needsHelp') continue;
    
    // Format arrays (like selected options from checkboxes)
    if (Array.isArray(value)) {
      output += `- ${formatKey(key)}: ${value.join(', ')}\n`;
    }
    // Format boolean values
    else if (typeof value === 'boolean') {
      output += `- ${formatKey(key)}: ${value ? 'Yes' : 'No'}\n`;
    }
    // Format all other values
    else {
      output += `- ${formatKey(key)}: ${value}\n`;
    }
  }
  return output;
}

/**
 * Formats a camelCase key into a readable string
 * @param {string} key - The camelCase key to format
 * @returns {string} Formatted key
 */
function formatKey(key) {
  return key
    // Insert a space before all caps
    .replace(/([A-Z])/g, ' $1')
    // Replace underscores with spaces
    .replace(/_/g, ' ')
    // Uppercase the first character
    .replace(/^./, str => str.toUpperCase())
    // Remove any extra spaces
    .trim();
}

module.exports = {
  generatePrompt
}; 