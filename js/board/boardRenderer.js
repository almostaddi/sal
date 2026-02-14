// Board rendering and layout - using inline transforms for dynamic alignment
export class BoardRenderer {
    constructor(boardSize = 100) {
        this.boardElement = document.getElementById('board');
        this.totalSquares = boardSize;
        this.boardSize = 10; // Always 10 squares per row
        this.snakes = {16:6, 47:26, 49:11, 56:53, 62:19, 64:60, 87:24, 93:73, 95:75, 98:78};
        this.ladders = {1:38, 4:14, 9:31, 21:42, 28:84, 36:44, 51:67, 71:91, 80:99};
    }
    
    // Update total squares (for board size changes)
    updateSize(newSize) {
        this.totalSquares = newSize;
    }
    
    // Create the board
    create() {
        const totalRows = this.totalSquares / this.boardSize;
        this.boardElement.innerHTML = ''; // Clear existing board
        
        // Generate rows from top to bottom
        for (let row = totalRows - 1; row >= 0; row--) {
            this.createRow(row);
        }
        
        // Scale board to fit window
        setTimeout(() => this.scale(), 50);
    }
    
    // Create a single row
    createRow(rowIndex) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'board-row';
        
        // Determine direction (alternating left-to-right, right-to-left)
        const isLeftToRight = rowIndex % 2 === 0;
        const rowStartNum = rowIndex * this.boardSize + 1;
        
        for (let col = 0; col < this.boardSize; col++) {
            const squareNum = isLeftToRight ? 
                rowStartNum + col : 
                rowStartNum + (this.boardSize - 1 - col);
            
            const square = this.createSquare(squareNum);
            rowDiv.appendChild(square);
        }
        
        this.boardElement.appendChild(rowDiv);
    }
    
    // Calculate dynamic shift amount in pixels (based on example HTML)
    getShiftAmount(number) {
        const startShiftAt = 12;
        if (number < startShiftAt) {
            return 0;
        }
        
        // Calculate shift level
        const shiftLevel = Math.floor((number - startShiftAt) / 10) + 1;
        
        // 9px per level (matches the example)
        return shiftLevel * 9;
    }
    
    // Determine if a square needs a connector and what type
    getConnectorType(number) {
        const isFinish = number === this.totalSquares;
        
        // No connectors for finish square or square 1
        if (isFinish || number === 1) {
            return null;
        }
        
        const endsWithZero = number % 10 === 0;
        const endsWithOne = number % 10 === 1;
        
        if (!endsWithZero && !endsWithOne) {
            return null; // No connector needed
        }
        
        const decade = Math.floor(number / 10);
        const isOddDecade = decade % 2 === 1;
        
        if (endsWithZero) {
            // Numbers ending in 0 connect upward
            return isOddDecade ? 'up-right' : 'up';
        } else {
            // Numbers ending in 1 connect downward
            return isOddDecade ? 'down-left' : 'down-left-tl';
        }
    }
    
    // Create a single square
    createSquare(number) {
        const square = document.createElement('div');
        
        // Calculate shift amount
        const shiftAmount = this.getShiftAmount(number);
        
        // Base classes
        let baseClass = 'square';
        
        // Check for snakes and ladders
        const isSnake = this.snakes[number];
        const isLadder = this.ladders[number];
        
        if (isSnake) {
            baseClass += ' snake';
            square.setAttribute('data-destination', '↓' + this.snakes[number]);
        } else if (isLadder) {
            baseClass += ' ladder';
            square.setAttribute('data-destination', '↑' + this.ladders[number]);
        }
        
        square.className = baseClass;
        square.id = `square-${number}`;
        square.setAttribute('data-number', number);
        
        // Determine connector type
        const connectorType = this.getConnectorType(number);
        
        if (connectorType) {
            // Add connector class
            const connectorClass = `square-connector-${connectorType}`;
            square.className = `${baseClass} ${connectorClass}`;
            
            // Create inner div for connector
            const inner = document.createElement('div');
            inner.className = 'square-connector-inner';
            inner.textContent = number;
            square.appendChild(inner);
        } else {
            // Regular square - just add number as text content
            square.textContent = number;
        }
        
        // Apply inline transform for shift (like the example HTML)
        if (shiftAmount > 0) {
            square.style.transform = `translateY(-${shiftAmount}px)`;
            
            // Add hover handlers to maintain shift while hovering
            square.addEventListener('mouseenter', function() {
                this.style.transform = `translateY(-${shiftAmount}px) scale(1.1)`;
            });
            square.addEventListener('mouseleave', function() {
                this.style.transform = `translateY(-${shiftAmount}px)`;
            });
        }
        
        return square;
    }
    
    // Scale board to fit window
    scale() {
        // Reset scale to get natural dimensions
        this.boardElement.style.transform = 'scale(1)';
        this.boardElement.style.transformOrigin = 'top center';
        
        const boardWidth = this.boardElement.scrollWidth;
        const boardHeight = this.boardElement.scrollHeight;
        
        // Get available space
        const windowWidth = window.innerWidth - 40; // 20px padding on each side
        const windowHeight = window.innerHeight - 200; // Space for controls/buttons
        
        // Calculate scale factors
        const scaleX = windowWidth / boardWidth;
        const scaleY = windowHeight / boardHeight;
        
        // Use smaller scale to fit both dimensions
        const minScale = 0.5; // Never go below 50%
        const maxScale = 1.0; // Never go above 100%
        const scale = Math.max(
            Math.min(scaleX, Math.max(scaleY, windowHeight / boardHeight * 1.5), maxScale), 
            minScale
        );
        
        // Apply scale
        this.boardElement.style.transform = `scale(${scale})`;
    }
}
