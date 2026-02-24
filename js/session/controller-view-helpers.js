function renderActiveSessionView({
    sessionSetup,
    sessionActive,
    globalState,
    saveState,
    uiState,
    renderActiveSession,
    syncGoTopButtonVisibility,
}) {
    sessionSetup.hidden = true
    sessionActive.hidden = false
    renderActiveSession(globalState, saveState, uiState)
    syncGoTopButtonVisibility({
        hasActiveSession: true,
        topButton: uiState.nextRoundBtn,
        bottomActions: uiState.sessionBottomActions,
    })
}

function showSetupSessionView({ sessionSetup, sessionActive, uiState, resetGoTopButtonVisibility }) {
    sessionSetup.hidden = false
    sessionActive.hidden = true
    resetGoTopButtonVisibility(uiState.sessionBottomActions)
}

function reconcileSelectedPlayersWithRoster(selectedPlayers, roster) {
    const validSelected = new Set()
    for (const player of selectedPlayers) {
        if (roster.includes(player)) {
            validSelected.add(player)
        }
    }
    return validSelected
}

function syncModeSelectorSelection(modeSelector, gameMode) {
    for (const btn of modeSelector.querySelectorAll(".mode-btn")) {
        btn.classList.toggle("selected", btn.dataset.mode === gameMode)
    }
}

function bindModeButtons(modeSelector, onModeChange) {
    for (const btn of modeSelector.querySelectorAll(".mode-btn")) {
        btn.addEventListener("click", () => onModeChange(btn.dataset.mode))
    }
}

function syncInitialGoTopButtonState(globalState, uiState, syncGoTopButtonVisibility) {
    syncGoTopButtonVisibility({
        hasActiveSession: Boolean(globalState?.activeSession),
        topButton: uiState.nextRoundBtn,
        bottomActions: uiState.sessionBottomActions,
    })
}

export {
    bindModeButtons,
    reconcileSelectedPlayersWithRoster,
    renderActiveSessionView,
    showSetupSessionView,
    syncInitialGoTopButtonState,
    syncModeSelectorSelection,
}
