// Shared Navigation JavaScript
function initNavigation() {
    // Create navigation HTML
    const navHTML = `
        <header class="nav-header">
            <div class="nav-container">
                <a href="index.html" class="nav-brand">
                    <span class="nav-logo">📊</span>
                    <span class="nav-title">Affiliate Link Analytics</span>
                </a>
                
                <nav class="nav-links">
                    <a href="index.html" class="nav-link" data-page="index">Dashboard</a>
                    <a href="by-url.html" class="nav-link" data-page="by-url">By URL Analysis</a>
                    <a href="https://github.com/merchantalternatives/affiliate-link-analytics" class="nav-link" target="_blank">
                        <span style="display: inline-flex; align-items: center; gap: 5px;">
                            GitHub
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"></path>
                                <polyline points="15 3 21 3 21 9"></polyline>
                                <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                        </span>
                    </a>
                </nav>
                
                <div class="hamburger" id="hamburger">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        </header>
        
        <div class="mobile-menu" id="mobile-menu">
            <a href="index.html" class="mobile-nav-link" data-page="index">📈 Dashboard</a>
            <a href="by-url.html" class="mobile-nav-link" data-page="by-url">🔗 By URL Analysis</a>
            <a href="https://github.com/merchantalternatives/affiliate-link-analytics" class="mobile-nav-link" target="_blank">
                💻 View on GitHub
            </a>
        </div>
    `;
    
    // Create footer HTML
    const footerHTML = `
        <footer class="footer">
            <div class="footer-content">
                <div class="footer-links">
                    <a href="index.html" class="footer-link">Dashboard</a>
                    <a href="by-url.html" class="footer-link">By URL Analysis</a>
                    <a href="https://github.com/merchantalternatives/affiliate-link-analytics" class="footer-link" target="_blank">GitHub Repository</a>
                </div>
                <div class="footer-text">
                    © 2024 Affiliate Link Analytics | Powered by serp.ly click data
                </div>
            </div>
        </footer>
    `;
    
    // Insert navigation at the beginning of body
    document.body.insertAdjacentHTML('afterbegin', navHTML);
    
    // Insert footer at the end of body
    document.body.insertAdjacentHTML('beforeend', footerHTML);
    
    // Set active page
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '') || 'index';
    document.querySelectorAll('[data-page]').forEach(link => {
        if (link.getAttribute('data-page') === currentPage) {
            link.classList.add('active');
        }
    });
    
    // Mobile menu toggle
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobile-menu');
    
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        mobileMenu.classList.toggle('active');
    });
    
    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
            hamburger.classList.remove('active');
            mobileMenu.classList.remove('active');
        }
    });
    
    // Close mobile menu when window resizes to desktop
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            hamburger.classList.remove('active');
            mobileMenu.classList.remove('active');
        }
    });
}

// Initialize navigation when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavigation);
} else {
    initNavigation();
}