const { Configuration, OpenAIApi } = require('openai');
const { generatePrompt } = require('./chatgpt-prompt-template');
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

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

exports.handler = async function(event, context) {
  // Enable CORS
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
    const body = JSON.parse(event.body);
    const { location, responses } = body;

    if (!location || !responses) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required parameters' })
      };
    }

    // Generate the prompt using our template
    const prompt = generatePrompt(location, responses);

    // Call OpenAI API
    const completion = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a knowledgeable case management assistant with expertise in social services and community resources. Your goal is to provide clear, actionable guidance to help people access local support services."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    // Format the response
    const content = completion.data.choices[0].message.content;
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
        content: formattedContent
      })
    };

  } catch (error) {
    console.error('Error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to process request',
        details: error.message
      })
    };
  }
};
