const fetch = require('node-fetch');

// Rate limiting configuration
const RATE_LIMIT = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // requests per window
  blacklistThreshold: 5 // number of violations before blacklisting
};

// Cache configuration
const CACHE_CONFIG = {
  ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
  maxSize: 10000, // Maximum number of cached entries
  staleWhileRevalidate: 24 * 60 * 60 * 1000 // 24 hours
};

// Enhanced in-memory cache with TTL and SWR
class EnhancedCache {
  constructor(maxSize) {
    this.maxSize = maxSize;
    this.cache = new Map();
    this.revalidating = new Set();
  }

  set(key, value, ttl) {
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry
      const oldestKey = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0][0];
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      value,
      expires: Date.now() + ttl,
      staleUntil: Date.now() + ttl + CACHE_CONFIG.staleWhileRevalidate,
      timestamp: Date.now()
    });
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.staleUntil) {
      this.cache.delete(key);
      return null;
    }

    // If data is stale but not expired, trigger background revalidation
    if (now > entry.expires && !this.revalidating.has(key)) {
      this.revalidating.add(key);
      this.revalidateEntry(key).catch(console.error);
    }

    return entry.value;
  }

  async revalidateEntry(key) {
    try {
      const response = await fetch(
        `https://api.bigdatacloud.net/data/zipcode-search?` +
        `zipCode=${encodeURIComponent(key)}&` +
        `countryCode=US&` +
        `localityLanguage=en&` +
        `key=${process.env.BIGDATACLOUD_API_KEY}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.records?.[0]) {
          const location = data.records[0];
          const result = {
            latitude: location.latitude,
            longitude: location.longitude,
            city: location.city,
            state: location.state,
            county: location.county,
            timezone: location.timezone
          };
          this.set(key, result, CACHE_CONFIG.ttl);
        }
      }
    } catch (error) {
      console.error('Revalidation error:', error);
    } finally {
      this.revalidating.delete(key);
    }
  }

  clear() {
    this.cache.clear();
    this.revalidating.clear();
  }
}

// Rate limiting store with blacklist support
class RateLimitStore {
  constructor() {
    this.store = new Map();
    this.blacklist = new Set();
    this.violations = new Map();
  }

  isBlacklisted(ip) {
    return this.blacklist.has(ip);
  }

  checkLimit(ip) {
    if (this.isBlacklisted(ip)) {
      return false;
    }

    const now = Date.now();
    const record = this.store.get(ip) || {
      count: 0,
      resetTime: now + RATE_LIMIT.windowMs
    };

    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + RATE_LIMIT.windowMs;
      this.violations.delete(ip);
    } else if (record.count >= RATE_LIMIT.maxRequests) {
      // Increment violations
      const violations = (this.violations.get(ip) || 0) + 1;
      this.violations.set(ip, violations);

      // Blacklist if too many violations
      if (violations >= RATE_LIMIT.blacklistThreshold) {
        this.blacklist.add(ip);
        console.warn(`IP ${ip} has been blacklisted due to repeated violations`);
      }
      return false;
    } else {
      record.count++;
    }

    this.store.set(ip, record);
    return true;
  }

  clear() {
    this.store.clear();
    this.violations.clear();
    // Don't clear blacklist - it should persist
  }
}

// Initialize cache and rate limit store
const cache = new EnhancedCache(CACHE_CONFIG.maxSize);
const rateLimitStore = new RateLimitStore();

// Validation rules
const VALIDATION = {
  zip: {
    pattern: /^\d{5}(-\d{4})?$/,
    message: 'ZIP code must be 5 digits or 9 digits with hyphen'
  },
  maxBodySize: 1024, // 1KB
  supportedCountries: ['US'],
  supportedLanguages: ['en']
};

// Error types
const ERROR_TYPES = {
  VALIDATION: 'ValidationError',
  RATE_LIMIT: 'RateLimitError',
  NOT_FOUND: 'NotFoundError',
  API: 'APIError',
  SERVER: 'ServerError',
  CONFIG: 'ConfigError'
};

// Format error response
function formatError(type, message, status = 500) {
  return {
    error: {
      type,
      message,
      timestamp: new Date().toISOString()
    }
  };
}

// Clean up tasks
setInterval(() => {
  const now = Date.now();
  
  // Clean up rate limit store
  for (const [ip, record] of rateLimitStore.store.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.store.delete(ip);
    }
  }

  // Clean up old violations
  for (const [ip, count] of rateLimitStore.violations.entries()) {
    if (now > rateLimitStore.store.get(ip)?.resetTime) {
      rateLimitStore.violations.delete(ip);
    }
  }
}, RATE_LIMIT.windowMs);

exports.handler = async function(event, context) {
  const headers = {
    'Content-Type': 'application/json',
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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify(formatError(
        ERROR_TYPES.VALIDATION,
        'Method not allowed',
        405
      ))
    };
  }

  try {
    // Get client IP for rate limiting
    const clientIP = event.headers['client-ip'] || 
                    event.headers['x-forwarded-for'] || 
                    'unknown';

    // Check rate limit
    if (!rateLimitStore.checkLimit(clientIP)) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify(formatError(
          ERROR_TYPES.RATE_LIMIT,
          'Rate limit exceeded. Please try again later.',
          429
        ))
      };
    }

    // Validate request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify(formatError(
          ERROR_TYPES.VALIDATION,
          'Request body is required',
          400
        ))
      };
    }

    let body;
    try {
      body = JSON.parse(event.body);
    } catch (e) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify(formatError(
          ERROR_TYPES.VALIDATION,
          'Invalid JSON in request body',
          400
        ))
      };
    }

    const { zip } = body;

    // Validate ZIP code format
    if (!zip || !VALIDATION.zip.pattern.test(zip)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify(formatError(
          ERROR_TYPES.VALIDATION,
          VALIDATION.zip.message,
          400
        ))
      };
    }

    // Check cache first
    const cachedResult = cache.get(zip);
    if (cachedResult) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(cachedResult)
      };
    }

    // Make API request if not cached
    const apiKey = process.env.BIGDATACLOUD_API_KEY;
    if (!apiKey) {
      console.error('API key not configured');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify(formatError(
          ERROR_TYPES.CONFIG,
          'Geocoding service configuration error',
          500
        ))
      };
    }

    const response = await fetch(
      `https://api.bigdatacloud.net/data/zipcode-search?` +
      `zipCode=${encodeURIComponent(zip)}&` +
      `countryCode=US&` +
      `localityLanguage=en&` +
      `key=${apiKey}`
    );

    if (!response.ok) {
      console.error(`Geocoding API error: ${response.status}`);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify(formatError(
          ERROR_TYPES.API,
          `Geocoding service error: ${response.status}`,
          response.status
        ))
      };
    }

    const data = await response.json();
    
    if (!data.records || data.records.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify(formatError(
          ERROR_TYPES.NOT_FOUND,
          'ZIP code not found in geocoding service',
          404
        ))
      };
    }

    const location = data.records[0];
    const result = {
      latitude: location.latitude,
      longitude: location.longitude,
      city: location.city,
      state: location.state,
      county: location.county,
      timezone: location.timezone
    };

    // Cache the result
    cache.set(zip, result, CACHE_CONFIG.ttl);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error('Geocoding service error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify(formatError(
        ERROR_TYPES.SERVER,
        'An unexpected error occurred',
        500
      ))
    };
  }
}; 