function createSessionSetupDraft(createDefaultTournamentDraft) {
    return {
        currentStep: "roster",
        selectedPlayers: new Set(),
        gameMode: null,
        free: {
            teamCount: 2,
        },
        tournament: createDefaultTournamentDraft(),
    }
}

function getVisibleStepIds(_gameMode) {
    return ["roster", "mode", "setup"]
}

function getFinalStepId(_gameMode) {
    return "setup"
}

function resetTournamentDraft(draft, createDefaultTournamentDraft) {
    draft.tournament = createDefaultTournamentDraft()
}

function setGameMode(draft, nextMode, createDefaultTournamentDraft) {
    if (draft.gameMode === nextMode) {
        return
    }
    draft.gameMode = nextMode
    if (nextMode !== "tournament") {
        resetTournamentDraft(draft, createDefaultTournamentDraft)
    }
}

function clampFreeTeamCount(draft) {
    const selectedCount = draft.selectedPlayers.size
    const maxTeams = Math.max(2, selectedCount)
    if (draft.free.teamCount > maxTeams) {
        draft.free.teamCount = maxTeams
    }
    if (draft.free.teamCount < 2) {
        draft.free.teamCount = 2
    }
}

function reconcileDraftWithRoster(draft, roster, reconcileTournamentDraft) {
    const nextSelectedPlayers = new Set()
    for (const player of draft.selectedPlayers) {
        if (roster.includes(player)) {
            nextSelectedPlayers.add(player)
        }
    }
    draft.selectedPlayers = nextSelectedPlayers
    clampFreeTeamCount(draft)
    reconcileTournamentDraft(draft.tournament, [...draft.selectedPlayers])

    const visibleStepIds = getVisibleStepIds(draft.gameMode)
    if (!visibleStepIds.includes(draft.currentStep)) {
        draft.currentStep = getFinalStepId(draft.gameMode)
    }
}

export {
    clampFreeTeamCount,
    createSessionSetupDraft,
    getFinalStepId,
    getVisibleStepIds,
    reconcileDraftWithRoster,
    setGameMode,
}
