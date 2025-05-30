// ChatGPT API Endpoint

import { Configuration, OpenAIApi } from 'openai';

// Initialize OpenAI configuration
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY
});
const openai = new OpenAIApi(configuration);

export default async function handler(req, res) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        // Call ChatGPT API
        const completion = await openai.createChatCompletion({
            model: 'gpt-4',
            messages: [
                {
                    role: 'system',
                    content: `You are a knowledgeable housing resource specialist. Your goal is to provide clear, actionable advice and local resources to people seeking housing assistance. Focus on immediate steps and local organizations that can help. Keep responses concise and practical.`
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 1000
        });

        // Extract the response
        const response = completion.data.choices[0].message.content;

        // Return the formatted response
        return res.status(200).json({ response });
    } catch (error) {
        console.error('ChatGPT API Error:', error);
        
        // Handle specific OpenAI errors
        if (error.response?.status === 429) {
            return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
        }
        
        if (error.response?.status === 401) {
            return res.status(401).json({ error: 'API key error. Please contact support.' });
        }

        // Generic error response
        return res.status(500).json({ error: 'An error occurred while processing your request' });
    }
} 