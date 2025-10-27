/* style.css */

/* ... (Keep all your existing styles) ... */


/* --- ADDED: Candidate Visibility Control --- */

/* Hide candidate grids by default */
.candidates-grid {
    display: grid; /* Keep grid structure */
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 1fr);
    width: 100%;
    height: 100%;
    font-size: clamp(8px, 1.8vmin, 14px);
    line-height: 1;
    text-align: center;
    color: var(--text-secondary);
    transition: opacity 0.2s ease-in-out;
    box-sizing: border-box;
    opacity: 0; /* Make invisible */
    pointer-events: none; /* Make unclickable */
}

/* Show candidates when the parent container has the 'show-candidates' class */
.show-candidates .candidates-grid {
    opacity: 1;
    pointer-events: auto;
}

/* Also ensure individual candidate items become visible */
.show-candidates .candidate-item {
    visibility: visible !important; /* Override potential inline styles from highlighting */
}

/* Ensure the .hidden class still works for highlighting logic */
.candidates-grid.hidden {
    opacity: 0 !important; /* Ensure .hidden takes priority even if .show-candidates is active */
    pointer-events: none !important;
}

/* Style for the toggle button when candidates are visible */
#toggle-candidates-btn.active {
    color: var(--color-7); /* Blue color, matching highlights */
    background-color: rgba(59, 130, 246, 0.1); /* Light blue background */
}


/* --- Existing Candidate Item Styles (Ensure these are present) --- */
.candidate-item {
    display: grid;
    place-items: center;
    box-sizing: border-box;
    visibility: visible; /* Default to visible, parent grid controls overall visibility */
}
.candidate-item.anti {
    background:#000;
    color: var(--anti-digit);
    border-radius: 9999px;
    width: 72%;
    height: 72%;
    margin: auto;
    font-weight: 600;
}

/* ... (Keep all other existing styles like colors, highlights, modals etc.) ... */