function buildTournamentSeedSignature(players, buildConfig, courtCount) {
    return JSON.stringify({
        players,
        format: buildConfig.format,
        teamSize: buildConfig.teamSize,
        courtCount,
        courtHandling: buildConfig.courtHandling,
        allowNotStrictDoubles: buildConfig.allowNotStrictDoubles,
        advanced: buildConfig.advanced,
    })
}

function resetTournamentDerivedState(draft) {
    draft.tournament.preview = null
    draft.tournament.buildConfig = null
    draft.tournament.previewError = ""
    draft.tournament.advancedError = ""
}

function syncStructuredDerivedState({
    canUseTwoVsOne,
    clampTournamentCourtCount,
    courtCountLabel,
    courtCountValue,
    courtsDecBtn,
    courtsIncBtn,
    draft,
    players,
}) {
    resetTournamentDerivedState(draft)
    const isStructuredMode = draft.gameMode === "singles" || draft.gameMode === "doubles"
    if (!isStructuredMode) {
        return
    }

    const isStructuredDoubles = draft.gameMode === "doubles"
    if (!(isStructuredDoubles && canUseTwoVsOne(players, 2))) {
        draft.structured.allowNotStrictDoubles = false
    }
    clampTournamentCourtCount({
        draft,
        matchMode: draft.gameMode,
        courtCountValue,
        courtCountLabel,
        courtsDecBtn,
        courtsIncBtn,
    })
}

function syncTournamentSeed(draft, players, buildConfig, buildTournamentSeed) {
    const seedSignature = buildTournamentSeedSignature(players, buildConfig, draft.tournament.courtCount)
    if (draft.tournament.seedOverride) {
        if (!draft.tournament.seedOverrideSignature) {
            draft.tournament.seedOverrideSignature = seedSignature
        } else if (draft.tournament.seedOverrideSignature !== seedSignature) {
            draft.tournament.seedOverride = null
            draft.tournament.seedOverrideSignature = ""
        }
    }

    return draft.tournament.seedOverride || buildTournamentSeed(players, buildConfig, draft.tournament.courtCount)
}

function syncTournamentBuildConfig({ buildTournamentConfig, buildTournamentSeed, draft, players }) {
    const buildConfig = buildTournamentConfig({
        tournamentDraft: draft.tournament,
        players,
    })
    const seed = syncTournamentSeed(draft, players, buildConfig, buildTournamentSeed)
    draft.tournament.buildConfig = { ...buildConfig, seed }
    return seed
}

function syncTournamentPreview({
    buildTournamentPreview,
    draft,
    getMinPlayersForTournament,
    players,
    seed,
    validateTournamentAdvancedState,
}) {
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
        syncStructuredDerivedState({
            canUseTwoVsOne,
            clampTournamentCourtCount,
            courtCountLabel,
            courtCountValue,
            courtsDecBtn,
            courtsIncBtn,
            draft,
            players,
        })
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

    const seed = syncTournamentBuildConfig({
        buildTournamentConfig,
        buildTournamentSeed,
        draft,
        players,
    })
    syncTournamentPreview({
        buildTournamentPreview,
        draft,
        getMinPlayersForTournament,
        players,
        seed,
        validateTournamentAdvancedState,
    })
}

function getTournamentBlockingError(draft) {
    return draft.tournament.advancedError || draft.tournament.previewError || ""
}

export { getTournamentBlockingError, updateTournamentDerivedState }
