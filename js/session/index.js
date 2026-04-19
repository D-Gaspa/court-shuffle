import { buildHistoryRemixPrefill } from "../history/remix.js"
import { buildTournamentPreview } from "../tournament/series/build.js"
import { syncCurrentPhaseToSession } from "../tournament/series/sync.js"
import {
    buildTournamentConfig,
    canUseTwoVsOne,
    createDefaultTournamentDraft,
    getMinPlayersForTournament,
    getTournamentMatchMode,
    initTournamentSetup,
    reconcileTournamentDraft,
    renderTournamentSetup,
    setTournamentAdvancedHistorySource,
    validateTournamentAdvancedState,
} from "../tournament/setup.js"
import { renderActiveSession } from "./active/active.js"
import { resetGoTopButtonVisibility, syncGoTopButtonVisibility } from "./active/go-top-button.js"
import { canSaveSessionToHistory, endSession } from "./active/history.js"
import {
    initNavigation,
    onEndSessionClick,
    onNextRoundClick,
    onNextTournamentClick,
    onPrevRoundClick,
    onPrevTournamentClick,
    onSkipTournamentClick,
    onUndoTournamentClick,
} from "./active/navigation.js"
import { appendContinuationPhase, buildContinuationPhase } from "./continuation/build.js"
import { buildContinuationPrefill } from "./continuation/prefill.js"
import {
    endSessionBtn,
    sessionActive,
    sessionSetup,
    tournamentSeriesNavToggleBtn,
    uiState,
} from "./controller/elements.js"
import { hideSessionLoading, showSessionLoading, waitForNextPaint } from "./controller/loading.js"
import { createSessionSetupController } from "./controller/setup/controller.js"
import { sessionSetupUi } from "./controller/setup/ui.js"
import { bindActiveSessionNavButtons, bindTournamentSeriesToggle } from "./controller/view/bindings.js"
import {
    renderActiveSessionView,
    showSetupBaseSessionView,
    syncInitialGoTopButtonState,
} from "./controller/view/render.js"
import { setTournamentSeriesNavCollapsedUi } from "./controller/view/ui-state.js"
import { startSession } from "./controller/wizard/actions.js"
import { buildSelectedSession } from "./setup/build.js"

let globalState = null
let saveState = null
let askConfirm = null
let handleSessionSaved = null

function getSessionLoadingCopy(gameMode) {
    if (gameMode === "tournament") {
        return "Checking uniqueness rules, generating matchups, and preparing the session."
    }
    return "Balancing teams and preparing the session."
}

const setupController = createSessionSetupController({
    buildTournamentConfig,
    buildTournamentPreview,
    canUseTwoVsOne,
    createDefaultTournamentDraft,
    getMinPlayersForTournament,
    getTournamentMatchMode,
    initTournamentSetup,
    reconcileTournamentDraft,
    renderTournamentSetup,
    ui: sessionSetupUi,
    validateTournamentAdvancedState,
})

function refreshSessionView() {
    if (globalState.activeSession && !setupController.draft.continuation) {
        renderActiveSessionView({
            sessionSetup,
            sessionActive,
            globalState,
            saveState,
            uiState,
            renderActiveSession: renderCurrentActiveSession,
            syncGoTopButtonVisibility,
        })
        return
    }
    setupController.renderSetupWizard({
        state: globalState,
        getPlayers: () => setupController.getPlayersInRosterOrder(globalState),
        onChange: refreshSessionView,
        showSetupBaseSessionView: () =>
            showSetupBaseSessionView({
                sessionSetup,
                sessionActive,
                uiState,
                resetGoTopButtonVisibility,
                tournamentSeriesNavToggleBtn,
            }),
    })
}

function renderCurrentActiveSession() {
    renderActiveSession(globalState, saveState, uiState)
}

function launchContinuationSetup() {
    if (!globalState.activeSession) {
        return
    }
    const prefill = buildContinuationPrefill(globalState.activeSession, globalState.roster)
    if (!prefill) {
        return
    }
    setupController.applyExternalSetupPrefill(prefill)
    refreshSessionView()
}

