// Example task: Tease And Denial - Cage (ALWAYS Task)
// This demonstrates a task that's forced when specific conditions are met

export default {
    id: 'cage_always_after_2_hands',
    setId: 'teaseanddenial',
    toyId: 'cage',
    type: 'standard',
    
    // This task is forced when conditions are met
    alwaysSelect: (conditions) => {
        // Check if we've rolled at least 2 Tease And Denial hand tasks
        const handCount = conditions.getTurnCountForToy('teaseanddenial_hand');
        if (handCount < 2) {
            return false;
        }
        
        // Check Tease And Denial is selected
        if (!conditions.hasSet('teaseanddenial')) {
            return false;
        }
        
        // Check if cage toy is checked
        if (!conditions.toyChecked('cage')) {
            return false;
        }
        
        // Check if Pe can hold cage
        if (!conditions.canBodyPartHold('Pe', 'cage')) {
            return false;
        }
        
        return true;
    },
    
    // This task is excluded from normal random selection
    excludeFromNormalPool: true,
    
    // Only trigger once per game
    onlyOnce: true,
    
    // Execute function adds cage to Pe
    execute: function() {
        return window.addToyToBodyPart('Pe', 'cage');
    },
    
    // Generate task HTML
    getDifficulty: (difficulty, conditions, difficultyMap) => {
        const handCount = conditions.getTurnCountForToy('teaseanddenial_hand');
        
        let html = '<strong>🔒 Special Cage Task!</strong>';
        html += `<p>You've completed ${handCount} hand tasks from Tease And Denial.</p>`;
        html += '<p>Time to put on the cage!</p>';
        html += '<p>Place the cage on your Pe.</p>';
        
        html += '<p style="font-size: 0.85em; color: #666; margin-top: 10px;">';
        html += '<em>Testing: ALWAYS task - only triggers after rolling 2+ Tease And Denial hand tasks ';
        html += 'if Tease And Denial selected, cage checked, and Pe can hold cage. ';
        html += 'This overrides normal task selection and only happens once per game.</em>';
        html += '</p>';
        
        html += '<img src="https://picsum.photos/seed/cagehand/800/600"/>';
        
        return html;
    }
};
