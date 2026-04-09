import { buildHistoryRemixPrefill } from "../history/remix.js"
import { buildTournamentPreview } from "../tournament/series/build.js"
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
} from "./active/navigation.js"
import {
    allow2v1Checkbox,
    courtCountLabel,
    courtCountValue,
    courtHint,
    courtsConfig,
    courtsDecBtn,
    courtsIncBtn,
    deselectAllBtn,
    endSessionBtn,
    modeHint,
    modeSelector,
    noRosterWarning,
    notStrictDoublesGroup,
    playerSelection,
    selectAllBtn,
    sessionActive,
    sessionBackBtn,
    sessionConfig,
    sessionNextBtn,
    sessionSetup,
    sessionSetupNotice,
    sessionStepButtons,
    sessionStepCaption,
    sessionStepPanels,
    startSessionBtn,
    teamCountValue,
    teamSizeHint,
    teamsConfig,
    teamsDecBtn,
    teamsIncBtn,
    tournamentAdvancedError,
    tournamentConfig,
    tournamentDistributionGroup,
    tournamentDistributionHint,
    tournamentSeriesNavToggleBtn,
    tournamentSetupPanel,
    uiState,
} from "./controller/elements.js"
import { createSessionSetupController } from "./controller/setup/controller.js"
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
    ui: {
        courtCountLabel,
        courtCountValue,
        courtHint,
        courtsDecBtn,
        courtsIncBtn,
        deselectAllBtn,
        modeHint,
        modeSelector,
        noRosterWarning,
        playerSelection,
        selectAllBtn,
        sessionActive,
        sessionBackBtn,
        sessionConfig,
        sessionNextBtn,
        sessionSetupNotice,
        sessionSetup,
        sessionStepButtons,
        sessionStepCaption,
        sessionStepPanels,
        startSessionBtn,
        teamCountValue,
        teamSizeHint,
        teamsConfig,
        teamsDecBtn,
        teamsIncBtn,
        allow2v1Checkbox,
        courtsConfig,
        notStrictDoublesGroup,
        tournamentAdvancedError,
        tournamentConfig,
        tournamentDistributionGroup,
        tournamentDistributionHint,
        tournamentSetupPanel,
    },
    validateTournamentAdvancedState,
})

function refreshSessionView() {
    if (globalState.activeSession) {
        renderActiveSessionView({
            sessionSetup,
            sessionActive,
            globalState,
            saveState,
            uiState,
            renderActiveSession,
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

function bindSetupControls() {
    setupController.bindControls({
        buildSelectedSession,
        getRoster: () => globalState.roster,
        onChange: refreshSessionView,
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
                buildSelectedSession,
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
        onPrevRoundClick,
        onNextRoundClick,
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
        renderFn: () => renderActiveSession(globalState, saveState, uiState),
        refreshFn: refreshSessionView,
    })
}

function initSession(state, persistFn, confirmFn) {
    globalState = state
    saveState = persistFn
    askConfirm = confirmFn
    setTournamentAdvancedHistorySource(() => ({
        history: globalState.history,
        archivedHistory: globalState.archivedHistory,
    }))

    bindSetupControls()
    bindActiveSessionControls(state, persistFn, confirmFn)
    syncInitialGoTopButtonState(globalState, uiState, syncGoTopButtonVisibility)
}

export { initSession, launchHistoryRemix, refreshSessionView }
