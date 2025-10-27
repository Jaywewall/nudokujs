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
    // Less used now.
    if (inputModeCell !== null) {
        clearTappedTarget();
        const cellState = gameState[inputModeCell];
        if (!cellState.isGiven && cellState.value !== num) {
            cellState.value = num;
            cellState.candidates.clear(); cellState.antiCandidates.clear();
            clearPeerCandidates(inputModeCell, num);
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
  const targetSet   = type === 'candidate' ? 'candidates'     : 'antiCandidates';
  const oppositeSet = type === 'candidate' ? 'antiCandidates' : 'candidates';

  selectedCells.forEach(index => {
    const cellState = gameState[index];
    let clashFound = false;
    if (type === 'candidate') {
      const cellPeers = new Set([...peers[index].row, ...peers[index].col, ...peers[index].box]);
      for (const peerIndex of cellPeers) { if (gameState[peerIndex].value === num) { clashFound = true; break; } }
    }
    if (!cellState.isGiven && !cellState.value && (!clashFound || type !== 'candidate')) {
      const removedFromOpposite = cellState[oppositeSet].delete(num);
      let modifiedTarget = false;
      if (cellState[targetSet].has(num)) {
          cellState[targetSet].delete(num);
          modifiedTarget = true;
      } else {
          cellState[targetSet].add(num);
          modifiedTarget = true;
      }
      if (removedFromOpposite || modifiedTarget) {
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

    selectedCells.forEach(index => {
        const cellState = gameState[index];
        if (!cellState.isGiven && cellState.value === null) {
            applicableCells.push(index);
            if (cellState.candidates.has(num)) countCandidate++;
            else if (cellState.antiCandidates.has(num)) countAntiCandidate++;
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

    // console.log(`Pickup Action for ${num}: ${action}. Counts: E=${countEmpty}, C=${countCandidate}, A=${countAntiCandidate}`); // DEBUG

    applicableCells.forEach(index => {
        const cellState = gameState[index];
        const isCandidate = cellState.candidates.has(num);
        const isAntiCandidate = cellState.antiCandidates.has(num);
        const isEmpty = !isCandidate && !isAntiCandidate;

        switch (action) {
            case 'setToCandidate':
                if (isEmpty) {
                    let clashFound = false;
                    const cellPeers = new Set([...peers[index].row, ...peers[index].col, ...peers[index].box]);
                    for (const peerIndex of cellPeers) { if (gameState[peerIndex].value === num) { clashFound = true; break; } }
                    if (!clashFound) {
                        cellState.candidates.add(num);
                        cellState.antiCandidates.delete(num);
                        changed = true;
                    }
                }
                break;
            case 'setToAntiCandidate':
                if (isCandidate) {
                    cellState.candidates.delete(num);
                    cellState.antiCandidates.add(num);
                    changed = true;
                }
                break;
            case 'setToEmpty':
                if (isAntiCandidate) {
                    cellState.antiCandidates.delete(num);
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
    const cellState = gameState[index];
    if (!cellState.isGiven && cellState.value !== num) {
        cellState.value = num;
        cellState.candidates.clear(); cellState.antiCandidates.clear();
        clearPeerCandidates(index, num);
        saveHistory(); renderBoard(); highlightNumber(num); runCompletionChecks(index, num);
    }
}

// ****** MODIFIED FUNCTION (Returns boolean, NO saveHistory) ******
function handleEraseInput(index) {
    const cellState = gameState[index];
    if (cellState.isGiven) return false;

    let changed = false;
    if (cellState.value !== null || cellState.candidates.size > 0 || cellState.antiCandidates.size > 0) {
        if (cellState.value !== null) { cellState.value = null; changed = true; }
        if (cellState.candidates.size > 0) { cellState.candidates.clear(); changed = true; }
        if (cellState.antiCandidates.size > 0) { cellState.antiCandidates.clear(); changed = true; }
    }
    return changed; // Indicate if change occurred
}

function clearPeerCandidates(index, num) {
    // (unchanged)
    const cellPeers = new Set([...peers[index].row, ...peers[index].col, ...peers[index].box]);
    cellPeers.forEach(peerIndex => {
        const peerState = gameState[peerIndex];
        if (peerState.candidates.has(num)) peerState.candidates.delete(num);
        if (peerState.antiCandidates.has(num)) peerState.antiCandidates.delete(num);
    });
}

// Helper: is solved (unchanged)
function isGridSolved() {
    // ... (implementation unchanged) ...
    if (currentSolutionString && currentSolutionString.length === 81) {
        for (let i = 0; i < 81; i++) {
            const ch = currentSolutionString[i];
            const sol = parseInt(ch, 10);
            if (Number.isNaN(sol) || sol < 1 || sol > 9 || gameState[i].value !== sol) {
                return false;
            }
        }
        return true;
    }
    return gameState.every(cell => cell.value !== null);
}

// --- MODIFIED: Solve Candidate Singles Function (with Chaining) ---
async function solveCandidateSingles() {
    let anyChangeMade = false;

    while (true) {
        const singlesThisPass = []; // Stores { index, num }

        // 1. Find all singles in the current board state
        for (let i = 0; i < 81; i++) {
            const cellState = gameState[i];
            if (cellState.value === null && cellState.candidates.size === 1) {
                const num = cellState.candidates.values().next().value;
                singlesThisPass.push({ index: i, num: num });
            }
        }

        // 2. Check for Exit: If no singles were found, break the loop
        if (singlesThisPass.length === 0) {
            break; // No more singles found, exit the while loop
        }

        anyChangeMade = true; // Mark that we made a change at least once

        // 3. Solve and Animate this pass
        const solvedCellIndices = [];
        for (const single of singlesThisPass) {
            const { index, num } = single;
            const cellState = gameState[index];

            // Check again in case a peer was solved in this same pass
            if (cellState.value === null && cellState.candidates.has(num)) {
                cellState.value = num;
                cellState.candidates.clear();
                cellState.antiCandidates.clear();
                
                clearPeerCandidates(index, num); // This creates new singles for the next loop
                solvedCellIndices.push(index);
            }
        }

        // 4. Save, Render, and Animate once per pass (if any were solved)
        if (solvedCellIndices.length > 0) {
            saveHistory(); // Save the entire "wave" as one step
            renderBoard(); // Render the board with the new values
            await animateHouse(solvedCellIndices, 50); // Animate solved cells
        }
        
        // Loop repeats to check for new singles...
    }

    // 5. After the loop is finished, check if the board is complete
    if (anyChangeMade && isGridSolved()) {
        await playFullBoardAnimation();
        if (currentPuzzleId) {
            markPuzzleAsSolved(currentPuzzleId, activeDifficulty);
        }
    }
}
// --- END ---


// --- KEYBOARD HANDLING ---
// ****** MODIFIED FUNCTION ******
function handleKeyboardInput(e) {
    if (modals.backdrop.style.display === 'block') return;

    // Handle Backspace/Delete
    if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        let changeMade = false;
        if (tappedTargetCellIndex !== null) {
            const targetState = gameState[tappedTargetCellIndex];
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
    const cellState = gameState[index];
    if (!cellState.isGiven) {
        if (cellState.value !== num) {
            cellState.value = num;
            cellState.candidates.clear(); cellState.antiCandidates.clear();
            clearPeerCandidates(index, num);
            saveHistory(); // Single action, save here
            renderBoard(); highlightNumber(num); runCompletionChecks(index, num);
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

    if (now - lastTap < 300 && index === lastTapIndex && !gameState[index].isGiven) {
        clearTimeout(longPressTimer); clearTappedTarget(); clearCellSelections();
        showRadialMenu(e.clientX, e.clientY, index);
        lastTap = 0; lastTapIndex = -1; isDragging = false; longPressFired = false;
        return;
    }

    lastTap = now; lastTapIndex = index; pointerDownTime = Date.now(); dragStartCell = index;
    longPressFired = false; isDragging = false;

    longPressTimer = setTimeout(() => {
        const cellState = gameState[index];
        if (cellState.value === null && !cellState.isGiven) {
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

    if (cell) {
        const index = parseInt(cell.dataset.index, 10);

        // Only run if we've moved to a *new* cell
        if (index !== lastDragIndex && lastDragIndex !== -1) {
            // Get all cells from the last index to this one
            const line = getLineOfCells(lastDragIndex, index);

            line.forEach(lineIndex => {
                // Ensure cell exists and is a valid target
                const cellEl = grid.children[lineIndex];
                if (cellEl && gameState[lineIndex].value === null && !gameState[lineIndex].isGiven) {
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

    if (Date.now() - pointerDownTime < LONG_PRESS_DURATION && !longPressFired) {
        // --- Single Tap Logic ---
        const cellState = gameState[index];

        if (cellState.value !== null) {
            // Tap Filled Cell (Given or User-Entered)
            const num = cellState.value;
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

// --- Changes needed in app.render.js ---
// - Add clearTappedTarget() call inside clearHighlights()
// - Add clearTappedTarget() call inside highlightNumber() before clearHighlights()
// (These were previously noted and should already be in app.render.js)