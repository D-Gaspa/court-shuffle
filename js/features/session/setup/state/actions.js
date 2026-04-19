function moveStep({
    draft,
    direction,
    buildWizardState,
    getTournamentBlockingError,
    getFinalStepId,
    getVisibleStepIds,
    onCancelContinuation,
    onCancelHistorySeed,
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
        if (direction < 0 && nextIndex < 0 && draft.continuation && onCancelContinuation) {
            onCancelContinuation()
        } else if (direction < 0 && nextIndex < 0 && draft.historySeed && onCancelHistorySeed) {
            onCancelHistorySeed()
        }
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
            if (draft.continuation?.lockedFields?.format || draft.historySeed?.lockedFields?.format) {
                break
            }
            draft.tournament.format = action.value
            break
        case "team-size":
            if (draft.continuation?.lockedFields?.teamSize || draft.historySeed?.lockedFields?.teamSize) {
                break
            }
            draft.tournament.teamSize = action.value
            break
        case "allow-2v1":
            if (draft.historySeed?.lockedFields?.allowNotStrictDoubles && draft.gameMode === "tournament") {
                break
            }
            if (draft.gameMode === "doubles") {
                draft.structured.allowNotStrictDoubles = Boolean(action.value)
            } else {
                draft.tournament.allowNotStrictDoubles = Boolean(action.value)
            }
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
async function startSession({
    draft,
    buildSelectedSession,
    buildWizardState,
    clearSetupNotice,
    getFinalStepId,
    getPlayers,
    getTournamentBlockingError,
    getVisibleStepIds,
    onContinuationStart,
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

    const session = await buildSelectedSession({
        players,
        gameMode: draft.gameMode,
        teamCount: draft.free.teamCount,
        courtCount: draft.gameMode === "tournament" ? draft.tournament.courtCount : draft.structured.courtCount,
        allowNotStrict:
            draft.gameMode === "doubles"
                ? draft.structured.allowNotStrictDoubles
                : draft.tournament.allowNotStrictDoubles,
        night:
            draft.gameMode === "tournament" && draft.nightLink?.enabled && draft.nightLink?.previousSessionId
                ? { previousSessionId: draft.nightLink.previousSessionId }
                : null,
        tournamentConfig: draft.tournament.buildConfig,
    })
    if (session) {
        const { continuation } = draft
        clearSetupNotice()
        draft.continuation = null
        draft.historySeed = null
        draft.nightLink = {
            enabled: false,
            previousSessionId: null,
        }
        if (continuation && onContinuationStart) {
            onContinuationStart({ continuation, players, sessionDraft: session })
            return
        }
        onSessionStart(session)
    }
}
function bindRosterControls({ selectAllBtn, deselectAllBtn, draft, getRoster, refreshSessionView }) {
    selectAllBtn.addEventListener("click", () => {
        if (draft.historySeed?.lockedFields?.roster) {
            return
        }
        draft.selectedPlayers = new Set(getRoster())
        refreshSessionView()
    })
    deselectAllBtn.addEventListener("click", () => {
        if (draft.historySeed?.lockedFields?.roster) {
            return
        }
        draft.selectedPlayers = new Set()
        refreshSessionView()
    })
}
function bindModeControls({ modeSelector, setGameMode, refreshSessionView }) {
    for (const button of modeSelector.querySelectorAll(".mode-btn")) {
        button.addEventListener("click", () => {
            setGameMode(button.dataset.mode)
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
        if ((draft.continuation || draft.historySeed?.lockedFields?.courtCount) && draft.gameMode === "tournament") {
            return
        }
        const courtCountTarget = draft.gameMode === "tournament" ? draft.tournament : draft.structured
        if (courtCountTarget.courtCount <= 1) {
            return
        }
        courtCountTarget.courtCount -= 1
        refreshSessionView()
    })
    courtsIncBtn.addEventListener("click", () => {
        if ((draft.continuation || draft.historySeed?.lockedFields?.courtCount) && draft.gameMode === "tournament") {
            return
        }
        const courtCountTarget = draft.gameMode === "tournament" ? draft.tournament : draft.structured
        courtCountTarget.courtCount += 1
        refreshSessionView()
    })
}

function bindWizardNavigation({
    buildWizardState,
    draft,
    getFinalStepId,
    getTournamentBlockingError,
    getVisibleStepIds,
    onCancelContinuation,
    onCancelHistorySeed,
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
            onCancelContinuation,
            onCancelHistorySeed,
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
    deselectAllBtn,
    draft,
    getFinalStepId,
    getRoster,
    getTournamentBlockingError,
    getVisibleStepIds,
    initTournamentSetup,
    linkPreviousNightCheckbox,
    modeSelector,
    onCancelContinuation,
    onCancelHistorySeed,
    onStartSession,
    refreshSessionView,
    selectAllBtn,
    sessionBackBtn,
    sessionNextBtn,
    sessionPrefillCancelBtn,
    sessionStepButtons,
    setCurrentStep,
    setGameMode,
    startSessionBtn,
    teamsDecBtn,
    teamsIncBtn,
    onTournamentAction,
}) {
    bindRosterControls({ selectAllBtn, deselectAllBtn, draft, getRoster, refreshSessionView })
    bindModeControls({ modeSelector, setGameMode, refreshSessionView })
    bindCountControls({ draft, teamsDecBtn, teamsIncBtn, courtsDecBtn, courtsIncBtn, refreshSessionView })
    linkPreviousNightCheckbox?.addEventListener("change", () => {
        draft.nightLink.enabled = Boolean(linkPreviousNightCheckbox.checked)
        refreshSessionView()
    })
    bindWizardNavigation({
        buildWizardState,
        draft,
        getFinalStepId,
        getTournamentBlockingError,
        getVisibleStepIds,
        onCancelContinuation,
        onCancelHistorySeed,
        sessionBackBtn,
        sessionNextBtn,
        sessionStepButtons,
        setCurrentStep,
    })
    sessionPrefillCancelBtn?.addEventListener("click", () => {
        if (draft.historySeed && onCancelHistorySeed) {
            onCancelHistorySeed()
        }
    })
    startSessionBtn.addEventListener("click", onStartSession)
    initTournamentSetup({ onChange: onTournamentAction })
}

export { applyTournamentAction, bindWizardControls, startSession }
