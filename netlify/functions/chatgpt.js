const { OpenAI } = require('openai');
const fetch = require('node-fetch');

// Function to calculate distance between two points using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Function to filter and process resources based on distance
function processResources(resources, userLat, userLon) {
  if (!Array.isArray(resources)) return [];
  
  // Add distance to each resource
  const resourcesWithDistance = resources.map(resource => {
    if (resource.coordinates) {
      const distance = calculateDistance(
        userLat, userLon,
        resource.coordinates.latitude,
        resource.coordinates.longitude
      );
      return { ...resource, distance };
    }
    return resource;
  }).filter(r => r.distance); // Only keep resources with valid distances

  // Sort by distance
  resourcesWithDistance.sort((a, b) => a.distance - b.distance);

  // Get resources within 20 miles
  const nearbyResources = resourcesWithDistance.filter(r => r.distance <= 20);
  
  // If we have 3-5 resources within 20 miles, use those
  if (nearbyResources.length >= 3 && nearbyResources.length <= 5) {
    return {
      resources: nearbyResources,
      summary: `Found ${nearbyResources.length} resources within 20 miles of your location.`
    };
  }
  
  // If we have more than 5 resources within 20 miles, take the closest 5
  if (nearbyResources.length > 5) {
    return {
      resources: nearbyResources.slice(0, 5),
      summary: `Showing the 5 closest resources within 20 miles of your location.`
    };
  }
  
  // If we have fewer than 3 resources within 20 miles, expand search to 30 miles
  const expandedResources = resourcesWithDistance.filter(r => r.distance <= 30);
  
  if (expandedResources.length >= 3) {
    // Take up to 5 resources, marking those beyond 20 miles
    const finalResources = expandedResources.slice(0, 5).map(resource => ({
      ...resource,
      isBeyondInitialRadius: resource.distance > 20
    }));
    
    return {
      resources: finalResources,
      summary: `Found ${nearbyResources.length} resources within 20 miles. Showing additional options within 30 miles to provide you with more choices.`
    };
  }
  
  // If still fewer than 3 resources, return all available with a note
  return {
    resources: expandedResources,
    summary: `Limited resources available in your area. Showing all ${expandedResources.length} options found within 30 miles.`
  };
}

// Language mapping for GPT instructions
const languageInstructions = {
  'en': 'Respond in English.',
  'es': 'Responde en español.',
  'zh': '用中文回答。',
  'tl': 'Sumagot sa Tagalog.',
  'vi': 'Trả lời bằng tiếng Việt.',
  'ar': 'الرجاء الرد باللغة العربية.',
  'fr': 'Répondre en français.',
  'ko': '한국어로 답변하세요.',
  'ru': 'Отвечайте на русском языке.',
  'pt': 'Responda em português.',
  'ht': 'Reponn an kreyòl ayisyen.'
};

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

exports.handler = async function(event) {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers
    };
  }

  try {
    // Validate request body
    if (!event.body) {
      throw new Error('Request body is required');
    }

    // Parse and validate request data
    const { messages, zip, language = 'en' } = JSON.parse(event.body);

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error('Invalid messages format: must be a non-empty array');
    }

    if (!zip) {
      throw new Error('ZIP code is required');
    }

    // Validate ZIP code format
    if (!/^\d{5}(-\d{4})?$/.test(zip)) {
      throw new Error('Invalid ZIP code format');
    }

    // Get coordinates for user's ZIP code
    const geocodeResponse = await fetch('/.netlify/functions/geocode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zip })
    });

    if (!geocodeResponse.ok) {
      throw new Error('Failed to geocode ZIP code');
    }

    const location = await geocodeResponse.json();
    const userLat = location.latitude;
    const userLon = location.longitude;

    // Get language-specific instruction
    const languageInstruction = languageInstructions[language] || languageInstructions.en;

    // Modify system message to include location context, resource requirements, and language instruction
    if (messages[0].role !== 'system') {
      messages.unshift({
        role: 'system',
        content: `${languageInstruction} You are creating personalized action plans for people seeking assistance in ZIP code ${zip} (${location.city}, ${location.state}). 
        Format your response in JSON with this structure:
        {
          "title": "Housing Action Plan for ZIP ${zip}",
          "introduction": "A brief, encouraging paragraph about the next steps they should take",
          "steps": [
            {
              "stepNumber": 1,
              "organization": "Organization name",
              "action": "A clear call-to-action (e.g., 'Schedule an intake appointment')",
              "description": "2-3 sentences about what to expect and what to prepare",
              "address": "Full address",
              "coordinates": {"latitude": number, "longitude": number},
              "phone": "Contact number",
              "hours": "Operating hours",
              "requirements": "What to bring or prepare",
              "priority": "high/medium/low"
            }
          ],
          "finalStep": {
            "title": "Keep Your Plan Handy",
            "action": "Download or email this plan to have it available when you need it."
          }
        }
        
        Guidelines:
        - Aim for 3-5 actionable steps
        - Order steps by priority (emergency services first)
        - Include specific call-to-actions for each step
        - Make the introduction empathetic but action-focused
        - Include coordinates for each location for distance calculation`
      });
    } else {
      messages[0].content = `You are creating personalized action plans for people seeking assistance in ZIP code ${zip} (${location.city}, ${location.state}). 
      Format your response in JSON with this structure:
      {
        "title": "Housing Action Plan for ZIP ${zip}",
        "introduction": "A brief, encouraging paragraph about the next steps they should take",
        "steps": [
          {
            "stepNumber": 1,
            "organization": "Organization name",
            "action": "A clear call-to-action (e.g., 'Schedule an intake appointment')",
            "description": "2-3 sentences about what to expect and what to prepare",
            "address": "Full address",
            "coordinates": {"latitude": number, "longitude": number},
            "phone": "Contact number",
            "hours": "Operating hours",
            "requirements": "What to bring or prepare",
            "priority": "high/medium/low"
          }
        ],
        "finalStep": {
          "title": "Keep Your Plan Handy",
          "action": "Download or email this plan to have it available when you need it."
        }
      }
      
      Guidelines:
      - Aim for 3-5 actionable steps
      - Order steps by priority (emergency services first)
      - Include specific call-to-actions for each step
      - Make the introduction empathetic but action-focused
      - Include coordinates for each location for distance calculation
      ${messages[0].content}`;
    }

    // Make OpenAI API request with retry logic
    let attempts = 0;
    const maxAttempts = 3;
    let completion;

    while (attempts < maxAttempts) {
      try {
        completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: messages,
          temperature: 0.7,
          max_tokens: 1000,
          presence_penalty: 0.1,
          frequency_penalty: 0.1,
        });
        break;
      } catch (error) {
        attempts++;
        if (attempts === maxAttempts) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }

    // Process the response
    let responseContent = completion.choices[0].message;

    // If response is in JSON format, process and filter resources
    if (typeof responseContent.content === 'string' && responseContent.content.trim().startsWith('{')) {
      try {
        const jsonResponse = JSON.parse(responseContent.content);
        if (jsonResponse.steps) {
          // Process resources using the new function
          const { resources, summary } = processResources(jsonResponse.steps, userLat, userLon);
          
          // Update the response with processed resources and new summary
          jsonResponse.steps = resources;
          jsonResponse.summary = `${summary} ${jsonResponse.summary}`;
          
          responseContent.content = JSON.stringify(jsonResponse);
        }
      } catch (e) {
        console.error('Error parsing JSON response:', e);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        response: responseContent
      })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: error.statusCode || 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
