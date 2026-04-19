import { cloneAdvancedSettings } from "../../../tournament/setup/advanced/model/index.js"

function createDefaultStructuredDraft() {
    return {
        courtCount: 1,
        allowNotStrictDoubles: false,
    }
}

function createSessionSetupDraft(createDefaultTournamentDraft) {
    return {
        currentStep: "roster",
        selectedPlayers: new Set(),
        gameMode: null,
        setupNotice: "",
        continuation: null,
        historySeed: null,
        nightLink: {
            enabled: false,
            previousSessionId: null,
        },
        free: {
            teamCount: 2,
        },
        structured: createDefaultStructuredDraft(),
        tournament: createDefaultTournamentDraft(),
    }
}

function getVisibleStepIds(draft) {
    if (draft?.continuation || draft?.historySeed) {
        return ["roster", "setup"]
    }
    return ["roster", "mode", "setup"]
}

function getFinalStepId() {
    return "setup"
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

function applySessionSetupPrefill(draft, prefill, createDefaultTournamentDraft) {
    const tournamentDefaults = createDefaultTournamentDraft()
    draft.currentStep = prefill.currentStep || "setup"
    draft.selectedPlayers = new Set(prefill.selectedPlayers || [])
    draft.gameMode = prefill.gameMode || null
    draft.setupNotice = prefill.notice || ""
    draft.continuation = prefill.continuation || null
    draft.historySeed = prefill.historySeed || null
    draft.nightLink = {
        enabled: Boolean(prefill.nightLink?.enabled),
        previousSessionId: prefill.nightLink?.previousSessionId || null,
    }
    draft.free = {
        teamCount: prefill.free?.teamCount || 2,
    }
    draft.structured = {
        ...createDefaultStructuredDraft(),
        ...prefill.structured,
    }
    draft.tournament = {
        ...tournamentDefaults,
        ...prefill.tournament,
        advanced: cloneAdvancedSettings(prefill.tournament?.advanced || tournamentDefaults.advanced),
        preview: null,
        buildConfig: null,
        previewError: "",
        advancedError: "",
        seedOverride: prefill.tournament?.seedOverride || null,
        seedOverrideSignature: prefill.tournament?.seedOverrideSignature || "",
    }
    clampFreeTeamCount(draft)
}

function clearSessionSetupNotice(draft) {
    draft.setupNotice = ""
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

    const visibleStepIds = getVisibleStepIds(draft)
    if (!visibleStepIds.includes(draft.currentStep)) {
        draft.currentStep = getFinalStepId(draft)
    }
}

export {
    applySessionSetupPrefill,
    clampFreeTeamCount,
    clearSessionSetupNotice,
    createDefaultStructuredDraft,
    createSessionSetupDraft,
    getFinalStepId,
    getVisibleStepIds,
    reconcileDraftWithRoster,
}
