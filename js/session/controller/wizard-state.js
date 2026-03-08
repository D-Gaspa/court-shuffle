import { getMinPlayersForTournament } from "../../tournament/setup.js"

const MODE_HINTS = {
    default: "Choose free or tournament to unlock the setup step.",
    free: "Flexible shuffles for a quick session.",
    tournament: "Build a mini-tournament series with bracket controls.",
}

const STEP_CAPTIONS = {
    roster: "Pick the roster for this session.",
    mode: "Choose the session style before configuring the details.",
    setup: {
        free: "Set team count for a free-form rotation.",
        tournament: "Set the tournament format, match type, and court count.",
        default: "Choose the session style before configuring the setup.",
    },
    advanced: "Optional Round 1 overrides update the session draft live.",
}

function getStepCaption(currentStep, gameMode) {
    const caption = STEP_CAPTIONS[currentStep]
    return typeof caption === "string" ? caption : caption?.[gameMode] || caption?.default || ""
}

function buildWizardState(draft, getTournamentBlockingError, getFinalStepId, getVisibleStepIds) {
    const selectedCount = draft.selectedPlayers.size
    const rosterComplete = selectedCount >= 2
    const modeComplete = draft.gameMode === "free" || draft.gameMode === "tournament"
    const freeSetupComplete =
        rosterComplete && draft.free.teamCount >= 2 && draft.free.teamCount <= Math.max(2, selectedCount)
    const tournamentMinPlayers = getMinPlayersForTournament(
        draft.tournament.teamSize,
        draft.tournament.allowNotStrictDoubles,
    )
    const tournamentSetupComplete = selectedCount >= tournamentMinPlayers && Boolean(draft.tournament.preview?.ok)
    let setupComplete = false
    if (draft.gameMode === "tournament") {
        setupComplete = tournamentSetupComplete
    } else if (draft.gameMode === "free") {
        setupComplete = freeSetupComplete
    }
    const advancedComplete =
        draft.gameMode === "tournament" && setupComplete && getTournamentBlockingError().length === 0
    const visibleSteps = getVisibleStepIds(draft.gameMode)
    let unlockedIndex = 0
    if (rosterComplete) {
        unlockedIndex = Math.min(1, visibleSteps.length - 1)
    }
    if (rosterComplete && modeComplete) {
        unlockedIndex = Math.min(2, visibleSteps.length - 1)
    }

    return {
        visibleSteps,
        finalStep: getFinalStepId(draft.gameMode),
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
