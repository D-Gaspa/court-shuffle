import { renderPlayerSelection, updateTeamSizeHint } from "../../active/render.js"
import { buildWizardState, normalizeCurrentStep } from "../wizard/state.js"
import { renderContinuationSummary } from "./continuation-summary.js"
import { getFinalStepId, getVisibleStepIds, reconcileDraftWithRoster } from "./draft.js"
import { renderSetupStep } from "./panels.js"
import {
    renderFreeSetup,
    renderModeStep,
    renderNightLinkSetup,
    renderSetupNotice,
    renderSetupShell,
    syncStepperUi,
} from "./render.js"
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

function renderSetupShellContent({ draft, onTournamentAction, state, ui }) {
    ui.noRosterWarning.hidden = true
    ui.sessionConfig.hidden = false
    renderSetupShell({
        draft,
        sessionBackBtn: ui.sessionBackBtn,
        sessionConfig: ui.sessionConfig,
        sessionContinuationBanner: ui.sessionContinuationBanner,
        sessionContinuationDetail: ui.sessionContinuationDetail,
        sessionContinuationPhaseTag: ui.sessionContinuationPhaseTag,
        sessionContinuationTitle: ui.sessionContinuationTitle,
        sessionContinuationTournamentTag: ui.sessionContinuationTournamentTag,
        sessionPrefillCancelBtn: ui.sessionPrefillCancelBtn,
        sessionSetupSubtitle: ui.sessionSetupSubtitle,
        sessionSetupTitle: ui.sessionSetupTitle,
        startSessionLabel: ui.startSessionLabel,
    })
    renderSetupNotice(draft.continuation || draft.historySeed ? "" : draft.setupNotice, ui.sessionSetupNotice)
    const rosterLocked = Boolean(draft.historySeed?.lockedFields?.roster)
    ui.selectAllBtn.disabled = rosterLocked
    ui.deselectAllBtn.disabled = rosterLocked
    renderPlayerSelection({
        roster: state.roster,
        selectedSet: draft.selectedPlayers,
        container: ui.playerSelection,
        onChange: onTournamentAction,
        locked: rosterLocked,
    })
    renderModeStep({ draft, modeHint: ui.modeHint, modeSelector: ui.modeSelector })
}

function renderSetupStepContent({
    canUseTwoVsOne,
    draft,
    getMinPlayersForTournament,
    getPlayers,
    getTournamentMatchMode,
    onTournamentAction,
    renderTournamentSetup,
    state,
    ui,
}) {
    renderSetupStep({
        allow2v1Checkbox: ui.allow2v1Checkbox,
        canUseTwoVsOne,
        clearTournamentDistribution,
        draft,
        handleTournamentAction: onTournamentAction,
        courtHint: ui.courtHint,
        courtsConfig: ui.courtsConfig,
        getPlayers,
        getMinPlayersForTournament,
        getTournamentMatchMode,
        notStrictDoublesGroup: ui.notStrictDoublesGroup,
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
        tournamentConfig: ui.tournamentConfig,
        tournamentDistributionGroup: ui.tournamentDistributionGroup,
        tournamentDistributionHint: ui.tournamentDistributionHint,
        tournamentSetupPanel: ui.tournamentSetupPanel,
        updateCourtHint,
    })
    renderContinuationSummary({
        draft,
        selectedPlayers: getPlayers(),
        summaryBodyElement: ui.continuationSummaryBody,
        summaryElement: ui.continuationSummary,
    })
    renderNightLinkSetup({
        draft,
        history: state.history,
        linkPreviousNightCheckbox: ui.linkPreviousNightCheckbox,
        nightLinkGroup: ui.nightLinkGroup,
        nightLinkHint: ui.nightLinkHint,
    })
}

function renderWizardContent({
    canUseTwoVsOne,
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
    renderSetupShellContent({
        draft,
        onTournamentAction,
        state,
        ui,
    })
    renderSetupStepContent({
        canUseTwoVsOne,
        draft,
        getMinPlayersForTournament,
        getPlayers,
        getTournamentMatchMode,
        onTournamentAction,
        renderTournamentSetup,
        state,
        ui,
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

export { getNormalizedWizardState, renderWizardContent }
