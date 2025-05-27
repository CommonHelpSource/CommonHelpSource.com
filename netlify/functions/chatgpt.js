const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

exports.handler = async function(event, context) {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    if (!event.body) {
      throw new Error('No request body');
    }

    const { messages } = JSON.parse(event.body);

    if (!messages || !Array.isArray(messages)) {
      throw new Error('Invalid messages format');
    }

    // Add formatting instructions if not already present
    if (messages[0].role === "system" && !messages[0].content.includes("Format your response")) {
      messages[0].content += `\n\nFormat your responses with clear structure:
      - Use proper spacing between sections
      - Bold organization names using **Name**
      - Include specific contact information in a clear format
      - Number steps and recommendations
      - Keep information relevant to the user's location and needs`;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000
    });

    // Check if the response needs to be parsed as JSON
    let responseContent = completion.choices[0].message;
    if (messages[0].content.includes("Format your response in JSON")) {
      try {
        // Attempt to parse the response as JSON
        const jsonContent = JSON.parse(responseContent.content);
        responseContent = {
          content: jsonContent
        };
      } catch (e) {
        console.error('Failed to parse JSON response:', e);
        // If JSON parsing fails, return the original response
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
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to process request',
        details: error.message
      })
    };
  }
};
