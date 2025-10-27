// --- MODALS & POPOVERS ---
function showModal(type) {
    // Make sure the modal element exists before trying to access its style/classList
    if (modals[type]) {
        modals.backdrop.style.display = 'block';
        modals[type].style.display = modals[type].id === 'new-game-select-modal' ? 'flex' : 'block'; // Adjust display for flex modal
        setTimeout(() => {
            modals.backdrop.classList.remove('opacity-0');
            modals[type].classList.remove('opacity-0', 'scale-95');
        }, 10);
    } else {
        console.error(`Modal type "${type}" not found in modals object.`);
    }
}

function hideModal(type) {
    // Make sure the modal element exists
    if (modals[type]) {
        modals.backdrop.classList.add('opacity-0');
        modals[type].classList.add('opacity-0', 'scale-95');
        setTimeout(() => {
            modals.backdrop.style.display = 'none';
            modals[type].style.display = 'none';
        }, 300); // Match transition duration
    }
    // No error needed if hiding a non-existent modal, might happen during cleanup
}

function showUndoRedo() {
    updateUndoRedoButtons(); undoRedoPopover.style.display = 'flex';
    setTimeout(() => { undoRedoPopover.classList.remove('opacity-0', 'scale-90'); }, 10);
    setTimeout(() => { undoRedoPopover.classList.add('opacity-0', 'scale-90'); setTimeout(() => { undoRedoPopover.style.display = 'none';}, 2500); }, 2500);
}

// --- RADIAL MENU ---
function showRadialMenu(x, y, index) {
    generateRadialMenu(); clearSelections();
    radialMenu.style.left = `${x - 100}px`; radialMenu.style.top = `${y - 100}px`; radialMenu.style.display = 'block';
    radialTargetIndex = index; setTimeout(() => { radialMenu.classList.remove('opacity-0', 'scale-75'); }, 10);
}
function hideRadialMenu() {
    radialMenu.classList.add('opacity-0', 'scale-75');
    setTimeout(() => { radialMenu.style.display = 'none'; radialTargetIndex = null; }, 150);
}

// --- NEW INTERACTION LOGIC (Pill Menu) ---
function addHoldIndicator(btn) {
    const indicator = document.createElement('div'); indicator.className = 'hold-progress-indicator';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 50 50');
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); circle.setAttribute('cx', '25'); circle.setAttribute('cy', '25'); circle.setAttribute('r', '23'); svg.appendChild(circle);
    indicator.appendChild(svg); btn.appendChild(indicator);
}
function removeHoldIndicator(btn) { const indicator = btn.querySelector('.hold-progress-indicator'); if (indicator) indicator.remove(); }

function toggleCandidateIsolationMode(forceOn, num = null) {
    isCandidateIsolationMode = forceOn;
    if (isCandidateIsolationMode) {
        numberPicker.classList.add('candidate-isolation-mode'); clearSelections(); pickerSelectedNumbers.clear(); if (num) { toggleIsolationNumber(num); }
    } else {
        numberPicker.classList.remove('candidate-isolation-mode'); pickerSelectedNumbers.clear(); numberPicker.querySelectorAll('.iso-selected').forEach(b => b.classList.remove('iso-selected')); clearHighlights();
    }
}

function toggleIsolationNumber(num) {
    const btn = numberPicker.querySelector(`[data-number="${num}"]`); if (!btn) return;
    if (pickerSelectedNumbers.has(num)) { pickerSelectedNumbers.delete(num); btn.classList.remove('iso-selected'); }
    else { pickerSelectedNumbers.add(num); btn.classList.add('iso-selected'); }
    if (pickerSelectedNumbers.size === 0) { toggleCandidateIsolationMode(false); }
    else { highlightCandidatesForNumbers(pickerSelectedNumbers); }
}

