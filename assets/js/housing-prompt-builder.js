// Housing Assessment Prompt Builder

/**
 * Formats a yes/no/other answer for the prompt
 * @param {string} value - The answer value
 * @returns {string} Formatted answer
 */
function formatAnswer(value) {
    if (!value) return 'Not provided';
    switch(value.toLowerCase()) {
        case 'yes':
        case 'true':
            return 'Yes';
        case 'no':
        case 'false':
            return 'No';
        case 'working':
        case 'working_on_it':
            return 'Working on it';
        default:
            return value;
    }
}

/**
 * Gets location context from localStorage
 * @returns {Object} Location information
 */
function getLocationContext() {
    return {
        zipCode: localStorage.getItem('userZipCode') || 'Unknown',
        city: localStorage.getItem('userCity') || 'Unknown',
        state: localStorage.getItem('userState') || 'Unknown'
    };
}

/**
 * Creates a structured prompt for ChatGPT based on housing assessment answers
 * @param {Object} assessmentData - The collected assessment data
 * @returns {string} Formatted prompt for OpenAI API
 */
export function createHousingPrompt(assessmentData) {
    const location = getLocationContext();
    
    // Format and filter the assessment data
    const formattedData = {
        housing_status: assessmentData.housing_situation,
        has_income: formatAnswer(assessmentData.has_income),
        has_photo_id: formatAnswer(assessmentData.has_photo_id),
        has_social_security: formatAnswer(assessmentData.has_social_security),
        has_birth_certificate: formatAnswer(assessmentData.has_birth_certificate),
        citizenship_status: assessmentData.citizenship_status,
        housing_applications: assessmentData.housing_applications,
        has_case_manager: formatAnswer(assessmentData.has_case_manager),
        has_eviction_history: formatAnswer(assessmentData.has_eviction_history),
        has_cori_record: formatAnswer(assessmentData.has_cori_record),
        has_disability: formatAnswer(assessmentData.has_disability),
        is_in_recovery: formatAnswer(assessmentData.is_in_recovery),
        has_children: formatAnswer(assessmentData.has_children),
        is_veteran: formatAnswer(assessmentData.is_veteran),
        fleeing_domestic_violence: formatAnswer(assessmentData.fleeing_domestic_violence)
    };

    // Filter out empty or "Not provided" values
    const relevantData = Object.entries(formattedData)
        .filter(([_, value]) => value && value !== 'Not provided')
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

    // Build sections with only relevant information
    const buildSection = (title, fields) => {
        const lines = Object.entries(fields)
            .filter(([key, _]) => key in relevantData)
            .map(([key, label]) => `${label}: ${relevantData[key]}`);
        
        return lines.length > 0 ? `\n${title}\n${'-'.repeat(title.length)}\n${lines.join('\n')}` : '';
    };

    const sections = {
        'CLIENT SITUATION': {
            housing_status: 'Current Housing',
            has_income: 'Income Status',
            fleeing_domestic_violence: 'Fleeing Domestic Violence'
        },
        'DOCUMENTATION STATUS': {
            has_photo_id: 'Photo ID',
            has_social_security: 'Social Security Card',
            has_birth_certificate: 'Birth Certificate',
            citizenship_status: 'Citizenship/Immigration'
        },
        'HOUSING HISTORY': {
            housing_applications: 'Previous Applications',
            has_case_manager: 'Working with Case Manager',
            has_eviction_history: 'Eviction History',
            has_cori_record: 'CORI Record'
        },
        'ADDITIONAL FACTORS': {
            has_disability: 'Disability/Medical Condition',
            is_in_recovery: 'Recovery/Sobriety Status',
            has_children: 'Children Under 18',
            is_veteran: 'Veteran Status'
        }
    };

    // Build the prompt with only populated sections
    let prompt = `You are a housing resource specialist assisting a client in ${location.city}, ${location.state} (ZIP: ${location.zipCode}).`;

    // Add each populated section
    Object.entries(sections).forEach(([title, fields]) => {
        const section = buildSection(title, fields);
        if (section) {
            prompt += section;
        }
    });

    // Add the request for recommendations
    prompt += `\n\nBased on this assessment, please provide:
1. Immediate next steps for housing assistance
2. Specific local resources and programs in ${location.city}, ${location.state}
3. Documentation preparation recommendations
4. Additional support services to consider
5. Estimated timeline for different housing options

Please prioritize recommendations based on urgency and feasibility.`;

    return prompt.trim();
}

/**
 * Collects assessment data from the form
 * @param {string} formId - The ID of the housing assessment form
 * @returns {Object} Collected assessment data
 */
