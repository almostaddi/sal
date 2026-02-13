// Pre-load script - runs immediately to prevent page flash
// Works with inline critical CSS that hides all pages by default

(function() {
    // Try to load saved state immediately
    const saved = localStorage.getItem('snakesLaddersGameState');
    
    let targetPage = 'home'; // default
    
    if (saved) {
        try {
            const state = JSON.parse(saved);
            
            if (state.gameStarted) {
                // Determine correct page based on state
                if (state.currentInstruction && state.currentInstruction.trim() !== '') {
                    targetPage = 'task';
                } else {
                    targetPage = 'board';
                }
            }
        } catch (e) {
            console.error('Failed to parse saved state:', e);
        }
    }
    
    // Store the target page so main.js can use it
    window.__INITIAL_PAGE__ = targetPage;
    
    console.log('🎯 Preload determined page:', targetPage);
    
    // Function to show the correct page
    function showInitialPage() {
        console.log('🎯 Preload showing page:', targetPage);
        
        // Hide all pages first
        const allPages = ['homePage', 'boardPage', 'taskPage'];
        allPages.forEach(pageId => {
            const page = document.getElementById(pageId);
            if (page) {
                page.style.display = 'none';
                page.classList.remove('active');
            }
        });
        
        // Show target page
        const targetPageElement = document.getElementById(targetPage + 'Page');
        if (targetPageElement) {
            targetPageElement.style.display = 'block';
            targetPageElement.classList.add('active');
            console.log('✅ Page shown:', targetPage);
        } else {
            console.error('❌ Target page not found:', targetPage + 'Page');
        }
    }
    
    // Try to show immediately if DOM is ready
    if (document.readyState === 'loading') {
        // DOM not ready yet, wait for it
        document.addEventListener('DOMContentLoaded', showInitialPage, { once: true });
    } else {
        // DOM already loaded, show immediately
        showInitialPage();
    }
})();