function showInputPill(btn, pointerAt = null) {
  if (pillSessionActive) {
    if (pointerAt) { const pre = document.elementFromPoint(pointerAt.x, pointerAt.y)?.closest('.pill-item'); if (pre) { inputPill.querySelectorAll('.pill-item').forEach(i => i.classList.remove('highlighted')); pre.classList.add('highlighted'); } }
    return;
  }
  pillSessionActive = true;
  if (!btn.dataset.number) return;
  const num = parseInt(btn.dataset.number, 10);
  const btnRect = btn.getBoundingClientRect();
  const selectionCount = selectedCells.size;
  inputPill.classList.remove('no-selection','single-selection','multi-selection');
  if (selectionCount === 0) inputPill.classList.add('no-selection');
  else if (selectionCount === 1) inputPill.classList.add('single-selection');
  else inputPill.classList.add('multi-selection');

  const pillAnti = inputPill.querySelector('[data-type="anti-candidate"]');
  const pillCand = inputPill.querySelector('[data-type="candidate"]');
  const pillVal  = inputPill.querySelector('[data-type="value"]');
  pillAnti.innerHTML = `<div class="candidate-item anti" style="width:24px;height:24px;">${num}</div>`;
  pillCand.innerHTML = `<span style="color:${COLORS[num-1]}">${num}</span>`;
  pillVal.innerHTML  = `<span class="text-2xl" style="color:${COLORS[num-1]}">${num}</span>`;

  inputPill.style.visibility = 'hidden'; inputPill.style.display = 'flex';
  const r0 = inputPill.getBoundingClientRect();
  const margin = 8;
  let top  = btnRect.top - r0.height - margin; if (top < margin) top = btnRect.bottom + margin;
  let left = btnRect.left + (btnRect.width/2) - (r0.width/2);
  left = Math.max(margin, Math.min(left, window.innerWidth - r0.width - margin));
  inputPill.style.left   = `${Math.round(left)}px`;
  inputPill.style.top    = `${Math.round(top)}px`;
  inputPill.style.width  = `${Math.round(r0.width)}px`;
  inputPill.style.height = `${Math.round(r0.height)}px`;
  inputPill.style.visibility = 'visible';
  inputPill.classList.add('opacity-0','scale-90');
  requestAnimationFrame(() => inputPill.classList.remove('opacity-0','scale-90'));
  let lastHighlighted = null; if (pointerAt) { const pre = document.elementFromPoint(pointerAt.x, pointerAt.y)?.closest('.pill-item'); if (pre) { pre.classList.add('highlighted'); lastHighlighted = pre; } }
  let didCommit = false;
  const highlightAt = (x, y) => { const el = document.elementFromPoint(x, y); const item = el?.closest('.pill-item'); if (item !== lastHighlighted) { if (lastHighlighted) lastHighlighted.classList.remove('highlighted'); if (item) item.classList.add('highlighted'); lastHighlighted = item; } };

  const commitChoice = (item) => {
    if (!item) return; const type = item.dataset.type;
    if (type === 'selection-mode') { toggleCandidateIsolationMode(true, num); }
    else if (selectedCells.size > 0) {
      if (type === 'value' && selectedCells.size === 1) { const index = selectedCells.values().next().value; handleNumberInputKeyboard(num, index); }
      else if (type === 'candidate' || type === 'anti-candidate') { handleCandidateInput(num, type); }
    }
  };
  const cleanupListeners = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp); window.removeEventListener('touchend', onTouchEnd); };

  const finishAt = (x, y) => {
    if (didCommit) return;
    didCommit = true;
    const hit = document.elementFromPoint(x, y)?.closest('.pill-item');

    if (hit) {
        commitChoice(hit);
    }

    hideInputPill();
    cleanupListeners();
  };

  const onMove = (e) => { e.preventDefault(); highlightAt(e.clientX, e.clientY); };
  const onUp = (e) => { e.preventDefault(); finishAt(e.clientX, e.clientY); };
  const onTouchEnd = (e) => { e.preventDefault(); const t = e.changedTouches && e.changedTouches[0]; if (!t) return; finishAt(t.clientX, t.clientY); };
  window.addEventListener('pointermove', onMove, { passive: false });
  window.addEventListener('pointerup', onUp, { passive: false });
  window.addEventListener('pointercancel', onUp, { passive: false });
  window.addEventListener('touchend', onTouchEnd, { passive: false });
}

function hideInputPill() {
    pillSessionActive = false;
    inputPill.classList.add('opacity-0', 'scale-90');
    setTimeout(() => { inputPill.style.display = 'none'; inputPill.style.width = inputPill.style.height = ''; inputPill.querySelectorAll('.pill-item.highlighted').forEach(i => i.classList.remove('highlighted')); }, 150);
}

// --- COMPLETION ANIMATION (FAST) ---
// Note: These animation functions are duplicated in app.render.js.
// We should ideally keep them in one place (e.g., app.ui.js) and remove from app.render.js
// For now, leaving as is, but this is technical debt.
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

// REMOVED duplicate runCompletionChecks (keep the one in app.render.js)

function animateHouse(cellIndices, delay = 40, type = 'normal') {
    const animationClass = type === 'long' ? 'animate-rainbow-sweep-long' : 'animate-rainbow-sweep';
    return new Promise(resolve => {
        cellIndices.forEach((cellIndex, i) => {
            setTimeout(() => {
                const cellEl = grid.children[cellIndex];
                if (cellEl) { // Add safety check
                    cellEl.classList.remove('animate-rainbow-sweep', 'animate-rainbow-sweep-long');
                    void cellEl.offsetWidth; // Force reflow
                    cellEl.classList.add(animationClass);
                    cellEl.addEventListener('animationend', () => { cellEl.classList.remove(animationClass); }, { once: true });
                }
            }, i * delay);
        });
        const animationDuration = (type === 'long' ? 2000 : 500); // Base duration of one animation cycle
        const totalDuration = (cellIndices.length * delay) + animationDuration;
        setTimeout(resolve, totalDuration);
    });
}