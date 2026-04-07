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
    courtCountLabel,
    courtCountValue,
    courtHint,
    courtsDecBtn,
    courtsIncBtn,
    deselectAllBtn,
    endSessionBtn,
    modeHint,
    modeSelector,
    noRosterWarning,
    playerSelection,
    selectAllBtn,
    sessionActive,
    sessionBackBtn,
    sessionConfig,
    sessionNextBtn,
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
    tournamentAdvancedError,
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
        tournamentAdvancedError,
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
        onSessionStart: ({ draft, buildWizardState, getFinalStepId, getTournamentBlockingError, getVisibleStepIds }) =>
            startSession({
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
    setTournamentAdvancedHistorySource(() => ({
        history: globalState.history,
        archivedHistory: globalState.archivedHistory,
    }))

    bindSetupControls()
    bindActiveSessionControls(state, persistFn, confirmFn)
    syncInitialGoTopButtonState(globalState, uiState, syncGoTopButtonVisibility)
}

export { initSession, refreshSessionView }
