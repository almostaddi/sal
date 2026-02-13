// Task selection logic

import { getTaskConditions } from '../state/gameState.js';

let taskRegistry = null;

// Load task registry from manifest
export async function loadTaskRegistry() {
    try {
        const manifest = await fetch('tasks/manifest.json').then(r => r.json());
        
        taskRegistry = {
            sets: {
                dressup: { tasks: {} },
                apple: { tasks: {} },
                digging: { tasks: {} },
                teaseanddenial: { tasks: {} }
            },
            snakes: [],
            ladders: [],
            final: [],
            shared: []
        };
        
        // Load each task file from manifest
        for (const [setId, taskFiles] of Object.entries(manifest)) {
            for (const filePath of taskFiles) {
                const taskDef = await loadTaskDefinition(filePath);
                
                // Categorize by type
                if (taskDef.type === 'snake') {
                    taskRegistry.snakes.push({ ...taskDef, filePath });
                } else if (taskDef.type === 'ladder') {
                    taskRegistry.ladders.push({ ...taskDef, filePath });
                } else if (setId === 'final') {
                    taskRegistry.final.push({ ...taskDef, filePath });
                } else if (setId === '_shared') {
                    taskRegistry.shared.push({ ...taskDef, filePath });
                } else {
                    // Regular set task
                    const toyId = taskDef.toyId;
                    if (!taskRegistry.sets[setId].tasks[toyId]) {
                        taskRegistry.sets[setId].tasks[toyId] = [];
                    }
                    taskRegistry.sets[setId].tasks[toyId].push({ ...taskDef, filePath });
                }
            }
        }
        
        console.log('Task registry loaded:', taskRegistry);
        return taskRegistry;
    } catch (error) {
        console.error('Failed to load task registry:', error);
        return null;
    }
}

// Load task definition from HTML file
async function loadTaskDefinition(filePath) {
    try {
        const response = await fetch(filePath);
        const html = await response.text();
        
        // Parse HTML to extract task definition
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const scriptTag = doc.querySelector('script#task-definition');
        
        if (!scriptTag) {
            console.warn(`No task definition found in ${filePath}`);
            return null;
        }
        
        // Extract the export default object
        const scriptContent = scriptTag.textContent;
        const module = { exports: {} };
        const func = new Function('module', 'exports', scriptContent + '; return module.exports.default || exports.default;');
        const taskDef = func(module, module.exports);
        
        return taskDef;
    } catch (error) {
        console.error(`Failed to load task from ${filePath}:`, error);
        return null;
    }
}

// Get all tasks for current toy/set context
function getTasksForCurrentContext() {
    const selectedSets = window.GAME_STATE.selectedSets;
    const toyChecked = window.GAME_STATE.toyChecked;
    const toySetEnabled = window.GAME_STATE.toySetEnabled;
    
    const allTasks = [];
    
    // Get tasks from selected sets
    for (const setId of selectedSets) {
        if (!taskRegistry.sets[setId]) continue;
        
        for (const [toyId, tasks] of Object.entries(taskRegistry.sets[setId].tasks)) {
            // Only include if toy is checked and set-toy combo is enabled
            if (!toyChecked[toyId]) continue;
            
            const toyKey = `${setId}_${toyId}`;
            if (!toySetEnabled[toyKey]) continue;
            
            // Filter out add/remove tasks (handled separately)
            const regularTasks = tasks.filter(task => 
                task.type !== 'add' && task.type !== 'remove'
            );
            
            allTasks.push(...regularTasks);
        }
    }
    
    return allTasks;
}

