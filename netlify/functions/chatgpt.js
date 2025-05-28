const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

exports.handler = async function(event, context) {
  // Enable CORS with more restrictive settings
  const headers = {
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*', // Ideally set to your specific domain
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400', // 24 hours cache for preflight requests
    'Content-Type': 'application/json'
  };

  // Handle preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204, // No content needed for preflight
      headers,
      body: ''
    };
  }

  // Validate request method
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Validate request body
    if (!event.body) {
      throw new Error('Request body is required');
    }

    // Parse and validate request data
    const { messages, zip } = JSON.parse(event.body);

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error('Invalid messages format: must be a non-empty array');
    }

    if (!zip) {
      throw new Error('ZIP code is required');
    }

    // Validate ZIP code format (basic US format)
    if (!/^\d{5}(-\d{4})?$/.test(zip)) {
      throw new Error('Invalid ZIP code format');
    }

    // Ensure first message is system message
    if (messages[0].role !== 'system') {
      messages.unshift({
        role: 'system',
        content: `You are a helpful assistant providing localized assistance recommendations for ZIP code ${zip}.`
      });
    } else if (!messages[0].content.includes('ZIP code')) {
      messages[0].content = `You are a helpful assistant providing localized assistance recommendations for ZIP code ${zip}. ${messages[0].content}`;
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
          presence_penalty: 0.1, // Slight penalty for repetition
          frequency_penalty: 0.1, // Slight penalty for frequent tokens
        });
        break; // Success, exit loop
      } catch (error) {
        attempts++;
        if (attempts === maxAttempts) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts)); // Exponential backoff
      }
    }

    // Process the response
    let responseContent = completion.choices[0].message;
    if (messages[0].content.includes("Format your response in JSON")) {
      try {
        // Attempt to parse and validate JSON response
        const jsonContent = JSON.parse(responseContent.content);
        responseContent = {
          content: jsonContent
        };
      } catch (e) {
        console.error('Failed to parse JSON response:', e);
        // Return error for invalid JSON when JSON was requested
        return {
          statusCode: 422,
          headers,
          body: JSON.stringify({
            error: 'Invalid JSON response from AI',
            details: 'The AI response could not be parsed as JSON'
          })
        };
      }
    }

    // Return successful response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        response: responseContent,
        usage: completion.usage // Include token usage information
      })
    };

  } catch (error) {
    // Log error details server-side
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      type: error.constructor.name
    });

    // Determine appropriate status code
    let statusCode = 500;
    if (error.message.includes('Invalid ZIP code') || error.message.includes('Invalid messages format')) {
      statusCode = 400;
    } else if (error.response?.status) {
      statusCode = error.response.status;
    }

    // Return error response
    return {
      statusCode,
      headers,
      body: JSON.stringify({
        error: 'Failed to process request',
        message: error.message,
        type: error.constructor.name
      })
    };
  }
};
