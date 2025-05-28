// Available languages
const languages = {
  'en': 'English',
  'es': 'Español',
  'zh': '中文',
  'tl': 'Tagalog',
  'vi': 'Tiếng Việt',
  'ar': 'العربية',
  'fr': 'Français',
  'ko': '한국어',
  'ru': 'Русский',
  'pt': 'Português',
  'ht': 'Kreyòl Ayisyen'
};

// Language code mappings (for browser language codes)
const languageMapping = {
  'en': 'en',
  'en-US': 'en',
  'en-GB': 'en',
  'es': 'es',
  'es-ES': 'es',
  'es-MX': 'es',
  'zh': 'zh',
  'zh-CN': 'zh',
  'zh-TW': 'zh',
  'tl': 'tl',
  'fil': 'tl',
  'vi': 'vi',
  'vi-VN': 'vi',
  'ar': 'ar',
  'ar-SA': 'ar',
  'fr': 'fr',
  'fr-FR': 'fr',
  'fr-CA': 'fr',
  'ko': 'ko',
  'ko-KR': 'ko',
  'ru': 'ru',
  'ru-RU': 'ru',
  'pt': 'pt',
  'pt-BR': 'pt',
  'pt-PT': 'pt',
  'ht': 'ht'
};

// Initialize language preference
async function initLanguage() {
  // Check if this is the first visit
  const isFirstVisit = !localStorage.getItem('hasVisited');
  localStorage.setItem('hasVisited', 'true');

  // Get stored language preference or detect browser language
  let currentLang = localStorage.getItem('preferredLanguage');
  
  if (!currentLang && isFirstVisit) {
    // Get browser language
    const browserLang = navigator.language || navigator.userLanguage;
    const mappedLang = languageMapping[browserLang] || languageMapping[browserLang.split('-')[0]];
    
    if (mappedLang && languages[mappedLang]) {
      currentLang = mappedLang;
      localStorage.setItem('preferredLanguage', currentLang);
      
      // Show notification after a short delay
      setTimeout(() => {
        showLanguageNotification(languages[currentLang]);
      }, 1000);
    } else {
      currentLang = 'en'; // Default to English if browser language is not supported
      localStorage.setItem('preferredLanguage', currentLang);
    }
  }

  document.documentElement.lang = currentLang;
  
  // Initialize translation system
  if (window.i18n) {
    await window.i18n.init();
  }
  
  return currentLang;
}

// Change language
async function changeLanguage(langCode) {
  if (languages[langCode]) {
    localStorage.setItem('preferredLanguage', langCode);
    document.documentElement.lang = langCode;
    
    // Use translation system if available
    if (window.i18n) {
      await window.i18n.changeLanguage(langCode);
    } else {
      // Fallback to page reload if translation system is not available
      window.location.reload();
    }
  }
}

// Get current language name
function getCurrentLanguageName() {
  const currentLang = localStorage.getItem('preferredLanguage') || 'en';
  return languages[currentLang];
}

// Show language notification
function showLanguageNotification(languageName) {
  // Create notification element if it doesn't exist
  let notification = document.getElementById('languageNotification');
  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'languageNotification';
    notification.className = 'notification-banner';
    
    notification.innerHTML = `
      <div class="message">
        <span data-i18n="notifications.languageSwitch">We've switched your language to ${languageName}. You can change it anytime in the top-right corner.</span>
      </div>
      <button class="close-btn" onclick="this.parentElement.remove()">×</button>
    `;
    
    document.body.appendChild(notification);
    
    // Add CSS if not already added
    if (!document.querySelector('link[href*="notification.css"]')) {
      const cssLink = document.createElement('link');
      cssLink.rel = 'stylesheet';
      cssLink.href = '/assets/css/notification.css';
      document.head.appendChild(cssLink);
    }
    
    // Show notification with animation
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (notification && notification.parentElement) {
        notification.classList.remove('show');
        setTimeout(() => {
          if (notification && notification.parentElement) {
            notification.remove();
          }
        }, 300);
      }
    }, 5000);
  }
}

// Export for use in other files
window.languageUtils = {
  languages,
  initLanguage,
  changeLanguage,
  getCurrentLanguageName,
  showLanguageNotification
}; 