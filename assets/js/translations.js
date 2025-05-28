// Translation management
class TranslationManager {
    constructor() {
        this.translations = {};
        this.currentLanguage = 'en';
        this.defaultLanguage = 'en';
        this.observers = new Set();
    }

    // Initialize translations
    async init() {
        // Get stored language preference or use default
        this.currentLanguage = localStorage.getItem('preferredLanguage') || this.defaultLanguage;
        
        // Load translations for current language
        await this.loadTranslations(this.currentLanguage);
        
        // Set HTML direction based on language
        this.setDocumentDirection();
        
        // Initial translation of page
        this.translatePage();
    }

    // Load translations for a specific language
    async loadTranslations(langCode) {
        try {
            const response = await fetch(`/assets/translations/lang_${langCode}.json`);
            if (!response.ok) {
                console.warn(`Failed to load translations for ${langCode}, falling back to English`);
                if (langCode !== this.defaultLanguage) {
                    return this.loadTranslations(this.defaultLanguage);
                }
                throw new Error(`Failed to load translations for ${langCode}`);
            }
            this.translations = await response.json();
            this.currentLanguage = langCode;
        } catch (error) {
            console.error('Error loading translations:', error);
            // If not already trying to load default language, try that as fallback
            if (langCode !== this.defaultLanguage) {
                return this.loadTranslations(this.defaultLanguage);
            }
        }
    }

    // Change language
    async changeLanguage(langCode) {
        await this.loadTranslations(langCode);
        localStorage.setItem('preferredLanguage', langCode);
        this.setDocumentDirection();
        this.translatePage();
        this.notifyObservers();
    }

    // Set HTML direction (LTR/RTL)
    setDocumentDirection() {
        const direction = this.translations.meta?.direction || 'ltr';
        document.documentElement.dir = direction;
        document.documentElement.lang = this.currentLanguage;
    }

    // Get translation for a key
    translate(key) {
        return this.getNestedTranslation(this.translations, key) || key;
    }

    // Get nested translation using dot notation
    getNestedTranslation(obj, path) {
        return path.split('.').reduce((prev, curr) => {
            return prev ? prev[curr] : undefined;
        }, obj);
    }

    // Translate the entire page
    translatePage() {
        // Translate elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.translate(key);
            
            if (translation) {
                // Handle different element types
                if (element.tagName === 'INPUT' && element.type === 'placeholder') {
                    element.placeholder = translation;
                } else if (element.tagName === 'IMG') {
                    element.alt = translation;
                } else {
                    // For buttons with spans, update the span content
                    const span = element.querySelector('span');
                    if (span) {
                        span.textContent = translation;
                    } else {
                        element.textContent = translation;
                    }
                }
            }
        });

        // Translate elements with data-i18n-placeholder
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            const translation = this.translate(key);
            if (translation) {
                element.placeholder = translation;
            }
        });

        // Translate elements with data-i18n-title (tooltips)
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            const translation = this.translate(key);
            if (translation) {
                element.title = translation;
                // If using Bootstrap tooltips, update them
                if (window.bootstrap && element._tippy) {
                    element._tippy.setContent(translation);
                }
            }
        });
    }

    // Add observer for language changes
    addObserver(callback) {
        this.observers.add(callback);
    }

    // Remove observer
    removeObserver(callback) {
        this.observers.delete(callback);
    }

    // Notify all observers of language change
    notifyObservers() {
        this.observers.forEach(callback => callback(this.currentLanguage));
    }
}

// Create and export singleton instance
window.i18n = new TranslationManager();

// Initialize translations when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.i18n.init();
}); 