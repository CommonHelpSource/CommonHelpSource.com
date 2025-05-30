/**
 * Utility functions for generating resource-informed responses
 */

/**
 * Generates a resource-informed response with ZIP code context
 * @param {string} category - The resource category (e.g., 'housing', 'food', etc.)
 * @param {Object} clientInfo - Client assessment information
 * @returns {Promise<string>} The generated response
 */
async function generateResourceResponse(category, clientInfo) {
  // Get ZIP code from localStorage with fallback
  const zip = localStorage.getItem('userZipCode') || 'unknown ZIP';

  // Base prompt structure
  const prompt = `You are a resource specialist helping someone in ZIP code ${zip}.
Category: ${category}

Client Information:
${formatClientInfo(clientInfo)}

Please provide:
1. Available local resources and programs in or near ZIP ${zip}
2. Eligibility requirements and documentation needed
3. Step-by-step instructions for accessing each resource
4. Contact information and hours of operation
5. Any relevant online application links or portals

Format the response in clear, easy-to-read sections with bullet points.
Focus on verified, currently active resources in the ${zip} area.`;

  try {
    // Call the API endpoint
    const response = await fetch('/.netlify/functions/generateNote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: prompt })
    });

    if (!response.ok) {
      throw new Error('Failed to generate resource response');
    }

    const data = await response.json();
    return data.output;
  } catch (error) {
    console.error('Error generating resource response:', error);
    throw error;
  }
}

/**
 * Formats client information into a readable string
 * @param {Object} info - Client assessment information
 * @returns {string} Formatted information
 */
function formatClientInfo(info) {
  if (!info) return 'No additional information provided';
  
  return Object.entries(info)
    .map(([key, value]) => `- ${formatKey(key)}: ${value}`)
    .join('\n');
}

/**
 * Formats a camelCase key into a readable label
 * @param {string} key - The key to format
 * @returns {string} Formatted label
 */
function formatKey(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

export {
  generateResourceResponse
}; 