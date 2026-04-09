import { getStepCaption, MODE_HINTS } from "../wizard/state.js"

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
    }

    for (const panel of sessionStepPanels) {
        const stepId = panel.dataset.sessionStepPanel
        const isActive = stepId === draft.currentStep
        panel.hidden = !isActive
        panel.classList.toggle("is-active", isActive)
    }

    sessionStepCaption.textContent = getStepCaption(draft.currentStep, draft.gameMode)
    sessionBackBtn.disabled = currentIndex <= 0
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

export { renderFreeSetup, renderModeStep, renderSetupNotice, syncStepperUi }
