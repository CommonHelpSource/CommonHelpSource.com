// Food Access Assessment Prompt Builder

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
        absent: 'am not',
        can: 'can',
        cannot: "can't"
    };
    
    const opts = { ...defaultOptions, ...options };
    
    if (!value) return opts.negative || opts.absent || opts.cannot;
    
    switch(value.toLowerCase()) {
        case 'yes':
        case 'true':
            return opts.positive || opts.present || opts.can;
        case 'no':
        case 'false':
            return opts.negative || opts.absent || opts.cannot;
        default:
            return value;
    }
}

/**
 * Creates a conversational prompt for ChatGPT based on food assessment answers
 * @param {Object} assessmentData - The collected assessment data
 * @returns {string} Formatted conversational prompt
 */
export function createFoodPrompt(assessmentData) {
    const zip = localStorage.getItem('userZipCode') || '[ZIP code not provided]';
    let prompt = `Hello, I live in ZIP code ${zip}.`;

    // Food Security
    if (assessmentData.has_enough_food) {
        const hasFood = toNaturalLanguage(assessmentData.has_enough_food);
        prompt += ` I ${hasFood} have enough food right now.`;
    }

    // SNAP Enrollment
    if (assessmentData.enrolled_in_snap) {
        const hasSnap = toNaturalLanguage(assessmentData.enrolled_in_snap, {
            positive: 'am',
            negative: 'am not'
        });
        prompt += ` I ${hasSnap} on SNAP.`;
    }

    // Meals on Wheels Interest
    if (assessmentData.wants_meals_on_wheels) {
        const wantsMow = toNaturalLanguage(assessmentData.wants_meals_on_wheels, {
            positive: 'am',
            negative: 'am not'
        });
        prompt += ` I ${wantsMow} 60+ and interested in Meals on Wheels.`;
    }

    // Cooking Access
    if (assessmentData.has_cooking_access) {
        const canCook = toNaturalLanguage(assessmentData.has_cooking_access, {
            positive: 'can',
            negative: "can't"
        });
        prompt += ` I ${canCook} cook or store food.`;
    }

    // Add the request
    prompt += `\n\nCan you help me find food programs near me? Please keep it local and simple.`;

    return prompt.trim();
}

/**
 * Collects food assessment data from the form
 * @param {string} formId - The ID of the food assessment form
 * @returns {Object} Collected assessment data
 */
export function collectFoodAssessmentData(formId = 'foodAssessmentForm') {
    const form = document.getElementById(formId);
    if (!form) {
        console.error('Food assessment form not found');
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
        has_enough_food: getData('has_enough_food'),
        enrolled_in_snap: getData('enrolled_in_snap'),
        wants_meals_on_wheels: getData('wants_meals_on_wheels'),
        has_cooking_access: getData('has_cooking_access')
    };
}

// Example usage:
/*
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('foodAssessmentForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const assessmentData = collectFoodAssessmentData();
            const prompt = createFoodPrompt(assessmentData);
            // Use the prompt with ChatGPT API
            console.log(prompt);
        });
    }
});
*/ 