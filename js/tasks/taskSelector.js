// Task selection logic

import { getTaskConditions } from '../state/gameState.js';

let taskRegistry = null;

// Load task registry from manifest
export async function loadTaskRegistry() {
    try {
        const manifest = await fetch('tasks/manifest.json').then(r => r.json());
        
        taskRegistry = {
            sets: {
                dressup: { tasks: {}, snakes: [], ladders: [], finals: [] },
                apple: { tasks: {}, snakes: [], ladders: [], finals: [] },
                digging: { tasks: {}, snakes: [], ladders: [], finals: [] },
                teaseanddenial: { tasks: {}, snakes: [], ladders: [], finals: [] }
            },
            fallbacks: {
                snake: null,
                ladder: null,
                final: null,
                general: null
            }
        };
        
        // Load each task file from manifest
        for (const [category, taskFiles] of Object.entries(manifest)) {
            for (const filePath of taskFiles) {
                const taskDef = await loadTaskDefinition(filePath);
                
                if (!taskDef) continue;
                
                // Handle fallbacks
                if (category === '_fallbacks') {
                    if (taskDef.type === 'snake-fallback') {
                        taskRegistry.fallbacks.snake = { ...taskDef, filePath };
                    } else if (taskDef.type === 'ladder-fallback') {
                        taskRegistry.fallbacks.ladder = { ...taskDef, filePath };
                    } else if (taskDef.type === 'final-fallback') {
                        taskRegistry.fallbacks.final = { ...taskDef, filePath };
                    } else if (taskDef.type === 'general-fallback') {
                        taskRegistry.fallbacks.general = { ...taskDef, filePath };
                    }
                }
                // Handle set-specific tasks
                else if (taskRegistry.sets[category]) {
                    if (taskDef.type === 'snake') {
                        taskRegistry.sets[category].snakes.push({ ...taskDef, filePath });
                    } else if (taskDef.type === 'ladder') {
                        taskRegistry.sets[category].ladders.push({ ...taskDef, filePath });
                    } else if (taskDef.type === 'final') {
                        taskRegistry.sets[category].finals.push({ ...taskDef, filePath });
                    } else {
                        // Regular set task
                        const toyId = taskDef.toyId;
                        if (!taskRegistry.sets[category].tasks[toyId]) {
                            taskRegistry.sets[category].tasks[toyId] = [];
                        }
                        taskRegistry.sets[category].tasks[toyId].push({ ...taskDef, filePath });
                    }
                }
                
                console.log(`✅ Loaded: ${filePath}`);
            }
        }
        
        console.log('Task registry loaded:', taskRegistry);
        return taskRegistry;
    } catch (error) {
        console.error('Failed to load task registry:', error);
        return null;
    }
}

// Load task definition from JS module file
async function loadTaskDefinition(filePath) {
    try {
        const module = await import(`/${filePath}`);
        return module.default;
    } catch (error) {
        // Don't log errors - files might not exist
        throw error;
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
        return taskRegistry.fallbacks.general;
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
    
    const selectedSets = window.GAME_STATE.selectedSets;
    const allTasks = [];
    
    // Collect set-specific snake/ladder tasks from selected sets
    for (const setId of selectedSets) {
        if (!taskRegistry.sets[setId]) continue;
        
        const setTasks = type === 'snake' ? 
            taskRegistry.sets[setId].snakes : 
            taskRegistry.sets[setId].ladders;
        
        allTasks.push(...setTasks);
    }
    
    // Filter by conditions
    const availableTasks = allTasks.filter(task => {
        if (task.canSelect && !task.canSelect(conditions)) return false;
        return true;
    });
    
    // If set-specific tasks available, pick one
    if (availableTasks.length > 0) {
        const taskToUse = availableTasks[Math.floor(Math.random() * availableTasks.length)];
        return { task: taskToUse, snakeLadderInfo };
    }
    
    // Otherwise use fallback
    const fallbackTask = type === 'snake' ? 
        taskRegistry.fallbacks.snake : 
        taskRegistry.fallbacks.ladder;
    
    return { task: fallbackTask, snakeLadderInfo };
}

// Select final challenge task
export function selectFinalChallenge() {
    const conditions = getTaskConditions();
    const selectedSets = window.GAME_STATE.selectedSets;
    
    // Collect all set-specific final challenges
    const allFinalTasks = [];
    for (const setId of selectedSets) {
        if (!taskRegistry.sets[setId]) continue;
        allFinalTasks.push(...taskRegistry.sets[setId].finals);
    }
    
    // Check for "always" final challenges
    const alwaysTasks = allFinalTasks.filter(t => 
        t.alwaysSelect && t.alwaysSelect(conditions)
    );
    
    if (alwaysTasks.length > 0) {
        return alwaysTasks[Math.floor(Math.random() * alwaysTasks.length)];
    }
    
    // Filter by canSelect and weight
    const availableTasks = allFinalTasks.filter(task => {
        if (task.canSelect && !task.canSelect(conditions)) return false;
        return true;
    });
    
    // Weighted selection if tasks available
    if (availableTasks.length > 0) {
        const weighted = availableTasks.map(task => ({
            task,
            weight: task.weight || 1
        }));
        
        return weightedRandomSelect(weighted);
    }
    
    // Use fallback
    return taskRegistry.fallbacks.final;
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
