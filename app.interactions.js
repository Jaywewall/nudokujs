// --- SELECTION & INPUT LOGIC ---

// Helper function to clear tapped target state and style
function clearTappedTarget() {
    if (tappedTargetCellIndex !== null) {
        const targetCellEl = grid.children[tappedTargetCellIndex];
        if (targetCellEl) {
            targetCellEl.classList.remove('tapped-target');
            targetCellEl.style.removeProperty('--highlight-color'); // Remove potentially set variable
        }
        tappedTargetCellIndex = null;
    }
}

// MODIFIED: Clears selections AND tapped target
function clearCellSelections() {
    clearTappedTarget(); // Clear target first
    inputModeCell = null;
    selectedCells.clear();
    for (const cell of grid.children) { cell.classList.remove('selected', 'input-mode'); }
    selectionIsActioned = false;
}

// MODIFIED: Clear selections uses the updated clearCellSelections, clearHighlights also clears target
function clearSelections() {
    clearCellSelections();
    clearHighlights(); // clearHighlights now also calls clearTappedTarget
}

// MODIFIED: Now only clears cell selections, keeping highlights but clearing tapped target.
function toggleCellSelection(index, addToSelection = false) {
    if(!addToSelection) {
        clearCellSelections(); // Clears normal selections and tapped target
    } else {
        clearTappedTarget(); // Adding to selection clears target
    }

    if(selectedCells.has(index)) {
        selectedCells.delete(index);
        grid.children[index].classList.remove('selected');
    }
    else {
        selectedCells.add(index);
        grid.children[index].classList.add('selected');
    }
    selectionIsActioned = false;
}

// MODIFIED: Ensure tapped target is cleared when setting input mode
function setInputMode(index) {
    clearTappedTarget();
    clearSelections();
    inputModeCell = index;
    grid.children[index].classList.add('input-mode');
}


function handleNumberInput(num) {
    const board = mySudokuJS.getBoard();
    if (inputModeCell !== null) {
        clearTappedTarget();
        const cellState = board[inputModeCell];
        if (!cellState.isGiven && cellState.val !== num) {
            mySudokuJS.setBoardCell(inputModeCell, num);
            saveHistory(); renderBoard(); clearSelections(); highlightNumber(num); runCompletionChecks(inputModeCell, num);
        }
    } else if (selectedCells.size > 0) {
        // Handled elsewhere
    } else if (tappedTargetCellIndex !== null) {
         clearTappedTarget(); highlightNumber(num);
    } else {
        highlightNumber(num);
    }
}

function handleCandidateInput(num, type) {
  // Primarily called by the Input Pill
  clearTappedTarget(); // Candidate input applies to selection
  let changed = false;
  const board = mySudokuJS.getBoard();

  selectedCells.forEach(index => {
    const cellState = board[index];
    if (!cellState.isGiven && !cellState.val) {
        if (type === 'candidate') {
            mySudokuJS.toggleCandidate(index, num);
            changed = true;
        } else {
            if(antiCandidates[index].has(num)) {
                antiCandidates[index].delete(num);
            } else {
                antiCandidates[index].add(num);
            }
            changed = true;
        }
    }
  });
  if (changed) {
      saveHistory(); renderBoard(); highlightNumber(num); selectionIsActioned = true;
  }
}

