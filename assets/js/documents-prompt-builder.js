// ID and Documents Assessment Prompt Builder

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
 * Formats citizenship/immigration status into natural language
 * @param {string} status - The citizenship/immigration status
 * @returns {string} Formatted status phrase
 */
function formatCitizenshipStatus(status) {
    if (!status) return null;
    
    switch(status.toLowerCase()) {
        case 'citizen':
            return 'am a citizen';
        case 'permanent_resident':
            return 'have permanent resident status';
        case 'visa':
            return 'have a valid visa';
        case 'no_documents':
            return "don't have immigration documents";
        case 'other':
            return 'have other immigration documents';
        default:
            return status;
    }
}

/**
 * Creates a conversational prompt for ChatGPT based on documents assessment answers
 * @param {Object} assessmentData - The collected assessment data
 * @returns {string} Formatted conversational prompt
 */
export function createDocumentsPrompt(assessmentData) {
    const zip = localStorage.getItem('userZipCode') || '[ZIP code not provided]';
    let prompt = `Hello, I live in ZIP code ${zip}.`;

    // Photo ID
    if (assessmentData.has_photo_id) {
        const hasId = toNaturalLanguage(assessmentData.has_photo_id);
        prompt += ` I ${hasId} have a photo ID.`;
    }

    // Social Security Card
    if (assessmentData.has_social_security) {
        const hasSS = toNaturalLanguage(assessmentData.has_social_security);
        prompt += ` I ${hasSS} have a Social Security card.`;
    }

    // Birth Certificate
    if (assessmentData.has_birth_certificate) {
        const hasBirth = toNaturalLanguage(assessmentData.has_birth_certificate);
        prompt += ` I ${hasBirth} have my birth certificate.`;
    }

    // Citizenship/Immigration Status
    if (assessmentData.citizenship_status) {
        const status = formatCitizenshipStatus(assessmentData.citizenship_status);
        if (status) {
            prompt += ` I ${status}.`;
        }
    }

    // Add the request
    prompt += `\n\nCan you help me find where I can get these documents or legal help in my ZIP code? Please keep it simple and local.`;

    return prompt.trim();
}

/**
 * Collects documents assessment data from the form
 * @param {string} formId - The ID of the documents assessment form
 * @returns {Object} Collected assessment data
 */
export function collectDocumentsAssessmentData(formId = 'documentsAssessmentForm') {
    const form = document.getElementById(formId);
    if (!form) {
        console.error('Documents assessment form not found');
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
        has_photo_id: getData('has_photo_id'),
        has_social_security: getData('has_social_security'),
        has_birth_certificate: getData('has_birth_certificate'),
        citizenship_status: getData('citizenship_status')
    };
}

// Example usage:
/*
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('documentsAssessmentForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const assessmentData = collectDocumentsAssessmentData();
            const prompt = createDocumentsPrompt(assessmentData);
            // Use the prompt with ChatGPT API
            console.log(prompt);
        });
    }
});
*/ 