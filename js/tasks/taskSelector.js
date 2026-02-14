// Example task showing how to use requires field for pre-filtering

export default {
    id: 'apple_tail_add_as_example',
    setId: 'apple',
    toyId: 'tail',
    type: 'standard',
    
    // Basic requirements - used by selector for fast pre-filtering
    requires: {
        toys: ['tail'],              // Must have tail toy selected
        freeBodyParts: ['As'],       // As must be available
        notHolding: ['tail']         // Can't already have tail anywhere
    },
    
    // Task handles its own edge cases and adapts
    getDifficulty: (difficulty, conditions, difficultyMap) => {
        // Check for edge cases and adapt
        if (!conditions.canBodyPartHold('As', 'tail')) {
            // As is occupied - show error message
            return `
                <strong>⚠️ Can't Place Tail</strong>
                <p>As is occupied. Remove other toys first.</p>
            `;
        }
        
        if (conditions.isHolding('tail')) {
            // Already have tail somewhere
            return `
                <strong>⚠️ Already Wearing Tail</strong>
                <p>The tail is already in use on ${conditions.getBodyPartsHolding('tail')[0].name}.</p>
            `;
        }
        
        // Check toy quantity
        const toyKey = 'apple_tail';
        const totalQuantity = conditions.toyQuantity(toyKey) || 1;
        const inUse = conditions.countToy('tail');
        
        if (inUse >= totalQuantity) {
            return `
                <strong>⚠️ No Tails Available</strong>
                <p>All ${totalQuantity} tail(s) are in use.</p>
            `;
        }
        
        // Normal case - show the actual task
        return `
            <strong>Insert Tail</strong>
            <p>Insert the tail plug into As.</p>
            <p><em>Difficulty: ${difficulty}</em></p>
            <img src="https://picsum.photos/seed/tail_as/800/600"/>
        `;
    },
    
    // Execute only if actually possible
    execute: function() {
        if (window.canAddToyToBodyPart('As', 'tail')) {
            return window.addToyToBodyPart('As', 'tail');
        }
        return false;
    }
};
