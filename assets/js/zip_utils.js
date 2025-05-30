// Cache configuration
const CACHE_CONFIG = {
  ttl: 24 * 60 * 60 * 1000, // 24 hours
  version: '1.0.0', // Increment when data structure changes
  maxRetries: 3,
  retryDelay: 1000,
  maxStale: 7 * 24 * 60 * 60 * 1000 // 7 days
};

// Initialize cache from localStorage with versioning and TTL
const cache = {
  zip: loadCache('zip_cache'),
  insurance: loadCache('insurance_cache'),
  city: loadCache('city_cache')
};

// Cache management functions with improved error handling
function loadCache(key) {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return {};

    const { data, expires, version, staleUntil } = JSON.parse(cached);
    const now = Date.now();

    // Clear if version mismatch
    if (version !== CACHE_CONFIG.version) {
      localStorage.removeItem(key);
      return {};
    }

    // If data is expired but not stale, keep it but trigger background refresh
    if (now > expires && now < staleUntil) {
      console.log(`Cache for ${key} is expired but not stale, using stale data`);
      // Schedule background refresh
      setTimeout(() => refreshCache(key), 0);
      return data;
    }

    // If data is stale, clear it
    if (now > staleUntil) {
      localStorage.removeItem(key);
      return {};
    }

    return data;
  } catch (e) {
    console.warn(`Failed to load cache for ${key}:`, e);
    try {
      localStorage.removeItem(key);
    } catch (clearError) {
      console.error(`Failed to clear corrupted cache for ${key}:`, clearError);
    }
    return {};
  }
}

async function refreshCache(key) {
  console.log(`Refreshing cache for ${key}`);
  try {
    switch (key) {
      case 'zip_cache':
        // Refresh all regions
        await Promise.all(
          Object.values(REGIONS).map(region => loadZipData(region.name))
        );
        break;
      case 'insurance_cache':
        // Refresh all regions' insurance data
        await Promise.all(
          Object.values(REGIONS).map(region => loadInsuranceData(region.name))
        );
        break;
      case 'city_cache':
        // City cache is refreshed on-demand
        break;
    }
  } catch (error) {
    console.error(`Failed to refresh cache for ${key}:`, error);
  }
}

function saveCache(key, data) {
  try {
    const now = Date.now();
    localStorage.setItem(key, JSON.stringify({
      data,
      expires: now + CACHE_CONFIG.ttl,
      staleUntil: now + CACHE_CONFIG.maxStale,
      version: CACHE_CONFIG.version
    }));
  } catch (e) {
    console.warn(`Failed to save cache for ${key}:`, e);
    // If storage is full, clear old caches
    try {
      localStorage.removeItem('zip_cache');
      localStorage.removeItem('insurance_cache');
      localStorage.removeItem('city_cache');
      // Try saving again
      localStorage.setItem(key, JSON.stringify({
        data,
        expires: Date.now() + CACHE_CONFIG.ttl,
        staleUntil: Date.now() + CACHE_CONFIG.maxStale,
        version: CACHE_CONFIG.version
      }));
    } catch (retryError) {
      console.error(`Failed to save cache after clearing:`, retryError);
    }
  }
}

// Region definitions
const REGIONS = {
  northeast: {
    name: 'northeast',
    zipRanges: [
      [0, 2999],    // MA, RI, NH, ME
      [5000, 5999], // VT
      [6000, 6999], // CT
      [7000, 8999], // NJ
      [10000, 14999], // NY
      [15000, 19699]  // PA
    ]
  },
  midwest: {
    name: 'midwest',
    zipRanges: [
      [43000, 45999], // OH
      [46000, 47999], // IN
      [48000, 49999], // MI
      [50000, 52999], // IA
      [53000, 54999], // WI
      [55000, 56999], // MN
      [57000, 57999], // SD
      [58000, 58999], // ND
      [60000, 62999], // IL
      [63000, 65999], // MO
      [66000, 67999], // KS
      [68000, 69999]  // NE
    ]
  },
  south: {
    name: 'south',
    zipRanges: [
      [19700, 19999], // DE
      [20600, 21999], // MD
      [23000, 24699], // VA
      [24700, 26999], // WV
      [27000, 28999], // NC
      [29000, 29999], // SC
      [30000, 31999], // GA
      [32000, 34999], // FL
      [35000, 36999], // AL
      [37000, 38599], // TN
      [39000, 39999], // MS
      [40000, 42799], // KY
      [70000, 71599], // LA
      [71600, 72999], // AR
      [73000, 74999], // OK
      [75000, 79999], // TX
      [88500, 88599]  // TX (El Paso area)
    ]
  },
  west: {
    name: 'west',
    zipRanges: [
      [83200, 83999], // ID
      [85000, 86599], // AZ
      [87000, 88499], // NM
      [88900, 89999], // NV
      [90000, 96199], // CA
      [96700, 96899], // HI
      [97000, 97999], // OR
      [98000, 99499], // WA
      [99500, 99999], // AK
      [59000, 59999], // MT
      [80000, 81999], // CO
      [82000, 83199], // WY
      [84000, 84999]  // UT
    ]
  },
  puerto_rico: {
    name: 'puerto_rico',
    zipRanges: [
      [600, 999]  // PR (00600-00999)
    ]
  }
};

