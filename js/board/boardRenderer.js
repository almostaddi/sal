// Board rendering and layout
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
    
    // Create a single square
    createSquare(number) {
        const square = document.createElement('div');
        
        // Calculate shift level (for stacked appearance)
        let shiftLevel = 0;
        const startShiftAt = 12;
        if (number >= startShiftAt) {
            shiftLevel = Math.floor((number - startShiftAt) / 10) + 1;
            if (shiftLevel > 9) shiftLevel = 9;
        }
        
        // Base classes
        let baseClass = 'square';
        let shiftClass = shiftLevel > 0 ? `square-shift-${shiftLevel}` : '';
        
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
        
        square.className = shiftClass ? `${baseClass} ${shiftClass}` : baseClass;
        square.id = `square-${number}`;
        square.setAttribute('data-number', number);
        
        // Add connector classes for winding path
        const isFinish = number === this.totalSquares;
        
        if (number % 10 === 0 && !isFinish) {
            const decade = Math.floor(number / 10);
            if (decade % 2 === 1) {
                // 10, 30, 50, 70, 90 - bottom right
                square.className = shiftClass ? 
                    `${baseClass} ${shiftClass} square-connector-up-right` : 
                    `${baseClass} square-connector-up-right`;
                const inner = document.createElement('div');
                inner.className = 'square-connector-inner';
                inner.textContent = number;
                square.appendChild(inner);
            } else {
                // 20, 40, 60, 80 - bottom left
                square.className = shiftClass ? 
                    `${baseClass} ${shiftClass} square-connector-up` : 
                    `${baseClass} square-connector-up`;
                const inner = document.createElement('div');
                inner.className = 'square-connector-inner';
                inner.textContent = number;
                square.appendChild(inner);
            }
        } else if (number % 10 === 1 && number !== 1) {
            const decade = Math.floor(number / 10);
            if (decade % 2 === 1) {
                // 11, 31, 51, 71, 91 - top right
                square.className = shiftClass ? 
                    `${baseClass} ${shiftClass} square-connector-down-left` : 
                    `${baseClass} square-connector-down-left`;
                const inner = document.createElement('div');
                inner.className = 'square-connector-inner';
                inner.textContent = number;
                square.appendChild(inner);
            } else {
                // 21, 41, 61, 81 - top left
                square.className = shiftClass ? 
                    `${baseClass} ${shiftClass} square-connector-down-left-tl` : 
                    `${baseClass} square-connector-down-left-tl`;
                const inner = document.createElement('div');
                inner.className = 'square-connector-inner';
                inner.textContent = number;
                square.appendChild(inner);
            }
        } else {
            const inner = document.createElement('div');
            inner.style.width = '70px';
            inner.style.height = '70px';
            inner.style.display = 'flex';
            inner.style.alignItems = 'center';
            inner.style.justifyContent = 'center';
            inner.style.fontSize = '24px';
            inner.style.fontWeight = 'bold';
            inner.textContent = number;
            square.appendChild(inner);
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
