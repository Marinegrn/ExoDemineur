let gameState = null;
let gameActive = false;
let startTime = null;
let timerInterval = null;

async function startNewGame() {
    const rows = parseInt(document.getElementById('rows').value);
    const cols = parseInt(document.getElementById('cols').value);
    const mines = parseInt(document.getElementById('mines').value);

    // Validation simple
    if (mines >= rows * cols) {
        alert('Le nombre de mines doit être inférieur au nombre total de cases !');
        return;
    }

    try {
        // Communication avec Flask
        const response = await fetch('/new_game', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ rows, cols, mines })
        });

        const data = await response.json();
        
        if (data.success) {
            gameState = {
                state: data.state,
                rows: data.rows,
                cols: data.cols,
                mines: data.mines,
                gameOver: data.game_over,
                won: data.won
            };
            
            gameActive = true;
            startTime = Date.now();
            
            document.getElementById('gameInfo').style.display = 'flex';
            document.getElementById('mineCount').textContent = mines;
            document.getElementById('flagCount').textContent = '0';
            
            startTimer();
            renderGame();
            updateStatus('En cours... Bonne chance !', 'playing');
        }
    } catch (error) {
        console.error('Erreur lors de la création du jeu:', error);
        // Fallback vers la logique JavaScript 
        fallbackNewGame(rows, cols, mines);
    }
}

// Fonction de secours si Flask n'est pas disponible
function fallbackNewGame(rows, cols, mines) {
    console.log('🔄 Utilisation du mode offline (JavaScript local)');
    gameState = createLocalGame(rows, cols, mines);
    gameActive = true;
    startTime = Date.now();
    
    document.getElementById('gameInfo').style.display = 'flex';
    document.getElementById('mineCount').textContent = mines;
    document.getElementById('flagCount').textContent = '0';
    
    startTimer();
    renderGame();
    updateStatus('En cours... Bonne chance ! (Mode offline)', 'playing');
}

function createLocalGame(rows, cols, mines) {
    // Logique JavaScript
    const grid = Array(rows).fill().map(() => Array(cols).fill(0));
    const revealed = Array(rows).fill().map(() => Array(cols).fill(false));
    const flagged = Array(rows).fill().map(() => Array(cols).fill(false));

    // Placement aléatoire des mines
    const minePositions = new Set();
    while (minePositions.size < mines) {
        const row = Math.floor(Math.random() * rows);
        const col = Math.floor(Math.random() * cols);
        minePositions.add(`${row},${col}`);
    }

    minePositions.forEach(pos => {
        const [row, col] = pos.split(',').map(Number);
        grid[row][col] = -1;
    });

    // Calculer les nombres
    const directions = [[-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]];
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            if (grid[row][col] !== -1) {
                let count = 0;
                directions.forEach(([dr, dc]) => {
                    const newRow = row + dr, newCol = col + dc;
                    if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols && grid[newRow][newCol] === -1) {
                        count++;
                    }
                });
                grid[row][col] = count;
            }
        }
    }

    // Format compatible avec Flask
    const state = [];
    for (let row = 0; row < rows; row++) {
        const rowState = [];
        for (let col = 0; col < cols; col++) {
            rowState.push({
                revealed: revealed[row][col],
                flagged: flagged[row][col],
                value: null
            });
        }
        state.push(rowState);
    }

    return {
        state,
        rows,
        cols,
        mines,
        gameOver: false,
        won: false,
        localGrid: grid, // Gardé pour la logique locale
        localRevealed: revealed,
        localFlagged: flagged
    };
}

async function revealCell(row, col) {
    if (!gameActive || (gameState.gameOver && !gameState.localGrid) || 
        gameState.state[row][col].revealed || gameState.state[row][col].flagged) {
        return;
    }

    try {
        const response = await fetch('/reveal', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ row, col })
        });

        const data = await response.json();
        
        if (data.success) {
            gameState.state = data.state;
            gameState.gameOver = data.game_over;
            gameState.won = data.won;
            
            if (data.game_over) {
                gameActive = false;
                stopTimer();
                if (data.won) {
                    updateStatus('🎉 Félicitations! Vous avez gagné!', 'won');
                } else {
                    updateStatus('💥 Boom! Vous avez perdu!', 'lost');
                }
            }
            
            renderGame();
        }
    } catch (error) {
        console.error('Erreur lors de la révélation:', error);

        if (gameState.localGrid) {
            revealCellLocal(row, col);
        }
    }
}

