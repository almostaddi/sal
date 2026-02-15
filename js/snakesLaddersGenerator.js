// Snakes and Ladders generation logic

// Parse exclusion ranges (e.g., "1-10, 40-50" -> [[1,10], [40,50]])
function parseExclusionRanges(rangesText) {
    if (!rangesText || !rangesText.trim()) return [];
    
    const ranges = [];
    const parts = rangesText.split(',');
    
    for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        
        const match = trimmed.match(/^(\d+)-(\d+)$/);
        if (match) {
            const start = parseInt(match[1]);
            const end = parseInt(match[2]);
            if (start <= end) {
                ranges.push([start, end]);
            }
        }
    }
    
    return ranges;
}

// Check if square is in any exclusion range
function isInExclusionRanges(square, ranges) {
    for (const [start, end] of ranges) {
        if (square >= start && square <= end) {
            return true;
        }
    }
    return false;
}

// Generate random snakes and ladders based on board size and config
export function generateRandomSnakesAndLadders(totalSquares, config = {}) {
    // Default config values
    const cfg = {
        enableMaxLaddersPerRow: config.enableMaxLaddersPerRow ?? true,
        maxLaddersPerRow: config.maxLaddersPerRow ?? 1,
        enableMaxSnakesPerRow: config.enableMaxSnakesPerRow ?? true,
        maxSnakesPerRow: config.maxSnakesPerRow ?? 1,
        enableMaxAnyPerRow: config.enableMaxAnyPerRow ?? true,
        maxAnyPerRow: config.maxAnyPerRow ?? 3,
        enableMaxJump: config.enableMaxJump ?? true,
        maxJump: config.maxJump ?? 60,
        enableMaxFall: config.enableMaxFall ?? true,
        maxFall: config.maxFall ?? 60,
        enableMinJump: config.enableMinJump ?? true,
        minJump: config.minJump ?? 4,
        enableMinFall: config.enableMinFall ?? true,
        minFall: config.minFall ?? 4,
        enableNoSnakesRanges: config.enableNoSnakesRanges ?? false,
        noSnakesRanges: config.noSnakesRanges ?? '',
        enableNoLaddersRanges: config.enableNoLaddersRanges ?? false,
        noLaddersRanges: config.noLaddersRanges ?? ''
    };
    
    // Parse exclusion ranges
    const noSnakesRanges = cfg.enableNoSnakesRanges ? parseExclusionRanges(cfg.noSnakesRanges) : [];
    const noLaddersRanges = cfg.enableNoLaddersRanges ? parseExclusionRanges(cfg.noLaddersRanges) : [];
    
    const numRows = totalSquares / 10;
    const snakes = {};
    const ladders = {};
    const usedSquares = new Set([1, totalSquares]); // Reserve start and finish
    
    // Track specials per row
    const snakesPerRow = Array(numRows).fill(0);
    const laddersPerRow = Array(numRows).fill(0);
    const anyPerRow = Array(numRows).fill(0);
    
    // Determine target number of snakes/ladders per row
    const targetSnakesPerRow = cfg.enableMaxSnakesPerRow ? cfg.maxSnakesPerRow : 1;
    const targetLaddersPerRow = cfg.enableMaxLaddersPerRow ? cfg.maxLaddersPerRow : 1;
    
    // Generate snakes and ladders
    for (let i = 0; i < numRows; i++) {
        // Try to place snakes for this row
        for (let s = 0; s < targetSnakesPerRow; s++) {
            let snakeAttempts = 0;
            while (snakeAttempts < 100) {
                const from = Math.floor(Math.random() * totalSquares) + 1;
                
                // Check exclusion ranges
                if (isInExclusionRanges(from, noSnakesRanges)) {
                    snakeAttempts++;
                    continue;
                }
                
                // Calculate fall range
                const absoluteMaxFall = from - 1;
                const configMaxFall = cfg.enableMaxFall ? cfg.maxFall : absoluteMaxFall;
                const maxFall = Math.min(configMaxFall, absoluteMaxFall);
                const minFall = cfg.enableMinFall ? cfg.minFall : 1;
                
                if (maxFall < minFall) {
                    snakeAttempts++;
                    continue;
                }
                
                const fall = Math.floor(Math.random() * (maxFall - minFall + 1)) + minFall;
                const to = from - fall;
                
                // Check constraints
                const fromRow = Math.floor((from - 1) / 10);
                const toRow = Math.floor((to - 1) / 10);
                
                // Check if to is in exclusion range
                if (isInExclusionRanges(to, noSnakesRanges)) {
                    snakeAttempts++;
                    continue;
                }
                
                // Check row limits (most restrictive takes priority)
                let rowLimitExceeded = false;
                
                if (cfg.enableMaxSnakesPerRow && snakesPerRow[fromRow] >= cfg.maxSnakesPerRow) {
                    rowLimitExceeded = true;
                }
                if (cfg.enableMaxAnyPerRow && anyPerRow[fromRow] >= cfg.maxAnyPerRow) {
                    rowLimitExceeded = true;
                }
                
                if (to < 1 || usedSquares.has(from) || usedSquares.has(to) || rowLimitExceeded) {
                    snakeAttempts++;
                    continue;
                }
                
                // Valid snake found
                snakes[from] = to;
                usedSquares.add(from);
                usedSquares.add(to);
                snakesPerRow[fromRow]++;
                anyPerRow[fromRow]++;
                if (toRow !== fromRow) anyPerRow[toRow]++;
                break;
            }
        }
        
        // Try to place ladders for this row
        for (let l = 0; l < targetLaddersPerRow; l++) {
            let ladderAttempts = 0;
            while (ladderAttempts < 100) {
                const from = Math.floor(Math.random() * totalSquares) + 1;
                
                // Check exclusion ranges
                if (isInExclusionRanges(from, noLaddersRanges)) {
                    ladderAttempts++;
                    continue;
                }
                
                // Calculate climb range
                const absoluteMaxClimb = totalSquares - from;
                const configMaxClimb = cfg.enableMaxJump ? cfg.maxJump : absoluteMaxClimb;
                const maxClimb = Math.min(configMaxClimb, absoluteMaxClimb);
                const minClimb = cfg.enableMinJump ? cfg.minJump : 1;
                
                if (maxClimb < minClimb) {
                    ladderAttempts++;
                    continue;
                }
                
                const climb = Math.floor(Math.random() * (maxClimb - minClimb + 1)) + minClimb;
                const to = from + climb;
                
                // Check constraints
                const fromRow = Math.floor((from - 1) / 10);
                const toRow = Math.floor((to - 1) / 10);
                
                // Check if to is in exclusion range
                if (isInExclusionRanges(to, noLaddersRanges)) {
                    ladderAttempts++;
                    continue;
                }
                
                // Check row limits (most restrictive takes priority)
                let rowLimitExceeded = false;
                
                if (cfg.enableMaxLaddersPerRow && laddersPerRow[fromRow] >= cfg.maxLaddersPerRow) {
                    rowLimitExceeded = true;
                }
                if (cfg.enableMaxAnyPerRow && anyPerRow[fromRow] >= cfg.maxAnyPerRow) {
                    rowLimitExceeded = true;
                }
                
                if (to > totalSquares || usedSquares.has(from) || usedSquares.has(to) || rowLimitExceeded) {
                    ladderAttempts++;
                    continue;
                }
                
                // Valid ladder found
                ladders[from] = to;
                usedSquares.add(from);
                usedSquares.add(to);
                laddersPerRow[fromRow]++;
                anyPerRow[fromRow]++;
                if (toRow !== fromRow) anyPerRow[toRow]++;
                break;
            }
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
