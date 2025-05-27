exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    const body = JSON.parse(event.body);
    const messages = body.messages;

    if (!messages || !Array.isArray(messages)) {
      throw new Error("Missing or invalid 'messages' array.");
    }

    // Add formatting instructions to system message if not already present
    if (messages[0].role === "system") {
      messages[0].content = `${messages[0].content}\n\nFormat your responses with clear structure:
      - Use proper spacing between sections
      - Bold organization names using **Name**
      - Include specific contact information in a clear format
      - Number steps and recommendations
      - Keep information relevant to the user's location and needs`;
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: messages,
        temperature: 0.7, // Add some creativity while keeping responses focused
        max_tokens: 1000, // Allow for detailed responses
      }),
    });

    const text = await response.text();

    // Try to parse the text manually
    let data;
    try {
      data = JSON.parse(text);
    } catch (jsonErr) {
      throw new Error("Failed to parse OpenAI response as JSON: " + text);
    }

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error("Invalid response from OpenAI: " + JSON.stringify(data));
    }

    // Post-process the response to ensure proper formatting
    let content = data.choices[0].message.content;
    
    // Ensure proper spacing between sections
    content = content.replace(/\n{3,}/g, '\n\n');
    
    // Ensure numbered steps are properly formatted
    content = content.replace(/(\d+\.) (?!\s)/g, '$1 ');
    
    // Ensure organization names are properly bolded
    content = content.replace(/\*\*([^*]+)\*\*/g, (_, name) => `**${name.trim()}**`);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        response: {
          ...data.choices[0].message,
          content: content
        }
      }),
    };
  } catch (err) {
    console.error("Function error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
