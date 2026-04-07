import { renderPlayerSelection, updateTeamSizeHint } from "../../active/render.js"
import { applyTournamentAction, bindWizardControls } from "../wizard/actions.js"
import { buildWizardState, normalizeCurrentStep } from "../wizard/state.js"
import { createSessionSetupDraft, getFinalStepId, getVisibleStepIds, reconcileDraftWithRoster } from "./draft.js"
import { renderSetupStep } from "./panels.js"
import { renderFreeSetup, renderModeStep, syncStepperUi } from "./render.js"
import { clampTournamentCourtCount, updateCourtHint } from "./tournament/courts.js"
import { getTournamentBlockingError, updateTournamentDerivedState } from "./tournament/derived.js"
import {
    buildTournamentSeed,
    clearTournamentDistribution,
    renderTournamentDistributionSummary,
    showTournamentPreviewError,
    showTournamentPreviewPendingState,
} from "./tournament/preview.js"

function buildCurrentWizardState(draft) {
    return buildWizardState(draft, () => getTournamentBlockingError(draft), getFinalStepId, getVisibleStepIds)
}

function getNormalizedWizardState({
    buildTournamentConfig,
    buildTournamentPreview,
    canUseTwoVsOne,
    draft,
    getMinPlayersForTournament,
    getPlayers,
    getTournamentMatchMode,
    reconcileTournamentDraft,
    state,
    ui,
    validateTournamentAdvancedState,
}) {
    reconcileDraftWithRoster(draft, state.roster, reconcileTournamentDraft)
    updateTournamentDerivedState({
        draft,
        players: getPlayers(),
        buildTournamentConfig,
        buildTournamentPreview,
        buildTournamentSeed,
        canUseTwoVsOne,
        clampTournamentCourtCount,
        courtCountLabel: ui.courtCountLabel,
        courtCountValue: ui.courtCountValue,
        courtsDecBtn: ui.courtsDecBtn,
        courtsIncBtn: ui.courtsIncBtn,
        getMinPlayersForTournament,
        getTournamentMatchMode,
        reconcileTournamentDraft,
        validateTournamentAdvancedState,
    })

    const wizardState = buildCurrentWizardState(draft)
    normalizeCurrentStep(draft, wizardState)
    return buildCurrentWizardState(draft)
}

function renderWizardContent({
    draft,
    getMinPlayersForTournament,
    getPlayers,
    getTournamentMatchMode,
    onTournamentAction,
    renderTournamentSetup,
    state,
    ui,
    wizardState,
}) {
    ui.noRosterWarning.hidden = true
    ui.sessionConfig.hidden = false
    renderPlayerSelection(state.roster, draft.selectedPlayers, ui.playerSelection, onTournamentAction)
    renderModeStep({ draft, modeHint: ui.modeHint, modeSelector: ui.modeSelector })
    renderSetupStep({
        clearTournamentDistribution,
        draft,
        handleTournamentAction: onTournamentAction,
        courtHint: ui.courtHint,
        getPlayers,
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
            draft,
            teamsConfig: ui.teamsConfig,
            teamCountValue: ui.teamCountValue,
            teamsDecBtn: ui.teamsDecBtn,
            teamsIncBtn: ui.teamsIncBtn,
            teamSizeHint: ui.teamSizeHint,
        },
        showTournamentPreviewError,
        showTournamentPreviewPendingState,
        teamSizeHint: ui.teamSizeHint,
        teamsConfig: ui.teamsConfig,
        tournamentAdvancedError: ui.tournamentAdvancedError,
        tournamentDistributionGroup: ui.tournamentDistributionGroup,
        tournamentDistributionHint: ui.tournamentDistributionHint,
        tournamentSetupPanel: ui.tournamentSetupPanel,
        updateCourtHint,
    })
    syncStepperUi({
        draft,
        wizardState,
        sessionStepButtons: ui.sessionStepButtons,
        sessionStepPanels: ui.sessionStepPanels,
        sessionStepCaption: ui.sessionStepCaption,
        sessionBackBtn: ui.sessionBackBtn,
        sessionNextBtn: ui.sessionNextBtn,
        startSessionBtn: ui.startSessionBtn,
    })
}

