import { hideFieldError, showFieldError } from "../../shared/utils.js"
import { reconcileAdvancedDraftForContext, summarizeAdvancedSettings, validateAdvancedDraft } from "./advanced-model.js"
import { renderAdvancedModalSections } from "./advanced-render.js"

function buildSummaryContext(config, minRequiredSitOutPool) {
    return { ...config, minRequiredSitOutPool }
}

function buildAdvancedValidationError(config, minRequiredSitOutPool) {
    return (
        validateAdvancedDraft({
            advancedDraft: config.advancedDraft,
            tournamentFormat: config.tournamentFormat,
            tournamentTeamSize: config.tournamentTeamSize,
            allowNotStrictDoubles: config.allowNotStrictDoubles,
            selectedPlayers: config.selectedPlayers,
            minRequiredSitOutPool,
            courtCount: config.courtCount,
        }) || ""
    )
}

function setAdvancedModalError(advancedModalError, message) {
    if (message) {
        showFieldError(advancedModalError, message)
        return
    }
    hideFieldError(advancedModalError)
}

function setAdvancedModalMessage(state, message) {
    setAdvancedModalError(state.dom.advancedModalError, message)
    state.advancedUi.renderMeta()
}

function hasVisibleAdvancedOptions(summary) {
    return Object.values(summary.sections || {}).some((section) => section.visible)
}

function renderModalSections(state, modal) {
    const { dom } = state
    renderAdvancedModalSections({
        tournamentTeamSize: modal.tournamentTeamSize,
        tournamentFormat: modal.tournamentFormat,
        allowNotStrictDoubles: modal.allowNotStrictDoubles,
        selectedPlayers: modal.selectedPlayers,
        minRequiredSitOutPool: state.minRequiredSitOutPool,
        courtCount: modal.courtCount,
        advancedDraft: modal.workingAdvanced,
        requiredSitOutSection: dom.requiredSitOutSection,
        requiredSitOutSelect: dom.requiredSitOutSelect,
        singlesOpeningSection: dom.singlesOpeningSection,
        singlesOpeningList: dom.singlesOpeningList,
        doublesPairsSection: dom.doublesPairsSection,
        doublesPairsList: dom.doublesPairsList,
        addDoublesPairBtn: dom.addDoublesPairBtn,
        doublesRestrictionsSection: dom.doublesRestrictionsSection,
        doublesRestrictionsList: dom.doublesRestrictionsList,
        addDoublesRestrictionBtn: dom.addDoublesRestrictionBtn,
        fillDoublesRestrictionBtn: dom.fillDoublesRestrictionBtn,
        fillDoublesRestrictionSessionBtn: dom.fillDoublesRestrictionSessionBtn,
        singlesByesSection: dom.singlesByesSection,
        singlesByesList: dom.singlesByesList,
        doublesByesSection: dom.doublesByesSection,
        doublesByesList: dom.doublesByesList,
        singlesNextUpSection: dom.singlesNextUpSection,
        singlesNextUpList: dom.singlesNextUpList,
        doublesNextUpSection: dom.doublesNextUpSection,
        doublesNextUpList: dom.doublesNextUpList,
        onRequestRender: () => reconcileAndRenderAdvancedModalState(state),
    })
}

function syncModalSummary(state, modal) {
    state.activeAdvancedSummary = summarizeAdvancedSettings(
        modal.workingAdvanced,
        buildSummaryContext(
            {
                tournamentFormat: modal.tournamentFormat,
                tournamentTeamSize: modal.tournamentTeamSize,
                allowNotStrictDoubles: modal.allowNotStrictDoubles,
                selectedPlayers: modal.selectedPlayers,
                courtCount: modal.courtCount,
            },
            state.minRequiredSitOutPool,
        ),
    )
    setAdvancedModalError(
        state.dom.advancedModalError,
        buildAdvancedValidationError(
            {
                advancedDraft: modal.workingAdvanced,
                tournamentFormat: modal.tournamentFormat,
                tournamentTeamSize: modal.tournamentTeamSize,
                allowNotStrictDoubles: modal.allowNotStrictDoubles,
                selectedPlayers: modal.selectedPlayers,
                courtCount: modal.courtCount,
            },
            state.minRequiredSitOutPool,
        ),
    )
    state.advancedUi.renderMeta()
}

function reconcileAndRenderAdvancedModalState(state, options = {}) {
    if (!state.modalState) {
        return
    }

    const modal = state.modalState
    reconcileAdvancedDraftForContext({
        tournamentAdvanced: modal.workingAdvanced,
        tournamentTeamSize: modal.tournamentTeamSize,
        tournamentFormat: modal.tournamentFormat,
        allowNotStrictDoubles: modal.allowNotStrictDoubles,
        selectedPlayers: modal.selectedPlayers,
        minRequiredSitOutPool: state.minRequiredSitOutPool,
        courtCount: modal.courtCount,
        preserveIncompleteRows: options.preserveIncompleteRows ?? true,
    })
    renderModalSections(state, modal)
    syncModalSummary(state, modal)
}

export {
    buildAdvancedValidationError,
    buildSummaryContext,
    hasVisibleAdvancedOptions,
    reconcileAndRenderAdvancedModalState,
    setAdvancedModalError,
    setAdvancedModalMessage,
}
