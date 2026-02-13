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
    animatePlayer
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

// Show/hide pages
function showPage(pageName) {
    console.log('🔄 Switching to page:', pageName);
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show target page
    const targetPage = document.getElementById(pageName + 'Page');
    if (targetPage) {
        targetPage.classList.add('active');
        console.log('✅ Now showing:', pageName);
    } else {
        console.error('❌ Page not found:', pageName + 'Page');
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎲 Snakes and Ladders - Initializing...');
    
    // Initialize state FIRST
    initializeState();
    initializeGameFunctions(onTaskComplete);
    
    // Load saved game state
    const savedState = loadGameState();
    
    // PRE-SET UI elements BEFORE showing page to prevent flash
    if (savedState && savedState.gameStarted) {
        // Update turn counter and dice result immediately
        document.getElementById('turnCounter').textContent = `Turn: ${savedState.turnCount}`;
        document.getElementById('diceResult').textContent = savedState.diceResultText || 'Dice: -';
        
        // Update button text based on phase
        const rollDiceButton = document.getElementById('rollDice');
        const phase = savedState.gamePhase || 'awaiting_dice_roll';
        
        if (phase === 'awaiting_normal_task' || 
            phase === 'awaiting_snake_ladder_task' || 
            phase === 'awaiting_snake_ladder_movement') {
            rollDiceButton.textContent = '➡️ Continue';
        } else {
            rollDiceButton.textContent = '🎲 Roll Dice';
        }
    }
    
    // Determine which page to show based on game phase
    let initialPage = 'home'; // Default
    if (savedState && savedState.gameStarted) {
        const phase = savedState.gamePhase || 'awaiting_dice_roll';
        
        if (savedState.currentInstruction && savedState.currentInstruction.trim() !== '') {
            // Currently showing a task
            initialPage = 'task';
        } else if (phase === 'awaiting_dice_roll' || 
                   phase === 'awaiting_normal_task' || 
                   phase === 'awaiting_snake_ladder_task' ||
                   phase === 'awaiting_snake_ladder_movement') {
            // On board, waiting for some action
            initialPage = 'board';
        } else {
            // Default to board if game started
            initialPage = 'board';
        }
    }
    
    console.log('📄 Initial page:', initialPage, '| Phase:', savedState?.gamePhase);
    
    // Show the correct page immediately (after UI is pre-set)
    showPage(initialPage);
    
    // Initialize board
    const initialBoardSize = savedState?.totalSquares || 100;
    boardRenderer = new BoardRenderer(initialBoardSize);
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
    if (savedState) {
        restoreSavedGame(savedState);
    }
    
    console.log('✅ Game Initialized');
});

// Set up event listeners
function setupEventListeners() {
    // Start game button
    document.getElementById('startButton').addEventListener('click', startGame);
    
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
    window.GAME_STATE.gamePhase = 'awaiting_dice_roll';
    
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
    window.GAME_STATE.diceResultText = 'Dice: -';
    
    // Set up initial roll dice button handler
    const rollDiceButton = document.getElementById('rollDice');
    rollDiceButton.onclick = rollDice;
    rollDiceButton.disabled = false;
    
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
    
    saveGameState();
}

// Restore saved game
function restoreSavedGame(state) {
    console.log('💾 Restoring saved game...', state);
    console.log('📍 Game phase:', state.gamePhase);
    
    // Restore UI state
    restoreUIState(state);
    
    // If game was in progress, restore board
    if (state.gameStarted) {
        boardRenderer.updateSize(state.totalSquares);
        boardRenderer.create();
        
        // Restore player position
        setPlayerPosition(state.playerPosition);
        
        // Note: Turn counter and dice result already set in DOMContentLoaded
        
        const rollDiceButton = document.getElementById('rollDice');
        const phase = state.gamePhase || 'awaiting_dice_roll';
        
        // Restore based on game phase
        if (state.currentInstruction && state.currentInstruction.trim() !== '') {
            // Was viewing a task - restore it
            const instructions = document.getElementById('instructions');
            instructions.innerHTML = state.currentInstruction;
            instructions.classList.add('active');
            
            // Re-attach the continue button event handler
            const continueButton = instructions.querySelector('#continueButton');
            if (continueButton) {
                continueButton.onclick = () => {
                    if (window.GAME_FUNCTIONS && window.GAME_FUNCTIONS.completeTask) {
                        window.GAME_FUNCTIONS.completeTask();
                    }
                };
            }
        } else if (phase === 'awaiting_snake_ladder_task') {
            // Waiting to show snake/ladder task
            // Button text already set to Continue
            rollDiceButton.disabled = false;
            
            // Highlight destination
            if (state.pendingSnakeLadder) {
                const destSquare = document.getElementById(`square-${state.pendingSnakeLadder.to}`);
                if (destSquare) {
                    destSquare.classList.add(
                        state.pendingSnakeLadder.type === 'snake' ? 'snake-destination' : 'ladder-destination'
                    );
                }
                
                rollDiceButton.onclick = () => {
                    if (destSquare) {
                        destSquare.classList.remove('snake-destination', 'ladder-destination');
                    }
                    showPage('task');
                    window.displaySnakeLadderTask(
                        state.pendingSnakeLadder.type,
                        state.pendingSnakeLadder.from,
                        state.pendingSnakeLadder.to
                    );
                };
            }
        } else if (phase === 'awaiting_snake_ladder_movement') {
            // Waiting to move piece after snake/ladder task
            // Button text already set to Continue
            rollDiceButton.disabled = false;
            
            if (state.pendingSnakeLadder) {
                const savedPending = state.pendingSnakeLadder;
                
                rollDiceButton.onclick = () => {
                    rollDiceButton.disabled = true;
                    rollDiceButton.onclick = null;
                    
                    // Directly animate the movement
                    animatePlayer(savedPending.from, savedPending.to, () => {
                        // Update player position
                        setPlayerPosition(savedPending.to);
                        window.GAME_STATE.playerPosition = savedPending.to;
                        
                        const totalSquares = window.GAME_STATE.totalSquares || 100;
                        
                        // Check if final square after snake/ladder
                        if (savedPending.to === totalSquares) {
                            // STATE: Ready for final challenge
                            window.GAME_STATE.gamePhase = 'awaiting_final_challenge';
                            window.GAME_STATE.pendingSnakeLadder = null;
                            window.GAME_FUNCTIONS.saveState();
                            
                            showPage('task');
                            window.displayFinalChallenge();
                            return;
                        }
                        
                        // STATE: Waiting to show normal task at destination
                        window.GAME_STATE.gamePhase = 'awaiting_normal_task';
                        window.GAME_STATE.pendingSnakeLadder = null;
                        window.GAME_FUNCTIONS.saveState();
                        
                        // Stay on board, show Continue button for the destination square task
                        rollDiceButton.textContent = '➡️ Continue';
                        rollDiceButton.disabled = false;
                        rollDiceButton.onclick = null;
                        
                        // Second continue: show the normal task at destination square
                        rollDiceButton.onclick = () => {
                            showPage('task');
                            window.displayRandomInstructionWithAddRemove(savedPending.addRemoveTask);
                        };
                    }, true);
                };
            }
        } else if (phase === 'awaiting_normal_task') {
            // Waiting to show normal task
            // Button text already set to Continue
            rollDiceButton.disabled = false;
            rollDiceButton.onclick = () => {
                showPage('task');
                window.displayRandomInstructionWithAddRemove(state.pendingAddRemoveTask);
            };
        } else {
            // awaiting_dice_roll or default
            // Button text already set to Roll Dice
            rollDiceButton.disabled = false;
            rollDiceButton.onclick = rollDice;
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
