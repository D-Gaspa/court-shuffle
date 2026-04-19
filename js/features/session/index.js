import { buildTournamentPreview } from "../../domains/tournament/series/build.js"
import { syncCurrentPhaseToSession } from "../../domains/tournament/series/sync.js"
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
} from "../../domains/tournament/setup/index.js"
import { appendContinuationPhase, buildContinuationPhase } from "./continuation/build.js"
import { buildContinuationPrefill } from "./continuation/prefill.js"
import { launchSessionHistoryRemix } from "./history-remix.js"
import { renderActiveSession } from "./live/active.js"
import { resetGoTopButtonVisibility, syncGoTopButtonVisibility } from "./live/go-top.js"
import { canSaveSessionToHistory, endSession } from "./live/history.js"
import {
    initNavigation,
    onEndSessionClick,
    onNextRoundClick,
    onNextTournamentClick,
    onPrevRoundClick,
    onPrevTournamentClick,
    onSkipTournamentClick,
    onUndoTournamentClick,
} from "./live/navigation.js"
import { buildSelectedSession } from "./setup/build.js"
import { createSessionBuilderWithLoading } from "./setup/build-with-loading.js"
import { createSessionSetupController } from "./setup/logic/controller.js"
import { sessionSetupUi } from "./setup/logic/ui.js"
import { startSession } from "./setup/state/actions.js"
import { bindActiveSessionNavButtons, bindTournamentSeriesToggle } from "./setup/ui/bindings.js"
import {
    endSessionBtn,
    sessionActive,
    sessionSetup,
    tournamentSeriesNavToggleBtn,
    uiState,
} from "./setup/ui/elements.js"
import { hideSessionLoading, showSessionLoading, waitForNextPaint } from "./setup/ui/loading.js"
import { renderActiveSessionView, showSetupBaseSessionView, syncInitialGoTopButtonState } from "./setup/ui/render.js"
import { setTournamentSeriesNavCollapsedUi } from "./setup/ui/ui-state.js"

let globalState = null
let saveState = null
let askConfirm = null
let handleSessionSaved = null

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

function getPlayersInRosterOrder() {
    return setupController.getPlayersInRosterOrder(globalState)
}

function showSetupBaseView() {
    showSetupBaseSessionView({
        sessionSetup,
        sessionActive,
        uiState,
        resetGoTopButtonVisibility,
        tournamentSeriesNavToggleBtn,
    })
}

function renderCurrentActiveSession() {
    renderActiveSession(globalState, saveState, uiState)
}

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
        getPlayers: getPlayersInRosterOrder,
        onChange: refreshSessionView,
        showSetupBaseSessionView: showSetupBaseView,
    })
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

function appendContinuationFromSetup(players) {
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
}

function handleBuiltSessionStart(session) {
    globalState.activeSession = session
    saveState()
    refreshSessionView()
}

function bindSetupControls() {
    const buildSelectedSessionWithLoading = createSessionBuilderWithLoading({
        buildSelectedSession,
        hideSessionLoading,
        overlay: sessionSetupUi.sessionLoadingOverlay,
        message: sessionSetupUi.sessionLoadingMessage,
        showSessionLoading,
        waitForNextPaint,
    })

    setupController.bindControls({
        buildSelectedSession: buildSelectedSessionWithLoading,
        getRoster: () => globalState.roster,
        onChange: refreshSessionView,
        onContinuationStart: ({ players }) => appendContinuationFromSetup(players),
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
                getPlayers: getPlayersInRosterOrder,
                getTournamentBlockingError,
                getVisibleStepIds,
                onSessionStart: handleBuiltSessionStart,
            }),
    })
}

function launchHistoryRemix(session, action, switchView) {
    launchSessionHistoryRemix({
        action,
        askConfirm,
        canSaveSessionToHistory,
        endSession,
        roster: globalState.roster,
        saveState,
        session,
        setupController,
        state: globalState,
        switchView,
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
