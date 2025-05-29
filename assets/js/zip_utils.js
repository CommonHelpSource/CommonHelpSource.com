// Cache for loaded data
const cache = {
  zip: {},
  insurance: {},
  city: {}
};

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
  }
};

// Get region based on ZIP code
function getRegion(zip) {
  console.log("Checking region for ZIP:", zip);
  const numericZip = parseInt(zip);
  for (const region of Object.values(REGIONS)) {
    for (const [start, end] of region.zipRanges) {
      if (numericZip >= start && numericZip <= end) {
        console.log("Found region:", region.name);
        return region.name;
      }
    }
  }
  console.log("No region found for ZIP:", zip);
  return null;
}

// Load ZIP data for a region
async function loadZipData(region) {
  console.log("Loading ZIP data for region:", region);
  if (cache.zip[region]) {
    console.log("Using cached ZIP data for region:", region);
    return cache.zip[region];
  }

  try {
    const response = await fetch(`/assets/data/zip_${region}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load ${region} ZIP data`);
    }
    const data = await response.json();
    console.log("Successfully loaded ZIP data for region:", region);
    cache.zip[region] = data;
    return data;
  } catch (error) {
    console.error(`Error loading ${region} ZIP data:`, error);
    throw error;
  }
}

// Get city data for a ZIP code
async function getCityData(zip, region) {
  if (cache.city[zip]) {
    console.log("Using cached city data for ZIP:", zip);
    return cache.city[zip];
  }

  try {
    // Load the cities data file for the region
    const response = await fetch(`/assets/data/cities_${region}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load cities data for ${region}`);
    }

    const citiesData = await response.json();
    const cityData = citiesData[zip];

    if (!cityData) {
      console.warn(`No city data found for ZIP ${zip} in region ${region}`);
      // Fallback to basic city data
      return {
        city: "Unknown City", // We'll update this with state data
        county: null,
        latitude: null,
        longitude: null
      };
    }

    cache.city[zip] = cityData;
    console.log("Successfully loaded city data for ZIP:", zip, cityData);
    return cityData;
  } catch (error) {
    console.error('Error getting city data:', error);
    // Fallback to basic city data
    return {
      city: "Unknown City", // We'll update this with state data
      county: null,
      latitude: null,
      longitude: null
    };
  }
}

// Get complete location info including insurance options
async function getLocationInfo(zip) {
  console.log("Getting location info for ZIP:", zip);
  
  try {
    // Get state info first
    const stateInfo = await getStateFromZip(zip);
    if (stateInfo.error) {
      console.error("State lookup error:", stateInfo.error);
      return {
        zip,
        error: stateInfo.error
      };
    }

    // Get city info
    const cityData = await getCityData(zip, stateInfo.region);
    
    // If we have state data but no city, create a default city name
    if (!cityData.city || cityData.city === "Unknown City") {
      cityData.city = `${stateInfo.state} Area`;
    }

    // Combine the data
    const locationInfo = {
      zip,
      city: cityData.city,
      state: stateInfo.state,
      county: cityData.county,
      latitude: cityData.latitude,
      longitude: cityData.longitude
    };

    console.log("Complete location info:", locationInfo);

    // If we're on the healthcare page, add insurance options
    if (window.location.pathname.includes('health')) {
      const insuranceOptions = await getInsuranceOptions(stateInfo.state, stateInfo.region);
      locationInfo.insuranceOptions = insuranceOptions;
      if (!insuranceOptions) {
        locationInfo.error = "Unable to load insurance options for your state.";
      }
    }

    return locationInfo;
  } catch (error) {
    console.error('Error getting location info:', error);
    return {
      zip,
      error: "An error occurred while processing your request. Please try again."
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

// Export functions
export { getRegion, getStateFromZip, getInsuranceOptions, getLocationInfo, clearCache }; 