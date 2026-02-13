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
    
    // When DOM is ready, immediately show the correct page
    document.addEventListener('DOMContentLoaded', function() {
        console.log('🎯 Preload showing page:', targetPage);
        
        // Remove the critical CSS inline styles and apply normal visibility
        const targetPageElement = document.getElementById(targetPage + 'Page');
        if (targetPageElement) {
            targetPageElement.style.display = 'block';
            targetPageElement.classList.add('active');
        }
    }, { once: true, capture: true }); // Run as early as possible
})();
