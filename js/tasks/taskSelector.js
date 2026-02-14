// Task selection logic with manifest-based pre-filtering

import { getTaskConditions } from '../state/gameState.js';

let taskRegistry = null;
let manifestMetadata = null;

// Load task registry from manifest
export async function loadTaskRegistry() {
    try {
        const manifest = await fetch('js/tasks/manifest.json').then(r => r.json());
        
        taskRegistry = {
            sets: {
                dressup: { tasks: {}, add: {}, remove: {}, snakes: [], ladders: [], finals: [] },
                apple: { tasks: {}, add: {}, remove: {}, snakes: [], ladders: [], finals: [] },
                digging: { tasks: {}, add: {}, remove: {}, snakes: [], ladders: [], finals: [] },
                teaseanddenial: { tasks: {}, add: {}, remove: {}, snakes: [], ladders: [], finals: [] }
            },
            fallbacks: {
                snake: null,
                ladder: null,
                final: null,
                general: null
            },
            metadata: {
                // Store manifest metadata for fast filtering
                bySet: {},
                byToy: {}
            }
        };
        
        manifestMetadata = taskRegistry.metadata;
        
        // Load each task file from manifest
        for (const [category, categoryData] of Object.entries(manifest)) {
            // Handle fallbacks
            if (category === '_fallbacks') {
                for (const filePath of categoryData) {
                    const taskDef = await loadTaskDefinition(filePath);
                    
                    if (!taskDef) {
                        console.warn(`⚠️ Failed to load: ${filePath}`);
                        continue;
                    }
                    
                    if (taskDef.type === 'snake' && taskDef.isFallback) {
                        taskRegistry.fallbacks.snake = { ...taskDef, filePath };
                        console.log(`✅ Loaded snake fallback: ${filePath}`);
                    } else if (taskDef.type === 'ladder' && taskDef.isFallback) {
                        taskRegistry.fallbacks.ladder = { ...taskDef, filePath };
                        console.log(`✅ Loaded ladder fallback: ${filePath}`);
                    } else if (taskDef.type === 'final') {
                        taskRegistry.fallbacks.final = { ...taskDef, filePath };
                        console.log(`✅ Loaded final fallback: ${filePath}`);
                    } else if (taskDef.type === 'general-fallback') {
                        taskRegistry.fallbacks.general = { ...taskDef, filePath };
                        console.log(`✅ Loaded general fallback: ${filePath}`);
                    }
                }
            }
            // Handle set-specific tasks
            else if (taskRegistry.sets[category]) {
                // Initialize metadata storage for this set
                if (!manifestMetadata.bySet[category]) {
                    manifestMetadata.bySet[category] = [];
                }
                
                // Load regular tasks
                if (categoryData.tasks) {
                    for (const filePath of categoryData.tasks) {
                        const taskDef = await loadTaskDefinition(filePath);
                        
                        if (!taskDef) {
                            console.warn(`⚠️ Failed to load: ${filePath}`);
                            continue;
                        }
                        
                        if (taskDef.type === 'snake') {
                            taskRegistry.sets[category].snakes.push({ ...taskDef, filePath });
                            console.log(`✅ Loaded: ${filePath}`);
                        } else if (taskDef.type === 'ladder') {
                            taskRegistry.sets[category].ladders.push({ ...taskDef, filePath });
                            console.log(`✅ Loaded: ${filePath}`);
                        } else if (taskDef.type === 'final') {
                            taskRegistry.sets[category].finals.push({ ...taskDef, filePath });
                            console.log(`✅ Loaded: ${filePath}`);
                        } else {
                            // Regular set task - store in registry
                            const toyId = taskDef.toyId;
                            if (!taskRegistry.sets[category].tasks[toyId]) {
                                taskRegistry.sets[category].tasks[toyId] = [];
                            }
                            taskRegistry.sets[category].tasks[toyId].push({ ...taskDef, filePath });
                            
                            // Store metadata for fast filtering
                            const metadata = {
                                id: taskDef.id,
                                setId: category,
                                toyId: toyId,
                                filePath: filePath,
                                requires: taskDef.requires || {},
                                baseWeight: taskDef.baseWeight || 1
                            };
                            manifestMetadata.bySet[category].push(metadata);
                            
                            // Index by toy as well
                            const toyKey = `${category}_${toyId}`;
                            if (!manifestMetadata.byToy[toyKey]) {
                                manifestMetadata.byToy[toyKey] = [];
                            }
                            manifestMetadata.byToy[toyKey].push(metadata);
                            
                            console.log(`✅ Loaded: ${filePath}`);
                        }
                    }
                }
                
                // Load add tasks
                if (categoryData.add) {
                    for (const filePath of categoryData.add) {
                        const taskDef = await loadTaskDefinition(filePath);
                        
                        if (!taskDef) {
                            console.warn(`⚠️ Failed to load add task: ${filePath}`);
                            continue;
                        }
                        
                        const toyId = taskDef.toyId;
                        if (!toyId) {
                            console.warn(`⚠️ Add task missing toyId: ${filePath}`);
                            continue;
                        }
                        
                        if (!taskRegistry.sets[category].add[toyId]) {
                            taskRegistry.sets[category].add[toyId] = [];
                        }
                        taskRegistry.sets[category].add[toyId].push({ 
                            ...taskDef, 
                            filePath,
                            bodyPart: taskDef.bodyPart
                        });
                        console.log(`✅ Loaded add task: ${filePath} (${toyId} -> ${taskDef.bodyPart})`);
                    }
                }
                
                // Load remove tasks
                if (categoryData.remove) {
                    for (const filePath of categoryData.remove) {
                        const taskDef = await loadTaskDefinition(filePath);
                        
                        if (!taskDef) {
                            console.warn(`⚠️ Failed to load remove task: ${filePath}`);
                            continue;
                        }
                        
                        const toyId = taskDef.toyId;
                        if (!toyId) {
                            console.warn(`⚠️ Remove task missing toyId: ${filePath}`);
                            continue;
                        }
                        
                        if (!taskRegistry.sets[category].remove[toyId]) {
                            taskRegistry.sets[category].remove[toyId] = [];
                        }
                        taskRegistry.sets[category].remove[toyId].push({ 
                            ...taskDef, 
                            filePath,
                            bodyPart: taskDef.bodyPart
                        });
                        console.log(`✅ Loaded remove task: ${filePath} (${toyId} -> ${taskDef.bodyPart})`);
                    }
                }
            }
        }
        
        console.log('📋 Task registry loaded:', taskRegistry);
        console.log('🐍 Snake fallback:', taskRegistry.fallbacks.snake);
        console.log('🪜 Ladder fallback:', taskRegistry.fallbacks.ladder);
        
        // Expose globally
        window.taskRegistry = taskRegistry;
        
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
        console.error(`Failed to load ${filePath}:`, error);
        return null;
    }
}

