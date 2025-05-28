document.addEventListener('DOMContentLoaded', function() {
    // Create header HTML
    const headerHTML = `
        <header style="
            padding: 1rem;
            background-color: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            position: relative;
            z-index: 1000;
            margin-bottom: 20px;
        ">
            <div style="
                max-width: 1200px;
                margin: 0 auto;
                display: flex;
                align-items: center;
                justify-content: space-between;
            ">
                <a href="index.html" style="
                    text-decoration: none;
                    display: block;
                    text-align: center;
                ">
                    <img 
                        src="assets/images/commonhelpsource-logo.png" 
                        alt="CommonHelpSource Logo"
                        data-i18n-alt="header.logoAlt"
                        style="
                            max-height: 60px;
                            width: auto;
                            margin: 0 auto;
                            display: block;
                        "
                    >
                </a>
                <div class="language-selector" style="
                    position: relative;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                ">
                    <span style="
                        display: flex;
                        align-items: center;
                        gap: 4px;
                        cursor: pointer;
                        padding: 8px;
                        border-radius: 6px;
                        border: 1px solid #ddd;
                        font-size: 14px;
                        color: #2d3436;
                    " onclick="document.getElementById('languageDropdown').style.display = document.getElementById('languageDropdown').style.display === 'none' ? 'block' : 'none'">
                        🌐 <span id="currentLanguage">English</span>
                    </span>
                    <div id="languageDropdown" style="
                        display: none;
                        position: absolute;
                        top: 100%;
                        right: 0;
                        background: white;
                        border-radius: 8px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                        padding: 8px 0;
                        margin-top: 4px;
                        z-index: 1000;
                        min-width: 180px;
                    ">
                    </div>
                </div>
            </div>
        </header>
    `;

    // Insert header at the beginning of the body
    document.body.insertAdjacentHTML('afterbegin', headerHTML);

    // Add script tags for translation system if not already present
    const scripts = [
        { src: 'assets/js/translations.js', id: 'translations-js' },
        { src: 'assets/js/language.js', id: 'language-js' }
    ];

    const loadScripts = async () => {
        for (const script of scripts) {
            if (!document.getElementById(script.id)) {
                await new Promise((resolve, reject) => {
                    const scriptElement = document.createElement('script');
                    scriptElement.src = script.src;
                    scriptElement.id = script.id;
                    scriptElement.onload = resolve;
                    scriptElement.onerror = reject;
                    document.head.appendChild(scriptElement);
                });
            }
        }
        initializeLanguageSelector();
    };

    loadScripts().catch(console.error);
});

function initializeLanguageSelector() {
    // Initialize language
    const currentLang = window.languageUtils.initLanguage();
    
    // Update current language display
    const currentLanguageElement = document.getElementById('currentLanguage');
    if (currentLanguageElement) {
        currentLanguageElement.textContent = window.languageUtils.languages[currentLang];
    }

    // Populate dropdown
    const dropdown = document.getElementById('languageDropdown');
    if (dropdown) {
        Object.entries(window.languageUtils.languages).forEach(([code, name]) => {
            const item = document.createElement('div');
            item.style.cssText = `
                padding: 8px 16px;
                cursor: pointer;
                font-size: 14px;
                color: #2d3436;
                transition: background-color 0.2s;
            `;
            item.onmouseover = () => item.style.backgroundColor = '#f5f6f7';
            item.onmouseout = () => item.style.backgroundColor = 'transparent';
            item.onclick = async () => {
                await window.languageUtils.changeLanguage(code);
                dropdown.style.display = 'none';
                // Update current language display
                if (currentLanguageElement) {
                    currentLanguageElement.textContent = name;
                }
            };
            item.textContent = name;
            dropdown.appendChild(item);
        });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', function(event) {
        const dropdown = document.getElementById('languageDropdown');
        const languageSelector = document.querySelector('.language-selector');
        if (dropdown && languageSelector && !languageSelector.contains(event.target)) {
            dropdown.style.display = 'none';
        }
    });
} 