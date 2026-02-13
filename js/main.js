// Main entry point - orchestrates the game

// Imports
import { 
    initializeState, 
    initializeGameFunctions,
    saveGameState, 
    loadGameState, 
    resetGameState 
} from './state/gameState.js';
import { BoardRenderer } from './board/boardRenderer.js';
import { 
    rollDice, 
    onTaskComplete, 
    setPlayerPosition,
    getPlayerPosition,
    resetPlayerState,
    setPendingSnakeLadder,
    getPendingSnakeLadder
} from './board/playerMovement.js';

// Game components
let boardRenderer;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeState();
    initializeGameFunctions(onTaskComplete);
    boardRenderer = new BoardRenderer(100);
    boardRenderer.create();
    setupEventListeners();
    restoreSavedGame();
});

// Set up event listeners
function setupEventListeners() {
    // Start game button
    document.getElementById('startButton').addEventListener('click', startGame);
    
    // Roll dice button
    document.getElementById('rollDice').addEventListener('click', rollDice);
    
    // Board size selector
    document.getElementById('boardSizeSelect').addEventListener('change', updateBoardSize);
    
    // Reset button
    document.getElementById('resetBtn').addEventListener('click', () => {
        document.getElementById('resetModal').classList.add('active');
    });
    
    // Patch notes button
    document.getElementById('patchNotesBtn').addEventListener('click', () => {
        document.getElementById('patchNotesModal').classList.add('active');
    });
    
    // Modal close buttons
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal').classList.remove('active');
        });
    });
    
    // Reset modal buttons
    document.getElementById('confirmReset').addEventListener('click', resetGame);
    document.getElementById('cancelReset').addEventListener('click', () => {
        document.getElementById('resetModal').classList.remove('active');
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
    });
    
    // Window resize - rescale board
    window.addEventListener('resize', () => {
        if (boardRenderer) {
            boardRenderer.scale();
        }
    });
}

// Show/hide pages
export function showPage(pageName) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
        page.style.display = 'none';
    });
    
    const targetPage = document.getElementById(pageName + 'Page');
    if (targetPage) {
        targetPage.style.display = 'block';
        targetPage.classList.add('active');
    }
}

// Start game
function startGame() {
    // Validate player name
    const playerName = document.getElementById('playerNameInput').value.trim();
    if (!playerName) {
        alert('⚠️ Please enter your name before starting!');
        return;
    }
    
    window.GAME_STATE.playerName = playerName;
    window.GAME_STATE.gameStarted = true;
    
    // Get board size
    const boardSize = parseInt(document.getElementById('boardSizeSelect').value);
    window.GAME_STATE.totalSquares = boardSize;
    boardRenderer.updateSize(boardSize);
    
    // Create board with selected size
    boardRenderer.create();
    
    // Show board page
    showPage('board');
    
    // Reset turn counter
    window.GAME_STATE.turnCount = 0;
    document.getElementById('turnCounter').textContent = 'Turn: 0';
    document.getElementById('diceResult').textContent = 'Dice: -';
    
    // Save state
    saveGameState();
}

// Update board size
function updateBoardSize() {
    const newSize = parseInt(document.getElementById('boardSizeSelect').value);
    window.GAME_STATE.totalSquares = newSize;
    
    if (boardRenderer && window.GAME_STATE.gameStarted) {
        boardRenderer.updateSize(newSize);
        boardRenderer.create();
    }
}

// Restore saved game
function restoreSavedGame() {
    const state = loadGameState();
    if (!state) return;
    
    // If game was in progress, restore UI
    if (state.gameStarted) {
        document.getElementById('playerNameInput').value = state.playerName;
        document.getElementById('boardSizeSelect').value = state.totalSquares;
        
        boardRenderer.updateSize(state.totalSquares);
        boardRenderer.create();
        
        // Restore player position
        setPlayerPosition(state.playerPosition);
        
        // Restore pending snake/ladder
        if (state.pendingSnakeLadder) {
            setPendingSnakeLadder(state.pendingSnakeLadder);
        }
        
        // Update UI
        document.getElementById('turnCounter').textContent = `Turn: ${state.turnCount}`;
        document.getElementById('diceResult').textContent = state.diceResultText || 'Dice: -';
        
        // Show board page
        showPage('board');
    }
}

// Reset game
function resetGame() {
    resetGameState();
    resetPlayerState();
    
    // Reset UI
    document.getElementById('playerNameInput').value = '';
    document.getElementById('turnCounter').textContent = 'Turn: 0';
    document.getElementById('diceResult').textContent = 'Dice: -';
    document.getElementById('testJumpInput').value = '';
    
    // Close modal
    document.getElementById('resetModal').classList.remove('active');
    
    // Show home page
    showPage('home');
}

// Expose showPage globally for other modules
window.showPage = showPage;

console.log('🎲 Snakes and Ladders - Game Initialized');