// Get available toys (checked and enabled) with quantities
function getAvailableToys() {
    const available = {};
    const selectedSets = window.GAME_STATE.selectedSets;
    const toyChecked = window.GAME_STATE.toyChecked;
    const toySetEnabled = window.GAME_STATE.toySetEnabled;
    const conditions = getTaskConditions();
    
    for (const setId of selectedSets) {
        for (const [toyKey, enabled] of Object.entries(toySetEnabled)) {
            if (!enabled) continue;
            
            const [set, ...toyIdParts] = toyKey.split('_');
            if (set !== setId) continue;
            
            const toyId = toyIdParts.join('_');
            if (!toyChecked[toyId]) continue;
            
            // Get total quantity and in-use count
            const totalQuantity = window.GAME_STATE.toyQuantities[toyKey] || 1;
            const inUse = conditions.countToy(toyId);
            const availableQuantity = totalQuantity - inUse;
            
            // Store the maximum available quantity across all sets
            if (!available[toyId] || available[toyId] < availableQuantity) {
                available[toyId] = availableQuantity;
            }
        }
    }
    
    return available;
}

// Get free body parts (can hold toys)
function getFreeBodyParts() {
    const conditions = getTaskConditions();
    const bodyParts = ['Mo', 'Ba', 'Bu', 'As', 'Ni', 'Ha', 'Bo', 'Pe'];
    const free = [];
    
    for (const bp of bodyParts) {
        if (conditions.bodyPartEmpty(bp)) {
            free.push(bp);
        }
    }
    
    return free;
}

// Get toys currently being held
function getHoldingToys() {
    const conditions = getTaskConditions();
    const allHeld = conditions.getAllHeldItems();
    return [...new Set(allHeld)]; // Unique toys
}

// Check if task metadata meets basic requirements
function meetsBasicRequirements(taskMeta, availableToys, freeBodyParts, holdingToys) {
    const requires = taskMeta.requires || {};
    
    // Check required toys with quantities
    if (requires.toys && requires.toys.length > 0) {
        for (const toyReq of requires.toys) {
            let toyId, quantity;
            
            // Handle both formats: 'tail' or { toy: 'tail', quantity: 2 }
            if (typeof toyReq === 'string') {
                toyId = toyReq;
                quantity = 1; // Default to needing at least 1
            } else {
                toyId = toyReq.toy;
                quantity = toyReq.quantity || 1;
            }
            
            // Check if toy exists and has enough quantity available
            if (!availableToys[toyId] || availableToys[toyId] < quantity) {
                return false;
            }
        }
    }
    
    // Check free body parts needed
    if (requires.freeBodyParts && requires.freeBodyParts.length > 0) {
        if (!requires.freeBodyParts.every(bp => freeBodyParts.includes(bp))) {
            return false;
        }
    }
    
    // Check not holding
    if (requires.notHolding && requires.notHolding.length > 0) {
        if (requires.notHolding.some(t => holdingToys.includes(t))) {
            return false;
        }
    }
    
    return true;
}

