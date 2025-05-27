async function sendMessage(messages) {
  try {
    console.log('Sending messages to chat function:', messages);
    
    const response = await fetch('/.netlify/functions/chatgpt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });

    console.log('Raw response status:', response.status);
    console.log('Raw response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('Raw response text:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
      console.log('Parsed response data:', data);
    } catch (parseError) {
      console.error('Failed to parse response:', responseText);
      throw new Error(`Server response was not valid JSON: ${responseText}`);
    }

    if (!response.ok) {
      console.error('Response not OK:', {
        status: response.status,
        statusText: response.statusText,
        data: data
      });
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    if (!data.response || !data.response.content) {
      console.error('Invalid response structure:', data);
      throw new Error('Invalid response format from server');
    }

    console.log('Successfully processed response:', {
      content: data.response.content.substring(0, 50) + '...'
    });

    return data.response;
  } catch (error) {
    console.error('Chat Error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
}

// Example usage:
// const messages = [
//   { role: "system", content: "You are a helpful assistant." },
//   { role: "user", content: "What housing resources are available?" }
// ];
// const response = await sendMessage(messages); 