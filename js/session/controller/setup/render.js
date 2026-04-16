import { getStepCaption, MODE_HINTS } from "../wizard/state.js"

const DEFAULT_SETUP_TITLE = "New Session"
const DEFAULT_SETUP_SUBTITLE = "Pick who's playing today and configure teams."
const DEFAULT_START_LABEL = "Shuffle & Start"
const CONTINUATION_START_LABEL = "Start Roster Change"
const CONTINUATION_BACK_LABEL = "Cancel Continuation"
const DEFAULT_BACK_LABEL = "Back"

function buildContinuationPhaseTag(continuation) {
    const phaseIndex = continuation?.sourcePhaseIndex
    return Number.isInteger(phaseIndex) ? `Phase ${phaseIndex + 1}` : "Continuation"
}

function buildContinuationTournamentTag(continuation) {
    const tournamentIndex = continuation?.sourceTournamentIndex
    return Number.isInteger(tournamentIndex) ? `After Tournament ${tournamentIndex + 1}` : "Latest completion"
}

function buildContinuationDetail(setupNotice) {
    if (setupNotice) {
        return setupNotice
    }
    return "Make a real roster change, keep the locked tournament shape, and then start the next phase after the latest completed mini tournament."
}

function renderSetupShell({
    draft,
    sessionBackBtn,
    sessionConfig,
    sessionContinuationBanner,
    sessionContinuationDetail,
    sessionContinuationPhaseTag,
    sessionContinuationTitle,
    sessionContinuationTournamentTag,
    sessionSetupSubtitle,
    sessionSetupTitle,
    startSessionLabel,
}) {
    const isContinuation = Boolean(draft.continuation)
    sessionConfig.classList.toggle("is-continuation", isContinuation)
    sessionContinuationBanner.hidden = !isContinuation

    if (!isContinuation) {
        sessionSetupTitle.textContent = DEFAULT_SETUP_TITLE
        sessionSetupSubtitle.textContent = DEFAULT_SETUP_SUBTITLE
        sessionBackBtn.textContent = DEFAULT_BACK_LABEL
        startSessionLabel.textContent = DEFAULT_START_LABEL
        return
    }

    sessionSetupTitle.textContent = "Change Roster For Next Phase"
    sessionSetupSubtitle.textContent =
        "Add or remove players first, then create the next phase from the latest completed mini tournament."
    sessionContinuationTitle.textContent = "Roster change required before the next phase"
    sessionContinuationDetail.textContent = buildContinuationDetail(draft.setupNotice)
    sessionContinuationPhaseTag.textContent = buildContinuationPhaseTag(draft.continuation)
    sessionContinuationTournamentTag.textContent = buildContinuationTournamentTag(draft.continuation)
    startSessionLabel.textContent = CONTINUATION_START_LABEL
    sessionBackBtn.textContent = draft.currentStep === "roster" ? CONTINUATION_BACK_LABEL : DEFAULT_BACK_LABEL
}

function syncStepperUi({
    draft,
    wizardState,
    sessionStepButtons,
    sessionStepPanels,
    sessionStepCaption,
    sessionBackBtn,
    sessionNextBtn,
    startSessionBtn,
}) {
    const currentIndex = wizardState.visibleSteps.indexOf(draft.currentStep)
    const canCancelContinuation = Boolean(draft.continuation) && currentIndex <= 0
    for (const button of sessionStepButtons) {
        const stepId = button.dataset.sessionStep
        const visibleIndex = wizardState.visibleSteps.indexOf(stepId)
        const isVisible = visibleIndex !== -1
        const isActive = stepId === draft.currentStep
        const isComplete = wizardState.completed[stepId] === true
        const isLocked = !isVisible || visibleIndex > wizardState.unlockedIndex

        button.hidden = !isVisible
        button.disabled = isLocked
        button.classList.toggle("is-active", isActive)
        button.classList.toggle("is-complete", isComplete && !isActive)
        button.classList.toggle("is-locked", isLocked)
        button.setAttribute("aria-selected", String(isActive))
        const indexElement = button.querySelector(".session-step-index")
        if (indexElement && isVisible) {
            indexElement.textContent = String(visibleIndex + 1)
        }
    }

    for (const panel of sessionStepPanels) {
        const stepId = panel.dataset.sessionStepPanel
        const isActive = stepId === draft.currentStep
        panel.hidden = !isActive
        panel.classList.toggle("is-active", isActive)
    }

    sessionStepCaption.textContent = getStepCaption(draft.currentStep, draft.gameMode)
    sessionBackBtn.disabled = currentIndex <= 0 && !canCancelContinuation
    const isFinalStep = draft.currentStep === wizardState.finalStep
    sessionNextBtn.hidden = isFinalStep
    startSessionBtn.hidden = !isFinalStep

    const currentComplete = wizardState.completed[draft.currentStep] === true
    sessionNextBtn.disabled = !currentComplete
    startSessionBtn.disabled = !currentComplete
}

function renderModeStep({ draft, modeHint, modeSelector }) {
    modeHint.textContent = MODE_HINTS[draft.gameMode] || MODE_HINTS.default || ""
    for (const button of modeSelector.querySelectorAll(".mode-btn")) {
        button.classList.toggle("selected", button.dataset.mode === draft.gameMode)
    }
}

function renderFreeSetup({
    draft,
    teamsConfig,
    teamCountValue,
    teamsDecBtn,
    teamsIncBtn,
    teamSizeHint,
    updateTeamSizeHint,
}) {
    const selectedCount = draft.selectedPlayers.size
    teamsConfig.hidden = false
    teamCountValue.textContent = draft.free.teamCount
    teamsDecBtn.disabled = draft.free.teamCount <= 2
    teamsIncBtn.disabled = draft.free.teamCount >= selectedCount || selectedCount < 2
    updateTeamSizeHint(selectedCount, draft.free.teamCount, teamSizeHint)
}

function renderSetupNotice(setupNotice, noticeElement) {
    noticeElement.hidden = !setupNotice
    noticeElement.textContent = setupNotice || ""
}

export { renderFreeSetup, renderModeStep, renderSetupNotice, renderSetupShell, syncStepperUi }
