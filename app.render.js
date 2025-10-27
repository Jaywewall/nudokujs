// --- RENDERING ---
function renderBoard() {
    clearHighlights();
    clearTappedTarget();
    updateNumberPicker();

    const currentBoard = mySudokuJS.getBoard();
    currentBoard.forEach((cellState, i) => {
        const cellEl = grid.children[i];
        const value = cellState.val;

        // Clear existing content and classes
        cellEl.innerHTML = '';
        cellEl.className = 'sudoku-cell flex items-center justify-center text-2xl cursor-pointer relative'; // Reset classes

        if (value) {
            const valueSpan = document.createElement('span');
            valueSpan.textContent = value;
            valueSpan.classList.add('cell-value');

            let isWrong = false;
            if (!cellState.isGiven && currentSolutionString && currentSolutionString.length === 81) {
                const sol = parseInt(currentSolutionString[i], 10);
                if (!Number.isNaN(sol) && sol >= 1 && sol <= 9 && sol !== value) {
                    isWrong = true;
                }
            }

            if (cellState.isGiven) {
                valueSpan.classList.add('given');
            } else {
                valueSpan.classList.add('user-input');
                if (isWrong) {
                    valueSpan.classList.add('wrong-value');
                } else {
                    valueSpan.style.color = COLORS[value - 1];
                }
            }
            cellEl.appendChild(valueSpan);
        } else {
            const candidatesGrid = document.createElement('div');
            candidatesGrid.classList.add('candidates-grid');
            
            const candidates = cellState.candidates || [];
            for (let k = 1; k <= 9; k++) {
                const candItem = document.createElement('div');
                candItem.classList.add('candidate-item');
                if (candidates[k-1] !== null) {
                    candItem.textContent = k;
                    candItem.style.color = COLORS[k - 1];
                }
                if (antiCandidates[i] && antiCandidates[i].has(k)) {
                    candItem.textContent = k;
                    candItem.classList.add('anti');
                }
                candidatesGrid.appendChild(candItem);
            }
            cellEl.appendChild(candidatesGrid);
        }
    });

    applyGridLines();
    checkCompletion();
}

function updateNumberPickerState() {
    const counts = Array(10).fill(0);
    const board = mySudokuJS.getBoard();
    board.forEach(cell => { if (cell.val) counts[cell.val]++; });
    for (let i = 1; i <= 9; i++) {
        const btn = numberPicker.querySelector(`[data-number="${i}"]`);
        if (counts[i] === 9) { // If 9 instances of the number are on the board
            btn.disabled = true;
            btn.classList.add('opacity-30', 'cursor-not-allowed');
        } else {
            btn.disabled = false;
            btn.classList.remove('opacity-30', 'cursor-not-allowed');
        }
    }
}

function updateUndoRedoButtons() {
    const undoDisabled = historyIndex <= 0;
    const redoDisabled = historyIndex >= history.length - 1;
    // Update header buttons
    document.getElementById('header-undo-btn').disabled = undoDisabled;
    document.getElementById('header-redo-btn').disabled = redoDisabled;
    // Update popover buttons (if they exist and need updating)
    document.getElementById('popover-undo-btn').disabled = undoDisabled;
    document.getElementById('popover-redo-btn').disabled = redoDisabled;
}

// --- HIGHLIGHTING ---
function clearHighlights() {
    // Clear grid highlights, blackout class, and inline styles
    for (let i = 0; i < 81; i++) {
        const cell = grid.children[i];
        // Remove background classes
        cell.className = cell.className.replace(/bgc\d+-light/g, '').replace(/bgc\d+/g, '');
        // Remove blackout class
        cell.classList.remove('blacked-out');
        // Remove text color classes ONLY from cell itself (keep for wrong-value spans etc)
        // This regex avoids removing c1-9 if part of another class like 'bgc1-light'
        cell.className = cell.className.replace(/(?<!bg|-)c([1-9])(?!\w|-)/g, '');
        // Reset inline background color
        cell.style.backgroundColor = '';
        // Reset candidate grid visibility and styles
        const candGrid = cell.querySelector('.candidates-grid');
        if (candGrid) {
            candGrid.classList.remove('hidden');
            const candidateItems = candGrid.querySelectorAll('.candidate-item');
            candidateItems.forEach(item => { item.style.visibility = 'visible'; });
        }
         // Reset span opacity and remove direct color classes (c1-9) from spans inside
         // Keep wrong-value class
        const spans = cell.querySelectorAll('span');
        spans.forEach(span => {
            if (!span.classList.contains('wrong-value')) {
                 span.className = span.className.replace(/(?<!bg|-)c([1-9])(?!\w|-)/g, '');
            }
            span.style.opacity = '1';
        });
    }

    // Clear picker highlights
    const selectedBtns = numberPicker.querySelectorAll('.picker-selected');
    selectedBtns.forEach(btn => btn.classList.remove('picker-selected'));
}


