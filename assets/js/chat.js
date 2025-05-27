async function sendMessage(messages) {
  try {
    console.log('Sending messages to chat function:', messages);
    
    const response = await fetch('/.netlify/functions/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });

    const responseText = await response.text();
    console.log('Raw response:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse response:', responseText);
      throw new Error(`Server response was not valid JSON: ${responseText}`);
    }

    if (!response.ok) {
      throw new Error(data.error || data.message || `HTTP error! status: ${response.status}`);
    }

    if (!data.message) {
      console.error('Invalid response structure:', data);
      throw new Error('Response missing message field');
    }

    return data.message;
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