export function collectAssessmentData(formId = 'housingAssessmentForm') {
    const form = document.getElementById(formId);
    if (!form) {
        console.error('Housing assessment form not found');
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
        housing_situation: getData('housing_situation'),
        has_income: getData('has_income'),
        has_photo_id: getData('has_photo_id'),
        has_social_security: getData('has_social_security'),
        has_birth_certificate: getData('has_birth_certificate'),
        citizenship_status: getData('citizenship_status'),
        housing_applications: getData('housing_applications'),
        has_case_manager: getData('has_case_manager'),
        has_eviction_history: getData('has_eviction_history'),
        has_cori_record: getData('has_cori_record'),
        has_disability: getData('has_disability'),
        is_in_recovery: getData('is_in_recovery'),
        has_children: getData('has_children'),
        is_veteran: getData('is_veteran'),
        fleeing_domestic_violence: getData('fleeing_domestic_violence')
    };
}

/**
 * Converts boolean-like values to natural language
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
 * Creates a conversational prompt for ChatGPT based on housing assessment answers
 * @param {Object} assessmentData - The collected assessment data
 * @returns {string} Formatted conversational prompt
 */
export function createConversationalPrompt(assessmentData) {
    const zip = localStorage.getItem('userZipCode') || '[ZIP code not provided]';
    let prompt = `Hello, I live in ZIP code ${zip}.`;

    // Housing Status
    if (assessmentData.housing_situation) {
        prompt += ` I am ${assessmentData.housing_situation}.`;
    }

    // Income and Documents
    const hasIncome = toNaturalLanguage(assessmentData.has_income);
    const hasId = toNaturalLanguage(assessmentData.has_photo_id);
    const hasSS = toNaturalLanguage(assessmentData.has_social_security);
    const hasBirth = toNaturalLanguage(assessmentData.has_birth_certificate);

    if (assessmentData.has_income || assessmentData.has_photo_id || 
        assessmentData.has_social_security || assessmentData.has_birth_certificate) {
        prompt += ` I ${hasIncome} have income.`;
        
        const docs = [];
        if (assessmentData.has_photo_id) docs.push('ID');
        if (assessmentData.has_social_security) docs.push('Social Security card');
        if (assessmentData.has_birth_certificate) docs.push('birth certificate');
        
        if (docs.length > 0) {
            prompt += ` I ${hasId} have the following documents: ${docs.join(', ')}.`;
        }
    }

    // Citizenship/Immigration
    if (assessmentData.citizenship_status) {
        prompt += ` My citizenship/immigration status is: ${assessmentData.citizenship_status}.`;
    }

    // Housing Applications
    if (assessmentData.housing_applications) {
        const haveApplied = toNaturalLanguage(assessmentData.housing_applications, {
            positive: 'have',
            negative: "haven't"
        });
        prompt += ` I ${haveApplied} applied for housing programs before.`;
    }

    // Case Management
    if (assessmentData.has_case_manager) {
        const hasManager = toNaturalLanguage(assessmentData.has_case_manager, {
            positive: 'am',
            negative: 'am not'
        });
        prompt += ` I ${hasManager} working with a case manager.`;
    }

    // CORI and Evictions
    if (assessmentData.has_cori_record || assessmentData.has_eviction_history) {
        const hasCori = toNaturalLanguage(assessmentData.has_cori_record, {
            positive: 'do',
            negative: "don't"
        });
        prompt += ` I ${hasCori} have a CORI record.`;

        if (assessmentData.has_eviction_history) {
            const hasEviction = toNaturalLanguage(assessmentData.has_eviction_history, {
                positive: 'have',
                negative: "haven't"
            });
            prompt += ` I ${hasEviction} been evicted before.`;
        }
    }

    // Recovery Status
    if (assessmentData.is_in_recovery) {
        const inRecovery = toNaturalLanguage(assessmentData.is_in_recovery);
        prompt += ` I ${inRecovery} in recovery.`;
    }

    // Children
    if (assessmentData.has_children) {
        const hasKids = toNaturalLanguage(assessmentData.has_children, {
            positive: 'do',
            negative: "don't"
        });
        prompt += ` I ${hasKids} have children under 18.`;
    }

    // Veteran Status
    if (assessmentData.is_veteran) {
        const isVeteran = toNaturalLanguage(assessmentData.is_veteran);
        prompt += ` I ${isVeteran} a veteran.`;
    }

    // Domestic Violence
    if (assessmentData.fleeing_domestic_violence) {
        const isDV = toNaturalLanguage(assessmentData.fleeing_domestic_violence);
        prompt += ` I ${isDV} fleeing domestic violence.`;
    }

    // Add the request
    prompt += `\n\nCan you help me find housing programs and local help near me? Keep the answer short and focused on steps I can take next in my ZIP code.`;

    return prompt.trim();
}

// Example usage:
/*
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('housingAssessmentForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const assessmentData = collectAssessmentData();
            const prompt = createHousingPrompt(assessmentData);
            // Use the prompt with ChatGPT API or store it
            console.log(prompt);
        });
    }
});
*/ 