// Select next task using manifest pre-filtering
export function selectNextTask() {
    if (!manifestMetadata) {
        console.warn('Manifest metadata not loaded, using fallback');
        return taskRegistry?.fallbacks?.general || null;
    }
    
    // Get current game state for filtering
    const availableToys = getAvailableToys();
    const freeBodyParts = getFreeBodyParts();
    const holdingToys = getHoldingToys();
    const selectedSets = window.GAME_STATE.selectedSets;
    
    console.log('🎯 Selecting task:', { availableToys, freeBodyParts, holdingToys, selectedSets });
    
    // Collect eligible tasks from selected sets
    const eligibleTasks = [];
    
    for (const setId of selectedSets) {
        const setTasks = manifestMetadata.bySet[setId] || [];
        
        for (const taskMeta of setTasks) {
            // Check if toy/set is enabled
            const toyKey = `${taskMeta.setId}_${taskMeta.toyId}`;
            if (!window.GAME_STATE.toySetEnabled[toyKey]) {
                continue;
            }
            
            // Check if toy is checked
            if (!window.GAME_STATE.toyChecked[taskMeta.toyId]) {
                continue;
            }
            
            // Check basic requirements
            if (!meetsBasicRequirements(taskMeta, availableToys, freeBodyParts, holdingToys)) {
                continue;
            }
            
            // Task is eligible!
            eligibleTasks.push(taskMeta);
        }
    }
    
    console.log(`✅ Found ${eligibleTasks.length} eligible tasks`);
    
    // If no eligible tasks, use set fallback or general fallback
    if (eligibleTasks.length === 0) {
        console.warn('No eligible tasks found, using fallback');
        
        // Try to find a set-specific fallback
        for (const setId of selectedSets) {
            const fallbackTasks = taskRegistry.sets[setId]?.tasks['hand'] || [];
            const fallback = fallbackTasks.find(t => t.id.includes('fallback'));
            if (fallback) {
                console.log(`Using ${setId} fallback`);
                return fallback;
            }
        }
        
        // Use general fallback
        return taskRegistry.fallbacks.general;
    }
    
    // Apply weight modifications
    const weighted = eligibleTasks.map(taskMeta => ({
        taskMeta,
        weight: Math.max(0, taskMeta.baseWeight + (window.GAME_STATE.taskWeights[taskMeta.filePath] || 0))
    })).filter(t => t.weight > 0);
    
    if (weighted.length === 0) {
        console.warn('All tasks have 0 weight, using fallback');
        return taskRegistry.fallbacks.general;
    }
    
    // Weighted random selection
    const selected = weightedRandomSelect(weighted);
    
    // Load the actual task
    const task = taskRegistry.sets[selected.taskMeta.setId]?.tasks[selected.taskMeta.toyId]
        ?.find(t => t.id === selected.taskMeta.id);
    
    if (!task) {
        console.error('Selected task not found in registry:', selected.taskMeta.id);
        return taskRegistry.fallbacks.general;
    }
    
    console.log(`🎲 Selected task: ${task.id}`);
    return task;
}

// Weighted random selection
function weightedRandomSelect(weightedItems) {
    const totalWeight = weightedItems.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const item of weightedItems) {
        random -= item.weight;
        if (random <= 0) {
            return item;
        }
    }
    
    return weightedItems[weightedItems.length - 1];
}

// Check if a toy/set combo has add tasks
export function hasAddTasks(setId, toyId) {
    if (!taskRegistry || !taskRegistry.sets[setId]) return false;
    return taskRegistry.sets[setId].add[toyId] && taskRegistry.sets[setId].add[toyId].length > 0;
}

// Check if a toy/set combo has remove tasks
export function hasRemoveTasks(setId, toyId) {
    if (!taskRegistry || !taskRegistry.sets[setId]) return false;
    return taskRegistry.sets[setId].remove[toyId] && taskRegistry.sets[setId].remove[toyId].length > 0;
}

// Check if a toy/set combo has any add or remove tasks
export function hasAddOrRemoveTasks(setId, toyId) {
    return hasAddTasks(setId, toyId) || hasRemoveTasks(setId, toyId);
}

