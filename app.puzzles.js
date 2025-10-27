// --- SOLVED PUZZLE STORAGE ---

function loadSolvedPuzzles() {
    try {
        const storedData = localStorage.getItem('solvedPuzzlesData');
        if (storedData) {
            solvedPuzzlesData = JSON.parse(storedData);
            // Ensure all difficulty keys exist
            DIFF_LABELS.forEach(label => {
                if (!solvedPuzzlesData[label]) {
                    solvedPuzzlesData[label] = [];
                }
            });
        } else {
             // Initialize if nothing is stored
            solvedPuzzlesData = Object.fromEntries(DIFF_LABELS.map(label => [label, []]));
        }
    } catch (error) {
        console.error("Failed to load or parse solved puzzles data:", error);
        // Initialize with empty data on error
        solvedPuzzlesData = Object.fromEntries(DIFF_LABELS.map(label => [label, []]));
    }
}

function saveSolvedPuzzles() {
    try {
        localStorage.setItem('solvedPuzzlesData', JSON.stringify(solvedPuzzlesData));
    } catch (error) {
        console.error("Failed to save solved puzzles data:", error);
    }
}

function markPuzzleAsSolved(puzzleId, difficulty) {
    if (!puzzleId || !difficulty || !solvedPuzzlesData[difficulty]) {
        console.warn("Could not mark puzzle as solved. Invalid id or difficulty:", puzzleId, difficulty);
        return;
    }
    // Use a Set temporarily for efficient checking, then convert back to array for storage
    const solvedSet = new Set(solvedPuzzlesData[difficulty]);
    if (!solvedSet.has(puzzleId)) {
        solvedSet.add(puzzleId);
        solvedPuzzlesData[difficulty] = Array.from(solvedSet); // Store as array
        saveSolvedPuzzles();
        // Update the list if the modal is open (or next time it opens)
        const currentModalDifficulty = document.getElementById("difficulty-select")?.value;
        if (currentModalDifficulty === difficulty) {
             populatePuzzleList(difficulty);
        }
        console.log(`Marked puzzle ${puzzleId} (${difficulty}) as solved.`);
    }
}

// --- PUZZLE LOADING & MANAGEMENT ---

async function loadPuzzles() {
  // Removed initial loading message targeting old modal element

  try {
    const response = await fetch('puzzles.json');
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    Object.assign(puzzleCatalog, data);

    loadSolvedPuzzles(); // Load solved status *after* puzzles are loaded

    // Initialize the difficulty selector and puzzle list in the new modal
    const difficultySelect = document.getElementById("difficulty-select");
    if (difficultySelect) {
        difficultySelect.value = activeDifficulty; // Set dropdown to current difficulty
        populatePuzzleList(activeDifficulty); // Populate list initially
    } else {
        console.error("Difficulty select element not found.");
    }


    // Load the first easy puzzle as a default if no current puzzle ID exists
    // Or try reloading the last known puzzle ID if available (e.g., after refresh)
    // Note: This needs refinement if we want persistent state across sessions
    const firstPuzzle = puzzleCatalog.Easy?.[0]; // Default fallback
    if (firstPuzzle) {
        loadBoard(firstPuzzle.puzzle, firstPuzzle.solution, firstPuzzle.id); // Load default
    } else {
        // Fallback if JSON is empty or Easy array is missing
        loadBoard(initialBoardString, initialSolutionString); // No ID for hardcoded fallback
    }

  } catch (error) {
    console.error("Failed to load puzzles.json:", error);
    // Add error handling for the new modal if needed
    // Fallback to the hardcoded puzzle on error
    loadBoard(initialBoardString, initialSolutionString);
  }
}

// *** NEW: Populates the puzzle list in the new modal ***
function populatePuzzleList(difficulty) {
    const listContainer = document.getElementById("puzzle-list-container");
    if (!listContainer) {
        console.error("Puzzle list container not found!");
        return;
    }

    listContainer.innerHTML = ''; // Clear previous list

    const puzzles = puzzleCatalog[difficulty];
    const solvedIds = new Set(solvedPuzzlesData[difficulty] || []);

    if (!puzzles || puzzles.length === 0) {
        listContainer.innerHTML = `<p class="text-sm text-center text-[var(--text-muted)]">No puzzles available for ${difficulty}.</p>`;
        return;
    }

    puzzles.forEach((puzzle, index) => {
        const listItem = document.createElement('button');
        listItem.classList.add('block', 'w-full', 'text-left', 'p-2', 'rounded', 'hover:bg-blue-100', 'focus:outline-none', 'focus:ring-2', 'focus:ring-blue-500', 'transition', 'text-sm');
        const isSolved = solvedIds.has(puzzle.id);
        listItem.textContent = `Puzzle ${index + 1}${isSolved ? ' (Solved)' : ''}`;
        listItem.dataset.puzzleId = puzzle.id;
        listItem.dataset.difficulty = difficulty;

        if (isSolved) {
            listItem.classList.add('text-slate-500'); // Style solved items differently
        } else {
             listItem.classList.add('text-slate-800', 'font-medium');
        }

         // Add current puzzle indicator
        if (puzzle.id === currentPuzzleId) {
            listItem.classList.add('bg-blue-200', 'font-bold'); // Highlight current puzzle
        }

        listItem.addEventListener('click', () => {
            startSelectedPuzzle(puzzle.id, difficulty);
        });
        listContainer.appendChild(listItem);
    });
}

// *** NEW: Starts a specific puzzle selected from the list ***
function startSelectedPuzzle(puzzleId, difficulty) {
    const puzzle = puzzleCatalog[difficulty]?.find(p => p.id === puzzleId);

    if (puzzle) {
        activeDifficulty = difficulty; // Update active difficulty
        loadBoard(puzzle.puzzle, puzzle.solution, puzzle.id);
        clearSelections();
        clearHighlights();
        hideModal('newGameSelect'); // Hide the new selection modal
    } else {
        console.error(`Puzzle with ID ${puzzleId} not found in difficulty ${difficulty}.`);
        alert("Error loading selected puzzle.");
    }
}


// --- REMOVED old updateNewGameControls function ---
// --- REMOVED old startRandomPuzzleForActiveDifficulty function ---