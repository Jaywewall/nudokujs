// --- INITIALIZATION ---

function generateGrid() {
    grid.innerHTML = '';
    for (let i = 0; i < 81; i++) {
        const cell = document.createElement('div');
        cell.classList.add('sudoku-cell', 'flex', 'items-center', 'justify-center', 'text-2xl', 'cursor-pointer', 'relative');
        cell.dataset.index = i;
        grid.appendChild(cell);
    }
}

function generateNumberPicker() {
    numberPicker.innerHTML = '';
    for (let i = 1; i <= 9; i++) {
        const btn = document.createElement('button');
        btn.classList.add('number-picker-btn', 'aspect-square', 'rounded-full', 'text-xl', 'font-bold', 'transition', 'flex', 'items-center', 'justify-center', 'focus:outline-none', 'focus:ring-2', 'focus:ring-blue-500');

        const numberSpan = document.createElement('span');
        numberSpan.textContent = i;
        numberSpan.style.color = COLORS[i - 1];

        btn.dataset.number = i;
        btn.appendChild(numberSpan);
        btn.classList.add(`bgc${i}-light`);
        numberPicker.appendChild(btn);
    }

    const deleteBtn = document.createElement('button');
    deleteBtn.classList.add('number-picker-btn', 'aspect-square', 'rounded-full', 'transition', 'flex', 'items-center', 'justify-center', 'focus:outline-none', 'focus:ring-2', 'focus:ring-blue-500', 'bg-red-500/20');
    deleteBtn.dataset.action = 'delete';
    deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red-400"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path><line x1="18" y1="9" x2="12" y2="15"></line><line x1="12" y1="9" x2="18" y2="15"></line></svg>`;
    numberPicker.appendChild(deleteBtn);
}

function generateRadialMenu() {
    radialMenu.innerHTML = '';
    const itemCount = 10; // 9 numbers + 1 eraser
    const angleStep = (2 * Math.PI) / itemCount;
    const radius = 75;
    const eraserAngle = -Math.PI / 2;
    const eraserX = radius * Math.cos(eraserAngle) + 100 - 24;
    const eraserY = radius * Math.sin(eraserAngle) + 100 - 24;

    const eraser = document.createElement('div');
    eraser.classList.add('radial-item', 'pointer-events-auto', 'absolute', 'w-12', 'h-12', 'flex', 'items-center', 'justify-center', 'rounded-full', 'bg-red-500/50', 'text-white');
    eraser.style.left = `${eraserX}px`;
    eraser.style.top = `${eraserY}px`;
    eraser.dataset.action = 'erase';
    eraser.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path><line x1="18" y1="9" x2="12" y2="15"></line><line x1="12" y1="9" x2="18" y2="15"></line></svg>`;
    radialMenu.appendChild(eraser);

    for (let i = 1; i <= 9; i++) {
        const angle = i * angleStep - Math.PI / 2;
        const x = radius * Math.cos(angle) + 100 - 24;
        const y = radius * Math.sin(angle) + 100 - 24;
        const item = document.createElement('div');
        item.classList.add('radial-item', 'pointer-events-auto', 'absolute', 'w-12', 'h-12', 'flex', 'items-center', 'justify-center', 'rounded-full', 'bg-slate-700', 'text-xl', 'font-bold');
        item.style.left = `${x}px`;
        item.style.top = `${y}px`;
        item.style.color = COLORS[i-1];
        item.textContent = i;
        item.dataset.number = i;
        radialMenu.appendChild(item);
    }
}

let initialBoard;

function loadBoard(boardObject, solutionObject, puzzleId = null) {
    initialBoard = JSON.parse(JSON.stringify(boardObject));
    mySudokuJS.setBoard(boardObject);
    initialSolutionString = solutionObject.map(cell => cell.val === null ? '.' : cell.val).join('');
    currentSolutionString = initialSolutionString;
    currentPuzzleId = puzzleId;
    antiCandidates = Array(81).fill(new Set());

    console.log(`Loading puzzle ID: ${currentPuzzleId || 'N/A'}`);

    // Reset history for the new board
    history = [];
    historyIndex = -1;
    saveHistory(); // Save the initial state of the *new* board
    renderBoard();
}


function saveHistory() {
    if(historyIndex < history.length - 1) {
        history = history.slice(0, historyIndex + 1);
    }
    const snapshot = {
        board: mySudokuJS.getBoard(),
        antiCandidates: JSON.parse(JSON.stringify(antiCandidates.map(s => Array.from(s))))
    };
    history.push(snapshot);
    historyIndex = history.length - 1;
    updateUndoRedoButtons();
}

function loadFromHistory(index) {
    if(index < 0 || index >= history.length) return;
    const snapshot = history[index];
    mySudokuJS.setBoard(snapshot.board);
    antiCandidates = snapshot.antiCandidates.map(a => new Set(a));
    historyIndex = index;
    renderBoard();
    updateUndoRedoButtons();
}

function precomputePeers() {
    peers.length = 0; // Clear existing peers before recomputing
    for (let i = 0; i < 81; i++) {
        const row = Math.floor(i / 9);
        const col = i % 9;
        const boxRow = Math.floor(row / 3);
        const boxCol = Math.floor(col / 3);

        const rowPeers = new Set(); for(let c = 0; c < 9; c++) rowPeers.add(row * 9 + c);
        const colPeers = new Set(); for(let r = 0; r < 9; r++) colPeers.add(r * 9 + col);
        const boxPeers = new Set();
        for (let r = boxRow * 3; r < boxRow * 3 + 3; r++) {
            for (let c = boxCol * 3; c < boxCol * 3 + 3; c++) { boxPeers.add(r * 9 + c); }
        }
        // Store all unique peers including the cell itself initially
        const allPeers = new Set([...rowPeers, ...colPeers, ...boxPeers]);
        // Store the sets excluding the cell itself for later use if needed
        peers[i] = {
             all: allPeers, // Includes self
             row: new Set([...rowPeers].filter(p => p !== i)),
             col: new Set([...colPeers].filter(p => p !== i)),
             box: new Set([...boxPeers].filter(p => p !== i)),
        };
    }
}

// --- END ---
function updateGameStateWithBoard(boardObject) {
    gameState = boardObject.map((cell, index) => {
        const value = cell.val === null ? null : cell.val;
        return {
            ...gameState[index],
            value: value,
        };
    });
}