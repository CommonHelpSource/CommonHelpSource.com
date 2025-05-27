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

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Response data:', data);

    if (!data.response || !data.response.content) {
      console.error('Invalid response structure:', data);
      throw new Error('Invalid response format from server');
    }

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