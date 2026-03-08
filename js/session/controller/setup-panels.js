function renderTournamentSetupPanel({
    draft,
    getPlayers,
    getTournamentMatchMode,
    getMinPlayersForTournament,
    handleTournamentAction,
    renderTournamentSetup,
    tournamentSetupPanel,
    updateCourtHint,
    courtHint,
    showTournamentPreviewPendingState,
    tournamentDistributionGroup,
    tournamentDistributionHint,
    tournamentAdvancedError,
    renderTournamentDistributionSummary,
    showTournamentPreviewError,
}) {
    const players = getPlayers()
    tournamentSetupPanel.hidden = false
    renderTournamentSetup({
        tournamentDraft: draft.tournament,
        selectedPlayers: players,
        previewError: draft.tournament.previewError,
        advancedError: draft.tournament.advancedError,
        onChange: handleTournamentAction,
    })
    updateCourtHint({
        draft,
        matchMode: getTournamentMatchMode(draft.tournament.teamSize),
        courtHint,
    })

    const minPlayers = getMinPlayersForTournament(draft.tournament.teamSize, draft.tournament.allowNotStrictDoubles)
    if (players.length < minPlayers) {
        showTournamentPreviewPendingState({
            tournamentDistributionGroup,
            tournamentDistributionHint,
            tournamentAdvancedError,
        })
        return
    }
    if (draft.tournament.preview?.ok) {
        renderTournamentDistributionSummary(
            draft.tournament.preview,
            draft.tournament.courtCount,
            tournamentDistributionHint,
            draft.tournament.buildConfig,
        )
        return
    }
    showTournamentPreviewError(
        draft.tournament.previewError || "Unable to build the tournament preview.",
        tournamentDistributionHint,
        tournamentAdvancedError,
    )
}

function renderSetupStep({
    clearTournamentDistribution,
    draft,
    handleTournamentAction,
    courtHint,
    getPlayers,
    getMinPlayersForTournament,
    getTournamentMatchMode,
    renderFreeSetup,
    renderTournamentDistributionSummary,
    renderTournamentSetup,
    sessionTeamRenderContext,
    showTournamentPreviewError,
    showTournamentPreviewPendingState,
    teamSizeHint,
    teamsConfig,
    tournamentAdvancedError,
    tournamentDistributionGroup,
    tournamentDistributionHint,
    tournamentSetupPanel,
    updateCourtHint,
}) {
    const isTournament = draft.gameMode === "tournament"
    const isFree = draft.gameMode === "free"
    teamsConfig.hidden = !isFree
    tournamentSetupPanel.hidden = !isTournament
    if (isTournament) {
        renderTournamentSetupPanel({
            draft,
            getPlayers,
            getTournamentMatchMode,
            getMinPlayersForTournament,
            handleTournamentAction,
            renderTournamentSetup,
            tournamentSetupPanel,
            updateCourtHint,
            courtHint,
            showTournamentPreviewPendingState,
            tournamentDistributionGroup,
            tournamentDistributionHint,
            tournamentAdvancedError,
            renderTournamentDistributionSummary,
            showTournamentPreviewError,
        })
        teamSizeHint.textContent = ""
        return
    }

    clearTournamentDistribution({
        tournamentDistributionGroup,
        tournamentDistributionHint,
        tournamentAdvancedError,
    })
    if (isFree) {
        renderFreeSetup(sessionTeamRenderContext)
        return
    }

    teamSizeHint.textContent = ""
}

export { renderSetupStep }
