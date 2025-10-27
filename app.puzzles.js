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
  // Initialize sudokuJS
  mySudokuJS = $("#sudoku").sudokuJS({
    difficulty: "easy",
    boardUpdatedFn: function(data){
      // console.log("board updated!");
    },
    boardFinishedFn: function(data){
      // console.log("board finished!");
    },
    boardErrorFn: function(data){
      // console.log("board error!");
    }
  });

  loadSolvedPuzzles();

  const difficultySelect = document.getElementById("difficulty-select");
  if (difficultySelect) {
    difficultySelect.value = activeDifficulty;
    populatePuzzleList(activeDifficulty);
  } else {
    console.error("Difficulty select element not found.");
  }

  // Generate a new board
  mySudokuJS.generateBoard("easy");
}

// *** NEW: Populates the puzzle list in the new modal ***
function populatePuzzleList(difficulty) {
    const listContainer = document.getElementById("puzzle-list-container");
    if (!listContainer) {
        console.error("Puzzle list container not found!");
        return;
    }

    listContainer.innerHTML = ''; // Clear previous list

    for (let i = 0; i < 10; i++) {
        const listItem = document.createElement('button');
        listItem.classList.add('block', 'w-full', 'text-left', 'p-2', 'rounded', 'hover:bg-blue-100', 'focus:outline-none', 'focus:ring-2', 'focus:ring-blue-500', 'transition', 'text-sm');
        listItem.textContent = `New Puzzle ${i + 1}`;
        listItem.dataset.difficulty = difficulty;

        listItem.addEventListener('click', () => {
            startSelectedPuzzle(null, difficulty);
        });
        listContainer.appendChild(listItem);
    }
}

function startSelectedPuzzle(puzzleId, difficulty) {
    activeDifficulty = difficulty;
    mySudokuJS.generateBoard(difficulty, (board) => {
        const puzzle = mySudokuJS.getBoard();
        mySudokuJS.solveAll();
        const solution = mySudokuJS.getBoard();
        loadBoard(puzzle, solution, null);
        clearSelections();
        clearHighlights();
        hideModal('newGameSelect');
    });
}

// --- REMOVED old updateNewGameControls function ---
// --- REMOVED old startRandomPuzzleForActiveDifficulty function ---