function bindSetupControls() {
    const buildSelectedSessionWithLoading = async (options) => {
        showSessionLoading({
            overlay: sessionSetupUi.sessionLoadingOverlay,
            message: sessionSetupUi.sessionLoadingMessage,
            text: getSessionLoadingCopy(options.gameMode),
        })
        await waitForNextPaint()
        try {
            return buildSelectedSession(options)
        } finally {
            hideSessionLoading(sessionSetupUi.sessionLoadingOverlay)
        }
    }

    setupController.bindControls({
        buildSelectedSession: buildSelectedSessionWithLoading,
        getRoster: () => globalState.roster,
        onChange: refreshSessionView,
        onContinuationStart: ({ players }) => {
            const phase = buildContinuationPhase({
                session: globalState.activeSession,
                players,
                courtCount: setupController.draft.tournament.courtCount,
                allowNotStrictDoubles: setupController.draft.tournament.allowNotStrictDoubles,
            })
            if (!phase) {
                return
            }
            appendContinuationPhase(globalState.activeSession, phase)
            saveState()
            refreshSessionView()
        },
        onSessionStart: ({
            clearSetupNotice,
            draft,
            buildWizardState,
            getFinalStepId,
            getTournamentBlockingError,
            getVisibleStepIds,
        }) =>
            startSession({
                clearSetupNotice,
                draft,
                buildSelectedSession: buildSelectedSessionWithLoading,
                buildWizardState,
                getFinalStepId,
                getPlayers: () => setupController.getPlayersInRosterOrder(globalState),
                getTournamentBlockingError,
                getVisibleStepIds,
                onSessionStart: (session) => {
                    globalState.activeSession = session
                    saveState()
                    refreshSessionView()
                },
            }),
    })
}

function completeHistoryRemix(prefill, switchView) {
    setupController.applyExternalSetupPrefill(prefill)
    saveState()
    switchView("session")
}

function launchHistoryRemix(session, action, switchView) {
    const prefill = buildHistoryRemixPrefill(session, action, globalState.roster)
    const replace = (shouldSave) => {
        if (globalState.activeSession) {
            endSession(globalState, saveState, shouldSave)
        }
        completeHistoryRemix(prefill, switchView)
    }

    if (!globalState.activeSession) {
        completeHistoryRemix(prefill, switchView)
        return
    }

    if (canSaveSessionToHistory(globalState.activeSession)) {
        askConfirm(
            "Replace Active Session",
            "Save the current session to history before loading this remix?",
            () => replace(true),
            {
                okLabel: "Save & Replace",
                okClass: "btn-primary",
                extraLabel: "Discard & Replace",
                onExtra: () => replace(false),
            },
        )
        return
    }

    askConfirm("Replace Active Session", "Discard the current session and load this remix?", () => replace(false), {
        okLabel: "Discard & Replace",
        okClass: "btn-danger",
    })
}

function bindActiveSessionControls(state, persistFn, confirmFn) {
    bindActiveSessionNavButtons({
        uiState,
        onContinueSessionClick: launchContinuationSetup,
        onPrevRoundClick,
        onNextRoundClick,
        onUndoTournamentClick,
        onPrevTournamentClick,
        onNextTournamentClick,
        onSkipTournamentClick,
        endSessionBtn,
        onEndSessionClick,
    })
    bindTournamentSeriesToggle({ uiState, tournamentSeriesNavToggleBtn, setTournamentSeriesNavCollapsedUi })
    initNavigation({
        state,
        saveFn: persistFn,
        confirmFn,
        renderFn: renderCurrentActiveSession,
        refreshFn: refreshSessionView,
        onSessionSaved: handleSessionSaved,
    })
}

function initSession(state, persistFn, confirmFn, options = {}) {
    globalState = state
    saveState = persistFn
    askConfirm = confirmFn
    handleSessionSaved = options.onSessionSaved || null
    if (globalState.activeSession?.mode === "tournament") {
        syncCurrentPhaseToSession(globalState.activeSession)
    }
    setTournamentAdvancedHistorySource(() => ({
        history: globalState.history,
        archivedHistory: globalState.archivedHistory,
    }))

    bindSetupControls()
    bindActiveSessionControls(state, persistFn, confirmFn)
    syncInitialGoTopButtonState(globalState, uiState, syncGoTopButtonVisibility)
}

export { initSession, launchHistoryRemix, refreshSessionView }
