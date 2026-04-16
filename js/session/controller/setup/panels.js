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
        continuation: draft.continuation,
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

function renderStructuredSetupPanel({
    allow2v1Checkbox,
    canUseTwoVsOne,
    courtHint,
    courtsConfig,
    draft,
    getPlayers,
    getTournamentMatchMode,
    notStrictDoublesGroup,
    tournamentConfig,
    tournamentDistributionGroup,
    tournamentSetupPanel,
    updateCourtHint,
}) {
    const players = getPlayers()
    tournamentSetupPanel.hidden = false
    tournamentConfig.hidden = true
    courtsConfig.hidden = false
    tournamentDistributionGroup.hidden = true

    const isDoubles = draft.gameMode === "doubles"
    const canEnableTwoVsOne = isDoubles && canUseTwoVsOne(players, 2)
    notStrictDoublesGroup.hidden = !isDoubles
    allow2v1Checkbox.checked = isDoubles && draft.structured.allowNotStrictDoubles
    allow2v1Checkbox.disabled = !canEnableTwoVsOne
    if (!canEnableTwoVsOne) {
        allow2v1Checkbox.checked = false
    }

    updateCourtHint({
        draft,
        matchMode: getTournamentMatchMode(isDoubles ? 2 : 1),
        courtHint,
    })
}

function renderTournamentLikeSetupStep(context, isStructured) {
    context.tournamentSetupPanel.hidden = false
    if (isStructured) {
        context.clearTournamentDistribution({
            tournamentDistributionGroup: context.tournamentDistributionGroup,
            tournamentDistributionHint: context.tournamentDistributionHint,
            tournamentAdvancedError: context.tournamentAdvancedError,
        })
        renderStructuredSetupPanel({
            allow2v1Checkbox: context.allow2v1Checkbox,
            canUseTwoVsOne: context.canUseTwoVsOne,
            courtHint: context.courtHint,
            courtsConfig: context.courtsConfig,
            draft: context.draft,
            getPlayers: context.getPlayers,
            getTournamentMatchMode: context.getTournamentMatchMode,
            notStrictDoublesGroup: context.notStrictDoublesGroup,
            tournamentConfig: context.tournamentConfig,
            tournamentDistributionGroup: context.tournamentDistributionGroup,
            tournamentSetupPanel: context.tournamentSetupPanel,
            updateCourtHint: context.updateCourtHint,
        })
        context.teamSizeHint.textContent = ""
        return
    }

    context.tournamentConfig.hidden = false
    context.courtsConfig.hidden = false
    renderTournamentSetupPanel({
        draft: context.draft,
        getPlayers: context.getPlayers,
        getTournamentMatchMode: context.getTournamentMatchMode,
        getMinPlayersForTournament: context.getMinPlayersForTournament,
        handleTournamentAction: context.handleTournamentAction,
        renderTournamentSetup: context.renderTournamentSetup,
        tournamentSetupPanel: context.tournamentSetupPanel,
        updateCourtHint: context.updateCourtHint,
        courtHint: context.courtHint,
        showTournamentPreviewPendingState: context.showTournamentPreviewPendingState,
        tournamentDistributionGroup: context.tournamentDistributionGroup,
        tournamentDistributionHint: context.tournamentDistributionHint,
        tournamentAdvancedError: context.tournamentAdvancedError,
        renderTournamentDistributionSummary: context.renderTournamentDistributionSummary,
        showTournamentPreviewError: context.showTournamentPreviewError,
    })
    context.teamSizeHint.textContent = ""
}

function renderFreeOrEmptySetupStep({
    clearTournamentDistribution,
    isFree,
    notStrictDoublesGroup,
    renderFreeSetup,
    sessionTeamRenderContext,
    teamSizeHint,
    tournamentAdvancedError,
    tournamentDistributionGroup,
    tournamentDistributionHint,
}) {
    clearTournamentDistribution({
        tournamentDistributionGroup,
        tournamentDistributionHint,
        tournamentAdvancedError,
    })
    notStrictDoublesGroup.hidden = true
    if (isFree) {
        renderFreeSetup(sessionTeamRenderContext)
        return
    }
    teamSizeHint.textContent = ""
}

function renderSetupStep(context) {
    const mode = context.draft.gameMode
    const isStructured = mode === "singles" || mode === "doubles"
    context.teamsConfig.hidden = mode !== "free"
    context.tournamentSetupPanel.hidden = !(mode === "tournament" || isStructured)

    if (mode === "tournament") {
        renderTournamentLikeSetupStep(context, false)
        return
    }

    if (isStructured) {
        renderTournamentLikeSetupStep(context, true)
        return
    }

    renderFreeOrEmptySetupStep({
        clearTournamentDistribution: context.clearTournamentDistribution,
        isFree: mode === "free",
        notStrictDoublesGroup: context.notStrictDoublesGroup,
        renderFreeSetup: context.renderFreeSetup,
        sessionTeamRenderContext: context.sessionTeamRenderContext,
        teamSizeHint: context.teamSizeHint,
        tournamentAdvancedError: context.tournamentAdvancedError,
        tournamentDistributionGroup: context.tournamentDistributionGroup,
        tournamentDistributionHint: context.tournamentDistributionHint,
    })
}

export { renderSetupStep }
