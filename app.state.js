// --- DOM ELEMENTS ---
const grid = document.getElementById('sudoku-grid');
const numberPicker = document.getElementById('number-picker');
const gameContainer = document.getElementById('game-container');
const modals = {
    backdrop: document.getElementById('modal-backdrop'),
    info: document.getElementById('info-modal'),
    settings: document.getElementById('settings-modal'),
    reset: document.getElementById('reset-modal'),
    newGameSelect: document.getElementById('new-game-select-modal'), // Changed from newGame
    assistance: document.getElementById('assistance-modal'), // ADDED
};
const undoRedoPopover = document.getElementById('undo-redo-popover');
const radialMenu = document.getElementById('radial-menu');
const inputPill = document.getElementById('input-pill');

// --- GAME STATE ---
let initialBoardString = "530070000600195000098000060800060003400803001700020006060000280000419005000080079"; // Will be overwritten by JSON load
let initialSolutionString = "534678912672195348198342567859761423426853791713924856961537284287419635345286179"; // Will be overwritten
let currentSolutionString = "";
let gameState = [];
let history = [];
let historyIndex = -1;

let selectedCells = new Set();
let inputModeCell = null;

// Interaction state
let pointerDownTime = 0;
let longPressTimer = null;
let isDragging = false;
let dragStartCell = null;
let dragMode = 'select';
let selectionIsActioned = false;
let lastDragIndex = -1; 
let isCandidateIsolationMode = false;
let pickerSelectedNumbers = new Set();
let pillSessionActive = false;
let longPressFired = false;
let lastTap = 0;
let lastTapIndex = -1;
let radialTargetIndex = null;
let tappedTargetCellIndex = null; 

// Settings
let isBlackoutModeEnabled = false;

// --- ADDED: Assistance Feature State ---
let isAssistBiValueActive = false;
let isAssistHiddenSinglesActive = false; // <<< ADDED
// --- End ---

// Pre-computed cell data for highlighting
const peers = [];

// --- CONSTANTS ---
const LONG_PRESS_DURATION = 300; // ms
const COLORS = Array.from({ length: 9 }, (_, i) => `var(--color-${i + 1})`);

// --- PUZZLE CATALOG / DIFFICULTY ---
const DIFF_LABELS = ["Easy","Medium","Hard","Expert"];
const puzzleCatalog = { Easy:[], Medium:[], Hard:[], Expert:[] };
let activeDifficulty = "Medium"; // Still used for default/current selection

// --- SOLVED PUZZLE TRACKING ---
let solvedPuzzlesData = {}; // Object to store solved puzzle IDs { Easy: ["id1"], Medium: [], ... }
let currentPuzzleId = null; // ID of the currently loaded puzzle