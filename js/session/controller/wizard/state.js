import { getMinPlayersForTournament } from "../../../tournament/setup.js"

const MIN_SINGLES_PLAYERS_PER_COURT = 2
const MIN_FLEX_DOUBLES_PLAYERS_PER_COURT = 3
const MIN_STRICT_DOUBLES_PLAYERS_PER_COURT = 4

const MODE_HINTS = {
    default: "Choose free or tournament to unlock the setup step.",
    free: "Flexible shuffles for a quick session.",
    tournament: "Build a mini-tournament series with bracket controls.",
    singles: "Legacy 1v1 court rotation loaded from history.",
    doubles: "Legacy 2v2 court rotation loaded from history.",
}

const STEP_CAPTIONS = {
    roster: "Pick the roster for this session.",
    mode: "Choose the session style before configuring the details.",
    setup: {
        free: "Set team count for a free-form rotation.",
        tournament: "Set the tournament format, match type, and court count.",
        singles: "Review the preserved court rotation before starting again.",
        doubles: "Review the preserved court rotation before starting again.",
        default: "Choose the session style before configuring the setup.",
    },
    advanced: "Optional Round 1 overrides update the session draft live.",
}

function getStructuredMinPlayers(gameMode, structuredDraft) {
    if (gameMode === "singles") {
        return Math.max(MIN_SINGLES_PLAYERS_PER_COURT, MIN_SINGLES_PLAYERS_PER_COURT * structuredDraft.courtCount)
    }
    if (gameMode === "doubles") {
        const perCourt = structuredDraft.allowNotStrictDoubles
            ? MIN_FLEX_DOUBLES_PLAYERS_PER_COURT
            : MIN_STRICT_DOUBLES_PLAYERS_PER_COURT
        return Math.max(perCourt, perCourt * structuredDraft.courtCount)
    }
    return 0
}

function getStepCaption(currentStep, gameMode) {
    const caption = STEP_CAPTIONS[currentStep]
    return typeof caption === "string" ? caption : caption?.[gameMode] || caption?.default || ""
}

function hasContinuationRosterChange(draft) {
    const previousPlayers = new Set(draft?.continuation?.basePlayers || [])
    if (previousPlayers.size !== draft.selectedPlayers.size) {
        return true
    }
    for (const player of draft.selectedPlayers) {
        if (!previousPlayers.has(player)) {
            return true
        }
    }
    return false
}

function buildWizardState(draft, getTournamentBlockingError, getFinalStepId, getVisibleStepIds) {
    const selectedCount = draft.selectedPlayers.size
    const continuationRosterChanged = !draft.continuation || hasContinuationRosterChange(draft)
    const rosterComplete = selectedCount >= 2 && continuationRosterChanged
    const modeComplete =
        Boolean(draft.continuation) ||
        Boolean(draft.historySeed) ||
        ["free", "tournament", "singles", "doubles"].includes(draft.gameMode)
    const freeSetupComplete =
        rosterComplete && draft.free.teamCount >= 2 && draft.free.teamCount <= Math.max(2, selectedCount)
    const structuredSetupComplete = selectedCount >= getStructuredMinPlayers(draft.gameMode, draft.structured)
    const tournamentMinPlayers = getMinPlayersForTournament(
        draft.tournament.teamSize,
        draft.tournament.allowNotStrictDoubles,
    )
    const tournamentSetupComplete =
        selectedCount >= tournamentMinPlayers && Boolean(draft.tournament.preview?.ok) && continuationRosterChanged
    let setupComplete = false
    if (draft.gameMode === "tournament") {
        setupComplete = tournamentSetupComplete
    } else if (draft.gameMode === "free") {
        setupComplete = freeSetupComplete
    } else if (draft.gameMode === "singles" || draft.gameMode === "doubles") {
        setupComplete = structuredSetupComplete
    }
    const advancedComplete =
        draft.gameMode === "tournament" && setupComplete && getTournamentBlockingError().length === 0
    const visibleSteps = getVisibleStepIds(draft)
    let unlockedIndex = 0
    if (rosterComplete && visibleSteps.length > 1) {
        unlockedIndex = Math.min(1, visibleSteps.length - 1)
    }
    if (rosterComplete && modeComplete && visibleSteps.length > 2) {
        unlockedIndex = Math.min(2, visibleSteps.length - 1)
    }

    return {
        visibleSteps,
        finalStep: getFinalStepId(draft),
        completed: {
            roster: rosterComplete,
            mode: modeComplete,
            setup: setupComplete,
            advanced: advancedComplete,
        },
        unlockedIndex,
    }
}

function normalizeCurrentStep(draft, wizardState) {
    const currentIndex = wizardState.visibleSteps.indexOf(draft.currentStep)
    if (currentIndex === -1) {
        draft.currentStep =
            wizardState.visibleSteps[Math.min(wizardState.unlockedIndex, wizardState.visibleSteps.length - 1)]
        return
    }
    if (currentIndex > wizardState.unlockedIndex) {
        draft.currentStep = wizardState.visibleSteps[wizardState.unlockedIndex]
    }
}

export { MODE_HINTS, buildWizardState, getStepCaption, normalizeCurrentStep }
