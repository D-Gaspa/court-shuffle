import { applyTournamentAction, bindWizardControls } from "../state/actions.js"
import { buildWizardState } from "../state/state.js"
import {
    applySessionSetupPrefill,
    clearSessionSetupNotice,
    createSessionSetupDraft,
    getFinalStepId,
    getVisibleStepIds,
} from "./draft.js"
import { renderSetupNotice } from "./render.js"
import { getTournamentBlockingError } from "./tournament/derived.js"
import { getNormalizedWizardState, renderWizardContent } from "./wizard-render.js"

function createTournamentActionHandler(draft, onChange) {
    return (action) => {
        applyTournamentAction(draft, action)
        onChange()
    }
}

function createGameModeSetter(draft, createDefaultTournamentDraft) {
    return (nextMode) => {
        if (draft.continuation || draft.historySeed) {
            return
        }
        if (draft.gameMode === nextMode) {
            return
        }
        draft.gameMode = nextMode
        draft.tournament = nextMode === "tournament" ? draft.tournament : createDefaultTournamentDraft()
    }
}

function bindSetupControls({
    buildSelectedSession,
    clearSetupNotice,
    clearContinuation,
    createDefaultTournamentDraft,
    draft,
    getRoster,
    initTournamentSetup,
    onChange,
    onContinuationStart,
    onSessionStart,
    ui,
}) {
    const handleTournamentAction = createTournamentActionHandler(draft, onChange)

    bindWizardControls({
        buildWizardState,
        courtsDecBtn: ui.courtsDecBtn,
        courtsIncBtn: ui.courtsIncBtn,
        deselectAllBtn: ui.deselectAllBtn,
        draft,
        getFinalStepId,
        getRoster,
        getTournamentBlockingError,
        getVisibleStepIds,
        initTournamentSetup,
        linkPreviousNightCheckbox: ui.linkPreviousNightCheckbox,
        modeSelector: ui.modeSelector,
        onCancelContinuation: () => {
            clearContinuation()
            onChange()
        },
        onCancelHistorySeed: () => {
            draft.historySeed = null
            draft.setupNotice = ""
            onChange()
        },
        onContinuationStart,
        onStartSession: () =>
            onSessionStart({
                draft,
                buildSelectedSession,
                buildWizardState,
                clearSetupNotice,
                getFinalStepId,
                getTournamentBlockingError,
                getVisibleStepIds,
                onContinuationStart,
            }),
        onTournamentAction: handleTournamentAction,
        refreshSessionView: onChange,
        selectAllBtn: ui.selectAllBtn,
        sessionBackBtn: ui.sessionBackBtn,
        sessionNextBtn: ui.sessionNextBtn,
        sessionPrefillCancelBtn: ui.sessionPrefillCancelBtn,
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

function createControllerBindings({
    buildSelectedSession,
    createDefaultTournamentDraft,
    draft,
    getRoster,
    initTournamentSetup,
    onChange,
    onContinuationStart,
    onSessionStart,
    ui,
}) {
    return bindSetupControls({
        buildSelectedSession,
        clearSetupNotice: () => clearSessionSetupNotice(draft),
        clearContinuation: () => {
            draft.continuation = null
            draft.setupNotice = ""
        },
        createDefaultTournamentDraft,
        draft,
        getRoster,
        initTournamentSetup,
        onChange,
        onContinuationStart,
        onSessionStart,
        ui,
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
        bindControls: ({ buildSelectedSession, getRoster, onChange, onContinuationStart, onSessionStart }) =>
            createControllerBindings({
                buildSelectedSession,
                createDefaultTournamentDraft,
                draft,
                getRoster,
                initTournamentSetup,
                onChange,
                onContinuationStart,
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
                renderSetupNotice("", ui.sessionSetupNotice)
                return
            }

            renderWizardContent({
                canUseTwoVsOne,
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
        applyExternalSetupPrefill: (prefill) => {
            applySessionSetupPrefill(draft, prefill, createDefaultTournamentDraft)
        },
        clearSetupNotice: () => clearSessionSetupNotice(draft),
    }
}

export { createSessionSetupController }