function createTournamentActionHandler(draft, onChange) {
    return (action) => {
        applyTournamentAction(draft, action)
        onChange()
    }
}

function createGameModeSetter(draft, createDefaultTournamentDraft) {
    return (nextMode) => {
        if (draft.gameMode === nextMode) {
            return
        }
        draft.gameMode = nextMode
        draft.tournament = nextMode === "tournament" ? draft.tournament : createDefaultTournamentDraft()
    }
}

function bindSetupControls({
    buildSelectedSession,
    createDefaultTournamentDraft,
    draft,
    getRoster,
    initTournamentSetup,
    onChange,
    onSessionStart,
    ui,
}) {
    const handleTournamentAction = createTournamentActionHandler(draft, onChange)

    bindWizardControls({
        buildWizardState,
        courtsDecBtn: ui.courtsDecBtn,
        courtsIncBtn: ui.courtsIncBtn,
        createDefaultTournamentDraft,
        deselectAllBtn: ui.deselectAllBtn,
        draft,
        getFinalStepId,
        getRoster,
        getTournamentBlockingError,
        getVisibleStepIds,
        initTournamentSetup,
        modeSelector: ui.modeSelector,
        onStartSession: () =>
            onSessionStart({
                draft,
                buildSelectedSession,
                buildWizardState,
                getFinalStepId,
                getTournamentBlockingError,
                getVisibleStepIds,
            }),
        onTournamentAction: handleTournamentAction,
        refreshSessionView: onChange,
        selectAllBtn: ui.selectAllBtn,
        sessionBackBtn: ui.sessionBackBtn,
        sessionNextBtn: ui.sessionNextBtn,
        sessionStepButtons: ui.sessionStepButtons,
        setCurrentStep: (stepId) => {
            draft.currentStep = stepId
            onChange()
        },
        setGameMode: createGameModeSetter(draft, createDefaultTournamentDraft),
        startSessionBtn: ui.startSessionBtn,
        teamsDecBtn: ui.teamsDecBtn,
        teamsIncBtn: ui.teamsIncBtn,
    })
}

function createSessionSetupController({
    buildTournamentConfig,
    buildTournamentPreview,
    canUseTwoVsOne,
    createDefaultTournamentDraft,
    getMinPlayersForTournament,
    getTournamentMatchMode,
    initTournamentSetup,
    reconcileTournamentDraft,
    renderTournamentSetup,
    ui,
    validateTournamentAdvancedState,
}) {
    const draft = createSessionSetupDraft(createDefaultTournamentDraft)

    return {
        bindControls: ({ buildSelectedSession, getRoster, onChange, onSessionStart }) =>
            bindSetupControls({
                buildSelectedSession,
                createDefaultTournamentDraft,
                draft,
                getRoster,
                initTournamentSetup,
                onChange,
                onSessionStart,
                ui,
            }),
        draft,
        getPlayersInRosterOrder: (state) => state.roster.filter((player) => draft.selectedPlayers.has(player)),
        renderSetupWizard: ({ state, getPlayers, onChange, showSetupBaseSessionView }) => {
            showSetupBaseSessionView()
            if (state.roster.length < 2) {
                ui.noRosterWarning.hidden = false
                ui.sessionConfig.hidden = true
                return
            }

            renderWizardContent({
                draft,
                getMinPlayersForTournament,
                getPlayers,
                getTournamentMatchMode,
                onTournamentAction: createTournamentActionHandler(draft, onChange),
                renderTournamentSetup,
                state,
                ui,
                wizardState: getNormalizedWizardState({
                    buildTournamentConfig,
                    buildTournamentPreview,
                    canUseTwoVsOne,
                    draft,
                    getMinPlayersForTournament,
                    getPlayers,
                    getTournamentMatchMode,
                    reconcileTournamentDraft,
                    state,
                    ui,
                    validateTournamentAdvancedState,
                }),
            })
        },
    }
}

export { createSessionSetupController }
