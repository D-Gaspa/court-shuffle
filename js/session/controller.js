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
import { renderPlayerSelection, updateTeamSizeHint } from "./active/render.js"
import { bindActiveSessionNavButtons, bindTournamentSeriesToggle } from "./controller/bindings.js"
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
import {
    createSessionSetupDraft,
    getFinalStepId,
    getVisibleStepIds,
    reconcileDraftWithRoster,
    setGameMode,
} from "./controller/setup-draft.js"
import { renderSetupStep } from "./controller/setup-panels.js"
import { renderFreeSetup, renderModeStep, syncStepperUi } from "./controller/setup-render.js"
import { clampTournamentCourtCount, updateCourtHint } from "./controller/tournament-courts.js"
import { getTournamentBlockingError, updateTournamentDerivedState } from "./controller/tournament-derived.js"
import {
    buildTournamentSeed,
    clearTournamentDistribution,
    renderTournamentDistributionSummary,
    showTournamentPreviewError,
    showTournamentPreviewPendingState,
} from "./controller/tournament-preview.js"
import { setTournamentSeriesNavCollapsedUi } from "./controller/ui.js"
import {
    renderActiveSessionView,
    showSetupBaseSessionView,
    syncInitialGoTopButtonState,
} from "./controller/view-helpers.js"
import { applyTournamentAction, bindWizardControls, startSession } from "./controller/wizard-actions.js"
import { buildWizardState, normalizeCurrentStep } from "./controller/wizard-state.js"
import { buildSelectedSession } from "./setup/build.js"

const sessionSetupDraft = createSessionSetupDraft(createDefaultTournamentDraft)
let globalState = null
let saveState = null

const getSelectedPlayersInRosterOrder = () =>
    globalState.roster.filter((player) => sessionSetupDraft.selectedPlayers.has(player))

function buildCurrentWizardState() {
    return buildWizardState(
        sessionSetupDraft,
        () => getTournamentBlockingError(sessionSetupDraft),
        getFinalStepId,
        getVisibleStepIds,
    )
}

function getNormalizedWizardState() {
    reconcileDraftWithRoster(sessionSetupDraft, globalState.roster, reconcileTournamentDraft)
    updateTournamentDerivedState({
        draft: sessionSetupDraft,
        players: getSelectedPlayersInRosterOrder(),
        buildTournamentConfig,
        buildTournamentPreview,
        buildTournamentSeed,
        canUseTwoVsOne,
        clampTournamentCourtCount,
        courtCountLabel,
        courtCountValue,
        courtsDecBtn,
        courtsIncBtn,
        getMinPlayersForTournament,
        getTournamentMatchMode,
        reconcileTournamentDraft,
        validateTournamentAdvancedState,
    })

    const wizardState = buildCurrentWizardState()
    normalizeCurrentStep(sessionSetupDraft, wizardState)
    return buildCurrentWizardState()
}

function renderWizardContent(normalizedWizardState) {
    noRosterWarning.hidden = true
    sessionConfig.hidden = false
    renderPlayerSelection(globalState.roster, sessionSetupDraft.selectedPlayers, playerSelection, refreshSessionView)
    renderModeStep({ draft: sessionSetupDraft, modeHint, modeSelector })
    renderSetupStep({
        clearTournamentDistribution,
        draft: sessionSetupDraft,
        handleTournamentAction,
        courtHint,
        getPlayers: getSelectedPlayersInRosterOrder,
        getMinPlayersForTournament,
        getTournamentMatchMode,
        renderFreeSetup: (sessionTeamRenderContext) =>
            renderFreeSetup({
                ...sessionTeamRenderContext,
                updateTeamSizeHint,
            }),
        renderTournamentDistributionSummary,
        renderTournamentSetup,
        sessionTeamRenderContext: {
            draft: sessionSetupDraft,
            teamsConfig,
            teamCountValue,
            teamsDecBtn,
            teamsIncBtn,
            teamSizeHint,
        },
        showTournamentPreviewError,
        showTournamentPreviewPendingState,
        teamSizeHint,
        teamsConfig,
        tournamentAdvancedError,
        tournamentDistributionGroup,
        tournamentDistributionHint,
        tournamentSetupPanel,
        updateCourtHint,
    })
    syncStepperUi({
        draft: sessionSetupDraft,
        wizardState: normalizedWizardState,
        sessionStepButtons,
        sessionStepPanels,
        sessionStepCaption,
        sessionBackBtn,
        sessionNextBtn,
        startSessionBtn,
    })
}

function renderSetupWizard() {
    showSetupBaseSessionView({
        sessionSetup,
        sessionActive,
        uiState,
        resetGoTopButtonVisibility,
        tournamentSeriesNavToggleBtn,
    })
    if (globalState.roster.length < 2) {
        noRosterWarning.hidden = false
        sessionConfig.hidden = true
        return
    }
    renderWizardContent(getNormalizedWizardState())
}

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
    renderSetupWizard()
}

const setCurrentStep = (stepId) => {
    sessionSetupDraft.currentStep = stepId
    refreshSessionView()
}

const handleTournamentAction = (action) => {
    applyTournamentAction(sessionSetupDraft, action)
    refreshSessionView()
}

function bindSetupControls() {
    bindWizardControls({
        buildWizardState,
        courtsDecBtn,
        courtsIncBtn,
        createDefaultTournamentDraft,
        deselectAllBtn,
        draft: sessionSetupDraft,
        getFinalStepId,
        getRoster: () => globalState.roster,
        getTournamentBlockingError,
        getVisibleStepIds,
        initTournamentSetup,
        modeSelector,
        onStartSession: () =>
            startSession({
                draft: sessionSetupDraft,
                buildSelectedSession,
                buildWizardState,
                getFinalStepId,
                getPlayers: getSelectedPlayersInRosterOrder,
                getTournamentBlockingError,
                getVisibleStepIds,
                onSessionStart: (session) => {
                    globalState.activeSession = session
                    saveState()
                    refreshSessionView()
                },
            }),
        onTournamentAction: handleTournamentAction,
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
