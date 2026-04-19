import { setTournamentSeriesNavCollapsedUi } from "./ui-state.js"

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

function showSetupBaseSessionView({
    sessionSetup,
    sessionActive,
    uiState,
    resetGoTopButtonVisibility,
    tournamentSeriesNavToggleBtn,
}) {
    showSetupSessionView({ sessionSetup, sessionActive, uiState, resetGoTopButtonVisibility })
    setTournamentSeriesNavCollapsedUi(
        {
            tournamentSeriesNav: uiState.tournamentSeriesNav,
            tournamentSeriesNavToggleBtn,
        },
        false,
    )
}

function syncInitialGoTopButtonState(globalState, uiState, syncGoTopButtonVisibility) {
    syncGoTopButtonVisibility({
        hasActiveSession: Boolean(globalState?.activeSession),
        topButton: uiState.nextRoundBtn,
        bottomActions: uiState.sessionBottomActions,
    })
}

export { renderActiveSessionView, showSetupBaseSessionView, syncInitialGoTopButtonState }
