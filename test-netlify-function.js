require('dotenv').config();
const { handler } = require('./netlify/functions/chatgpt.js');

async function testFunction() {
  console.log('Testing Netlify Function...');
  console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
  
  const mockEvent = {
    httpMethod: "POST",
    body: JSON.stringify({
      messages: [
        { role: "user", content: "Hello, can you hear me?" }
      ]
    })
  };

  try {
    const response = await handler(mockEvent);
    console.log('Response status:', response.statusCode);
    console.log('Response body:', JSON.parse(response.body));
  } catch (error) {
    console.error('Error:', error);
  }
}

testFunction(); 