// ****** MODIFIED FUNCTION ******
function highlightNumber(num) {
    clearHighlights();
    if (!num) return;

    if (isCandidateIsolationMode) {
        toggleCandidateIsolationMode(false);
    }

    // Highlight the picker button
    const btn = numberPicker.querySelector(`[data-number="${num}"]`);
    if (btn) btn.classList.add('picker-selected');

    const blackedOutIndices = new Set(); // Keep track of indices to black out
    const board = mySudokuJS.getBoard();

    // Step 1: Determine which cells SHOULD be blacked out (if mode is enabled)
    if (isBlackoutModeEnabled) {
        for (let i = 0; i < 81; i++) {
            const cellState = board[i];
            let shouldBlackout = false;
            // Blackout GIVENS or FINAL user values of OTHER numbers
            if (cellState.val !== null && cellState.val !== num) {
                shouldBlackout = true;
            // Blackout ANTI-CANDIDATES of the HIGHLIGHTED number
            } else if (!cellState.val && antiCandidates[i].has(num)) {
                shouldBlackout = true;
            }
            if (shouldBlackout) {
                blackedOutIndices.add(i);
                grid.children[i].classList.add('blacked-out');
            }
        }
    }

    // Step 2: Apply Normal Highlighting (based on classes)
    const valueCells = new Set();
    const peerCells = new Set();
    board.forEach((cell, i) => { if (cell.val === num) valueCells.add(i); });
    if (valueCells.size > 0) {
        // Find all peers of cells containing the highlighted value
        valueCells.forEach(i => {
             // Add row, col, and box peers (excluding self, handled separately)
             peers[i].row.forEach(p => peerCells.add(p));
             peers[i].col.forEach(p => peerCells.add(p));
             peers[i].box.forEach(p => peerCells.add(p));
        });
    }

    // Apply light background to peers that don't have the value themselves
    peerCells.forEach(i => {
        if (!valueCells.has(i)) {
             grid.children[i].classList.add(`bgc${num}-light`);
        }
    });

    // Apply strong background and text color to cells with the value
    valueCells.forEach(i => {
        const cellEl = grid.children[i];
         cellEl.classList.add(`bgc${num}`);
         // Apply color class directly to the cell or specific span if needed
         const span = cellEl.querySelector('span:not(.wrong-value)'); // Target the span unless it's wrong
         if (span) {
             span.classList.add(`c${num}`);
         } else if (!cellEl.querySelector('.wrong-value')) { // If no span or wrong value, apply to cell
             cellEl.classList.add(`c${num}`);
         }
    });

    // If blackout is NOT enabled, also highlight cells with anti-candidates lightly
    if (!isBlackoutModeEnabled) {
        board.forEach((cell, i) => {
            if (!cell.val && antiCandidates[i].has(num)) {
                 grid.children[i].classList.add(`bgc${num}-light`);
            }
        });
    }

    // Step 3: Handle Candidate Visibility
    for (let i = 0; i < 81; i++) {
        const cellEl = grid.children[i];
        const candGrid = cellEl.querySelector('.candidates-grid');

        // Skip candidate handling if cell is blacked out OR has no candidate grid
        if (blackedOutIndices.has(i) || !candGrid) {
            if(candGrid) candGrid.classList.add('hidden'); // Ensure grid hidden if blacked out
            continue;
        }
        
        // Proceed if not blacked out and has candidate grid
        const cellState = board[i];
        const hasTargetCandidate = cellState.candidates && cellState.candidates[num-1] !== null;
        // Only consider anti-candidate visibility if blackout is OFF
        const hasRelevantAntiCandidate = !isBlackoutModeEnabled && antiCandidates[i].has(num);

        if (hasTargetCandidate || hasRelevantAntiCandidate) {
            candGrid.classList.remove('hidden'); // Show the grid container
            const candidateItems = candGrid.querySelectorAll('.candidate-item');
            candidateItems.forEach(item => {
                // Show only the highlighted number's candidate/anti-candidate
                item.style.visibility = (item.textContent == num) ? 'visible' : 'hidden';
            });
        } else {
            // Hide candidate grid if no relevant candidate/anti-candidate for the highlighted number
            candGrid.classList.add('hidden');
        }
    }

     // Step 4: Force Black Background (if enabled)
    if (isBlackoutModeEnabled) {
        blackedOutIndices.forEach(i => {
            grid.children[i].style.backgroundColor = '#000';
            // Also ensure text inside is hidden (except givens which are styled differently)
            const span = grid.children[i].querySelector('span');
            if (span && !grid.children[i].classList.contains('text-[var(--text-secondary)]')) { // Check if it's not a given
                 // span.style.opacity = '0'; // Might be better than color change
                 span.style.color = 'transparent'; // Hide user-entered values
            }

        });
    }
}


