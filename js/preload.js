// Pre-load script - runs immediately to prevent page flash
// This must be placed in the <head> before any body content loads

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
    
    // When DOM is ready, immediately show the correct page
    document.addEventListener('DOMContentLoaded', function() {
        // Hide all pages first
        const pages = document.querySelectorAll('.page');
        pages.forEach(page => {
            page.style.display = 'none';
            page.classList.remove('active');
        });
        
        // Show the correct page immediately
        const targetPageElement = document.getElementById(targetPage + 'Page');
        if (targetPageElement) {
            targetPageElement.style.display = 'block';
            targetPageElement.classList.add('active');
        }
    }, { once: true, capture: true }); // Run as early as possible
})();
