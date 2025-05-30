// ZIP Code Utilities

/**
 * Gets the region file name based on ZIP prefix
 * @param {string} zipCode - The ZIP code to check
 * @returns {string|null} The region file name or null if invalid
 */
function getRegionFileForZip(zipCode) {
    if (!zipCode) return null;
    
    // Check for Puerto Rico first
    if (zipCode.startsWith('00') || zipCode.startsWith('006')) {
        return 'zip_puerto_rico.json';
    }
    
    const firstDigit = zipCode.charAt(0);
    
    // Map first digit to region
    if (['0', '1', '2'].includes(firstDigit)) {
        return 'zip_northeast.json';
    } else if (firstDigit === '3') {
        return 'zip_south.json';
    } else if (['4', '5', '6'].includes(firstDigit)) {
        return 'zip_midwest.json';
    } else if (['7', '8', '9'].includes(firstDigit)) {
        return 'zip_west.json';
    }
    
    return null;
}

/**
 * Loads location data for a ZIP code
 * @param {string} zipCode - The ZIP code to look up
 * @returns {Promise<Object|null>} Location data or null if not found
 */
export async function getLocationData(zipCode) {
    if (!zipCode || !/^\d{5}$/.test(zipCode)) {
        return null;
    }

    const regionFile = getRegionFileForZip(zipCode);
    if (!regionFile) {
        console.error('Could not determine region for ZIP:', zipCode);
        return null;
    }

    try {
        const response = await fetch(`/assets/data/${regionFile}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data[zipCode] || null;
    } catch (error) {
        console.error('Error loading ZIP data:', error);
        return null;
    }
}

/**
 * Updates the UI with location information
 * @param {string} zipCode - The ZIP code
 * @param {Object} locationData - The location data
 * @param {Object} options - Display options
 */
export function updateLocationDisplay(zipCode, locationData, options = {}) {
    const {
        zipElementId = 'zip-display',
        locationElementId = 'location-display',
        showError = true
    } = options;

    const zipElement = document.getElementById(zipElementId);
    const locationElement = document.getElementById(locationElementId);

    if (!zipElement || !locationElement) return;

    if (!zipCode || !locationData) {
        if (showError) {
            zipElement.textContent = 'ZIP code not set';
            zipElement.classList.add('error');
            locationElement.textContent = 'Please set your location';
            locationElement.classList.add('error');
        }
        return;
    }

    zipElement.textContent = `ZIP ${zipCode}`;
    zipElement.classList.remove('error');
    locationElement.textContent = `${locationData.city}, ${locationData.state}`;
    locationElement.classList.remove('error');

    // Store in localStorage for persistence
    localStorage.setItem('userZipCode', zipCode);
    localStorage.setItem('userCity', locationData.city);
    localStorage.setItem('userState', locationData.state);
}

/**
 * Initializes location display on page load
 * @param {Object} options - Display options
 * @returns {Promise<void>}
 */
export async function initializeLocation(options = {}) {
    const zipCode = localStorage.getItem('userZipCode');
    if (!zipCode) {
        updateLocationDisplay(null, null, options);
        return;
    }

    const locationData = await getLocationData(zipCode);
    updateLocationDisplay(zipCode, locationData, options);
}

/**
 * Calculates if a location is within radius of a ZIP code
 * @param {Object} point1 - First location {lat: number, lng: number}
 * @param {Object} point2 - Second location {lat: number, lng: number}
 * @returns {boolean} True if within 10 miles
 */
export function isWithinRadius(point1, point2) {
    const R = 3959; // Earth's radius in miles
    const lat1 = point1.lat * Math.PI / 180;
    const lat2 = point2.lat * Math.PI / 180;
    const dLat = lat2 - lat1;
    const dLon = (point2.lng - point1.lng) * Math.PI / 180;

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1) * Math.cos(lat2) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    return distance <= 10; // 10-mile radius
}

/**
 * Validates a ZIP code
 * @param {string} zipCode - The ZIP code to validate
 * @returns {boolean} True if valid
 */
export function isValidZipCode(zipCode) {
    return /^\d{5}$/.test(zipCode);
} 