function highlightCandidatesForNumbers(numberSet) {
    clearHighlights();
    if (numberSet.size === 0) return;
    const board = mySudokuJS.getBoard();

    for (let i = 0; i < 81; i++) {
        const cellEl = grid.children[i];
        // Don't modify cells with final values
        if(board[i].val) continue;

        const candGrid = cellEl.querySelector('.candidates-grid');
        if (candGrid) {
            let hasAnyTargetCandidate = false;
            candGrid.classList.remove('hidden'); // Ensure grid is potentially visible
            const candidateItems = candGrid.querySelectorAll('.candidate-item');
            candidateItems.forEach(item => {
                const candidateNum = parseInt(item.textContent, 10);
                const isAnti = item.classList.contains('anti');
                // Show candidate if it's in the set AND it's not an anti-candidate
                if (numberSet.has(candidateNum) && !isAnti) {
                     item.style.visibility = 'visible';
                     hasAnyTargetCandidate = true;
                }
                else {
                    item.style.visibility = 'hidden';
                }
            });
            // Hide the grid container if no matching candidates were found in this cell
            if (!hasAnyTargetCandidate) {
                 candGrid.classList.add('hidden');
            }
        }
    }
}

// --- COMPLETION CHECKS ---
async function runCompletionChecks(index, numJustPlaced) {
    // MODIFIED: Added call to markPuzzleAsSolved when solved
    if (isGridSolved()) {
        await playFullBoardAnimation();
        // Mark the puzzle as solved when the animation finishes
        if (currentPuzzleId) {
             markPuzzleAsSolved(currentPuzzleId, activeDifficulty);
        }
        return; // Exit after full board animation
    }
    const board = mySudokuJS.getBoard();

    // Number Completion Check (unchanged)
    const numberCount = board.filter(c => c.val === numJustPlaced).length;
    if (numberCount === 9) {
        const numberIndices = [];
        board.forEach((c, i) => { if (c.val === numJustPlaced) numberIndices.push(i); });
        await animateHouse(numberIndices, 50);
    }

    // House Completion Check (unchanged)
    const housesToCheck = [peers[index].row, peers[index].col, peers[index].box];
    const completedHouses = [];
    for (const house of housesToCheck) {
        // Ensure house is a Set or Array before trying to spread it
        if (house instanceof Set || Array.isArray(house)) {
            const isComplete = [...house].every(i => board[i].val !== null);
            if (isComplete) completedHouses.push([...house]);
        }
    }

    if (completedHouses.length > 0) {
        await Promise.all(completedHouses.map(house => animateHouse(house)));
    }
}


function animateHouse(cellIndices, delay = 40, type = 'normal') {
    const animationClass = type === 'long' ? 'animate-rainbow-sweep-long' : 'animate-rainbow-sweep';
    return new Promise(resolve => {
        cellIndices.forEach((cellIndex, i) => {
            setTimeout(() => {
                const cellEl = grid.children[cellIndex];
                 if (cellEl) { // Check if element exists
                    cellEl.classList.remove('animate-rainbow-sweep', 'animate-rainbow-sweep-long');
                    void cellEl.offsetWidth; // Force reflow to restart animation
                    cellEl.classList.add(animationClass);
                    cellEl.addEventListener('animationend', () => { cellEl.classList.remove(animationClass); }, { once: true });
                 }
            }, i * delay);
        });
        const totalDuration = (cellIndices.length * delay) + (type === 'long' ? 2000 : 500); // Duration of the animation itself
        setTimeout(resolve, totalDuration);
    });
}

function getRowGroup(r){ return Array.from({length:9},(_,c)=>r*9+c); }
function getColGroup(c){ return Array.from({length:9},(_,r)=>r*9+c); }
function getBoxGroup(br,bc){ const out=[]; for(let r=br*3;r<br*3+3;r++){ for(let c=bc*3;c<bc*3+3;c++){ out.push(r*9+c);} } return out; }

function runWave(groups, gapMs=20){
    return new Promise(resolve=>{
        groups.forEach((g, i)=>{ setTimeout(()=>{ animateHouse(g, 0, 'short'); }, i*gapMs); });
        setTimeout(resolve, groups.length*gapMs + 550); // 0.5s anim + buffer
    });
}

async function playFullBoardAnimation() {
    // 1) Quick sweep through houses: rows → columns → boxes
    const rowGroups = Array.from({length:9},(_,r)=>getRowGroup(r));
    await runWave(rowGroups, 20);
    const colGroups = Array.from({length:9},(_,c)=>getColGroup(c));
    await runWave(colGroups, 20);
    const boxGroups = [];
    for(let br=0;br<3;br++){ for(let bc=0;bc<3;bc++){ boxGroups.push(getBoxGroup(br,bc)); } }
    await runWave(boxGroups, 20);

    // 2) Fast rainbow diagonal sweep TL→BR
    const diagonals = Array.from({ length: 17 }, () => []);
    for (let i = 0; i < 81; i++) { const row = Math.floor(i / 9); const col = i % 9; diagonals[row + col].push(i); }
    await runWave(diagonals, 25);
}
