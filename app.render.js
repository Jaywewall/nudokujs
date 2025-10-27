// --- RENDERING ---
function renderBoard() {
    // --- ADDED: Assistance Feature Check ---
    // Apply/Remove global class based on assistance state
    if (isAssistBiValueActive) {
        grid.classList.add('assist-bivalue-active');
    } else {
        grid.classList.remove('assist-bivalue-active');
    }
    // --- End Assistance Feature Check ---

    gameState.forEach((cellState, i) => {
        const cellEl = grid.children[i];
        cellEl.innerHTML = ''; // Clear previous content
        
        // --- ADDED: Clear assistance classes ---
        cellEl.classList.remove('bivalue-cell');
        // Clear all possible pulse animations
        cellEl.className = cellEl.className.replace(/animate-pulse-c[1-9]/g, '');
        // --- End ---

        // --- Start of Restored Logic ---
        if (cellState.value) { // Cell has a final value (given or user-entered)
            cellEl.classList.remove(
                'font-black', 'font-bold', 'font-semibold', 'font-medium', 'font-normal',
                'text-[var(--text-secondary)]'
            );

            // Determine if this user-entered value mismatches the provided solution
            let isWrong = false;
            if (!cellState.isGiven && currentSolutionString && currentSolutionString.length === 81) {
                const ch = currentSolutionString[i];
                const sol = parseInt(ch, 10);
                if (!Number.isNaN(sol) && sol >= 1 && sol <= 9 && sol !== cellState.value) {
                    isWrong = true;
                }
            }

            if (cellState.isGiven) {
                const sp = document.createElement('span'); // Use span for consistent styling access
                sp.textContent = cellState.value;
                cellEl.appendChild(sp);
                cellEl.classList.add('font-black', 'text-[var(--text-secondary)]'); // Style for givens
            } else { // User-entered value
                cellEl.classList.add('font-normal'); // Default style for user values
                const sp = document.createElement('span');
                sp.textContent = cellState.value;
                if (isWrong) {
                    sp.className = 'wrong-value'; // Special style for wrong values
                } else {
                    sp.classList.add(`c${cellState.value}`); // Add color class to user-entered correct value
                }
                 cellEl.appendChild(sp);
            }
        } else if (cellState.candidates.size > 0 || cellState.antiCandidates.size > 0) { // Cell has candidates/anti-candidates
            cellEl.classList.remove(
                'font-black', 'font-bold', 'font-semibold', 'font-medium', 'font-normal',
                'text-[var(--text-secondary)]'
            );
            const candidatesGrid = document.createElement('div');
            candidatesGrid.className = 'candidates-grid pointer-events-none';
            
            // --- ADDED: Assistance Rule Logic (Bi-Value) ---
            if (isAssistBiValueActive) {
                // If rule is active, check if this cell meets the criteria
                if (cellState.candidates.size === 2) {
                    cellEl.classList.add('bivalue-cell');
                }
            }
            // --- End Assistance Rule Logic ---

            // --- ADDED: Assistance Rule Logic (Hidden Single) ---
            if (isAssistHiddenSinglesActive && cellState.hiddenSingle) {
                // Apply the pulse class for the specific number
                cellEl.classList.add(`animate-pulse-c${cellState.hiddenSingle}`);
            }
            // --- End ---


            for (let n = 1; n <= 9; n++) {
                const candEl = document.createElement('div');
                candEl.classList.add('candidate-item');
                if (cellState.candidates.has(n)) {
                    candEl.textContent = n;
                    candEl.classList.add(`c${n}`); // Color for normal candidate
                } else if(cellState.antiCandidates.has(n)) {
                    candEl.textContent = n;
                    candEl.classList.add('anti'); // Style for anti-candidate
                }
                // If neither, the div is empty but still part of the grid structure
                candidatesGrid.appendChild(candEl);
            }
            cellEl.appendChild(candidatesGrid);
        } else { // Cell is completely empty
            cellEl.classList.remove(
                'font-black', 'font-bold', 'font-semibold', 'font-medium', 'font-normal',
                'text-[var(--text-secondary)]'
            );
            // No content needed, already cleared by cellEl.innerHTML = ''
        }
         // --- End of Restored Logic ---
    });
    updateNumberPickerState(); // Ensure this is called after render
}

