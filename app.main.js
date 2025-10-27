// --- EVENT LISTENERS ---
function setupEventListeners() {
    // Grid interactions
    grid.addEventListener('pointerdown', handleGridPointerDown);
    grid.addEventListener('pointermove', handleGridPointerMove);
    grid.addEventListener('pointerup', handleGridPointerUp);
    grid.addEventListener('contextmenu', (e) => e.preventDefault());

    // Keyboard Listener
    document.body.addEventListener('keydown', handleKeyboardInput);

    // Deselection logic & Menu Closing
    document.body.addEventListener('pointerdown', (e) => {
        const dropdownMenu = document.getElementById('dropdown-menu');
        const menuBtn = document.getElementById('menu-btn');
        const isClickInsideMenu = menuBtn && dropdownMenu && (dropdownMenu.contains(e.target) || menuBtn.contains(e.target));
        const isClickInsideSettings = modals.settings.contains(e.target);
        const isClickInsideNewGameSelect = modals.newGameSelect && modals.newGameSelect.contains(e.target);
        const isClickInsideAssistance = modals.assistance && modals.assistance.contains(e.target); // ADDED

        if (dropdownMenu && !isClickInsideMenu && !dropdownMenu.classList.contains('hidden')) {
            dropdownMenu.classList.add('hidden');
        }

        const isClickOnGrid = grid.contains(e.target);
        const isClickOnPicker = numberPicker.contains(e.target);
        const isClickOnRadial = radialMenu.contains(e.target);
        const isClickOnPill = inputPill.contains(e.target);
        const isClickOnUndoRedo = undoRedoPopover.contains(e.target);

        const outsideInteractive = !isClickOnGrid &&
                                   !isClickOnPicker &&
                                   !isClickOnRadial &&
                                   !isClickOnPill &&
                                   !isClickInsideMenu &&
                                   !isClickInsideSettings &&
                                   !isClickInsideNewGameSelect &&
                                   !isClickOnUndoRedo &&
                                   !isClickInsideAssistance; // ADDED


        if (outsideInteractive) {
            clearSelections(); // Clears cell selections, target, and highlights
            if (isCandidateIsolationMode) toggleCandidateIsolationMode(false);
            if (radialMenu.style.display === 'block') hideRadialMenu();
            if (inputPill.style.display === 'flex') hideInputPill();
        }
    });

    document.body.addEventListener('dblclick', (e) => {
        if (!grid.contains(e.target) && !numberPicker.contains(e.target) && !radialMenu.contains(e.target)) { clearSelections(); }
    });

    // Number Picker (Hold/Swipe Logic)
    let pickerPointerDownTime = 0;
    let pickerLongPressTimer = null;
    let isSwipe = false;
    let startX = 0;
    let startY = 0;
    let currentHeldButton = null;

    numberPicker.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const btn = e.target.closest('.number-picker-btn');
      if (!btn || btn.disabled) return;
      if (isCandidateIsolationMode) {
        if (btn.dataset.number) toggleIsolationNumber(parseInt(btn.dataset.number, 10));
        return;
      }
      currentHeldButton = btn;
      pickerPointerDownTime = Date.now();
      isSwipe = false; startX = e.clientX; startY = e.clientY;
      addHoldIndicator(btn);
      pickerLongPressTimer = setTimeout(() => {
        pickerLongPressTimer = null; removeHoldIndicator(btn); showInputPill(btn, { x: startX, y: startY });
      }, 500);
    }, { passive: false });

    numberPicker.addEventListener('pointermove', (e) => {
      if (!currentHeldButton) return; e.preventDefault();
      const deltaY = startY - e.clientY;
      if (Math.abs(deltaY) > 20) {
        isSwipe = true; clearTimeout(pickerLongPressTimer); removeHoldIndicator(currentHeldButton);
        if (deltaY > 20) { showInputPill(currentHeldButton, { x: e.clientX, y: e.clientY }); }
        currentHeldButton = null;
      }
    }, { passive: false });

    // ****** REFACTORED POINTERUP LISTENER FOR NUMBER PICKER ******
    numberPicker.addEventListener('pointerup', (e) => {
        if (!currentHeldButton) return; // Only process if a button was being held
        removeHoldIndicator(currentHeldButton);
        clearTimeout(pickerLongPressTimer);
        const btn = currentHeldButton;
        currentHeldButton = null;

        // --- Process Tap (if not swipe and short duration) ---
        if (!isSwipe && Date.now() - pickerPointerDownTime < 500) {
            if (!btn) return;

            if (isCandidateIsolationMode) return; // Isolation handles its own clicks

            // --- Number Button Tap ---
            if (btn.dataset.number) {
                const num = parseInt(btn.dataset.number, 10);

                if (selectedCells.size > 0) {
                    // Action 1: Cycle candidates for selected cells
                    clearTappedTarget(); // Candidate input clears target
                    handleCandidateCycling(num); // Use pickup logic (saves history inside if changed)
                } else if (tappedTargetCellIndex !== null) {
                    // Action 2: Target is set, compare numbers
                    const targetState = gameState[tappedTargetCellIndex];
                    if (targetState && targetState.value === num) {
                        // Tapped same number as target -> Clear highlight
                        clearHighlights(); // This also clears the target
                    } else {
                        // Tapped different number -> Switch highlight
                        highlightNumber(num); // This also clears the target
                        // Ensure the target cell itself is cleared visually if highlight changes
                        clearTappedTarget(); // Redundant? highlightNumber clears target. Keep for safety.
                    }
                     // Target is always cleared after a number tap when it was set (handled by highlight funcs)
                } else {
                    // Action 3: Nothing selected/targeted -> Toggle highlight
                    const currentHighlightBtn = numberPicker.querySelector('.picker-selected');
                    const currentHighlightNum = currentHighlightBtn ? parseInt(currentHighlightBtn.dataset.number, 10) : null;
                    if (currentHighlightNum === num) {
                        clearHighlights(); // Clicked highlighted number -> clear
                    } else {
                        highlightNumber(num); // Clicked different/no number -> highlight
                    }
                }
            }
            // --- Delete Button Tap ---
            else if (btn.dataset.action === 'delete') {
                let changeMade = false;

                // Priority 1: Tapped Target
                if (tappedTargetCellIndex !== null) {
                    const targetState = gameState[tappedTargetCellIndex];
                    if (targetState && !targetState.isGiven) {
                        if (handleEraseInput(tappedTargetCellIndex)) { // handleEraseInput NO LONGER saves history
                            changeMade = true;
                        }
                    }
                    clearTappedTarget(); // Clear target after attempting delete
                }
                // Priority 2: Selected Cells (only if target wasn't handled)
                else if (selectedCells.size > 0) {
                    selectedCells.forEach(index => {
                        if (handleEraseInput(index)) { // handleEraseInput NO LONGER saves history
                            changeMade = true;
                        }
                    });
                    // clearCellSelections(); // Optional
                }

                // Save history and Render *once* if any change was made
                if (changeMade) {
                    saveHistory(); // <<< Save history only once
                    renderBoard();
                }
            }
        }
        isSwipe = false; // Reset swipe flag regardless
    });


    // Header Buttons & Modals
    // Core Actions
    document.getElementById('header-undo-btn').addEventListener('click', () => { if(historyIndex > 0) loadFromHistory(historyIndex - 1); });
    document.getElementById('header-redo-btn').addEventListener('click', () => { if(historyIndex < history.length - 1) loadFromHistory(historyIndex + 1); });

    // Button to open the new game select modal
    document.getElementById('new-game-modal-btn').addEventListener('click', () => {
        console.log("New Game button clicked!"); // DEBUG
        const difficultySelect = document.getElementById('difficulty-select');
        if (difficultySelect) {
            console.log(`Setting difficulty select to: ${activeDifficulty}`); // DEBUG
            difficultySelect.value = activeDifficulty;
        } else {
            console.error("Error: Difficulty select element not found!"); // DEBUG
        }
        console.log(`Calling populatePuzzleList with difficulty: ${activeDifficulty}`); // DEBUG
        populatePuzzleList(activeDifficulty);
        console.log("Calling showModal('newGameSelect')"); // DEBUG
        showModal('newGameSelect');
    });

    // --- MODIFIED: Assistance Feature Listeners ---
    document.getElementById('assistance-btn').addEventListener('click', () => showModal('assistance'));
    document.getElementById('close-assistance-modal').addEventListener('click', () => hideModal('assistance'));
    
    const biValueToggle = document.getElementById('assist-bivalue-toggle');
    const hiddenSinglesToggle = document.getElementById('assist-hidden-singles-toggle'); // <<< ADDED
    
    if (biValueToggle) {
        biValueToggle.addEventListener('change', (e) => {
            isAssistBiValueActive = e.target.checked;
            // --- ADDED: Mutual Exclusivity ---
            if (isAssistBiValueActive) {
                if (hiddenSinglesToggle) hiddenSinglesToggle.checked = false;
                isAssistHiddenSinglesActive = false;
                gameState.forEach(cell => cell.hiddenSingle = null); // Clear state
            }
            // --- END ---
            updateClearRulesButtonVisibility();
            renderBoard(); // Re-render the board to apply/remove the rule
        });
    }

    // <<< ADDED: Listener for Hidden Singles Toggle >>>
    if (hiddenSinglesToggle) {
        hiddenSinglesToggle.addEventListener('change', (e) => {
            isAssistHiddenSinglesActive = e.target.checked;
            // --- ADDED: Mutual Exclusivity ---
            if (isAssistHiddenSinglesActive) {
                if (biValueToggle) biValueToggle.checked = false;
                isAssistBiValueActive = false;
                updateHiddenSinglesState(); // Run the calculation once
            } else {
                // Clear the state if toggled off
                gameState.forEach(cell => cell.hiddenSingle = null);
            }
            // --- END ---
            updateClearRulesButtonVisibility();
            renderBoard(); // Re-render to apply/remove highlights
        });
    }
    // <<< END >>>

    document.getElementById('clear-rules-btn').addEventListener('click', () => {
        // Find all assistance toggles and uncheck them
        if (biValueToggle) biValueToggle.checked = false;
        if (hiddenSinglesToggle) hiddenSinglesToggle.checked = false; // <<< ADDED

        // Manually trigger the state update and re-render
        isAssistBiValueActive = false;
        isAssistHiddenSinglesActive = false; // <<< ADDED
        gameState.forEach(cell => cell.hiddenSingle = null); // <<< ADDED
        
        updateClearRulesButtonVisibility();
        renderBoard();
    });

    // MODIFIED: Listener for Solve Puzzle Button
    document.getElementById('solve-puzzle-btn').addEventListener('click', async () => {
        mySudokuJS.setBoard(gameState);
        mySudokuJS.solveAll();
        const solvedBoard = mySudokuJS.getBoard();
        updateGameStateWithBoard(solvedBoard);
        renderBoard();
        hideModal('assistance');
    });

    // Listener for Hint Button
    document.getElementById('hint-btn').addEventListener('click', () => {
        mySudokuJS.setBoard(gameState);
        mySudokuJS.solveStep();
        const hintedBoard = mySudokuJS.getBoard();
        updateGameStateWithBoard(hintedBoard);
        renderBoard();
        hideModal('assistance');
    });
    // --- END: Assistance Feature Listeners ---


    // Secondary Actions (Large Screen Buttons)
    document.getElementById('reset-btn').addEventListener('click', () => showModal('reset'));
    document.getElementById('info-btn').addEventListener('click', () => showModal('info'));
    document.getElementById('settings-btn').addEventListener('click', () => showModal('settings'));

    // Modal Close Buttons
    document.getElementById('close-info-modal').addEventListener('click', () => hideModal('info'));
    document.getElementById('close-settings-modal').addEventListener('click', () => hideModal('settings'));
    document.getElementById('cancel-reset-btn').addEventListener('click', () => hideModal('reset'));
    document.getElementById('cancel-select-new-game-btn').addEventListener('click', () => hideModal('newGameSelect'));


    // Modal Confirm Actions
    document.getElementById('confirm-reset-btn').addEventListener('click', () => {
        const currentPuzzleData = puzzleCatalog[activeDifficulty]?.find(p => p.id === currentPuzzleId);
        if (currentPuzzleData) {
            loadBoard(currentPuzzleData.puzzle, currentPuzzleData.solution, currentPuzzleData.id);
        } else {
            const firstPuzzle = puzzleCatalog.Easy?.[0];
            if (firstPuzzle) {
                loadBoard(firstPuzzle.puzzle, firstSpoon.solution, firstPuzzle.id);
            } else {
                loadBoard(initialBoardString, initialSolutionString);
            }
        }
        clearSelections();
        hideModal('reset');
    });


    // Backdrop Click
    modals.backdrop.addEventListener('click', () => {
        hideModal('info');
        hideModal('settings');
        hideModal('reset');
        hideModal('newGameSelect');
        hideModal('assistance'); // ADDED
    });

    // Hamburger Menu Logic
    const menuBtn = document.getElementById('menu-btn');
    const dropdownMenu = document.getElementById('dropdown-menu');
    if (menuBtn && dropdownMenu) {
        menuBtn.addEventListener('click', () => {
            dropdownMenu.classList.toggle('hidden');
        });
    }

    // Add listeners for menu items
    document.getElementById('menu-reset-btn').addEventListener('click', () => { showModal('reset'); dropdownMenu?.classList.add('hidden'); });
    document.getElementById('menu-info-btn').addEventListener('click', () => { showModal('info'); dropdownMenu?.classList.add('hidden'); });
    document.getElementById('menu-settings-btn').addEventListener('click', () => { showModal('settings'); dropdownMenu?.classList.add('hidden'); });


    // ****** MODIFIED RADIAL MENU LISTENER ******
    radialMenu.addEventListener('click', (e) => {
        const item = e.target.closest('.radial-item');
        // Ensure radial target is valid before proceeding
        if (item && radialTargetIndex !== null && gameState[radialTargetIndex]) {
            let changeMade = false; // Flag specifically for the erase action

            if (item.dataset.number) {
                 const num = parseInt(item.dataset.number);
                 // handleRadialInput sets final value, clears candidates, saves history, renders, highlights, etc.
                 // It also clears selections/target internally.
                 handleRadialInput(num, radialTargetIndex);
                 // No need for explicit changeMade check here as handleRadialInput handles changes
            }
            else if (item.dataset.action === 'erase') {
                 // Check if the target is erasable (not given)
                 if (!gameState[radialTargetIndex].isGiven) {
                     if (handleEraseInput(radialTargetIndex)) { // handleEraseInput NO LONGER saves history
                         changeMade = true;
                     }
                 }
                 // Clear target and selection after erase attempt via radial menu
                 clearTappedTarget();
                 clearCellSelections();

                 // Save history and Render *if* erase made a change
                 if (changeMade) {
                    saveHistory(); // <<< Save history here
                    renderBoard();
                 }
            }
            hideRadialMenu(); // <<< FIXED TYPO: Was hideModalMenu()
        } else {
             // If click is not on item or target is invalid, just hide menu
             hideRadialMenu(); // <<< FIXED TYPO: Was hideModalMenu()
        }
    });

    // New Game Select Modal Controls
    const difficultySelect = document.getElementById('difficulty-select');
    if (difficultySelect) {
        difficultySelect.addEventListener('change', (e) => {
            activeDifficulty = e.target.value;
            populatePuzzleList(activeDifficulty);
        });
    }

    // Blackout Mode Setting Listener
    const blackoutToggle = document.getElementById('blackout-mode-toggle');
    if (blackoutToggle) {
        blackoutToggle.addEventListener('change', (e) => {
            isBlackoutModeEnabled = e.target.checked;
            const highlightedButton = numberPicker.querySelector('.picker-selected[data-number]');
            if (highlightButton) {
                const num = parseInt(highlightedButton.dataset.number, 10);
                highlightNumber(num);
            } else {
                 clearHighlights();
                 renderBoard();
            }
        });
    }
}

// --- ADDED: Helper for Assistance Feature ---
function updateClearRulesButtonVisibility() {
    const clearRulesBtn = document.getElementById('clear-rules-btn');
    // Check all assistance states. If any are true, show the button.
    const anyRuleActive = isAssistBiValueActive || isAssistHiddenSinglesActive; // <<< MODIFIED
    
    if (anyRuleActive) {
        clearRulesBtn.classList.remove('hidden');
    } else {
        clearRulesBtn.classList.add('hidden');
    }
}


// --- START GAME ---
document.addEventListener('DOMContentLoaded', init);