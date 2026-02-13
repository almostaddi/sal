// Pre-load script - determines which page to show on load

(function() {
    console.log('🎯 Preload script running...');
    
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
    
    console.log('📄 Target page determined:', targetPage);
    
    // Function to show the correct page
    function showInitialPage() {
        console.log('🎯 Showing page:', targetPage);
        
        // Get all page elements
        const homePage = document.getElementById('homePage');
        const boardPage = document.getElementById('boardPage');
        const taskPage = document.getElementById('taskPage');
        
        // Hide all pages
        if (homePage) {
            homePage.classList.remove('active');
            homePage.style.display = 'none';
        }
        if (boardPage) {
            boardPage.classList.remove('active');
            boardPage.style.display = 'none';
        }
        if (taskPage) {
            taskPage.classList.remove('active');
            taskPage.style.display = 'none';
        }
        
        // Show target page
        let targetElement = null;
        if (targetPage === 'home' && homePage) {
            targetElement = homePage;
        } else if (targetPage === 'board' && boardPage) {
            targetElement = boardPage;
        } else if (targetPage === 'task' && taskPage) {
            targetElement = taskPage;
        }
        
        if (targetElement) {
            targetElement.style.display = 'block';
            targetElement.classList.add('active');
            console.log('✅ Page shown successfully:', targetPage);
        } else {
            console.error('❌ Could not find page element:', targetPage + 'Page');
        }
    }
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', showInitialPage);
    } else {
        showInitialPage();
    }
})();
