// Utility Assessment Prompt Builder

/**
 * Converts yes/no values to natural language
 * @param {string} value - The value to convert
 * @param {Object} options - Custom phrases for true/false states
 * @returns {string} Natural language phrase
 */
function toNaturalLanguage(value, options = {}) {
    const defaultOptions = {
        positive: 'am',
        negative: 'am not',
        have: 'have',
        havent: "haven't",
        do: 'do',
        dont: "don't"
    };
    
    const opts = { ...defaultOptions, ...options };
    
    if (!value) return opts.negative || opts.havent || opts.dont;
    
    switch(value.toLowerCase()) {
        case 'yes':
        case 'true':
            return opts.positive || opts.have || opts.do;
        case 'no':
        case 'false':
            return opts.negative || opts.havent || opts.dont;
        default:
            return value;
    }
}

/**
 * Creates a conversational prompt for ChatGPT based on utility assessment answers
 * @param {Object} assessmentData - The collected assessment data
 * @returns {string} Formatted conversational prompt
 */
export function createUtilityPrompt(assessmentData) {
    const zip = localStorage.getItem('userZipCode') || '[ZIP code not provided]';
    let prompt = `Hello, I live in ZIP code ${zip}.`;

    // Behind on Bills
    if (assessmentData.is_behind_on_bills) {
        const isBehind = toNaturalLanguage(assessmentData.is_behind_on_bills, {
            positive: 'am',
            negative: 'am not'
        });
        prompt += ` I ${isBehind} behind on utility bills.`;
    }

    // Shut-off Notice
    if (assessmentData.has_shutoff_notice) {
        const hasNotice = toNaturalLanguage(assessmentData.has_shutoff_notice, {
            positive: 'have',
            negative: "haven't"
        });
        prompt += ` I ${hasNotice} received a shut-off notice.`;
    }

    // Fuel Assistance
    if (assessmentData.in_fuel_assistance) {
        const inProgram = toNaturalLanguage(assessmentData.in_fuel_assistance, {
            positive: 'am',
            negative: 'am not'
        });
        prompt += ` I ${inProgram} in fuel assistance.`;
    }

    // Needs Help with Heating/Electric
    if (assessmentData.needs_utility_help) {
        const needsHelp = toNaturalLanguage(assessmentData.needs_utility_help, {
            positive: 'do',
            negative: "don't"
        });
        prompt += ` I ${needsHelp} need help with heating or electricity.`;
    }

    // Add the request
    prompt += `\n\nCan you help me find programs that help with bills or heating near me? Keep it local and short.`;

    return prompt.trim();
}

/**
 * Collects utility assessment data from the form
 * @param {string} formId - The ID of the utility assessment form
 * @returns {Object} Collected assessment data
 */
export function collectUtilityAssessmentData(formId = 'utilityAssessmentForm') {
    const form = document.getElementById(formId);
    if (!form) {
        console.error('Utility assessment form not found');
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
        is_behind_on_bills: getData('is_behind_on_bills'),
        has_shutoff_notice: getData('has_shutoff_notice'),
        in_fuel_assistance: getData('in_fuel_assistance'),
        needs_utility_help: getData('needs_utility_help')
    };
}

// Example usage:
/*
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('utilityAssessmentForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const assessmentData = collectUtilityAssessmentData();
            const prompt = createUtilityPrompt(assessmentData);
            // Use the prompt with ChatGPT API
            console.log(prompt);
        });
    }
});
*/ 