// Get all body parts that have add tasks for this toy/set combo
export function getAddTaskBodyParts(setId, toyId) {
    if (!taskRegistry || !taskRegistry.sets[setId]) return [];
    if (!taskRegistry.sets[setId].add[toyId]) return [];
    
    const bodyParts = new Set();
    taskRegistry.sets[setId].add[toyId].forEach(task => {
        if (task.bodyPart) {
            bodyParts.add(task.bodyPart);
        }
    });
    
    return Array.from(bodyParts);
}

// Get all body parts that have remove tasks for this toy/set combo
export function getRemoveTaskBodyParts(setId, toyId) {
    if (!taskRegistry || !taskRegistry.sets[setId]) return [];
    if (!taskRegistry.sets[setId].remove[toyId]) return [];
    
    const bodyParts = new Set();
    taskRegistry.sets[setId].remove[toyId].forEach(task => {
        if (task.bodyPart) {
            bodyParts.add(task.bodyPart);
        }
    });
    
    return Array.from(bodyParts);
}

// Get add tasks for a specific toy and body part
export function getAddTasksForBodyPart(setId, toyId, bodyPart) {
    if (!taskRegistry || !taskRegistry.sets[setId]) return [];
    if (!taskRegistry.sets[setId].add[toyId]) return [];
    
    return taskRegistry.sets[setId].add[toyId].filter(task => task.bodyPart === bodyPart);
}

// Get remove tasks for a specific toy and body part
export function getRemoveTasksForBodyPart(setId, toyId, bodyPart) {
    if (!taskRegistry || !taskRegistry.sets[setId]) return [];
    if (!taskRegistry.sets[setId].remove[toyId]) return [];
    
    return taskRegistry.sets[setId].remove[toyId].filter(task => task.bodyPart === bodyPart);
}

// Select snake/ladder task (unchanged)
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
    
    for (const setId of selectedSets) {
        if (!taskRegistry.sets[setId]) continue;
        
        const setTasks = type === 'snake' ? 
            taskRegistry.sets[setId].snakes : 
            taskRegistry.sets[setId].ladders;
        
        allTasks.push(...setTasks);
    }
    
    const availableTasks = allTasks.filter(task => {
        if (task.canSelect && !task.canSelect(conditions)) return false;
        return true;
    });
    
    if (availableTasks.length > 0) {
        const taskToUse = availableTasks[Math.floor(Math.random() * availableTasks.length)];
        console.log(`Using set-specific ${type} task:`, taskToUse);
        return { task: taskToUse, snakeLadderInfo };
    }
    
    const fallbackTask = type === 'snake' ? 
        taskRegistry.fallbacks.snake : 
        taskRegistry.fallbacks.ladder;
    
    if (!fallbackTask) {
        console.error(`No ${type} fallback task found!`);
        return { task: taskRegistry.fallbacks.general, snakeLadderInfo };
    }
    
    console.log(`Using ${type} fallback task:`, fallbackTask);
    return { task: fallbackTask, snakeLadderInfo };
}

// Select final challenge task (unchanged)
export function selectFinalChallenge() {
    const conditions = getTaskConditions();
    const selectedSets = window.GAME_STATE.selectedSets;
    
    const allFinalTasks = [];
    for (const setId of selectedSets) {
        if (!taskRegistry.sets[setId]) continue;
        allFinalTasks.push(...taskRegistry.sets[setId].finals);
    }
    
    const alwaysTasks = allFinalTasks.filter(t => 
        t.alwaysSelect && t.alwaysSelect(conditions)
    );
    
    if (alwaysTasks.length > 0) {
        return alwaysTasks[Math.floor(Math.random() * alwaysTasks.length)];
    }
    
    const availableTasks = allFinalTasks.filter(task => {
        if (task.canSelect && !task.canSelect(conditions)) return false;
        return true;
    });
    
    if (availableTasks.length > 0) {
        const weighted = availableTasks.map(task => ({
            task,
            weight: task.weight || 1
        }));
        
        return weightedRandomSelect(weighted).task;
    }
    
    return taskRegistry.fallbacks.final;
}

// Expose functions globally
window.selectNextTask = selectNextTask;
window.selectSnakeLadderTask = selectSnakeLadderTask;
window.selectFinalChallenge = selectFinalChallenge;
window.hasAddTasks = hasAddTasks;
window.hasRemoveTasks = hasRemoveTasks;
window.hasAddOrRemoveTasks = hasAddOrRemoveTasks;
window.getAddTaskBodyParts = getAddTaskBodyParts;
window.getRemoveTaskBodyParts = getRemoveTaskBodyParts;
window.getAddTasksForBodyPart = getAddTasksForBodyPart;
window.getRemoveTasksForBodyPart = getRemoveTasksForBodyPart;
