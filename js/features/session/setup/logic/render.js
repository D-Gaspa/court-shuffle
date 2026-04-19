import { canSessionsShareNight, compareHistoryEntries } from "../../../history/groups/model.js"
import { getStepCaption, MODE_HINTS } from "../state/state.js"

const DEFAULT_SETUP_TITLE = "New Session"
const DEFAULT_SETUP_SUBTITLE = "Pick who's playing today and configure teams."
const DEFAULT_START_LABEL = "Shuffle & Start"
const CONTINUATION_START_LABEL = "Start Roster Change"
const CONTINUATION_BACK_LABEL = "Cancel Continuation"
const HISTORY_SEED_CANCEL_LABEL = "Back"
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

function buildHistorySeedTitle(historySeed) {
    return historySeed?.variant === "same-seed"
        ? "Saved seed locked from history"
        : "Saved settings loaded from history"
}

function buildHistorySeedSubtitle(historySeed) {
    return historySeed?.variant === "same-seed"
        ? "Review the roster and start a new tournament session with the original saved seed."
        : "Review the roster and start a new tournament session with the saved tournament settings."
}

function buildHistorySeedKicker(historySeed) {
    return historySeed?.variant === "same-seed" ? "Same Seed" : "Reuse Settings"
}

function buildHistorySeedStartLabel(historySeed) {
    return historySeed?.variant === "same-seed" ? "Start Saved Seed" : "Start Fresh Seed"
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
    sessionPrefillCancelBtn,
    sessionSetupSubtitle,
    sessionSetupTitle,
    startSessionLabel,
}) {
    const isContinuation = Boolean(draft.continuation)
    const isHistorySeed = Boolean(draft.historySeed)
    sessionConfig.classList.toggle("is-continuation", isContinuation)
    sessionConfig.classList.toggle("is-history-seed", isHistorySeed)
    sessionContinuationBanner.hidden = !(isContinuation || isHistorySeed)
    sessionPrefillCancelBtn.hidden = !isHistorySeed

    if (!(isContinuation || isHistorySeed)) {
        sessionSetupTitle.textContent = DEFAULT_SETUP_TITLE
        sessionSetupSubtitle.textContent = DEFAULT_SETUP_SUBTITLE
        sessionBackBtn.textContent = DEFAULT_BACK_LABEL
        startSessionLabel.textContent = DEFAULT_START_LABEL
        return
    }

    if (isContinuation) {
        sessionSetupTitle.textContent = "Change Roster For Next Phase"
        sessionSetupSubtitle.textContent =
            "Add or remove players first, then create the next phase from the latest completed mini tournament."
        sessionContinuationBanner.querySelector(".session-continuation-kicker").textContent = "Continuation Phase"
        sessionContinuationTitle.textContent = "Roster change required before the next phase"
        sessionContinuationDetail.textContent = buildContinuationDetail(draft.setupNotice)
        sessionContinuationPhaseTag.textContent = buildContinuationPhaseTag(draft.continuation)
        sessionContinuationTournamentTag.textContent = buildContinuationTournamentTag(draft.continuation)
        startSessionLabel.textContent = CONTINUATION_START_LABEL
        sessionBackBtn.textContent = draft.currentStep === "roster" ? CONTINUATION_BACK_LABEL : DEFAULT_BACK_LABEL
        return
    }

    sessionSetupTitle.textContent = buildHistorySeedTitle(draft.historySeed)
    sessionSetupSubtitle.textContent = buildHistorySeedSubtitle(draft.historySeed)
    sessionContinuationBanner.querySelector(".session-continuation-kicker").textContent = buildHistorySeedKicker(
        draft.historySeed,
    )
    sessionContinuationTitle.textContent = buildHistorySeedTitle(draft.historySeed)
    sessionContinuationDetail.textContent = draft.historySeed?.detail || ""
    sessionContinuationPhaseTag.textContent = draft.historySeed?.sourceLabel || "Saved Session"
    sessionContinuationTournamentTag.textContent =
        draft.historySeed?.variant === "same-seed" ? "Original Seed Locked" : "Fresh Seed On Start"
    startSessionLabel.textContent = buildHistorySeedStartLabel(draft.historySeed)
    sessionBackBtn.textContent = HISTORY_SEED_CANCEL_LABEL
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
    const canCancelHistorySeed = Boolean(draft.historySeed) && currentIndex <= 0
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
    sessionBackBtn.disabled = currentIndex <= 0 && !canCancelContinuation && !canCancelHistorySeed
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

function getLatestSavedSession(history) {
    const committed = (history || []).filter((entry) => entry && entry.provisional !== true)
    if (committed.length === 0) {
        return null
    }
    return [...committed].sort(compareHistoryEntries).at(-1) || null
}

function renderNightLinkSetup({ draft, history, nightLinkGroup, nightLinkHint, linkPreviousNightCheckbox }) {
    const latestSavedSession = getLatestSavedSession(history)
    const canLink =
        draft.gameMode === "tournament" &&
        latestSavedSession &&
        canSessionsShareNight(latestSavedSession, {
            mode: "tournament",
            tournamentTeamSize: draft.tournament.teamSize,
        })

    if (!canLink) {
        draft.nightLink.enabled = false
        draft.nightLink.previousSessionId = null
        nightLinkGroup.hidden = true
        linkPreviousNightCheckbox.checked = false
        nightLinkHint.textContent = ""
        return
    }

    draft.nightLink.previousSessionId = latestSavedSession.id
    nightLinkGroup.hidden = false
    linkPreviousNightCheckbox.checked = Boolean(draft.nightLink.enabled)
    nightLinkHint.textContent = `Continue the latest saved ${draft.tournament.teamSize === 1 ? "singles" : "doubles"} night from ${new Date(latestSavedSession.date).toLocaleDateString()}.`
}

export { renderFreeSetup, renderModeStep, renderNightLinkSetup, renderSetupNotice, renderSetupShell, syncStepperUi }