// Enhanced validation rules
const VALIDATION = {
  zip: {
    pattern: /^\d{5}(-\d{4})?$/,
    message: 'ZIP code must be 5 digits or 9 digits with hyphen'
  },
  state: {
    pattern: /^[A-Z]{2}$/,
    message: 'State must be a 2-letter code'
  },
  coordinates: {
    latitude: {
      min: 24.396308, // Southernmost point of continental US
      max: 49.384358, // Northernmost point of continental US
      message: 'Latitude must be within continental US bounds'
    },
    longitude: {
      min: -125.000000, // Westernmost point of continental US
      max: -66.934570, // Easternmost point of continental US
      message: 'Longitude must be within continental US bounds'
    }
  }
};

// Enhanced error types
const ERROR_TYPES = {
  VALIDATION: 'ValidationError',
  NETWORK: 'NetworkError',
  CACHE: 'CacheError',
  DATA: 'DataError',
  CONFIG: 'ConfigurationError'
};

class ZipError extends Error {
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

// Validate coordinates
function validateCoordinates(latitude, longitude) {
  if (typeof latitude !== 'number' || isNaN(latitude)) {
    throw new ZipError(
      ERROR_TYPES.VALIDATION,
      'Invalid latitude value',
      null,
      { latitude }
    );
  }

  if (typeof longitude !== 'number' || isNaN(longitude)) {
    throw new ZipError(
      ERROR_TYPES.VALIDATION,
      'Invalid longitude value',
      null,
      { longitude }
    );
  }

  if (latitude < VALIDATION.coordinates.latitude.min ||
      latitude > VALIDATION.coordinates.latitude.max) {
    throw new ZipError(
      ERROR_TYPES.VALIDATION,
      VALIDATION.coordinates.latitude.message,
      null,
      { latitude }
    );
  }

  if (longitude < VALIDATION.coordinates.longitude.min ||
      longitude > VALIDATION.coordinates.longitude.max) {
    throw new ZipError(
      ERROR_TYPES.VALIDATION,
      VALIDATION.coordinates.longitude.message,
      null,
      { longitude }
    );
  }
}

// Enhanced ZIP validation
async function validateZip(zip) {
  if (typeof zip !== 'string' && typeof zip !== 'number') {
    return {
      valid: false,
      error: new ZipError(
        ERROR_TYPES.VALIDATION,
        'ZIP code must be a string or number',
        null,
        { zip }
      )
    };
  }

  const zipString = zip.toString().trim();
  if (!VALIDATION.zip.pattern.test(zipString)) {
    return {
      valid: false,
      error: new ZipError(
        ERROR_TYPES.VALIDATION,
        VALIDATION.zip.message,
        null,
        { zip: zipString }
      )
    };
  }

  const numericZip = parseInt(zipString.substring(0, 5));
  const region = getRegion(numericZip);
  if (!region) {
    return {
      valid: false,
      error: new ZipError(
        ERROR_TYPES.VALIDATION,
        'ZIP code not in supported regions',
        null,
        { zip: zipString, numericZip }
      )
    };
  }

  // Check if ZIP exists in our data files
  try {
    const zipData = await loadZipData(region);
    if (!zipData[zipString]) {
      return {
        valid: false,
        error: new ZipError(
          ERROR_TYPES.VALIDATION,
          'ZIP code not found in our database',
          null,
          { zip: zipString, region }
        )
      };
    }
  } catch (error) {
    console.error('Error loading ZIP data:', error);
    return {
      valid: false,
      error: new ZipError(
        ERROR_TYPES.DATA,
        'Unable to verify ZIP code. Please try again later.',
        error,
        { zip: zipString, region }
      )
    };
  }

  return {
    valid: true,
    zip: zipString,
    numericZip,
    region
  };
}

// Get region based on ZIP code
function getRegion(zip) {
  console.log("[getRegion] Checking region for ZIP:", zip);
  const numericZip = parseInt(zip);
  
  // Special handling for Puerto Rico ZIPs
  if (numericZip >= 600 && numericZip <= 999) {
    console.log("[getRegion] Identified as Puerto Rico ZIP");
    return 'puerto_rico';
  }
  
  // Check each region's ranges
  for (const [regionKey, region] of Object.entries(REGIONS)) {
    for (const [start, end] of region.zipRanges) {
      if (numericZip >= start && numericZip <= end) {
        console.log(`[getRegion] Found matching region: ${regionKey} for range [${start}-${end}]`);
        return region.name;
      }
    }
  }
  
  console.log("[getRegion] No region found for ZIP:", zip);
  return null;
}

// Load ZIP data for a region with error handling and caching
async function loadZipData(region) {
  console.log("[loadZipData] Loading data for region:", region);
  
  // Check memory cache
  if (cache.zip[region]) {
    console.log("[loadZipData] Using cached data");
    return cache.zip[region];
  }

  try {
    console.log(`[loadZipData] Fetching zip_${region}.json`);
    const response = await fetch(`/assets/data/zip_${region}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load ${region} ZIP data: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`[loadZipData] Loaded ${Object.keys(data).length} ZIP entries for ${region}`);
    
    // Update cache
    cache.zip[region] = data;
    saveCache('zip_cache', cache.zip);
    
    return data;
  } catch (error) {
    console.error('[loadZipData] Error:', error);
    throw error;
  }
}

// Get city data for a ZIP code with improved error handling
async function getCityData(zip, region) {
  console.log("[getCityData] Looking up city data for ZIP:", zip, "Region:", region);

  // Input validation
  const validation = await validateZip(zip);
  if (!validation.valid) {
    console.error("[getCityData] Invalid ZIP:", validation.error.message);
    throw new Error(validation.error.message);
  }

  // Check memory cache
  if (cache.city[zip]) {
    console.log("[getCityData] Using cached city data");
    return cache.city[zip];
  }

  try {
    // Try local data first
    console.log("[getCityData] Attempting to load local data");
    const zipData = await loadZipData(region);
    
    if (zipData[zip]) {
      console.log("[getCityData] Found local data:", zipData[zip]);
      // Cache and return the local data
      cache.city[zip] = zipData[zip];
      saveCache('city_cache', cache.city);
      return zipData[zip];
    }

    // If local data not found, try geocoding service
    console.log("[getCityData] Local data not found, trying geocoding service");
    const geocodeResponse = await fetch('/.netlify/functions/geocode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zip })
    });

    if (!geocodeResponse.ok) {
      if (geocodeResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (geocodeResponse.status === 404) {
        throw new Error('ZIP code not found in geocoding service.');
      } else {
        throw new Error(`Geocoding service error: ${geocodeResponse.status}`);
      }
    }

    const geocodeData = await geocodeResponse.json();
    if (geocodeData.error) {
      throw new Error(geocodeData.error);
    }

    console.log("[getCityData] Geocoding service returned:", geocodeData);
    const fallbackData = {
      city: geocodeData.city,
      state: geocodeData.state || region === 'puerto_rico' ? 'PR' : null,
      county: geocodeData.county || null
    };

    // Cache the fallback data
    cache.city[zip] = fallbackData;
    saveCache('city_cache', cache.city);

    return fallbackData;
  } catch (error) {
    console.error('[getCityData] Error:', error);
    throw error;
  }
}

// Get complete location info including insurance options
async function getLocationInfo(zip) {
  console.log("[getLocationInfo] Processing ZIP:", zip);
  
  // Validate input
  const validation = await validateZip(zip);
  if (!validation.valid) {
    console.error("[getLocationInfo] Validation failed:", validation.error.message);
    return {
      zip,
      error: validation.error.message,
      errorDetails: validation.error.toJSON()
    };
  }

  try {
    // Get state info first
    const region = getRegion(zip);
    if (!region) {
      console.error("[getLocationInfo] No region found for ZIP:", zip);
      return {
        zip,
        error: "ZIP code not in a supported region",
        errorDetails: { type: ERROR_TYPES.VALIDATION }
      };
    }

    console.log("[getLocationInfo] Found region:", region);
    
    // Get city info with retries
    let cityData;
    let lastError;
    for (let i = 0; i < CACHE_CONFIG.maxRetries; i++) {
      try {
        cityData = await getCityData(zip, region);
        if (cityData) {
          console.log("[getLocationInfo] Successfully got city data:", cityData);
          break;
        }
      } catch (error) {
        lastError = error;
        console.warn(`[getLocationInfo] Retry ${i + 1} failed:`, error);
        if (i < CACHE_CONFIG.maxRetries - 1) {
          await new Promise(resolve => 
            setTimeout(resolve, CACHE_CONFIG.retryDelay * Math.pow(2, i))
          );
        }
      }
    }

    if (!cityData) {
      console.error("[getLocationInfo] All retries failed:", lastError);
      return {
        zip,
        error: "Could not find location information for this ZIP code",
        errorDetails: lastError instanceof ZipError ? lastError.toJSON() : {
          type: ERROR_TYPES.DATA,
          message: lastError?.message || "Unknown error",
          timestamp: new Date()
        }
      };
    }

    // Validate coordinates if present
    if (cityData.latitude !== undefined && cityData.longitude !== undefined) {
      try {
        validateCoordinates(cityData.latitude, cityData.longitude);
      } catch (error) {
        console.warn('[getLocationInfo] Invalid coordinates:', error);
        delete cityData.latitude;
        delete cityData.longitude;
      }
    }
    
    const locationInfo = {
      zip,
      city: cityData.city,
      state: cityData.state,
      county: cityData.county,
      latitude: cityData.latitude,
      longitude: cityData.longitude,
      timezone: cityData.timezone
    };

    console.log("[getLocationInfo] Final location info:", locationInfo);
    return locationInfo;
  } catch (error) {
    console.error('[getLocationInfo] Error:', error);
    return {
      zip,
      error: "An error occurred while processing your request. Please try again.",
      errorDetails: error instanceof ZipError ? error.toJSON() : {
        type: ERROR_TYPES.DATA,
        message: error.message,
        timestamp: new Date()
      }
    };
  }
}

// Get state from ZIP code
async function getStateFromZip(zip) {
  console.log("Getting state for ZIP:", zip);
  const region = getRegion(zip);
  if (!region) {
    console.log("No region found for ZIP:", zip);
    return {
      error: "ZIP not recognized. Please double-check or try a nearby ZIP code."
    };
  }

  try {
    const zipData = await loadZipData(region);
    const state = zipData[zip];
    console.log("State Found:", state);
    return {
      state: state || null,
      region
    };
  } catch (error) {
    console.error('Error getting state from ZIP:', error);
    return { error: "Unable to verify ZIP code. Please try again later." };
  }
}

// Get insurance options for a state
async function getInsuranceOptions(state, region) {
  if (!state || !region) {
    return null;
  }

  try {
    const insuranceData = await loadInsuranceData(region);
    return insuranceData[state] || null;
  } catch (error) {
    console.error('Error getting insurance options:', error);
    return null;
  }
}

// Load insurance data for a region
async function loadInsuranceData(region) {
  if (cache.insurance[region]) {
    return cache.insurance[region];
  }

  try {
    const response = await fetch(`/assets/data/insurance_${region}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load ${region} insurance data`);
    }
    const data = await response.json();
    cache.insurance[region] = data;
    return data;
  } catch (error) {
    console.error(`Error loading ${region} insurance data:`, error);
    throw error;
  }
}

// Clear cache (useful for testing)
function clearCache() {
  cache.zip = {};
  cache.insurance = {};
  cache.city = {};
}

// Helper function to get region from state
function getRegionFromState(state) {
  const stateToRegion = {
    'ME': 'northeast', 'NH': 'northeast', 'VT': 'northeast', 'MA': 'northeast',
    'RI': 'northeast', 'CT': 'northeast', 'NY': 'northeast', 'NJ': 'northeast',
    'PA': 'northeast', 'OH': 'midwest', 'IN': 'midwest', 'IL': 'midwest',
    'MI': 'midwest', 'WI': 'midwest', 'MN': 'midwest', 'IA': 'midwest',
    'MO': 'midwest', 'ND': 'midwest', 'SD': 'midwest', 'NE': 'midwest',
    'KS': 'midwest', 'DE': 'south', 'MD': 'south', 'DC': 'south',
    'VA': 'south', 'WV': 'south', 'NC': 'south', 'SC': 'south',
    'GA': 'south', 'FL': 'south', 'KY': 'south', 'TN': 'south',
    'AL': 'south', 'MS': 'south', 'AR': 'south', 'LA': 'south',
    'OK': 'south', 'TX': 'south', 'MT': 'west', 'ID': 'west',
    'WY': 'west', 'CO': 'west', 'NM': 'west', 'AZ': 'west',
    'UT': 'west', 'NV': 'west', 'WA': 'west', 'OR': 'west',
    'CA': 'west', 'AK': 'west', 'HI': 'west', 'PR': 'puerto_rico'
  };
  return stateToRegion[state];
}

// Export functions and constants
export {
  getRegion,
  getStateFromZip,
  getInsuranceOptions,
  getLocationInfo,
  validateZip,
  validateCoordinates,
  clearCache,
  ERROR_TYPES,
  VALIDATION,
  CACHE_CONFIG
};

// Export the required functions
export { getLocationInfo, validateZip }; 