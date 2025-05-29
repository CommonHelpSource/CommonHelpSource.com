// Debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Cache configuration
const CACHE_CONFIG = {
  ttl: 15 * 60 * 1000, // 15 minutes
  maxSize: 50, // Maximum number of cached responses
  version: '1.0.0'
};

// LRU Cache implementation
class LRUCache {
  constructor(maxSize) {
    this.maxSize = maxSize;
    this.cache = new Map();
    this.keyTimestamps = new Map();
  }

  set(key, value, ttl) {
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry
      const oldestKey = Array.from(this.keyTimestamps.entries())
        .sort(([, a], [, b]) => a - b)[0][0];
      this.cache.delete(oldestKey);
      this.keyTimestamps.delete(oldestKey);
    }
    this.cache.set(key, {
      value,
      expires: Date.now() + ttl
    });
    this.keyTimestamps.set(key, Date.now());
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      this.keyTimestamps.delete(key);
      return null;
    }
    this.keyTimestamps.set(key, Date.now()); // Update timestamp
    return entry.value;
  }

  clear() {
    this.cache.clear();
    this.keyTimestamps.clear();
  }
}

// Response cache
const responseCache = new LRUCache(CACHE_CONFIG.maxSize);

// Enhanced error types
const ERROR_TYPES = {
  NETWORK: 'NetworkError',
  API: 'APIError',
  VALIDATION: 'ValidationError',
  PARSE: 'ParseError',
  TIMEOUT: 'TimeoutError',
  RATE_LIMIT: 'RateLimitError',
  AUTH: 'AuthenticationError',
  CONTENT: 'ContentError',
  SERVER: 'ServerError',
  CACHE: 'CacheError'
};

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 5000,
  timeout: 30000, // 30 seconds
  retryableErrors: [
    ERROR_TYPES.NETWORK,
    ERROR_TYPES.SERVER,
    ERROR_TYPES.TIMEOUT
  ]
};

// Message validation rules
const MESSAGE_VALIDATION = {
  maxLength: 4000,
  minLength: 1,
  maxMessages: 10,
  allowedRoles: ['system', 'user', 'assistant'],
  forbiddenPatterns: [
    /^\s*$/,  // Empty or whitespace only
    /<script/i,  // Basic XSS prevention
    /javascript:/i,  // Basic XSS prevention
  ]
};

class ChatError extends Error {
  constructor(type, message, originalError = null, metadata = {}) {
    super(message);
    this.name = type;
    this.originalError = originalError;
    this.metadata = metadata;
    this.timestamp = new Date();
  }

  toJSON() {
    return {
      type: this.name,
      message: this.message,
      metadata: this.metadata,
      timestamp: this.timestamp,
      originalError: this.originalError ? {
        message: this.originalError.message,
        name: this.originalError.name
      } : null
    };
  }
}

// Validate individual message
function validateMessage(message, index) {
  if (!message || typeof message !== 'object') {
    throw new ChatError(
      ERROR_TYPES.VALIDATION,
      `Message at index ${index} must be an object`
    );
  }

  if (!MESSAGE_VALIDATION.allowedRoles.includes(message.role)) {
    throw new ChatError(
      ERROR_TYPES.VALIDATION,
      `Invalid role "${message.role}" at index ${index}. Allowed roles: ${MESSAGE_VALIDATION.allowedRoles.join(', ')}`
    );
  }

  if (!message.content || typeof message.content !== 'string') {
    throw new ChatError(
      ERROR_TYPES.VALIDATION,
      `Message content at index ${index} must be a non-empty string`
    );
  }

  if (message.content.length > MESSAGE_VALIDATION.maxLength) {
    throw new ChatError(
      ERROR_TYPES.VALIDATION,
      `Message content at index ${index} exceeds maximum length of ${MESSAGE_VALIDATION.maxLength} characters`
    );
  }

  if (message.content.length < MESSAGE_VALIDATION.minLength) {
    throw new ChatError(
      ERROR_TYPES.VALIDATION,
      `Message content at index ${index} is too short. Minimum length is ${MESSAGE_VALIDATION.minLength} character`
    );
  }

  for (const pattern of MESSAGE_VALIDATION.forbiddenPatterns) {
    if (pattern.test(message.content)) {
      throw new ChatError(
        ERROR_TYPES.VALIDATION,
        `Message content at index ${index} contains forbidden pattern`
      );
    }
  }
}

