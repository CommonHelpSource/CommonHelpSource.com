const OpenAI = require('openai');

// Check for API key
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is not set');
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Helper function to validate request body
function validateRequest(body) {
  if (!body || !body.prompt) {
    return { valid: false, error: 'Missing prompt in request body' };
  }
  return { valid: true };
}

// Helper function to sanitize prompt
function sanitizePrompt(prompt) {
  // Remove any potentially harmful characters or patterns
  return prompt.trim().replace(/[<>]/g, '');
}

// Main handler function
exports.handler = async function(event) {
  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse request body
    const body = JSON.parse(event.body);

    // Validate prompt
    if (!body.prompt || typeof body.prompt !== 'string') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Request must include a prompt string' })
      };
    }

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: body.prompt }],
      temperature: 0.7,
      max_tokens: 1000
    });

    // Return successful response
    return {
      statusCode: 200,
      body: JSON.stringify({
        response: completion.choices[0].message.content
      })
    };

  } catch (error) {
    // Log error for debugging
    console.error('Error processing request:', error);

    // Handle specific error types
    if (error.name === 'SyntaxError') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }

    if (error.name === 'OpenAIError') {
      return {
        statusCode: 503,
        body: JSON.stringify({ error: 'OpenAI API error', details: error.message })
      };
    }

    // Generic error response
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message
      })
    };
  }
}; 