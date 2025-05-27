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
                justify-content: center;
            ">
                <a href="index.html" style="
                    text-decoration: none;
                    display: block;
                    text-align: center;
                ">
                    <img 
                        src="assets/images/commonhelpsource-logo.png" 
                        alt="CommonHelpSource Logo" 
                        style="
                            max-height: 60px;
                            width: auto;
                            margin: 0 auto;
                            display: block;
                        "
                    >
                </a>
            </div>
        </header>
    `;

    // Insert header at the beginning of the body
    document.body.insertAdjacentHTML('afterbegin', headerHTML);
}); 