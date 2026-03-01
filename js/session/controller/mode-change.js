function syncModeButtons(modeSelector, mode) {
    for (const btn of modeSelector.querySelectorAll(".mode-btn")) {
        btn.classList.toggle("selected", btn.dataset.mode === mode)
    }
}

function syncModePanels(mode, teamsConfig, modeHint, setTeamCount) {
    if (mode === "free") {
        teamsConfig.hidden = false
        modeHint.textContent = ""
        return
    }
    teamsConfig.hidden = true
    setTeamCount(2)
}

function syncTournamentMode({
    mode,
    showTournamentConfig,
    updateTournamentHint,
    setCourtVisibility,
    getTournamentMatchMode,
    hideTournamentConfig,
    resetTournamentSetup,
    resetCourtCount,
}) {
    if (mode === "tournament") {
        showTournamentConfig()
        updateTournamentHint()
        setCourtVisibility(getTournamentMatchMode())
        return
    }
    hideTournamentConfig()
    resetTournamentSetup()
    setCourtVisibility(mode)
    resetCourtCount()
}

function handleModeChange({
    mode,
    setGameMode,
    setTeamCount,
    modeSelector,
    teamsConfig,
    modeHint,
    showTournamentConfig,
    updateTournamentHint,
    setCourtVisibility,
    getTournamentMatchMode,
    hideTournamentConfig,
    resetTournamentSetup,
    resetCourtCount,
    syncAllow2v1Visibility,
    selectedPlayersCount,
    allow2v1Checkbox,
    setNotStrictDoubles,
    onSelectionChange,
}) {
    setGameMode(mode)
    syncModeButtons(modeSelector, mode)
    syncModePanels(mode, teamsConfig, modeHint, setTeamCount)
    syncTournamentMode({
        mode,
        showTournamentConfig,
        updateTournamentHint,
        setCourtVisibility,
        getTournamentMatchMode,
        hideTournamentConfig,
        resetTournamentSetup,
        resetCourtCount,
    })

    syncAllow2v1Visibility(selectedPlayersCount)
    if (mode !== "tournament") {
        allow2v1Checkbox.checked = false
        setNotStrictDoubles(false)
    }
    onSelectionChange()
}

export { handleModeChange }
