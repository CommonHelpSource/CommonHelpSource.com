// Housing Assessment Prompt Builder

import { toNaturalLanguage } from './documents-prompt-builder.js';

/**
 * Formats a yes/no answer into natural language
 * @param {string} value - The answer value
 * @param {Object} options - Custom phrases for yes/no
 * @returns {string} Formatted answer
 */
function formatYesNo(value, options = {}) {
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
 * Formats housing status into natural language
 * @param {string} status - The housing status
 * @returns {string} Formatted status phrase
 */
function formatHousingStatus(status) {
    if (!status) return '';
    
    const statusMap = {
        homeless: 'currently homeless',
        shelter: 'staying in a shelter',
        couch_surfing: 'temporarily staying with friends/family',
        at_risk: 'at risk of losing my housing',
        eviction_notice: 'received an eviction notice',
        stable_housing: 'in stable housing but need assistance',
        other: 'in a different housing situation'
    };
    
    return statusMap[status.toLowerCase()] || status;
}

/**
 * Formats citizenship status into natural language
 * @param {string} status - The citizenship status
 * @returns {string} Formatted status phrase
 */
function formatCitizenshipStatus(status) {
    if (!status) return 'not sure about my status';
    
    const statusMap = {
        citizen: 'a U.S. citizen',
        legal: 'not a citizen but have papers',
        undocumented: 'undocumented',
        other: 'not sure about my status'
    };
    
    return statusMap[status.toLowerCase()] || status;
}

/**
 * Creates a conversational prompt for ChatGPT based on housing assessment answers
 * @param {Object} tier1Data - The collected Tier 1 assessment data
 * @param {Object} tier2Data - The collected Tier 2 assessment data
 * @returns {string} Formatted conversational prompt
 */
export function createHousingPrompt(tier1Data, tier2Data = {}) {
    const zip = localStorage.getItem('userZipCode') || '[ZIP code not provided]';
    const city = localStorage.getItem('userCity') || 'your area';
    const state = localStorage.getItem('userState') || '';
    
    let prompt = `Hello, I live in ZIP code ${zip} – ${city}, ${state}.\nBased on my answers:`;
    
    // Tier 1 Data
    if (tier1Data.housing_status) {
        prompt += `\n- I am ${formatHousingStatus(tier1Data.housing_status)}.`;
    }

    if (tier1Data.has_income) {
        const hasIncome = formatYesNo(tier1Data.has_income, {
            positive: 'have',
            negative: "don't have"
        });
        prompt += `\n- I ${hasIncome} income.`;
    }

    // Document Status
    const missingDocs = [];
    if (tier1Data.has_id === 'no') missingDocs.push('ID');
    if (tier1Data.has_ssn === 'no') missingDocs.push('Social Security card');
    if (tier1Data.has_birth_cert === 'no') missingDocs.push('birth certificate');
    
    if (missingDocs.length > 0) {
        prompt += `\n- I don't have a ${missingDocs.join(', or a ')}.`;
    }

    if (tier1Data.citizenship_status) {
        prompt += `\n- I am ${formatCitizenshipStatus(tier1Data.citizenship_status)}.`;
    }

    if (tier1Data.has_case_manager) {
        const hasManager = formatYesNo(tier1Data.has_case_manager, {
            positive: 'am',
            negative: 'am not'
        });
        prompt += `\n- I ${hasManager} working with a case manager or outreach worker.`;
    }

    if (tier1Data.is_veteran) {
        const isVeteran = formatYesNo(tier1Data.is_veteran);
        prompt += `\n- I ${isVeteran} a veteran.`;
    }

    if (tier1Data.is_fleeing_dv) {
        const isDV = formatYesNo(tier1Data.is_fleeing_dv);
        prompt += `\n- I ${isDV} fleeing domestic violence.`;
    }

    // Tier 2 Data
    if (tier2Data.has_champ) {
        const hasChamp = formatYesNo(tier2Data.has_champ, {
            positive: 'have',
            negative: "haven't"
        });
        prompt += `\n- I ${hasChamp} applied for CHAMP or Section 8.`;
    }

    if (tier2Data.has_eviction) {
        const hasEviction = formatYesNo(tier2Data.has_eviction, {
            positive: 'have',
            negative: "haven't"
        });
        prompt += `\n- I ${hasEviction} been evicted or turned away from housing.`;
    }

    if (tier2Data.has_cori) {
        const hasCori = formatYesNo(tier2Data.has_cori, {
            positive: 'do',
            negative: "don't"
        });
        prompt += `\n- I ${hasCori} have a CORI record.`;
    }

    if (tier2Data.monthly_income) {
        prompt += `\n- My monthly household income is $${tier2Data.monthly_income}.`;
    }

    if (tier2Data.current_rent) {
        prompt += `\n- My current rent/housing cost is $${tier2Data.current_rent} per month.`;
    }

    if (tier2Data.has_disability) {
        const hasDisability = formatYesNo(tier2Data.has_disability, {
            positive: 'do',
            negative: "don't"
        });
        prompt += `\n- I ${hasDisability} have a condition or disability that makes it hard to live alone.`;
    }

    if (tier2Data.in_recovery) {
        const inRecovery = formatYesNo(tier2Data.in_recovery);
        prompt += `\n- I ${inRecovery} in recovery or trying to stay sober.`;
    }

    if (tier2Data.preferred_areas) {
        prompt += `\n- I am interested in housing in these areas: ${tier2Data.preferred_areas}.`;
    }

    // Add the request for local resources
    prompt += `\n\nCan you help me find housing programs and resources within 10 miles of ZIP ${zip} that fit my situation?`;
    prompt += `\nPlease keep the response short, local, and focused on real steps I can take next.`;

    return prompt.trim();
}

/**
 * Collects Tier 1 housing assessment data from the form
 * @param {string} formId - The ID of the Tier 1 assessment form
 * @returns {Object} Collected assessment data
 */
export function collectTier1Data(formId = 'housingTier1Form') {
    const form = document.getElementById(formId);
    if (!form) {
        console.error('Housing Tier 1 form not found');
        return null;
    }

    return {
        housing_status: form.elements['housing_status']?.value,
        has_income: form.elements['has_income']?.value,
        household_size: form.elements['household_size']?.value,
        has_children: form.elements['has_children']?.value,
        has_id: form.elements['has_id']?.value,
        has_ssn: form.elements['has_ssn']?.value,
        has_birth_cert: form.elements['has_birth_cert']?.value,
        citizenship_status: form.elements['citizenship_status']?.value,
        has_case_manager: form.elements['has_case_manager']?.value,
        is_veteran: form.elements['is_veteran']?.value,
        is_fleeing_dv: form.elements['is_fleeing_dv']?.value
    };
}

/**
 * Collects Tier 2 housing assessment data from the form
 * @param {string} formId - The ID of the Tier 2 assessment form
 * @returns {Object} Collected assessment data
 */
export function collectTier2Data(formId = 'housingTier2Form') {
    const form = document.getElementById(formId);
    if (!form) {
        console.error('Housing Tier 2 form not found');
        return null;
    }

    return {
        has_champ: form.elements['has_champ']?.value,
        has_eviction: form.elements['has_eviction']?.value,
        has_cori: form.elements['has_cori']?.value,
        monthly_income: form.elements['monthly_income']?.value,
        current_rent: form.elements['current_rent']?.value,
        has_disability: form.elements['has_disability']?.value,
        in_recovery: form.elements['in_recovery']?.value,
        preferred_areas: form.elements['preferred_areas']?.value
    };
}

/**
 * Stores Tier 1 data in localStorage for persistence between tiers
 * @param {Object} tier1Data - The Tier 1 assessment data to store
 */
export function storeTier1Data(tier1Data) {
    if (!tier1Data) return;
    localStorage.setItem('housingTier1Data', JSON.stringify(tier1Data));
}

/**
 * Retrieves stored Tier 1 data from localStorage
 * @returns {Object|null} The stored Tier 1 data or null if not found
 */
export function retrieveTier1Data() {
    const data = localStorage.getItem('housingTier1Data');
    try {
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Error parsing stored Tier 1 data:', error);
        return null;
    }
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