// Generate cache key for messages
function generateCacheKey(messages) {
  return messages.map(m => `${m.role}:${m.content}`).join('|');
}

// Exponential backoff for retries
function getRetryDelay(retryCount) {
  const delay = Math.min(
    RETRY_CONFIG.maxDelay,
    RETRY_CONFIG.baseDelay * Math.pow(2, retryCount)
  );
  return delay + Math.random() * 1000; // Add jitter
}

// Main send message function
async function sendMessage(messages, retryCount = 0) {
  try {
    // Input validation
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new ChatError(
        ERROR_TYPES.VALIDATION,
        'Messages must be a non-empty array'
      );
    }

    if (messages.length > MESSAGE_VALIDATION.maxMessages) {
      throw new ChatError(
        ERROR_TYPES.VALIDATION,
        `Too many messages. Maximum allowed: ${MESSAGE_VALIDATION.maxMessages}`
      );
    }

    // Validate each message
    messages.forEach(validateMessage);

    // Check cache
    const cacheKey = generateCacheKey(messages);
    const cachedResponse = responseCache.get(cacheKey);
    if (cachedResponse) {
      console.log('Using cached response');
      return cachedResponse;
    }

    console.log('Sending messages to chat function:', messages);
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, RETRY_CONFIG.timeout);

    try {
      const response = await fetch('/.netlify/functions/chatgpt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log('Raw response status:', response.status);

      // Handle different HTTP error codes
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        switch (response.status) {
          case 429:
            throw new ChatError(
              ERROR_TYPES.RATE_LIMIT,
              'Rate limit exceeded. Please try again later.',
              null,
              errorData
            );
          case 401:
            throw new ChatError(
              ERROR_TYPES.AUTH,
              'Authentication failed. Please check your API key.',
              null,
              errorData
            );
          case 503:
            throw new ChatError(
              ERROR_TYPES.SERVER,
              'Service temporarily unavailable.',
              null,
              errorData
            );
          case 400:
            throw new ChatError(
              ERROR_TYPES.VALIDATION,
              'Invalid request format.',
              null,
              errorData
            );
          case 422:
            throw new ChatError(
              ERROR_TYPES.CONTENT,
              'Content validation failed.',
              null,
              errorData
            );
          default:
            throw new ChatError(
              ERROR_TYPES.API,
              `API error: ${errorData.error || response.statusText}`,
              null,
              errorData
            );
        }
      }

      const responseText = await response.text();
      console.log('Raw response text:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
        console.log('Parsed response data:', data);
      } catch (parseError) {
        throw new ChatError(
          ERROR_TYPES.PARSE,
          'Failed to parse server response',
          parseError,
          { responseText }
        );
      }

      if (!data.response || !data.response.content) {
        throw new ChatError(
          ERROR_TYPES.API,
          'Invalid response format from server',
          null,
          { data }
        );
      }

      // Cache successful response
      responseCache.set(cacheKey, data.response, CACHE_CONFIG.ttl);

      console.log('Successfully processed response');
      return data.response;

    } catch (error) {
      if (error.name === 'AbortError') {
        throw new ChatError(
          ERROR_TYPES.TIMEOUT,
          'Request timed out',
          error
        );
      }
      throw error;
    }

  } catch (error) {
    console.error('Chat Error:', error.toJSON());

    // Implement retry logic for specific error types
    if (
      retryCount < RETRY_CONFIG.maxRetries &&
      RETRY_CONFIG.retryableErrors.includes(error.name)
    ) {
      const delay = getRetryDelay(retryCount);
      console.log(`Retrying in ${delay}ms... (Attempt ${retryCount + 1})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return sendMessage(messages, retryCount + 1);
    }

    // If we've exhausted retries or it's not a retryable error, rethrow
    throw error;
  }
}

// Debounced version of sendMessage for use in input handlers
const debouncedSendMessage = debounce(sendMessage, 300);

// Clear cache when window loses focus (to ensure fresh data when user returns)
window.addEventListener('blur', () => {
  responseCache.clear();
});

export {
  sendMessage,
  debouncedSendMessage,
  ChatError,
  ERROR_TYPES,
  CACHE_CONFIG,
  MESSAGE_VALIDATION
};

// Example usage:
// const messages = [
//   { role: "system", content: "You are a helpful assistant." },
//   { role: "user", content: "What housing resources are available?" }
// ];
// const response = await sendMessage(messages); 