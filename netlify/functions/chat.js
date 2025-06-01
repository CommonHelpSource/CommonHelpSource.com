const { Configuration, OpenAIApi } = require('openai');

// Initialize OpenAI configuration
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
});
const openai = new OpenAIApi(configuration);

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
exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
      headers: {
        'Allow': 'POST',
        'Content-Type': 'application/json'
      }
    };
  }

  try {
    // Parse and validate request body
    const body = JSON.parse(event.body);
    const validation = validateRequest(body);
    
    if (!validation.valid) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: validation.error }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // Sanitize the prompt
    const sanitizedPrompt = sanitizePrompt(body.prompt);
    
    // Log the sanitized prompt for debugging
    console.log("Sanitized Prompt:", sanitizedPrompt);

    // Set up the chat completion request
    const messages = [
      {
        role: "system",
        content: "You are a helpful assistant providing information about community resources and social services. Your responses should be clear, accurate, and focused on helping people access the support they need."
      },
      {
        role: "user",
        content: sanitizedPrompt
      }
    ];
    
    // Log the full messages array for debugging
    console.log("Full Messages Array:", JSON.stringify(messages, null, 2));

    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: messages,
      temperature: 0.7,
      max_tokens: 500,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    });

    // Extract and return the response
    const response = completion.data.choices[0].message.content;
    
    // Log the API response for debugging
    console.log("OpenAI Response:", response);

    return {
      statusCode: 200,
      body: JSON.stringify({ response }),
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*' // Configure this appropriately for production
      }
    };

  } catch (error) {
    console.error('Error processing chat request:', error);

    // Handle different types of errors
    if (error.response) {
      // OpenAI API error
      return {
        statusCode: error.response.status,
        body: JSON.stringify({
          error: 'Error from OpenAI API',
          details: error.response.data
        }),
        headers: { 'Content-Type': 'application/json' }
      };
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      // Network error
      return {
        statusCode: 503,
        body: JSON.stringify({
          error: 'Service temporarily unavailable',
          details: 'Network connection error'
        }),
        headers: { 'Content-Type': 'application/json' }
      };
    } else {
      // Generic error
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Internal server error',
          details: error.message
        }),
        headers: { 'Content-Type': 'application/json' }
      };
    }
  }
}; 