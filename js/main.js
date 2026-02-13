// Main entry point - orchestrates the game

// State management
import { 
    initializeState, 
    initializeGameFunctions,
    saveGameState, 
    loadGameState, 
    resetGameState 
} from './state/gameState.js';

// Board components
import { BoardRenderer } from './board/boardRenderer.js';
import { 
    rollDice, 
    onTaskComplete, 
    setPlayerPosition,
    resetPlayerState,
    setPendingSnakeLadder
} from './board/playerMovement.js';

// Task system
import { loadTaskRegistry } from './tasks/taskSelector.js';
import { 
    loadAndDisplayTask,
    loadAndDisplaySnakeLadderTask,
    loadAndDisplayFinalChallenge
} from './tasks/taskLoader.js';

// UI components
import { initializeUI, restoreUIState } from './ui.js';

// Data
import { INSTRUCTION_SETS } from './data/instructionSets.js';

// Game components
let boardRenderer;
let taskRegistryLoaded = false;

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎲 Snakes and Ladders - Initializing...');
    
    // Initialize state
    initializeState();
    initializeGameFunctions(onTaskComplete);
    
    // Initialize board
    boardRenderer = new BoardRenderer(100);
    boardRenderer.create();
    
    // Initialize UI
    initializeUI();
    
    // Load task registry
    console.log('📦 Loading task registry...');
    const registry = await loadTaskRegistry();
    if (registry) {
        taskRegistryLoaded = true;
        console.log('✅ Task registry loaded');
    } else {
        console.warn('⚠️ Failed to load task registry - using fallback tasks');
    }
    
    // Setup event listeners
    setupEventListeners();
    
    // Restore saved game if exists
    restoreSavedGame();
    
    console.log('✅ Game Initialized');
});

// Set up event listeners
function setupEventListeners() {
    // Start game button
    document.getElementById('startButton').addEventListener('click', startGame);
    
    // Roll dice button
    document.getElementById('rollDice').addEventListener('click', rollDice);
    
    // Board size selector
    document.getElementById('boardSizeSelect').addEventListener('change', updateBoardSize);
    
    // Player name input
    document.getElementById('playerNameInput').addEventListener('input', function() {
        window.GAME_STATE.playerName = this.value;
        saveGameState();
    });
    
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
    // Validate instruction sets
    const selectedSets = window.GAME_STATE.selectedSets;
    if (selectedSets.length === 0) {
        alert('⚠️ Please select at least one instruction set before starting!');
        return;
    }
    
    // Validate toys
    const hasToys = Object.values(window.GAME_STATE.toyQuantities).some(qty => qty > 0);
    const hasCheckedToys = Object.values(window.GAME_STATE.toyChecked).some(checked => checked);
    
    if (!hasToys || !hasCheckedToys) {
        alert('⚠️ Please select at least one toy before starting!');
        return;
    }
    
    // Validate player name
    const playerName = document.getElementById('playerNameInput').value.trim();
    if (!playerName) {
        alert('⚠️ Please enter your name before starting!');
        return;
    }
    
    // Validate task registry
    if (!taskRegistryLoaded) {
        alert('⚠️ Task system is still loading. Please wait a moment and try again.');
        return;
    }
    
    window.GAME_STATE.playerName = playerName;
    window.GAME_STATE.gameStarted = true;
    
    // Get board size
    const boardSize = parseInt(document.getElementById('boardSizeSelect').value);
    window.GAME_STATE.totalSquares = boardSize;
    boardRenderer.updateSize(boardSize);
    
    // Handle cage "start worn" option
    if (window.GAME_STATE.cageWorn && window.GAME_STATE.toyChecked['cage']) {
        window.addToyToBodyPart('Pe', 'cage');
    }
    
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
    
    console.log('🎮 Game Started!');
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
    if (!state) {
        console.log('No saved game found');
        return;
    }
    
    console.log('💾 Restoring saved game...');
    
    // Restore UI state
    restoreUIState(state);
    
    // If game was in progress, restore board
    if (state.gameStarted) {
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
        
        // Show appropriate page
        if (state.currentInstruction && state.currentInstruction.trim() !== '') {
            showPage('task');
            const instructions = document.getElementById('instructions');
            instructions.innerHTML = state.currentInstruction;
            instructions.classList.add('active');
        } else {
            showPage('board');
        }
        
        console.log('✅ Game restored');
    }
}

// Reset game
function resetGame() {
    console.log('🔄 Resetting game...');
    
    resetGameState();
    resetPlayerState();
    
    // Reset UI
    document.getElementById('playerNameInput').value = '';
    document.getElementById('boardSizeSelect').value = '100';
    document.getElementById('turnCounter').textContent = 'Turn: 0';
    document.getElementById('diceResult').textContent = 'Dice: -';
    document.getElementById('testJumpInput').value = '';
    
    // Clear instructions
    const instructions = document.getElementById('instructions');
    instructions.classList.remove('active');
    instructions.innerHTML = '';
    
    // Reset checkboxes
    document.querySelectorAll('#instructionSetCheckboxes input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });
    
    // Re-initialize UI
    initializeUI();
    
    // Close modal
    document.getElementById('resetModal').classList.remove('active');
    
    // Show home page
    showPage('home');
    
    console.log('✅ Game reset complete');
}

// Expose showPage globally for other modules
window.showPage = showPage;

// Expose task display functions globally for compatibility
window.displayRandomInstruction = async () => {
    const task = window.selectNextTask();
    if (task) {
        await loadAndDisplayTask(task);
    }
};

window.displayRandomInstructionWithAddRemove = async (addRemoveTask) => {
    const task = window.selectNextTask();
    if (task) {
        await loadAndDisplayTask(task, addRemoveTask);
    }
};

window.displaySnakeLadderTask = loadAndDisplaySnakeLadderTask;
window.displayFinalChallenge = loadAndDisplayFinalChallenge;
