function renderActiveSessionState({
    globalState,
    saveState,
    sessionSetup,
    sessionActive,
    uiState,
    renderActiveSessionView,
    renderActiveSession,
    syncGoTopButtonVisibility,
}) {
    renderActiveSessionView({
        sessionSetup,
        sessionActive,
        globalState,
        saveState,
        uiState,
        renderActiveSession,
        syncGoTopButtonVisibility,
    })
}

function syncSetupModeVisibility({
    gameMode,
    teamsConfig,
    syncModeSelectorSelection,
    modeSelector,
    showTournamentConfig,
    hideTournamentConfig,
    setCourtVisibility,
    getTournamentMatchMode,
    tournamentDistributionGroup,
    clearTournamentDistribution,
    tournamentDistributionHint,
    tournamentAdvancedError,
}) {
    syncModeSelectorSelection(modeSelector, gameMode)
    teamsConfig.hidden = gameMode !== "free"
    if (gameMode === "tournament") {
        showTournamentConfig()
        setCourtVisibility(getTournamentMatchMode())
        tournamentDistributionGroup.hidden = false
        return
    }
    hideTournamentConfig()
    setCourtVisibility(gameMode)
    clearTournamentDistribution({
        tournamentDistributionGroup,
        tournamentDistributionHint,
        tournamentAdvancedError,
    })
}

function buildSetupSessionViewState({
    showSetupSessionView,
    sessionSetup,
    sessionActive,
    uiState,
    resetGoTopButtonVisibility,
    globalState,
    noRosterWarning,
    sessionConfig,
    selectedPlayers,
    teamCount,
    reconcileSelectedPlayersWithRoster,
    syncAllow2v1Visibility,
    setTournamentSeriesNavCollapsedUi,
    tournamentSeriesNavToggleBtn,
    renderPlayerSelection,
    playerSelection,
    onSelectionChange,
    gameMode,
    teamsConfig,
    syncModeSelectorSelection,
    modeSelector,
    showTournamentConfig,
    hideTournamentConfig,
    setCourtVisibility,
    getTournamentMatchMode,
    tournamentDistributionGroup,
    clearTournamentDistribution,
    tournamentDistributionHint,
    tournamentAdvancedError,
    syncTeamCountControls,
    teamCountValue,
    teamsDecBtn,
    teamsIncBtn,
}) {
    showSetupSessionView({ sessionSetup, sessionActive, uiState, resetGoTopButtonVisibility })
    if (globalState.roster.length < 2) {
        noRosterWarning.hidden = false
        sessionConfig.hidden = true
        return { selectedPlayers, teamCount }
    }
    noRosterWarning.hidden = true
    sessionConfig.hidden = false

    const nextSelectedPlayers = reconcileSelectedPlayersWithRoster(selectedPlayers, globalState.roster)
    syncAllow2v1Visibility(nextSelectedPlayers.size)
    setTournamentSeriesNavCollapsedUi(
        {
            tournamentSeriesNav: uiState.tournamentSeriesNav,
            tournamentSeriesNavToggleBtn,
        },
        false,
    )
    renderPlayerSelection(globalState.roster, nextSelectedPlayers, playerSelection, onSelectionChange)
    syncSetupModeVisibility({
        gameMode,
        teamsConfig,
        syncModeSelectorSelection,
        modeSelector,
        showTournamentConfig,
        hideTournamentConfig,
        setCourtVisibility,
        getTournamentMatchMode,
        tournamentDistributionGroup,
        clearTournamentDistribution,
        tournamentDistributionHint,
        tournamentAdvancedError,
    })
    syncAllow2v1Visibility(nextSelectedPlayers.size)

    const nextTeamCount = syncTeamCountControls({
        teamCount,
        selectedCount: nextSelectedPlayers.size,
        teamCountValue,
        teamsDecBtn,
        teamsIncBtn,
    })
    onSelectionChange()
    return { selectedPlayers: nextSelectedPlayers, teamCount: nextTeamCount }
}

function refreshSessionViewState({
    globalState,
    saveState,
    sessionSetup,
    sessionActive,
    uiState,
    renderActiveSessionView,
    renderActiveSession,
    syncGoTopButtonVisibility,
    showSetupSessionView,
    resetGoTopButtonVisibility,
    noRosterWarning,
    sessionConfig,
    selectedPlayers,
    teamCount,
    reconcileSelectedPlayersWithRoster,
    syncAllow2v1Visibility,
    setTournamentSeriesNavCollapsedUi,
    tournamentSeriesNavToggleBtn,
    renderPlayerSelection,
    playerSelection,
    onSelectionChange,
    gameMode,
    teamsConfig,
    syncModeSelectorSelection,
    modeSelector,
    showTournamentConfig,
    hideTournamentConfig,
    setCourtVisibility,
    getTournamentMatchMode,
    tournamentDistributionGroup,
    clearTournamentDistribution,
    tournamentDistributionHint,
    tournamentAdvancedError,
    syncTeamCountControls,
    teamCountValue,
    teamsDecBtn,
    teamsIncBtn,
}) {
    if (globalState.activeSession) {
        renderActiveSessionState({
            globalState,
            saveState,
            sessionSetup,
            sessionActive,
            uiState,
            renderActiveSessionView,
            renderActiveSession,
            syncGoTopButtonVisibility,
        })
        return { selectedPlayers, teamCount }
    }

    return buildSetupSessionViewState({
        showSetupSessionView,
        sessionSetup,
        sessionActive,
        uiState,
        resetGoTopButtonVisibility,
        globalState,
        noRosterWarning,
        sessionConfig,
        selectedPlayers,
        teamCount,
        reconcileSelectedPlayersWithRoster,
        syncAllow2v1Visibility,
        setTournamentSeriesNavCollapsedUi,
        tournamentSeriesNavToggleBtn,
        renderPlayerSelection,
        playerSelection,
        onSelectionChange,
        gameMode,
        teamsConfig,
        syncModeSelectorSelection,
        modeSelector,
        showTournamentConfig,
        hideTournamentConfig,
        setCourtVisibility,
        getTournamentMatchMode,
        tournamentDistributionGroup,
        clearTournamentDistribution,
        tournamentDistributionHint,
        tournamentAdvancedError,
        syncTeamCountControls,
        teamCountValue,
        teamsDecBtn,
        teamsIncBtn,
    })
}

export { refreshSessionViewState }
