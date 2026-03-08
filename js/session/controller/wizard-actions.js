function moveStep({
    draft,
    direction,
    buildWizardState,
    getTournamentBlockingError,
    getFinalStepId,
    getVisibleStepIds,
    setCurrentStep,
}) {
    const wizardState = buildWizardState(
        draft,
        () => getTournamentBlockingError(draft),
        getFinalStepId,
        getVisibleStepIds,
    )
    const currentIndex = wizardState.visibleSteps.indexOf(draft.currentStep)
    const nextIndex = currentIndex + direction
    if (nextIndex < 0 || nextIndex >= wizardState.visibleSteps.length) {
        return
    }
    if (direction > 0 && wizardState.completed[draft.currentStep] !== true) {
        return
    }
    if (direction > 0 && nextIndex > wizardState.unlockedIndex) {
        return
    }
    setCurrentStep(wizardState.visibleSteps[nextIndex])
}

function applyTournamentAction(draft, action) {
    if (!action || typeof action !== "object") {
        return
    }

    switch (action.type) {
        case "format":
            draft.tournament.format = action.value
            break
        case "team-size":
            draft.tournament.teamSize = action.value
            break
        case "allow-2v1":
            draft.tournament.allowNotStrictDoubles = Boolean(action.value)
            break
        case "add-singles-matchup":
            draft.tournament.advanced.singlesOpeningMatchups.push(["", ""])
            break
        case "add-doubles-pair":
            draft.tournament.advanced.doublesLockedPairs.push(["", ""])
            break
        case "replace-advanced":
            draft.tournament.advanced = action.value
            break
        default:
            break
    }
}

function startSession({
    draft,
    buildSelectedSession,
    buildWizardState,
    getFinalStepId,
    getPlayers,
    getTournamentBlockingError,
    getVisibleStepIds,
    onSessionStart,
}) {
    const players = getPlayers()
    const wizardState = buildWizardState(
        draft,
        () => getTournamentBlockingError(draft),
        getFinalStepId,
        getVisibleStepIds,
    )
    if (draft.currentStep !== wizardState.finalStep || wizardState.completed[draft.currentStep] !== true) {
        return
    }

    const session = buildSelectedSession({
        players,
        gameMode: draft.gameMode,
        teamCount: draft.free.teamCount,
        courtCount: draft.gameMode === "tournament" ? draft.tournament.courtCount : 1,
        allowNotStrict: draft.tournament.allowNotStrictDoubles,
        tournamentConfig: draft.tournament.buildConfig,
    })
    if (session) {
        onSessionStart(session)
    }
}

function bindRosterControls({ selectAllBtn, deselectAllBtn, draft, getRoster, refreshSessionView }) {
    selectAllBtn.addEventListener("click", () => {
        draft.selectedPlayers = new Set(getRoster())
        refreshSessionView()
    })
    deselectAllBtn.addEventListener("click", () => {
        draft.selectedPlayers = new Set()
        refreshSessionView()
    })
}

function bindModeControls({ modeSelector, draft, createDefaultTournamentDraft, setGameMode, refreshSessionView }) {
    for (const button of modeSelector.querySelectorAll(".mode-btn")) {
        button.addEventListener("click", () => {
            setGameMode(draft, button.dataset.mode, createDefaultTournamentDraft)
            refreshSessionView()
        })
    }
}

function bindCountControls({ draft, teamsDecBtn, teamsIncBtn, courtsDecBtn, courtsIncBtn, refreshSessionView }) {
    teamsDecBtn.addEventListener("click", () => {
        if (draft.free.teamCount <= 2) {
            return
        }
        draft.free.teamCount -= 1
        refreshSessionView()
    })
    teamsIncBtn.addEventListener("click", () => {
        if (draft.free.teamCount >= draft.selectedPlayers.size) {
            return
        }
        draft.free.teamCount += 1
        refreshSessionView()
    })

    courtsDecBtn.addEventListener("click", () => {
        if (draft.tournament.courtCount <= 1) {
            return
        }
        draft.tournament.courtCount -= 1
        refreshSessionView()
    })
    courtsIncBtn.addEventListener("click", () => {
        draft.tournament.courtCount += 1
        refreshSessionView()
    })
}

function bindWizardNavigation({
    buildWizardState,
    draft,
    getFinalStepId,
    getTournamentBlockingError,
    getVisibleStepIds,
    sessionBackBtn,
    sessionNextBtn,
    sessionStepButtons,
    setCurrentStep,
}) {
    const buildMoveHandler = (direction) => () =>
        moveStep({
            draft,
            direction,
            buildWizardState,
            getTournamentBlockingError,
            getFinalStepId,
            getVisibleStepIds,
            setCurrentStep,
        })

    sessionBackBtn.addEventListener("click", buildMoveHandler(-1))
    sessionNextBtn.addEventListener("click", buildMoveHandler(1))

    for (const button of sessionStepButtons) {
        button.addEventListener("click", () => {
            const wizardState = buildWizardState(
                draft,
                () => getTournamentBlockingError(draft),
                getFinalStepId,
                getVisibleStepIds,
            )
            const targetStep = button.dataset.sessionStep
            const targetIndex = wizardState.visibleSteps.indexOf(targetStep)
            if (targetIndex === -1 || targetIndex > wizardState.unlockedIndex) {
                return
            }
            setCurrentStep(targetStep)
        })
    }
}

function bindWizardControls({
    buildWizardState,
    courtsDecBtn,
    courtsIncBtn,
    createDefaultTournamentDraft,
    deselectAllBtn,
    draft,
    getFinalStepId,
    getRoster,
    getTournamentBlockingError,
    getVisibleStepIds,
    initTournamentSetup,
    modeSelector,
    onStartSession,
    refreshSessionView,
    selectAllBtn,
    sessionBackBtn,
    sessionNextBtn,
    sessionStepButtons,
    setCurrentStep,
    setGameMode,
    startSessionBtn,
    teamsDecBtn,
    teamsIncBtn,
    onTournamentAction,
}) {
    bindRosterControls({ selectAllBtn, deselectAllBtn, draft, getRoster, refreshSessionView })
    bindModeControls({ modeSelector, draft, createDefaultTournamentDraft, setGameMode, refreshSessionView })
    bindCountControls({ draft, teamsDecBtn, teamsIncBtn, courtsDecBtn, courtsIncBtn, refreshSessionView })
    bindWizardNavigation({
        buildWizardState,
        draft,
        getFinalStepId,
        getTournamentBlockingError,
        getVisibleStepIds,
        sessionBackBtn,
        sessionNextBtn,
        sessionStepButtons,
        setCurrentStep,
    })
    startSessionBtn.addEventListener("click", onStartSession)
    initTournamentSetup({ onChange: onTournamentAction })
}

export { applyTournamentAction, bindWizardControls, startSession }