async function toggleFlag(row, col) {
    if (!gameActive || (gameState.gameOver && !gameState.localGrid) || gameState.state[row][col].revealed) {
        return;
    }

    try {
        const response = await fetch('/flag', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ row, col })
        });

        const data = await response.json();
        
        if (data.success) {
            gameState.state = data.state;
            updateFlagCount();
            renderGame();
        }
    } catch (error) {
        console.error('Erreur lors du placement du drapeau:', error);

        if (gameState.localFlagged) {
            toggleFlagLocal(row, col);
        }
    }
}

// Fonctions de fallback (mode offline)
function revealCellLocal(row, col) {
    if (gameState.localRevealed[row][col] || gameState.localFlagged[row][col]) return;

    gameState.localRevealed[row][col] = true;
    gameState.state[row][col].revealed = true;
    gameState.state[row][col].value = gameState.localGrid[row][col];

    if (gameState.localGrid[row][col] === -1) {
        gameState.gameOver = true;
        gameActive = false;
        stopTimer();
        revealAllMinesLocal();
        updateStatus('💥 Boom! Vous avez perdu! (Mode offline)', 'lost');
        return;
    }

    if (gameState.localGrid[row][col] === 0) {
        const directions = [[-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]];
        directions.forEach(([dr, dc]) => {
            const newRow = row + dr, newCol = col + dc;
            if (newRow >= 0 && newRow < gameState.rows && newCol >= 0 && newCol < gameState.cols) {
                revealCellLocal(newRow, newCol);
            }
        });
    }

    checkWinLocal();
    renderGame();
}

function toggleFlagLocal(row, col) {
    gameState.localFlagged[row][col] = !gameState.localFlagged[row][col];
    gameState.state[row][col].flagged = gameState.localFlagged[row][col];
    updateFlagCount();
    renderGame();
}

function revealAllMinesLocal() {
    for (let row = 0; row < gameState.rows; row++) {
        for (let col = 0; col < gameState.cols; col++) {
            if (gameState.localGrid[row][col] === -1) {
                gameState.localRevealed[row][col] = true;
                gameState.state[row][col].revealed = true;
                gameState.state[row][col].value = -1;
            }
        }
    }
}

function checkWinLocal() {
    let unrevealedSafeCells = 0;
    for (let row = 0; row < gameState.rows; row++) {
        for (let col = 0; col < gameState.cols; col++) {
            if (gameState.localGrid[row][col] !== -1 && !gameState.localRevealed[row][col]) {
                unrevealedSafeCells++;
            }
        }
    }

    if (unrevealedSafeCells === 0) {
        gameState.won = true;
        gameState.gameOver = true;
        gameActive = false;
        stopTimer();
        updateStatus('🎉 Félicitations! Vous avez gagné! (Mode offline)', 'won');
    }
}

function renderGame() {
    const gameGrid = document.getElementById('gameGrid');
    gameGrid.style.gridTemplateColumns = `repeat(${gameState.cols}, 1fr)`;
    gameGrid.innerHTML = '';

    for (let row = 0; row < gameState.rows; row++) {
        for (let col = 0; col < gameState.cols; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;

            const cellState = gameState.state[row][col];

            if (cellState.flagged) {
                cell.classList.add('flagged');
                cell.textContent = '🚩';
            } else if (cellState.revealed) {
                cell.classList.add('revealed');
                if (cellState.value === -1) {
                    cell.classList.add('mine');
                    cell.textContent = '💣';
                } else if (cellState.value > 0) {
                    cell.textContent = cellState.value;
                    cell.classList.add(`number-${cellState.value}`);
                }
            }

            cell.addEventListener('click', () => revealCell(row, col));
            cell.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                toggleFlag(row, col);
            });

            gameGrid.appendChild(cell);
        }
    }
}

function updateStatus(message, type) {
    const status = document.getElementById('gameStatus');
    status.textContent = message;
    status.className = `game-status ${type}`;
}

function updateFlagCount() {
    let flagCount = 0;
    for (let row = 0; row < gameState.rows; row++) {
        for (let col = 0; col < gameState.cols; col++) {
            if (gameState.state[row][col].flagged) {
                flagCount++;
            }
        }
    }
    document.getElementById('flagCount').textContent = flagCount;
}

function startTimer() {
    timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const seconds = (elapsed % 60).toString().padStart(2, '0');
        document.getElementById('timer').textContent = `${minutes}:${seconds}`;
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// Initialisation une fois le DOM chargé
document.addEventListener('DOMContentLoaded', function() {
    // Empêcher le menu contextuel par défaut sur le jeu
    document.addEventListener('contextmenu', (e) => {
        if (e.target.classList.contains('cell')) {
            e.preventDefault();
        }
    });
    
    // Vérifier si Flask est disponible
    fetch('/').then(() => {
        console.log('✅ Serveur Flask détecté - Mode online activé');
    }).catch(() => {
        console.log('⚠️ Serveur Flask non détecté - Mode offline activé');
    });
});