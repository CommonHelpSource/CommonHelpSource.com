const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function testAPI() {
  try {
    console.log('Testing OpenAI connection...');
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Hello, are you working?" }],
    });
    console.log('Success! Response:', completion.choices[0].message);
  } catch (error) {
    console.error('Error details:', {
      message: error.message,
      type: error.constructor.name,
      stack: error.stack
    });
  }
}

testAPI(); 