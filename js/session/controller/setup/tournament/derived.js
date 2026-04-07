function updateTournamentDerivedState({
    draft,
    players,
    buildTournamentConfig,
    buildTournamentPreview,
    buildTournamentSeed,
    canUseTwoVsOne,
    clampTournamentCourtCount,
    courtCountLabel,
    courtCountValue,
    courtsDecBtn,
    courtsIncBtn,
    getMinPlayersForTournament,
    getTournamentMatchMode,
    reconcileTournamentDraft,
    validateTournamentAdvancedState,
}) {
    if (draft.gameMode !== "tournament") {
        draft.tournament.preview = null
        draft.tournament.buildConfig = null
        draft.tournament.previewError = ""
        draft.tournament.advancedError = ""
        return
    }

    reconcileTournamentDraft(draft.tournament, players)
    if (!canUseTwoVsOne(players, draft.tournament.teamSize)) {
        draft.tournament.allowNotStrictDoubles = false
    }
    clampTournamentCourtCount({
        draft,
        matchMode: getTournamentMatchMode(draft.tournament.teamSize),
        courtCountValue,
        courtCountLabel,
        courtsDecBtn,
        courtsIncBtn,
    })

    const buildConfig = buildTournamentConfig({
        tournamentDraft: draft.tournament,
        players,
    })
    const seed = buildTournamentSeed(players, buildConfig, draft.tournament.courtCount)
    draft.tournament.buildConfig = { ...buildConfig, seed }
    draft.tournament.advancedError =
        validateTournamentAdvancedState({ tournamentDraft: draft.tournament, selectedPlayers: players }) || ""

    const minPlayers = getMinPlayersForTournament(draft.tournament.teamSize, draft.tournament.allowNotStrictDoubles)
    if (players.length < minPlayers) {
        draft.tournament.preview = null
        draft.tournament.previewError = ""
        return
    }

    const preview = buildTournamentPreview({
        players,
        format: draft.tournament.buildConfig.format,
        teamSize: draft.tournament.buildConfig.teamSize,
        courtCount: draft.tournament.courtCount,
        courtHandling: draft.tournament.buildConfig.courtHandling,
        allowNotStrictDoubles: draft.tournament.buildConfig.allowNotStrictDoubles,
        seed,
        advanced: draft.tournament.buildConfig.advanced,
    })
    draft.tournament.preview = preview
    draft.tournament.previewError = preview.ok ? "" : preview.errors[0] || "Unable to build the tournament preview."
}

function getTournamentBlockingError(draft) {
    return draft.tournament.advancedError || draft.tournament.previewError || ""
}

export { getTournamentBlockingError, updateTournamentDerivedState }
