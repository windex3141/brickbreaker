document.addEventListener('DOMContentLoaded', () => {
    console.log('Game initialization started');
    
    // Game configuration
    const config = {
        rows: 8,
        columns: 8,
        candyTypes: [
            'red',
            'blue',
            'green',
            'yellow',
            'purple',
            'orange'
        ],
        specialBricks: [
            'diamond',
            'gold'
        ],
        specialBrickChance: 0.08, // 8% chance for a special brick to appear
        pointValues: {
            regular: 10,        // Points for regular brick
            diamond: 50,        // Points for diamond brick
            gold: 30,           // Points for gold brick
            bonusPerExtra: 10   // Extra points for matches > 3
        },
        animationSpeed: {
            swap: 300,       // ms for swap animation
            dissolve: 500,   // ms for dissolve animation
            fall: 400,       // ms for falling animation
            cascadeDelay: 100 // ms delay between cascade animations
        },
        hints: {
            maxHints: 3,          // Maximum number of hints available
            pointsPerHint: 5000,  // Points needed to earn a new hint
            hintDuration: 3000    // Duration in ms to show the hint highlight
        },
        initialSmashes: 1         // Start with 1 screen smash
    };

    // Game state
    const state = {
        board: [],
        selectedCandy: null,
        score: 0,
        moves: 0,
        isAnimating: false,
        hints: {
            available: config.hints.maxHints,
            lastScoreCheckpoint: 0
        },
        smashesRemaining: config.initialSmashes,
        gameOver: false
    };

    // DOM elements
    const gameBoard = document.getElementById('game-board');
    const scoreElement = document.getElementById('score');
    const movesElement = document.getElementById('moves');
    const hintsElement = document.getElementById('hints-available');
    const newGameButton = document.getElementById('new-game-btn');
    const hintButton = document.getElementById('hint-btn');
    const gameOverOverlay = document.getElementById('game-over');
    const finalScoreElement = document.getElementById('final-score');
    const restartButton = document.getElementById('restart-btn');
    const hintNotification = document.getElementById('hint-recharge');
    const hintsAvailableElement = document.getElementById('hints-available');
    const smashesElement = document.getElementById('smashes');
    const smashButton = document.getElementById('smash-btn');
    const smashNotification = document.getElementById('smash-notification');

    // Initialize the game
    function initGame() {
        console.log('initGame called');
        console.log('Game board element:', gameBoard);
        
        // Reset state
        state.board = [];
        state.selectedCandy = null;
        state.score = 0;
        state.moves = 0;
        state.isAnimating = false;
        state.hints.available = config.hints.maxHints;
        state.hints.lastScoreCheckpoint = 0;
        state.smashesRemaining = config.initialSmashes;
        state.gameOver = false;
        
        // Update UI
        scoreElement.textContent = state.score;
        movesElement.textContent = state.moves;
        hintsElement.textContent = state.hints.available;
        smashesElement.textContent = state.smashesRemaining;
        
        // Hide game over overlay if visible
        gameOverOverlay.classList.add('hidden');
        
        // Enable hint button if needed
        updateHintButtonState();
        
        // Clear the board
        gameBoard.innerHTML = '';
        
        // Set up grid styling based on config
        gameBoard.style.gridTemplateColumns = `repeat(${config.columns}, 1fr)`;
        gameBoard.style.gridTemplateRows = `repeat(${config.rows}, 1fr)`;
        
        // Create the initial board
        createBoard();
        console.log('Board created:', state.board);
        
        // Render the board
        renderBoard();
        console.log('Board rendered');
        
        // Check for valid moves
        if (!hasValidMoves()) {
            // Initial board has no valid moves, so recreate it
            console.log('No valid moves, recreating board');
            initGame();
        }

        // Add event listener for screen smash button
        document.getElementById('smash-btn').addEventListener('click', performScreenSmash);
    }
    
    // Create the initial board data structure
    function createBoard() {
        console.log('Creating board...');
        for (let row = 0; row < config.rows; row++) {
            state.board[row] = [];
            for (let col = 0; col < config.columns; col++) {
                // Generate a random candy
                const randomType = getRandomCandyType();
                state.board[row][col] = {
                    type: randomType,
                    row: row,
                    col: col
                };
            }
        }
    }
    
    // Render the board to the DOM
    function renderBoard() {
        console.log('Rendering board...');
        gameBoard.innerHTML = '';
        
        for (let row = 0; row < config.rows; row++) {
            for (let col = 0; col < config.columns; col++) {
                const candy = state.board[row][col];
                const cell = document.createElement('div');
                
                cell.classList.add('cell');
                cell.setAttribute('data-row', row);
                cell.setAttribute('data-col', col);
                
                const candyElement = document.createElement('div');
                candyElement.classList.add('candy', candy.type);
                
                cell.appendChild(candyElement);
                cell.addEventListener('click', () => handleCandyClick(row, col));
                
                gameBoard.appendChild(cell);
            }
        }
        console.log('Number of candy elements created:', gameBoard.querySelectorAll('.candy').length);
    }
    
    // Get a random candy type, with a chance for special bricks
    function getRandomCandyType() {
        // Determine if this will be a special brick
        if (Math.random() < config.specialBrickChance) {
            // Choose randomly between the special brick types
            const specialIndex = Math.floor(Math.random() * config.specialBricks.length);
            return config.specialBricks[specialIndex];
        } else {
            // Regular candy
            const regularIndex = Math.floor(Math.random() * config.candyTypes.length);
            return config.candyTypes[regularIndex];
        }
    }
    
    // Handle candy click events
    function handleCandyClick(row, col) {
        // Don't allow interactions during animations
        if (state.isAnimating) return;
        
        // Remove any existing hint highlights
        removeHintHighlights();
        
        const clickedCandy = state.board[row][col];
        
        // If no candy is selected, select this one
        if (!state.selectedCandy) {
            state.selectedCandy = clickedCandy;
            highlightSelectedCandy(row, col);
            return;
        }
        
        // If the same candy is clicked again, deselect it
        if (state.selectedCandy === clickedCandy) {
            state.selectedCandy = null;
            removeHighlights();
            return;
        }
        
        // Check if the candies are adjacent
        if (areAdjacent(state.selectedCandy, clickedCandy)) {
            // Swap the candies with animation
            animateSwap(state.selectedCandy, clickedCandy);
        } else {
            // Candies are not adjacent, change selection
            removeHighlights();
            state.selectedCandy = clickedCandy;
            highlightSelectedCandy(row, col);
        }
    }
    
    // Animate swapping of two candies
    function animateSwap(candy1, candy2) {
        state.isAnimating = true;
        
        const cell1 = getCellElement(candy1.row, candy1.col);
        const cell2 = getCellElement(candy2.row, candy2.col);
        
        if (!cell1 || !cell2) {
            console.error("Could not find cells for swap animation");
            state.isAnimating = false;
            return;
        }
        
        const candy1Element = cell1.querySelector('.candy');
        const candy2Element = cell2.querySelector('.candy');
        
        if (!candy1Element || !candy2Element) {
            console.error("Could not find candy elements for swap animation");
            state.isAnimating = false;
            return;
        }
        
        // Get the positions for animation
        const rect1 = cell1.getBoundingClientRect();
        const rect2 = cell2.getBoundingClientRect();
        
        // Calculate the distance to move
        const deltaX = rect2.left - rect1.left;
        const deltaY = rect2.top - rect1.top;
        
        // Apply CSS variables for the animation
        candy1Element.style.setProperty('--targetX', `${deltaX}px`);
        candy1Element.style.setProperty('--targetY', `${deltaY}px`);
        candy2Element.style.setProperty('--targetX', `${-deltaX}px`);
        candy2Element.style.setProperty('--targetY', `${-deltaY}px`);
        
        // Add the sliding animation class
        candy1Element.classList.add('sliding');
        candy2Element.classList.add('sliding');
        
        // Wait for animation to complete
        setTimeout(() => {
            // Swap the candies in the data model
            swapCandies(candy1, candy2);
            
            // Swap the candy elements in the DOM
            cell1.innerHTML = '';
            cell2.innerHTML = '';
            
            const newCandy1Element = document.createElement('div');
            newCandy1Element.classList.add('candy', candy1.type);
            cell1.appendChild(newCandy1Element);
            
            const newCandy2Element = document.createElement('div');
            newCandy2Element.classList.add('candy', candy2.type);
            cell2.appendChild(newCandy2Element);
            
            // Check for matches after the swap
            const matches = checkForMatches();
            
            if (matches.length > 0) {
                // Valid move - matches found
                animateMatchesAndCascade(matches);
            } else {
                // Invalid move - no matches, swap back with animation
                swapCandies(candy2, candy1);
                
                // Update the DOM elements again
                cell1.innerHTML = '';
                cell2.innerHTML = '';
                
                const revertedCandy1Element = document.createElement('div');
                revertedCandy1Element.classList.add('candy', candy1.type);
                cell1.appendChild(revertedCandy1Element);
                
                const revertedCandy2Element = document.createElement('div');
                revertedCandy2Element.classList.add('candy', candy2.type);
                cell2.appendChild(revertedCandy2Element);
                
                // Animation is complete for invalid move
                state.isAnimating = false;
            }
            
            // Reset selection
            state.selectedCandy = null;
            removeHighlights();
        }, config.animationSpeed.swap);
    }
    
    // Highlight the selected candy
    function highlightSelectedCandy(row, col) {
        const cellElement = getCellElement(row, col);
        if (cellElement) {
            const candyElement = cellElement.querySelector('.candy');
            if (candyElement) {
                candyElement.classList.add('selected');
            }
        }
    }
    
    // Remove all highlights
    function removeHighlights() {
        const candies = document.querySelectorAll('.candy');
        candies.forEach(candy => candy.classList.remove('selected'));
    }
    
    // Remove hint highlights
    function removeHintHighlights() {
        const candies = document.querySelectorAll('.candy');
        candies.forEach(candy => candy.classList.remove('hint-highlight'));
    }
    
    // Get the DOM element for a candy
    function getCandyElement(row, col) {
        const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
        return cell ? cell.querySelector('.candy') : null;
    }
    
    // Get the cell element containing a candy
    function getCellElement(row, col) {
        return document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    }
    
    // Check if two candies are adjacent
    function areAdjacent(candy1, candy2) {
        const rowDiff = Math.abs(candy1.row - candy2.row);
        const colDiff = Math.abs(candy1.col - candy2.col);
        
        // Adjacent if exactly one is 1 and the other is 0
        return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
    }
    
    // Swap two candies
    function swapCandies(candy1, candy2) {
        // Swap types in the data model
        const tempType = candy1.type;
        candy1.type = candy2.type;
        candy2.type = tempType;
        
        // Update the DOM
        const candy1Element = getCandyElement(candy1.row, candy1.col);
        const candy2Element = getCandyElement(candy2.row, candy2.col);
        
        candy1Element.className = `candy ${candy1.type}`;
        candy2Element.className = `candy ${candy2.type}`;
    }
    
    // Check for matches in the current board state
    function checkForMatches() {
        const matches = [];
        
        // Check horizontal matches
        for (let row = 0; row < config.rows; row++) {
            for (let col = 0; col < config.columns - 2; col++) {
                const type = state.board[row][col].type;
                if (type === state.board[row][col + 1].type && 
                    type === state.board[row][col + 2].type) {
                    
                    // Found a match of 3 or more
                    const match = {
                        type: type,
                        candies: [
                            state.board[row][col],
                            state.board[row][col + 1],
                            state.board[row][col + 2]
                        ]
                    };
                    
                    // Check if there are more in this match
                    let nextCol = col + 3;
                    while (nextCol < config.columns && state.board[row][nextCol].type === type) {
                        match.candies.push(state.board[row][nextCol]);
                        nextCol++;
                    }
                    
                    matches.push(match);
                    col = nextCol - 1; // Skip ahead
                }
            }
        }
        
        // Check vertical matches
        for (let col = 0; col < config.columns; col++) {
            for (let row = 0; row < config.rows - 2; row++) {
                const type = state.board[row][col].type;
                if (type === state.board[row + 1][col].type && 
                    type === state.board[row + 2][col].type) {
                    
                    // Found a match of 3 or more
                    const match = {
                        type: type,
                        candies: [
                            state.board[row][col],
                            state.board[row + 1][col],
                            state.board[row + 2][col]
                        ]
                    };
                    
                    // Check if there are more in this match
                    let nextRow = row + 3;
                    while (nextRow < config.rows && state.board[nextRow][col].type === type) {
                        match.candies.push(state.board[nextRow][col]);
                        nextRow++;
                    }
                    
                    matches.push(match);
                    row = nextRow - 1; // Skip ahead
                }
            }
        }
        
        return matches;
    }
    
    // Animate matches and handle cascade effects
    function animateMatchesAndCascade(matches) {
        // Update score based on matches
        updateScore(matches);
        
        // Increment moves
        state.moves++;
        movesElement.textContent = state.moves;
        
        // Animate the removal of matches
        animateMatches(matches, () => {
            // After animation completes, apply gravity with animation
            animateGravity();
        });
    }
    
    // Animate the dissolving of matched candies
    function animateMatches(matches, callback) {
        console.log('Animating matches:', matches);
        
        // Mark matched candies as empty (null)
        matches.forEach(match => {
            match.candies.forEach(candy => {
                // Mark this candy as empty (null)
                state.board[candy.row][candy.col].type = null;
                
                // Get the DOM element
                const cellElement = getCellElement(candy.row, candy.col);
                
                if (cellElement) {
                    const candyElement = cellElement.querySelector('.candy');
                    
                    if (candyElement) {
                        // Apply dissolve and burst animations
                        candyElement.classList.add('dissolving', 'bursting');
                        
                        // Create particles for a more dramatic effect
                        createParticles(cellElement, candy.type);
                        
                        // Show individual point popup for this brick
                        showBrickScorePopup(cellElement, candy.type);
                    } else {
                        console.error('No candy element found in cell', candy.row, candy.col);
                    }
                } else {
                    console.error('No cell element found for', candy.row, candy.col);
                }
            });
        });
        
        // Wait for the animation to complete
        setTimeout(() => {
            // Remove the animations classes from all elements
            const dissolvingElements = document.querySelectorAll('.dissolving');
            
            dissolvingElements.forEach(el => {
                el.classList.remove('dissolving', 'bursting');
                
                // Find the parent cell and clear it
                const cell = el.closest('.cell');
                if (cell) {
                    cell.innerHTML = '';
                }
            });
            
            // Remove particles
            const particles = document.querySelectorAll('.particle');
            particles.forEach(particle => particle.remove());
            
            // Call the callback function (applies gravity)
            if (callback) callback();
        }, config.animationSpeed.dissolve);
    }
    
    // Show score popup for an individual brick
    function showBrickScorePopup(cellElement, type) {
        // Determine point value based on brick type
        let points;
        if (type === 'diamond') {
            points = config.pointValues.diamond;
        } else if (type === 'gold') {
            points = config.pointValues.gold;
        } else {
            points = config.pointValues.regular;
        }
        
        // Create a popup element
        const popup = document.createElement('div');
        popup.textContent = `+${points}`;
        popup.classList.add('brick-score-popup');
        
        // Style based on brick type
        if (type === 'diamond') {
            popup.classList.add('diamond-score');
        } else if (type === 'gold') {
            popup.classList.add('gold-score');
        }
        
        // Position the popup at the cell's position
        const rect = cellElement.getBoundingClientRect();
        const boardRect = gameBoard.getBoundingClientRect();
        
        // Position relative to the game board
        const posX = rect.left - boardRect.left + rect.width / 2;
        const posY = rect.top - boardRect.top + rect.height / 2;
        
        popup.style.left = `${posX}px`;
        popup.style.top = `${posY}px`;
        
        // Add to game board
        gameBoard.appendChild(popup);
        
        // Remove after animation completes
        setTimeout(() => {
            popup.remove();
        }, 1000);
    }
    
    // Create particle effects for a candy element
    function createParticles(cellElement, type) {
        const rect = cellElement.getBoundingClientRect();
        const boardRect = gameBoard.getBoundingClientRect();
        
        // Position relative to the game board
        const centerX = rect.left - boardRect.left + rect.width / 2;
        const centerY = rect.top - boardRect.top + rect.height / 2;
        
        // Get the color based on candy type
        let color;
        switch (type) {
            case 'red': color = '#ff5252'; break;
            case 'blue': color = '#4285f4'; break;
            case 'green': color = '#0f9d58'; break;
            case 'yellow': color = '#ffeb3b'; break;
            case 'purple': color = '#9c27b0'; break;
            case 'orange': color = '#ff9800'; break;
            case 'diamond': color = '#67c7eb'; break;
            case 'gold': color = '#e7b627'; break;
            default: color = '#ffffff';
        }
        
        // Create more particles for special candies
        const particleCount = (type === 'diamond' || type === 'gold') ? 20 : 10;
        
        // Create multiple particles
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.classList.add('particle');
            particle.style.backgroundColor = color;
            particle.style.left = `${centerX}px`;
            particle.style.top = `${centerY}px`;
            
            // Random movement direction
            const angle = Math.random() * Math.PI * 2;
            const distance = 20 + Math.random() * 30;
            const moveX = Math.cos(angle) * distance;
            const moveY = Math.sin(angle) * distance;
            
            particle.style.setProperty('--moveX', `${moveX}px`);
            particle.style.setProperty('--moveY', `${moveY}px`);
            
            gameBoard.appendChild(particle);
        }
    }
    
    // Animate gravity effect (candies falling)
    function animateGravity() {
        // Calculate how candies should fall
        const fallData = calculateFallData();
        
        // Apply falling animations
        applyFallingAnimations(fallData, () => {
            // After gravity animation, check for new matches
            const newMatches = checkForMatches();
            if (newMatches.length > 0) {
                // Chain reaction - animate new matches
                setTimeout(() => {
                    animateMatchesAndCascade(newMatches);
                }, config.animationSpeed.cascadeDelay);
            } else {
                // No more matches, animation is complete
                state.isAnimating = false;
                
                // Check if there are any valid moves left
                if (!hasValidMoves()) {
                    showGameOver();
                }
            }
        });
    }
    
    // Calculate how candies should fall
    function calculateFallData() {
        const fallData = [];
        
        // For each column
        for (let col = 0; col < config.columns; col++) {
            let emptySpaces = 0;
            const colFallData = [];
            
            // Start from the bottom and count empty spaces
            for (let row = config.rows - 1; row >= 0; row--) {
                if (state.board[row][col].type === null) {
                    emptySpaces++;
                } else if (emptySpaces > 0) {
                    // This candy needs to fall
                    const currentRow = row;
                    const newRow = row + emptySpaces;
                    
                    colFallData.push({
                        fromRow: currentRow,
                        fromCol: col,
                        toRow: newRow,
                        toCol: col,
                        fallDistance: emptySpaces
                    });
                    
                    // Update the board data
                    state.board[newRow][col].type = state.board[currentRow][col].type;
                    state.board[currentRow][col].type = null;
                }
            }
            
            // Add new candies at the top
            for (let row = 0; row < emptySpaces; row++) {
                // Generate a new candy type
                const newType = getRandomCandyType();
                state.board[row][col].type = newType;
                
                // This is a new candy falling from above the board
                colFallData.push({
                    isNew: true,
                    toRow: row,
                    toCol: col,
                    fallDistance: emptySpaces - row
                });
            }
            
            if (colFallData.length > 0) {
                fallData.push(...colFallData);
            }
        }
        
        return fallData;
    }
    
    // Apply falling animations based on calculated fall data
    function applyFallingAnimations(fallData, callback) {
        if (fallData.length === 0) {
            // No candies to fall, call the callback immediately
            if (callback) callback();
            return;
        }
        
        // For existing candies that need to fall
        fallData.filter(data => !data.isNew).forEach(data => {
            // Get the original element
            const candyElement = getCandyElement(data.fromRow, data.fromCol);
            
            // Update data attributes to match new position
            candyElement.setAttribute('data-row', data.toRow);
            candyElement.setAttribute('data-col', data.toCol);
            
            // Calculate the fall distance for animation
            const cellHeight = gameBoard.clientHeight / config.rows;
            const fallPixels = data.fallDistance * cellHeight;
            
            // Set CSS variables for the animation
            candyElement.style.setProperty('--startY', '0px');
            candyElement.style.setProperty('--endY', `${fallPixels}px`);
            
            // Add the falling animation class
            candyElement.classList.add('falling');
        });
        
        // Re-render to create new candy elements at the top
        renderBoard();
        
        // For new candies falling from the top
        fallData.filter(data => data.isNew).forEach(data => {
            const candyElement = getCandyElement(data.toRow, data.toCol);
            
            // Calculate starting position above the board
            const cellHeight = gameBoard.clientHeight / config.rows;
            const startY = -(data.fallDistance + 1) * cellHeight;
            
            // Set CSS variables for the animation
            candyElement.style.setProperty('--startY', `${startY}px`);
            candyElement.style.setProperty('--endY', '0px');
            
            // Add the falling animation class
            candyElement.classList.add('falling');
        });
        
        // Wait for animations to complete
        setTimeout(() => {
            // Remove the falling class from all elements
            const fallingElements = document.querySelectorAll('.falling');
            fallingElements.forEach(el => el.classList.remove('falling'));
            
            // Call the callback function
            if (callback) callback();
        }, config.animationSpeed.fall);
    }
    
    // Update the score based on matches
    function updateScore(matches) {
        let points = 0;
        
        matches.forEach(match => {
            // Calculate points based on candy types
            match.candies.forEach(candy => {
                // Determine point value based on candy type
                if (candy.type === 'diamond') {
                    points += config.pointValues.diamond;
                } else if (candy.type === 'gold') {
                    points += config.pointValues.gold;
                } else {
                    points += config.pointValues.regular;
                }
            });
            
            // Bonus points for matches greater than 3
            if (match.candies.length > 3) {
                points += (match.candies.length - 3) * config.pointValues.bonusPerExtra;
            }
        });
        
        state.score += points;
        scoreElement.textContent = state.score;
        
        // Check if player earned a new hint
        checkHintRefill();
        
        // Animate score update
        animateScoreUpdate(points);
    }
    
    // Check if player earned a new hint
    function checkHintRefill() {
        // Calculate how many checkpoints the player has passed
        const checkpointsPassed = Math.floor(state.score / config.hints.pointsPerHint);
        const lastCheckpoint = Math.floor(state.hints.lastScoreCheckpoint / config.hints.pointsPerHint);
        
        // If player passed at least one new checkpoint
        if (checkpointsPassed > lastCheckpoint) {
            const hintsToAdd = Math.min(
                checkpointsPassed - lastCheckpoint,
                config.hints.maxHints - state.hints.available
            );
            
            if (hintsToAdd > 0) {
                // Add new hints
                state.hints.available = Math.min(
                    state.hints.available + hintsToAdd,
                    config.hints.maxHints
                );
                
                // Update UI
                updateHints();
                
                // Show notification
                showHintNotification();
                
                // Update hint button state
                updateHintButtonState();
            }
            
            // Update the checkpoint
            state.hints.lastScoreCheckpoint = state.score;
        }
    }
    
    // Show hint notification
    function showHintNotification() {
        hintsAvailableElement.textContent = state.hints.available;
        hintNotification.classList.remove('hidden');
        
        // Hide notification after animation
        setTimeout(() => {
            hintNotification.classList.add('hidden');
        }, 3000);
    }
    
    // Update hint button state
    function updateHintButtonState() {
        hintButton.disabled = state.hints.available <= 0;
    }
    
    // Animate the score update with special styling for higher points
    function animateScoreUpdate(points) {
        // Create a floating score element
        const scorePopup = document.createElement('div');
        scorePopup.textContent = `+${points}`;
        scorePopup.style.position = 'absolute';
        
        // Special styling for high scores
        if (points >= 100) {
            scorePopup.style.color = '#FFD700'; // Gold
            scorePopup.style.fontSize = '28px';
            scorePopup.style.textShadow = '0 0 10px rgba(255, 215, 0, 0.7)';
        } else if (points >= 50) {
            scorePopup.style.color = '#C0C0C0'; // Silver
            scorePopup.style.fontSize = '26px';
            scorePopup.style.textShadow = '0 0 8px rgba(192, 192, 192, 0.7)';
        } else {
            scorePopup.style.color = '#e86a92';
            scorePopup.style.fontSize = '24px';
        }
        
        scorePopup.style.fontWeight = 'bold';
        scorePopup.style.top = '50%';
        scorePopup.style.left = '50%';
        scorePopup.style.transform = 'translate(-50%, -50%)';
        scorePopup.style.zIndex = '100';
        scorePopup.style.pointerEvents = 'none';
        scorePopup.style.animation = 'scorePopup 1s forwards';
        
        // Add a style for the animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes scorePopup {
                0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
                20% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
                80% { transform: translate(-50%, -120%) scale(1); opacity: 1; }
                100% { transform: translate(-50%, -150%) scale(0.8); opacity: 0; }
            }
        `;
        
        document.head.appendChild(style);
        gameBoard.appendChild(scorePopup);
        
        // Remove the element after animation
        setTimeout(() => {
            scorePopup.remove();
        }, 1000);
    }
    
    // Check if there are any valid moves available
    function hasValidMoves() {
        // Try swapping each candy with its neighbors and check if it creates a match
        for (let row = 0; row < config.rows; row++) {
            for (let col = 0; col < config.columns; col++) {
                // Check right neighbor
                if (col < config.columns - 1) {
                    // Swap
                    const tempType = state.board[row][col].type;
                    state.board[row][col].type = state.board[row][col + 1].type;
                    state.board[row][col + 1].type = tempType;
                    
                    // Check for matches
                    const matches = checkForMatches();
                    
                    // Swap back
                    state.board[row][col + 1].type = state.board[row][col].type;
                    state.board[row][col].type = tempType;
                    
                    if (matches.length > 0) {
                        return true;
                    }
                }
                
                // Check bottom neighbor
                if (row < config.rows - 1) {
                    // Swap
                    const tempType = state.board[row][col].type;
                    state.board[row][col].type = state.board[row + 1][col].type;
                    state.board[row + 1][col].type = tempType;
                    
                    // Check for matches
                    const matches = checkForMatches();
                    
                    // Swap back
                    state.board[row + 1][col].type = state.board[row][col].type;
                    state.board[row][col].type = tempType;
                    
                    if (matches.length > 0) {
                        return true;
                    }
                }
            }
        }
        
        // No valid moves found
        return false;
    }
    
    // Find a valid move for hint
    function findValidMove() {
        const validMoves = [];
        
        // Try swapping each candy with its neighbors and check if it creates a match
        for (let row = 0; row < config.rows; row++) {
            for (let col = 0; col < config.columns; col++) {
                // Check right neighbor
                if (col < config.columns - 1) {
                    // Swap
                    const tempType = state.board[row][col].type;
                    state.board[row][col].type = state.board[row][col + 1].type;
                    state.board[row][col + 1].type = tempType;
                    
                    // Check for matches
                    const matches = checkForMatches();
                    
                    // Swap back
                    state.board[row][col + 1].type = state.board[row][col].type;
                    state.board[row][col].type = tempType;
                    
                    if (matches.length > 0) {
                        validMoves.push({
                            candy1: { row, col },
                            candy2: { row, col: col + 1 },
                            matchCount: matches.reduce((total, match) => total + match.candies.length, 0)
                        });
                    }
                }
                
                // Check bottom neighbor
                if (row < config.rows - 1) {
                    // Swap
                    const tempType = state.board[row][col].type;
                    state.board[row][col].type = state.board[row + 1][col].type;
                    state.board[row + 1][col].type = tempType;
                    
                    // Check for matches
                    const matches = checkForMatches();
                    
                    // Swap back
                    state.board[row + 1][col].type = state.board[row][col].type;
                    state.board[row][col].type = tempType;
                    
                    if (matches.length > 0) {
                        validMoves.push({
                            candy1: { row, col },
                            candy2: { row: row + 1, col },
                            matchCount: matches.reduce((total, match) => total + match.candies.length, 0)
                        });
                    }
                }
            }
        }
        
        // Sort by match count to prioritize better moves
        validMoves.sort((a, b) => b.matchCount - a.matchCount);
        
        return validMoves.length > 0 ? validMoves[0] : null;
    }
    
    // Show a hint
    function showHint() {
        // Check if player has hints available
        if (state.hints.available <= 0) return;
        
        // Use a hint
        state.hints.available--;
        updateHints();
        
        // Find a valid move
        const validMove = findValidMove();
        
        if (validMove) {
            // Highlight the candies involved in the move
            const candy1Element = getCandyElement(validMove.candy1.row, validMove.candy1.col);
            const candy2Element = getCandyElement(validMove.candy2.row, validMove.candy2.col);
            
            candy1Element.classList.add('hint-highlight');
            candy2Element.classList.add('hint-highlight');
            
            // Remove the highlight after a delay
            setTimeout(() => {
                candy1Element.classList.remove('hint-highlight');
                candy2Element.classList.remove('hint-highlight');
            }, config.hints.hintDuration);
        }
    }
    
    // Show game over overlay
    function showGameOver() {
        // Update final score
        finalScoreElement.textContent = state.score;
        
        // Show overlay
        gameOverOverlay.classList.remove('hidden');
    }
    
    // Update smashes display
    function updateSmashes(smashes) {
        state.smashesRemaining = smashes;
        smashesElement.textContent = smashes;
        
        // Enable/disable smash button based on availability
        const smashBtn = document.getElementById('smash-btn');
        if (smashes <= 0) {
            smashBtn.disabled = true;
        } else {
            smashBtn.disabled = false;
            
            // Show notification when smash is available
            if (smashes > 0 && !smashNotification.classList.contains('shown')) {
                const notification = smashNotification;
                notification.classList.remove('hidden');
                notification.classList.add('shown');
                
                setTimeout(() => {
                    notification.classList.add('hidden');
                    notification.classList.remove('shown');
                }, 3000);
            }
        }
    }
    
    // Perform the Angela Screen Smash special move
    function performScreenSmash() {
        if (state.smashesRemaining <= 0 || state.gameOver) return;
        
        // Use up a smash
        updateSmashes(state.smashesRemaining - 1);
        
        // Find all regular bricks (non-special)
        const regularBricks = [];
        for (let row = 0; row < config.rows; row++) {
            for (let col = 0; col < config.columns; col++) {
                const brick = state.board[row][col];
                if (brick && !config.specialBricks.includes(brick.type)) {
                    regularBricks.push({ row, col, brick });
                }
            }
        }
        
        // If we don't have at least 9 regular bricks, smash as many as we can
        const numToSmash = Math.min(9, regularBricks.length);
        if (numToSmash < 3) {
            console.log("Not enough regular bricks to perform a screen smash!");
            return;
        }
        
        // Randomly select bricks to smash
        const shuffled = regularBricks.sort(() => 0.5 - Math.random());
        const bricksToSmash = shuffled.slice(0, numToSmash);
        
        // First analyze if any of these bricks will cause a match when removed
        let willCauseMatch = false;
        
        // Clone the board for simulation
        const simulationBoard = state.board.map(row => [...row]);
        
        // For each brick to smash, check if its removal would cause a match
        for (const { row, col } of bricksToSmash) {
            // Temporarily remove this brick
            const originalBrick = simulationBoard[row][col];
            simulationBoard[row][col] = null;
            
            // Apply gravity in the simulation
            for (let r = row; r > 0; r--) {
                simulationBoard[r][col] = simulationBoard[r-1][col];
                simulationBoard[r-1][col] = null;
            }
            
            // Check for potential matches
            for (let r = 0; r < config.rows; r++) {
                for (let c = 0; c < config.columns; c++) {
                    if (simulationBoard[r][c]) {
                        const horizontalMatches = findHorizontalMatches(simulationBoard, r, c);
                        const verticalMatches = findVerticalMatches(simulationBoard, r, c);
                        if (horizontalMatches.length >= 3 || verticalMatches.length >= 3) {
                            willCauseMatch = true;
                            break;
                        }
                    }
                }
                if (willCauseMatch) break;
            }
            
            // Restore the simulation board for the next check
            simulationBoard[row][col] = originalBrick;
        }
        
        // If none of the randomly selected bricks will cause a match,
        // we need to find at least one brick that will
        if (!willCauseMatch) {
            // Find a brick that will cause a match when removed
            let matchFound = false;
            
            // Try each remaining regular brick to see if removing it causes a match
            for (const { row, col } of regularBricks.filter(b => 
                !bricksToSmash.some(s => s.row === b.row && s.col === b.col))) {
                
                // Clone the board again for a fresh simulation
                const newSimBoard = state.board.map(row => [...row]);
                
                // Remove this brick and apply gravity
                newSimBoard[row][col] = null;
                for (let r = row; r > 0; r--) {
                    newSimBoard[r][col] = newSimBoard[r-1][col];
                    newSimBoard[r-1][col] = null;
                }
                
                // Check for matches
                for (let r = 0; r < config.rows; r++) {
                    for (let c = 0; c < config.columns; c++) {
                        if (newSimBoard[r][c]) {
                            const horizontalMatches = findHorizontalMatches(newSimBoard, r, c);
                            const verticalMatches = findVerticalMatches(newSimBoard, r, c);
                            if (horizontalMatches.length >= 3 || verticalMatches.length >= 3) {
                                // Replace one of our random bricks with this one that causes a match
                                bricksToSmash[0] = { row, col, brick: state.board[row][col] };
                                matchFound = true;
                                break;
                            }
                        }
                    }
                    if (matchFound) break;
                }
                
                if (matchFound) break;
            }
        }
        
        // Animate the smashing effect for all selected bricks
        bricksToSmash.forEach(({ row, col, brick }, index) => {
            const candyElement = getCandyElement(row, col);
            console.log(`Smashing brick at ${row},${col}:`, candyElement);
            
            if (candyElement) {
                candyElement.classList.add('smash-target');
                
                // Stagger the animations slightly
                setTimeout(() => {
                    // Show the score popup
                    showBrickScorePopup(candyElement, brick.type);
                    
                    // Add smashing animation
                    candyElement.classList.add('smashing');
                    
                    // Remove the brick after animation
                    setTimeout(() => {
                        state.board[row][col] = null;
                        candyElement.innerHTML = '';
                        candyElement.style.opacity = '0';
                        
                        // If this was the last brick to animate, start the cascade
                        if (index === bricksToSmash.length - 1) {
                            // Update score for the smashed bricks
                            updateScore(state.score + (config.pointValues.regular * bricksToSmash.length));
                            
                            // Apply gravity and check for new matches
                            setTimeout(() => {
                                animateGravity();
                                // After gravity completes, checkForMatches happens in the animateGravity callback
                            }, 300);
                        }
                    }, 400);
                }, index * 100);
            } else {
                console.error(`Couldn't find candy element at ${row},${col}`);
            }
        });
    }
    
    // Find horizontal matches of 3 or more bricks
    function findHorizontalMatches(board, row, col) {
        const matches = [{ row, col }];
        const type = board[row][col]?.type;
        
        if (!type) return [];
        
        // Check left
        let c = col - 1;
        while (c >= 0 && board[row][c]?.type === type) {
            matches.push({ row, col: c });
            c--;
        }
        
        // Check right
        c = col + 1;
        while (c < config.columns && board[row][c]?.type === type) {
            matches.push({ row, col: c });
            c++;
        }
        
        return matches.length >= 3 ? matches : [];
    }
    
    // Find vertical matches of 3 or more bricks
    function findVerticalMatches(board, row, col) {
        const matches = [{ row, col }];
        const type = board[row][col]?.type;
        
        if (!type) return [];
        
        // Check up
        let r = row - 1;
        while (r >= 0 && board[r][col]?.type === type) {
            matches.push({ row: r, col });
            r--;
        }
        
        // Check down
        r = row + 1;
        while (r < config.rows && board[r][col]?.type === type) {
            matches.push({ row: r, col });
            r++;
        }
        
        return matches.length >= 3 ? matches : [];
    }
    
    // Reset game
    function resetGame() {
        // Clear the board
        const boardElement = document.getElementById('game-board');
        boardElement.innerHTML = '';
        
        // Reset game state
        state.board = [];
        state.score = 0;
        state.moves = 0;
        state.hints.available = config.hints.maxHints;
        state.hints.lastScoreCheckpoint = 0;
        state.smashesRemaining = config.initialSmashes;
        state.gameOver = false;
        
        // Hide game over overlay
        document.getElementById('game-over').classList.add('hidden');
        
        // Initialize the game again
        initGame();
    }
    
    // Event listeners
    newGameButton.addEventListener('click', initGame);
    hintButton.addEventListener('click', showHint);
    restartButton.addEventListener('click', initGame);
    smashButton.addEventListener('click', performScreenSmash);
    
    // Start the game
    console.log('Starting game initialization');
    initGame();
    console.log('Game initialization complete');

    // Update UI when hints change
    function updateHints() {
        hintsElement.textContent = state.hints.available;
        
        // Enable/disable hint button based on availability
        if (state.hints.available <= 0) {
            hintButton.disabled = true;
        } else {
            hintButton.disabled = false;
        }
    }
}); 