// Select next task
export function selectNextTask() {
    const conditions = getTaskConditions();
    
    // 1. Check for forced task
    if (window.GAME_STATE.forceNextTask) {
        const taskPath = window.GAME_STATE.forceNextTask;
        window.GAME_STATE.forceNextTask = null;
        return loadTaskByPath(taskPath);
    }
    
    // 2. Check task queue
    if (window.GAME_STATE.scheduledTasks && window.GAME_STATE.scheduledTasks.length > 0) {
        const taskPath = window.GAME_STATE.scheduledTasks.shift();
        return loadTaskByPath(taskPath);
    }
    
    // 3. Get available tasks
    let tasks = getTasksForCurrentContext();
    
    // 4. Filter disabled tasks
    tasks = tasks.filter(task => 
        !window.GAME_STATE.disabledTasks.has(task.filePath)
    );
    
    // 5. Filter by canSelect conditions
    tasks = tasks.filter(task => {
        if (task.excludeFromNormalPool) return false;
        if (task.canSelect && !task.canSelect(conditions)) return false;
        return true;
    });
    
    // 6. Check for "always" tasks
    const alwaysTasks = tasks.filter(task => {
        if (!task.alwaysSelect) return false;
        
        // Check onlyOnce flag
        if (task.onlyOnce) {
            const taskId = `${task.setId}_${task.toyId}_always`;
            if (window.GAME_STATE.completedOnlyOnceTasks[taskId]) {
                return false;
            }
        }
        
        return task.alwaysSelect(conditions);
    });
    
    if (alwaysTasks.length > 0) {
        const selected = alwaysTasks[Math.floor(Math.random() * alwaysTasks.length)];
        
        // Mark onlyOnce task as completed
        if (selected.onlyOnce) {
            const taskId = `${selected.setId}_${selected.toyId}_always`;
            window.GAME_STATE.completedOnlyOnceTasks[taskId] = true;
        }
        
        return selected;
    }
    
    // 7. Apply weight modifications
    const weighted = tasks.map(task => ({
        task,
        weight: Math.max(0, (task.baseWeight || 1) + (window.GAME_STATE.taskWeights[task.filePath] || 0))
    })).filter(t => t.weight > 0);
    
    // 8. If no tasks available, use general fallback
    if (weighted.length === 0) {
        return getGeneralFallback();
    }
    
    // 9. Random weighted selection
    return weightedRandomSelect(weighted);
}

// Select snake/ladder task
export function selectSnakeLadderTask(type, fromPos, toPos) {
    const conditions = getTaskConditions();
    const snakeLadderInfo = {
        type: type,
        from: fromPos,
        to: toPos,
        distance: toPos - fromPos
    };
    
    // Get all tasks of this type
    const allTasks = type === 'snake' ? taskRegistry.snakes : taskRegistry.ladders;
    
    // Filter by conditions
    const availableTasks = allTasks.filter(task => {
        if (task.isFallback) return true;
        if (task.canSelect && !task.canSelect(conditions)) return false;
        return true;
    });
    
    // Prioritize: set-specific > type-specific fallback > general fallback
    const setSpecific = availableTasks.filter(t => !t.isFallback && t.setId);
    const typeFallback = availableTasks.filter(t => t.isFallback && t.type === type);
    
    let taskToUse;
    if (setSpecific.length > 0) {
        taskToUse = setSpecific[Math.floor(Math.random() * setSpecific.length)];
    } else if (typeFallback.length > 0) {
        taskToUse = typeFallback[0];
    } else {
        taskToUse = getGeneralFallback();
    }
    
    return { task: taskToUse, snakeLadderInfo };
}

// Select final challenge task
export function selectFinalChallenge() {
    const conditions = getTaskConditions();
    
    // Check for "always" final challenges
    const alwaysTasks = taskRegistry.final.filter(t => 
        t.alwaysSelect && t.alwaysSelect(conditions)
    );
    
    if (alwaysTasks.length > 0) {
        return alwaysTasks[Math.floor(Math.random() * alwaysTasks.length)];
    }
    
    // Weighted selection based on probabilities
    const roll = Math.random() * 100;
    let targetTaskId = null;
    
    const settings = window.GAME_STATE.finalChallengeSettings;
    
    if (roll < settings.stroking) {
        targetTaskId = 'stroking';
    } else if (roll < settings.stroking + settings.vibe) {
        targetTaskId = 'vibe';
    } else {
        targetTaskId = 'anal';
    }
    
    // Find task with matching ID
    let selectedTask = taskRegistry.final.find(t => t.id === targetTaskId);
    
    // If not found or doesn't pass canSelect, use fallback
    if (!selectedTask || (selectedTask.canSelect && !selectedTask.canSelect(conditions))) {
        selectedTask = taskRegistry.final.find(t => t.id === 'fallback');
    }
    
    // If STILL nothing, use general fallback
    if (!selectedTask) {
        return getGeneralFallback();
    }
    
    return selectedTask;
}

// Get general fallback task
function getGeneralFallback() {
    return taskRegistry.shared.find(t => t.type === 'general-fallback');
}

// Load task by file path
async function loadTaskByPath(filePath) {
    return await loadTaskDefinition(filePath);
}

// Weighted random selection
function weightedRandomSelect(weightedTasks) {
    const totalWeight = weightedTasks.reduce((sum, t) => sum + t.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const item of weightedTasks) {
        random -= item.weight;
        if (random <= 0) {
            return item.task;
        }
    }
    
    return weightedTasks[weightedTasks.length - 1].task;
}

// Expose functions globally
window.selectNextTask = selectNextTask;
window.selectSnakeLadderTask = selectSnakeLadderTask;
window.selectFinalChallenge = selectFinalChallenge;
