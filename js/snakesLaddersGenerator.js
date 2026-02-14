// Snakes and Ladders generation logic

// Generate random snakes and ladders based on board size
export function generateRandomSnakesAndLadders(totalSquares) {
    const numRows = totalSquares / 10;
    const snakes = {};
    const ladders = {};
    const usedSquares = new Set([1, totalSquares]); // Reserve start and finish
    
    // Track special squares per row
    const specialsPerRow = Array(numRows).fill(0);
    
    // Generate 1 snake and 1 ladder per row
    for (let i = 0; i < numRows; i++) {
        // Try to place a snake
        let snakeAttempts = 0;
        while (snakeAttempts < 100) {
            const from = Math.floor(Math.random() * totalSquares) + 1;
            const maxFall = Math.min(60, from - 1);
            const minFall = 4;
            
            if (maxFall < minFall) {
                snakeAttempts++;
                continue;
            }
            
            const fall = Math.floor(Math.random() * (maxFall - minFall + 1)) + minFall;
            const to = from - fall;
            
            // Check constraints
            const fromRow = Math.floor((from - 1) / 10);
            const toRow = Math.floor((to - 1) / 10);
            
            // UPDATED: Check that neither from nor to are already used as ANY special square
            if (to < 1 || usedSquares.has(from) || usedSquares.has(to) ||
                specialsPerRow[fromRow] >= 3) {
                snakeAttempts++;
                continue;
            }
            
            // Valid snake found
            snakes[from] = to;
            usedSquares.add(from);
            usedSquares.add(to);
            specialsPerRow[fromRow]++;
            if (toRow !== fromRow) specialsPerRow[toRow]++;
            break;
        }
        
        // Try to place a ladder
        let ladderAttempts = 0;
        while (ladderAttempts < 100) {
            const from = Math.floor(Math.random() * totalSquares) + 1;
            const maxClimb = Math.min(60, totalSquares - from);
            const minClimb = 4;
            
            if (maxClimb < minClimb) {
                ladderAttempts++;
                continue;
            }
            
            const climb = Math.floor(Math.random() * (maxClimb - minClimb + 1)) + minClimb;
            const to = from + climb;
            
            // Check constraints
            const fromRow = Math.floor((from - 1) / 10);
            const toRow = Math.floor((to - 1) / 10);
            
            // UPDATED: Check that neither from nor to are already used as ANY special square
            if (to > totalSquares || usedSquares.has(from) || usedSquares.has(to) ||
                specialsPerRow[fromRow] >= 3) {
                ladderAttempts++;
                continue;
            }
            
            // Valid ladder found
            ladders[from] = to;
            usedSquares.add(from);
            usedSquares.add(to);
            specialsPerRow[fromRow]++;
            if (toRow !== fromRow) specialsPerRow[toRow]++;
            break;
        }
    }
    
    return { snakes, ladders };
}

// Parse custom snakes/ladders string
export function parseCustomSnakesLadders(text) {
    try {
        // Remove whitespace and curly braces
        text = text.trim().replace(/^\{/, '').replace(/\}$/, '');
        
        if (!text) return {};
        
        const result = {};
        const pairs = text.split(',');
        
        for (const pair of pairs) {
            const [from, to] = pair.split(':').map(s => parseInt(s.trim()));
            if (!isNaN(from) && !isNaN(to)) {
                result[from] = to;
            }
        }
        
        return result;
    } catch (e) {
        console.error('Failed to parse custom snakes/ladders:', e);
        return {};
    }
}

// Validate custom snakes/ladders
export function validateCustomSnakesLadders(snakes, ladders, totalSquares) {
    const errors = [];
    const allFromSquares = new Set();
    const allToSquares = new Set();
    const allUsedSquares = new Set();
    
    // Check snakes
    for (const [from, to] of Object.entries(snakes)) {
        const fromNum = parseInt(from);
        const toNum = parseInt(to);
        
        if (fromNum < 1 || fromNum > totalSquares) {
            errors.push(`Snake from ${fromNum} is out of bounds (1-${totalSquares})`);
        }
        if (toNum < 1 || toNum > totalSquares) {
            errors.push(`Snake to ${toNum} is out of bounds (1-${totalSquares})`);
        }
        if (toNum >= fromNum) {
            errors.push(`Snake ${fromNum}→${toNum} must go down, not up`);
        }
        if (allFromSquares.has(fromNum)) {
            errors.push(`Square ${fromNum} is used as the start of multiple specials`);
        }
        if (allUsedSquares.has(fromNum)) {
            errors.push(`Square ${fromNum} cannot be both a destination and a start`);
        }
        if (allUsedSquares.has(toNum)) {
            errors.push(`Square ${toNum} is used multiple times`);
        }
        
        allFromSquares.add(fromNum);
        allToSquares.add(toNum);
        allUsedSquares.add(fromNum);
        allUsedSquares.add(toNum);
    }
    
    // Check ladders
    for (const [from, to] of Object.entries(ladders)) {
        const fromNum = parseInt(from);
        const toNum = parseInt(to);
        
        if (fromNum < 1 || fromNum > totalSquares) {
            errors.push(`Ladder from ${fromNum} is out of bounds (1-${totalSquares})`);
        }
        if (toNum < 1 || toNum > totalSquares) {
            errors.push(`Ladder to ${toNum} is out of bounds (1-${totalSquares})`);
        }
        if (toNum <= fromNum) {
            errors.push(`Ladder ${fromNum}→${toNum} must go up, not down`);
        }
        if (allFromSquares.has(fromNum)) {
            errors.push(`Square ${fromNum} is used as the start of multiple specials`);
        }
        if (allUsedSquares.has(fromNum)) {
            errors.push(`Square ${fromNum} cannot be both a destination and a start`);
        }
        if (allUsedSquares.has(toNum)) {
            errors.push(`Square ${toNum} is used multiple times`);
        }
        
        allFromSquares.add(fromNum);
        allToSquares.add(toNum);
        allUsedSquares.add(fromNum);
        allUsedSquares.add(toNum);
    }
    
    return errors;
}

// Format snakes/ladders for display in textarea
export function formatSnakesLaddersForDisplay(obj) {
    if (!obj || Object.keys(obj).length === 0) return '';
    
    const pairs = Object.entries(obj)
        .map(([from, to]) => `${from}:${to}`)
        .join(', ');
    
    return `{${pairs}}`;
}
