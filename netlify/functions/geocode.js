const fetch = require('node-fetch');

exports.handler = async function(event) {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers
    };
  }

  try {
    // Validate request body
    if (!event.body) {
      throw new Error('Request body is required');
    }

    const { zip } = JSON.parse(event.body);
    if (!zip || !/^\d{5}(-\d{4})?$/.test(zip)) {
      throw new Error('Invalid ZIP code format');
    }

    // Use BigDataCloud API to get coordinates for ZIP code
    const response = await fetch(
      `https://api.bigdatacloud.net/data/zipcode-search?zipCode=${zip}&countryCode=US&localityLanguage=en`
    );

    if (!response.ok) {
      throw new Error('Failed to geocode ZIP code');
    }

    const data = await response.json();
    
    // Extract coordinates from the first result
    if (!data.records || data.records.length === 0) {
      throw new Error('ZIP code not found');
    }

    const location = data.records[0];
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        latitude: location.latitude,
        longitude: location.longitude,
        city: location.city,
        state: location.state
      })
    };

  } catch (error) {
    console.error('Geocoding error:', error);
    return {
      statusCode: error.statusCode || 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
}; 