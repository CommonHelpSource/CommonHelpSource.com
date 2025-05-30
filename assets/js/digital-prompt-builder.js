// Digital Access Assessment Prompt Builder

/**
 * Converts yes/no values to natural language
 * @param {string} value - The value to convert
 * @param {Object} options - Custom phrases for true/false states
 * @returns {string} Natural language phrase
 */
function toNaturalLanguage(value, options = {}) {
    const defaultOptions = {
        positive: 'do',
        negative: "don't",
        present: 'am',
        absent: 'am not'
    };
    
    const opts = { ...defaultOptions, ...options };
    
    if (!value) return opts.negative || opts.absent;
    
    switch(value.toLowerCase()) {
        case 'yes':
        case 'true':
            return opts.positive || opts.present;
        case 'no':
        case 'false':
            return opts.negative || opts.absent;
        default:
            return value;
    }
}

/**
 * Creates a conversational prompt for ChatGPT based on digital access assessment answers
 * @param {Object} assessmentData - The collected assessment data
 * @returns {string} Formatted conversational prompt
 */
export function createDigitalPrompt(assessmentData) {
    const zip = localStorage.getItem('userZipCode') || '[ZIP code not provided]';
    let prompt = `Hello, I live in ZIP code ${zip}.`;

    // Internet Access
    if (assessmentData.has_internet) {
        const hasInternet = toNaturalLanguage(assessmentData.has_internet);
        prompt += ` I ${hasInternet} have internet at home.`;
    }

    // Device Access
    if (assessmentData.has_device) {
        const hasDevice = toNaturalLanguage(assessmentData.has_device);
        prompt += ` I ${hasDevice} have a device like a phone or laptop.`;
    }

    // Digital Comfort
    if (assessmentData.is_comfortable_online) {
        const isComfortable = toNaturalLanguage(assessmentData.is_comfortable_online, {
            positive: 'am',
            negative: 'am not'
        });
        prompt += ` I ${isComfortable} comfortable using the internet.`;
    }

    // Need Affordable Internet
    if (assessmentData.needs_affordable_internet) {
        const needsHelp = toNaturalLanguage(assessmentData.needs_affordable_internet);
        prompt += ` I ${needsHelp} need help getting low-cost internet.`;
    }

    // Add the request
    prompt += `\n\nCan you help me find internet or digital help programs near me? Please keep the answer short and ZIP-code specific.`;

    return prompt.trim();
}

/**
 * Collects digital access assessment data from the form
 * @param {string} formId - The ID of the digital assessment form
 * @returns {Object} Collected assessment data
 */
export function collectDigitalAssessmentData(formId = 'digitalAssessmentForm') {
    const form = document.getElementById(formId);
    if (!form) {
        console.error('Digital assessment form not found');
        return null;
    }

    const getData = (name) => {
        const element = form.elements[name];
        if (!element) return null;
        
        if (element.type === 'radio' || element.type === 'checkbox') {
            const checked = form.querySelector(`input[name="${name}"]:checked`);
            return checked ? checked.value : null;
        }
        
        return element.value || null;
    };

    return {
        has_internet: getData('has_internet'),
        has_device: getData('has_device'),
        is_comfortable_online: getData('is_comfortable_online'),
        needs_affordable_internet: getData('needs_affordable_internet')
    };
}

// Example usage:
/*
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('digitalAssessmentForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const assessmentData = collectDigitalAssessmentData();
            const prompt = createDigitalPrompt(assessmentData);
            // Use the prompt with ChatGPT API
            console.log(prompt);
        });
    }
});
*/ 