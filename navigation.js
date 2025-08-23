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
        </div>
    `;
    
    // Insert navigation at the beginning of body
    document.body.insertAdjacentHTML('afterbegin', navHTML);
    
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