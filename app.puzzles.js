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
      renderBoard();
    },
    boardFinishedFn: function(data){
      renderBoard();
    },
    boardErrorFn: function(data){
      // console.log("board error!");
    }
  });
}


function startSelectedPuzzle(puzzleId, difficulty) {
    activeDifficulty = difficulty;
    mySudokuJS.generateBoard(difficulty, (board) => {
        const puzzle = JSON.parse(JSON.stringify(mySudokuJS.getBoard()));
        mySudokuJS.solveAll();
        const solution = mySudokuJS.getBoard();
        mySudokuJS.setBoard(puzzle);
        loadBoard(puzzle, solution, null);
        clearSelections();
        clearHighlights();
        hideModal('newGameSelect');
    });
}

// --- REMOVED old updateNewGameControls function ---
// --- REMOVED old startRandomPuzzleForActiveDifficulty function ---