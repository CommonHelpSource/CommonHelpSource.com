const OpenAI = require('openai');
const { generatePrompt } = require('./chatgpt-prompt-template');
const fetch = require('node-fetch');

// Rate limiting configuration
const RATE_LIMIT = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20 // requests per window
};

// Rate limiting store
const rateLimitStore = new Map();

// Clean up rate limit entries
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, RATE_LIMIT.windowMs);

// Check rate limit
function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitStore.get(ip) || {
    count: 0,
    resetTime: now + RATE_LIMIT.windowMs
  };

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + RATE_LIMIT.windowMs;
  } else if (record.count >= RATE_LIMIT.maxRequests) {
    return false;
  } else {
    record.count++;
  }

  rateLimitStore.set(ip, record);
  return true;
}

// Validate OpenAI response
function validateResponse(response) {
  if (!response?.data?.choices?.[0]?.message?.content) {
    throw new Error('Invalid response format from OpenAI');
  }
  return response.data.choices[0].message.content;
}

// Format error response
function formatErrorResponse(error, headers) {
  console.error('ChatGPT Error:', {
    message: error.message,
    code: error.code,
    type: error.type,
    stack: error.stack
  });

  let statusCode = 500;
  let errorMessage = 'An unexpected error occurred';

  if (error.message.includes('rate limit')) {
    statusCode = 429;
    errorMessage = 'Rate limit exceeded. Please try again later.';
  } else if (error.message.includes('invalid_api_key')) {
    statusCode = 401;
    errorMessage = 'Service configuration error';
  } else if (error.message.includes('Invalid response format')) {
    statusCode = 502;
    errorMessage = 'Invalid response from AI service';
  }

  return {
    statusCode,
    headers,
    body: JSON.stringify({
      error: errorMessage,
      code: error.code || 'UNKNOWN_ERROR'
    })
  };
}

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

exports.handler = async function(event, context) {
  // Set strict CORS headers
  const headers = {
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || 'https://commonhelp.netlify.app',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers
    };
  }

  try {
    // Get client IP for rate limiting
    const clientIP = event.headers['client-ip'] || 
                    event.headers['x-forwarded-for'] || 
                    'unknown';

    // Check rate limit
    if (!checkRateLimit(clientIP)) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({
          error: 'Rate limit exceeded. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED'
        })
      };
    }

    // Validate request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Request body is required',
          code: 'MISSING_BODY'
        })
      };
    }

    let body;
    try {
      body = JSON.parse(event.body);
    } catch (e) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid JSON in request body',
          code: 'INVALID_JSON'
        })
      };
    }

    // Validate required fields
    const { messages, zip } = body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Messages array is required',
          code: 'MISSING_MESSAGES'
        })
      };
    }

    if (!zip || !/^\d{5}(-\d{4})?$/.test(zip)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Valid ZIP code is required',
          code: 'INVALID_ZIP'
        })
      };
    }

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    // Call OpenAI API with retry logic
    let response;
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
      try {
        response = await openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are a knowledgeable case management assistant with expertise in social services and community resources. Your goal is to provide clear, actionable guidance to help people access local support services."
            },
            ...messages
          ],
          temperature: 0.7,
          max_tokens: 2000
        });
        break;
      } catch (error) {
        console.error('OpenAI API Error:', error);
        if (retryCount === maxRetries || !error.message.includes('rate limit')) {
          throw error;
        }
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }

    // Format response
    const content = response.choices[0].message.content;
    const formattedContent = content
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[(.*?)\]/g, '<span class="section-header">$1</span>')
      .replace(/^(Step \d+:)/gm, '<strong>$1</strong>')
      .replace(/- ([^:]+):/g, '<strong>- $1:</strong>');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        response: {
          content: formattedContent
        }
      })
    };

  } catch (error) {
    return formatErrorResponse(error, headers);
  }
};