// ****** REFACTORED FUNCTION for "Pickup" Logic ******
function handleCandidateCycling(num) {
    if (selectedCells.size === 0) {
         console.warn("handleCandidateCycling called with no selected cells.");
         clearTappedTarget(); highlightNumber(num);
         return;
    }

    clearTappedTarget(); // Ensure target is clear

    let changed = false;
    const applicableCells = [];
    let countEmpty = 0, countCandidate = 0, countAntiCandidate = 0;
    const board = mySudokuJS.getBoard();

    selectedCells.forEach(index => {
        const cellState = board[index];
        if (!cellState.isGiven && cellState.val === null) {
            applicableCells.push(index);
            if (cellState.candidates && cellState.candidates[num-1] !== null) countCandidate++;
            else if (antiCandidates[index] && antiCandidates[index].has(num)) countAntiCandidate++;
            else countEmpty++;
        }
    });

    if (applicableCells.length === 0) {
         highlightNumber(num); return;
    }

    let action = 'none';
    if (countEmpty > 0) action = 'setToCandidate';
    else if (countCandidate > 0) action = 'setToAntiCandidate';
    else if (countAntiCandidate > 0) action = 'setToEmpty';

    applicableCells.forEach(index => {
        const cellState = board[index];
        const isCandidate = cellState.candidates && cellState.candidates[num-1] !== null;
        const isAntiCandidate = antiCandidates[index] && antiCandidates[index].has(num);
        const isEmpty = !isCandidate && !isAntiCandidate;

        switch (action) {
            case 'setToCandidate':
                if (isEmpty) {
                    mySudokuJS.toggleCandidate(index, num);
                    changed = true;
                }
                break;
            case 'setToAntiCandidate':
                if (isCandidate) {
                    mySudokuJS.toggleCandidate(index, num);
                    antiCandidates[index].add(num);
                    changed = true;
                }
                break;
            case 'setToEmpty':
                if (isAntiCandidate) {
                    antiCandidates[index].delete(num);
                    changed = true;
                }
                break;
        }
    });

    if (changed) {
        saveHistory(); renderBoard(); highlightNumber(num); selectionIsActioned = true;
    } else {
        highlightNumber(num); // Ensure highlight remains/is set correctly even if no change
    }
}

// ****** MODIFIED FUNCTION ******
function handleRadialInput(num, index) {
    clearTappedTarget(); clearCellSelections();
    const board = mySudokuJS.getBoard();
    const cellState = board[index];
    if (!cellState.isGiven && cellState.val !== num) {
        mySudokuJS.setBoardCell(index, num);
        saveHistory();
        highlightNumber(num);
        runCompletionChecks(index, num);
    }
}

// ****** MODIFIED FUNCTION (Returns boolean, NO saveHistory) ******
function handleEraseInput(index) {
    const board = mySudokuJS.getBoard();
    const cellState = board[index];
    if (cellState.isGiven) return false;

    let changed = false;
    if (cellState.val !== null || (cellState.candidates && cellState.candidates.some(c => c !== null)) || (antiCandidates[index] && antiCandidates[index].size > 0)) {
        mySudokuJS.clearCell(index);
        antiCandidates[index].clear();
        changed = true;
    }
    return changed; // Indicate if change occurred
}

function clearPeerCandidates(index, num) {
    // This is now handled by sudokuJS
}

// Helper: is solved (unchanged)
function isGridSolved() {
    return mySudokuJS.isBoardFinished();
}
// ****** MODIFIED FUNCTION ******
function handleKeyboardInput(e) {
    if (modals.backdrop.style.display === 'block') return;

    // Handle Backspace/Delete
    if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        let changeMade = false;
        if (tappedTargetCellIndex !== null) {
            const board = mySudokuJS.getBoard();
            const targetState = board[tappedTargetCellIndex];
            if (targetState && !targetState.isGiven) {
                if (handleEraseInput(tappedTargetCellIndex)) changeMade = true;
            }
            clearTappedTarget(); // Always clear target after delete attempt
        } else if (selectedCells.size > 0) {
            selectedCells.forEach(index => {
                if (handleEraseInput(index)) changeMade = true;
            });
            // clearCellSelections(); // Optional
        }
        if (changeMade) { saveHistory(); renderBoard(); }
        return;
    }

    // Handle number input (1-9)
    const num = parseInt(e.key, 10);
    if (!isNaN(num) && num >= 1 && num <= 9) {
        e.preventDefault();
        if (selectedCells.size > 0) {
            clearTappedTarget();
            handleCandidateCycling(num); // Saves history inside if changed
        } else if (tappedTargetCellIndex !== null) {
            handleNumberInputKeyboard(num, tappedTargetCellIndex); // Saves history inside if changed
        } else {
            highlightNumber(num);
        }
        return;
    }
}