function updateNumberPickerState() {
    // --- Start of Restored Logic ---
    const counts = Array(10).fill(0);
    gameState.forEach(cell => { if (cell.value) counts[cell.value]++; });
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
     // --- End of Restored Logic ---
}

function updateUndoRedoButtons() {
     // --- Start of Restored Logic ---
    const undoDisabled = historyIndex <= 0;
    const redoDisabled = historyIndex >= history.length - 1;
    // Update header buttons
    document.getElementById('header-undo-btn').disabled = undoDisabled;
    document.getElementById('header-redo-btn').disabled = redoDisabled;
    // Update popover buttons (if they exist and need updating)
    document.getElementById('popover-undo-btn').disabled = undoDisabled;
    document.getElementById('popover-redo-btn').disabled = redoDisabled;
     // --- End of Restored Logic ---
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
     // *** REMOVED: Clearing stored candidate state logic is no longer needed here ***
    clearHighlights();
    if (!num) return; // If num is 0 or null, just clear highlights

    if (isCandidateIsolationMode) {
        toggleCandidateIsolationMode(false);
    }

    // Highlight the picker button
    const btn = numberPicker.querySelector(`[data-number="${num}"]`);
    if (btn) btn.classList.add('picker-selected');

    const blackedOutIndices = new Set(); // Keep track of indices to black out

    // Step 1: Determine which cells SHOULD be blacked out (if mode is enabled)
    if (isBlackoutModeEnabled) {
        for (let i = 0; i < 81; i++) {
            const cellState = gameState[i];
            let shouldBlackout = false;
            // Blackout GIVENS or FINAL user values of OTHER numbers
            if (cellState.value !== null && cellState.value !== num) {
                shouldBlackout = true;
            // Blackout ANTI-CANDIDATES of the HIGHLIGHTED number
            } else if (!cellState.value && cellState.antiCandidates.has(num)) {
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
    gameState.forEach((cell, i) => { if (cell.value === num) valueCells.add(i); });
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
        gameState.forEach((cell, i) => {
            if (!cell.value && cell.antiCandidates.has(num)) {
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

        // --- ADDED: Skip candidate visibility logic if assistance rule is active ---
        // The assistance rule CSS will handle visibility
        if (isAssistBiValueActive) {
            continue;
        }
        // --- End ---
        
        // --- ADDED: Skip if hidden single is active (we want to see all cands) ---
        if (isAssistHiddenSinglesActive) {
            continue;
        }
        // --- End ---

        // Proceed if not blacked out and has candidate grid
        const cellState = gameState[i];
        const hasTargetCandidate = cellState.candidates.has(num);
        // Only consider anti-candidate visibility if blackout is OFF
        const hasRelevantAntiCandidate = !isBlackoutModeEnabled && cellState.antiCandidates.has(num);

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
    // *** REMOVED: Clearing stored candidate state logic is no longer needed here ***
    clearHighlights();
    if (numberSet.size === 0) return;

    for (let i = 0; i < 81; i++) {
        const cellEl = grid.children[i];
        // Don't modify cells with final values
        if(gameState[i].value) continue;

        // --- ADDED: Skip candidate visibility logic if assistance rule is active ---
        if (isAssistBiValueActive) {
            continue;
        }
        // --- End ---
        
        // --- ADDED: Skip if hidden single is active ---
        if (isAssistHiddenSinglesActive) {
            continue;
        }
        // --- End ---

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

    // Number Completion Check (unchanged)
    const numberCount = gameState.filter(c => c.value === numJustPlaced).length;
    if (numberCount === 9) {
        const numberIndices = [];
        gameState.forEach((c, i) => { if (c.value === numJustPlaced) numberIndices.push(i); });
        await animateHouse(numberIndices, 50);
    }

    // House Completion Check (unchanged)
    const housesToCheck = [peers[index].row, peers[index].col, peers[index].box];
    const completedHouses = [];
    for (const house of housesToCheck) {
        // Ensure house is a Set or Array before trying to spread it
        if (house instanceof Set || Array.isArray(house)) {
            const isComplete = [...house].every(i => gameState[i].value !== null);
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