// ****** MODIFIED FUNCTION ******
// Specific handler for keyboard FINAL value input
function handleNumberInputKeyboard(num, index) {
    clearTappedTarget(); clearCellSelections();
    const board = mySudokuJS.getBoard();
    const cellState = board[index];
    if (!cellState.isGiven) {
        if (cellState.val !== num) {
            mySudokuJS.setBoardCell(index, num);
            saveHistory(); // Single action, save here
            highlightNumber(num); runCompletionChecks(index, num);
        } else {
             clearHighlights();
        }
    } else {
        highlightNumber(num);
    }
}

// --- COMPLEX POINTER EVENT HANDLING ---

/**
 * Gets all cell indices on a line between two indices.
 * Uses a simplified Bresenham's line algorithm.
 * @param {number} index1 - Start cell index (0-80)
 * @param {number} index2 - End cell index (0-80)
 * @returns {number[]} Array of cell indices on the line, inclusive.
 */
function getLineOfCells(index1, index2) {
    if (index1 === index2) return [index1];

    const cells = [];
    const r1 = Math.floor(index1 / 9);
    const c1 = index1 % 9;
    const r2 = Math.floor(index2 / 9);
    const c2 = index2 % 9;

    let dr = r2 - r1;
    let dc = c2 - c1;

    const stepR = dr > 0 ? 1 : -1;
    const stepC = dc > 0 ? 1 : -1;

    dr = Math.abs(dr);
    dc = Math.abs(dc);

    let r = r1;
    let c = c1;
    cells.push(r * 9 + c);

    if (dc > dr) { // More horizontal
        let err = dc / 2;
        while (c !== c2) {
            err -= dr;
            if (err < 0) {
                r += stepR;
                err += dc;
            }
            c += stepC;
            cells.push(r * 9 + c);
        }
    } else { // More vertical
        let err = dr / 2;
        while (r !== r2) {
            err -= dc;
            if (err < 0) {
                c += stepC;
                err += dr;
            }
            r += stepR;
            cells.push(r * 9 + c);
        }
    }
    return cells;
}

// ****** MODIFIED FUNCTION ******
function handleGridPointerDown(e) {
    e.preventDefault();
    const cell = e.target.closest('.sudoku-cell'); if (!cell) return;
    const index = parseInt(cell.dataset.index, 10);
    const now = Date.now();
    const board = mySudokuJS.getBoard();

    if (now - lastTap < 300 && index === lastTapIndex && !board[index].isGiven) {
        clearTimeout(longPressTimer); clearTappedTarget(); clearCellSelections();
        showRadialMenu(e.clientX, e.clientY, index);
        lastTap = 0; lastTapIndex = -1; isDragging = false; longPressFired = false;
        return;
    }

    lastTap = now; lastTapIndex = index; pointerDownTime = Date.now(); dragStartCell = index;
    longPressFired = false; isDragging = false;

    longPressTimer = setTimeout(() => {
        const cellState = board[index];
        if (cellState.val === null && !cellState.isGiven) {
            longPressFired = true; isDragging = true;
            dragMode = selectedCells.has(index) ? 'deselect' : 'select';
            clearTappedTarget();
            if (dragMode === 'select') {
                if (selectionIsActioned) clearCellSelections();
                selectedCells.add(index); grid.children[index].classList.add('selected');
            } else {
                selectedCells.delete(index); grid.children[index].classList.remove('selected');
            }
            lastDragIndex = index; // <<< ADDED: Set start of drag line
        } else {
            longPressFired = false;
        }
    }, LONG_PRESS_DURATION);
}

// --- handleGridPointerMove (FIXED with Line Algorithm) ---
function handleGridPointerMove(e) {
    if (!isDragging) return;

    const element = document.elementFromPoint(e.clientX, e.clientY);
    const cell = element ? element.closest('.sudoku-cell') : null;
    const board = mySudokuJS.getBoard();

    if (cell) {
        const index = parseInt(cell.dataset.index, 10);

        // Only run if we've moved to a *new* cell
        if (index !== lastDragIndex && lastDragIndex !== -1) {
            // Get all cells from the last index to this one
            const line = getLineOfCells(lastDragIndex, index);

            line.forEach(lineIndex => {
                // Ensure cell exists and is a valid target
                const cellEl = grid.children[lineIndex];
                if (cellEl && board[lineIndex].val === null && !board[lineIndex].isGiven) {
                    if (dragMode === 'select' && !selectedCells.has(lineIndex)) {
                        selectedCells.add(lineIndex);
                        cellEl.classList.add('selected');
                    } else if (dragMode === 'deselect' && selectedCells.has(lineIndex)) {
                        selectedCells.delete(lineIndex);
                        cellEl.classList.remove('selected');
                    }
                }
            });

            lastDragIndex = index; // Update the last index
        }
    }
}

// ****** REVISED FUNCTION ******
function handleGridPointerUp(e) {
    clearTimeout(longPressTimer);
    const wasDragging = isDragging;
    isDragging = false;
    lastDragIndex = -1; // <<< ADDED: Reset drag index

    if (wasDragging) {
        longPressFired = false;
        selectionIsActioned = false; // Reset action flag after drag completes
        return; // Drag handled in pointerDown/Move
    }

    const cell = e.target.closest('.sudoku-cell');
    if (!cell) { longPressFired = false; return; }
    const index = parseInt(cell.dataset.index, 10);
    const board = mySudokuJS.getBoard();

    if (Date.now() - pointerDownTime < LONG_PRESS_DURATION && !longPressFired) {
        // --- Single Tap Logic ---
        const cellState = board[index];

        if (cellState.val !== null) {
            // Tap Filled Cell (Given or User-Entered)
            const num = cellState.val;
            const targetCellEl = grid.children[index];
            const isWrong = targetCellEl?.querySelector('span.wrong-value');

            let highlightColorVar = COLORS[num - 1]; // Default to number's color
            // Check if the SPAN has the wrong-value class
            if (isWrong) {
                // If wrong, we rely on the specific CSS rule, don't set variable color
                highlightColorVar = null; // Indicate not to set the variable
            }

            if (tappedTargetCellIndex !== index) {
                clearCellSelections(); // Clears previous selections and target
                tappedTargetCellIndex = index;
                if (targetCellEl) {
                    // Set variable color ONLY if not wrong
                    if (highlightColorVar) {
                         targetCellEl.style.setProperty('--highlight-color', highlightColorVar);
                    } else {
                         targetCellEl.style.removeProperty('--highlight-color'); // Ensure removed if wrong
                    }
                    targetCellEl.classList.add('tapped-target');
                }
            } else {
                 // Tapped the same target cell again
                 selectedCells.forEach(selIndex => grid.children[selIndex]?.classList.remove('selected'));
                 selectedCells.clear();
                 selectionIsActioned = false;

                 // Re-apply target style (ensuring correct color logic)
                 if (targetCellEl) {
                     if (highlightColorVar) {
                         targetCellEl.style.setProperty('--highlight-color', highlightColorVar);
                     } else {
                         targetCellEl.style.removeProperty('--highlight-color');
                     }
                     targetCellEl.classList.add('tapped-target');
                 }
            }
            highlightNumber(num); // Highlight based on the tapped number
        } else {
            // Tap Empty Cell
            clearTappedTarget(); // Tapping empty clears any previous target
            const additive = (e.shiftKey || e.ctrlKey || selectedCells.size > 0) && !selectionIsActioned;
            toggleCellSelection(index, additive); // Handles selection logic
        }
    }
    longPressFired = false;
}
