import { hideFieldError, showFieldError } from "../../shared/utils.js"
import { createAdvancedModalUiController } from "./advanced-modal-ui.js"
import {
    cloneAdvancedSettings,
    reconcileAdvancedDraftForContext,
    summarizeAdvancedSettings,
    validateAdvancedDraft,
} from "./advanced-model.js"
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

function hasVisibleAdvancedOptions(summary) {
    return Object.values(summary.sections || {}).some((section) => section.visible)
}

function renderAdvancedSections(state, tournamentDraft, selectedPlayers, onRequestRender) {
    const { dom } = state
    renderAdvancedModalSections({
        tournamentTeamSize: tournamentDraft.teamSize,
        tournamentFormat: tournamentDraft.format,
        allowNotStrictDoubles: tournamentDraft.allowNotStrictDoubles,
        selectedPlayers,
        minRequiredSitOutPool: state.minRequiredSitOutPool,
        courtCount: tournamentDraft.courtCount,
        advancedDraft: tournamentDraft.advanced,
        requiredSitOutSection: dom.requiredSitOutSection,
        requiredSitOutSelect: dom.requiredSitOutSelect,
        singlesOpeningSection: dom.singlesOpeningSection,
        singlesOpeningList: dom.singlesOpeningList,
        doublesPairsSection: dom.doublesPairsSection,
        doublesPairsList: dom.doublesPairsList,
        addDoublesPairBtn: dom.addDoublesPairBtn,
        singlesByesSection: dom.singlesByesSection,
        singlesByesList: dom.singlesByesList,
        doublesByesSection: dom.doublesByesSection,
        doublesByesList: dom.doublesByesList,
        singlesNextUpSection: dom.singlesNextUpSection,
        singlesNextUpList: dom.singlesNextUpList,
        doublesNextUpSection: dom.doublesNextUpSection,
        doublesNextUpList: dom.doublesNextUpList,
        onRequestRender,
    })
}

function syncActiveSummaryState(state, tournamentDraft, players) {
    state.currentAdvancedSummary = summarizeAdvancedSettings(
        tournamentDraft.advanced,
        buildSummaryContext(
            {
                tournamentFormat: tournamentDraft.format,
                tournamentTeamSize: tournamentDraft.teamSize,
                allowNotStrictDoubles: tournamentDraft.allowNotStrictDoubles,
                selectedPlayers: players,
                courtCount: tournamentDraft.courtCount,
            },
            state.minRequiredSitOutPool,
        ),
    )
    if (!state.modalState) {
        state.activeAdvancedSummary = state.currentAdvancedSummary
    }
    if (state.dom.advancedBtn) {
        const hasVisibleOptions = hasVisibleAdvancedOptions(state.currentAdvancedSummary)
        state.dom.advancedBtn.disabled = !hasVisibleOptions
        state.dom.advancedBtn.title = hasVisibleOptions ? "Advanced Settings" : "No advanced overrides available"
    }
    state.advancedUi.renderMeta()
}

function resetAdvancedModalState(state) {
    state.modalState = null
    state.activeAdvancedSummary = state.currentAdvancedSummary
    state.advancedUi.resetActiveSection()
    setAdvancedModalError(state.dom.advancedModalError, "")
    state.advancedUi.renderMeta()
}

function renderAdvancedModalState(state, options = {}) {
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

    renderAdvancedSections(
        state,
        {
            advanced: modal.workingAdvanced,
            format: modal.tournamentFormat,
            teamSize: modal.tournamentTeamSize,
            allowNotStrictDoubles: modal.allowNotStrictDoubles,
            courtCount: modal.courtCount,
        },
        modal.selectedPlayers,
        () => renderAdvancedModalState(state),
    )

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

function openAdvancedDialog(state, latestRenderState) {
    const { advancedDialog } = state.dom
    if (!(advancedDialog && hasVisibleAdvancedOptions(state.currentAdvancedSummary))) {
        return
    }

    state.modalState = {
        onChange: latestRenderState.onChange,
        selectedPlayers: [...latestRenderState.selectedPlayers],
        tournamentFormat: latestRenderState.tournamentDraft.format,
        tournamentTeamSize: latestRenderState.tournamentDraft.teamSize,
        allowNotStrictDoubles: latestRenderState.tournamentDraft.allowNotStrictDoubles,
        courtCount: latestRenderState.tournamentDraft.courtCount,
        workingAdvanced: cloneAdvancedSettings(latestRenderState.tournamentDraft.advanced),
    }
    state.advancedUi.resetActiveSection()
    renderAdvancedModalState(state, { preserveIncompleteRows: false })
    if (!advancedDialog.open) {
        advancedDialog.showModal()
    }
}

function applyAdvancedDialog(state) {
    if (!state.modalState) {
        return
    }

    const modal = state.modalState
    const validationError = buildAdvancedValidationError(
        {
            advancedDraft: modal.workingAdvanced,
            tournamentFormat: modal.tournamentFormat,
            tournamentTeamSize: modal.tournamentTeamSize,
            allowNotStrictDoubles: modal.allowNotStrictDoubles,
            selectedPlayers: modal.selectedPlayers,
            courtCount: modal.courtCount,
        },
        state.minRequiredSitOutPool,
    )
    setAdvancedModalError(state.dom.advancedModalError, validationError)
    if (validationError) {
        state.advancedUi.renderMeta()
        return
    }

    state.dom.advancedDialog?.close()
    modal.onChange({
        type: "replace-advanced",
        value: cloneAdvancedSettings(modal.workingAdvanced),
    })
}

function bindAdvancedDialogInteractions(state) {
    const { dom } = state
    dom.advancedBtn?.addEventListener("click", () => {
        if (state.latestRenderState) {
            openAdvancedDialog(state, state.latestRenderState)
        }
    })
    dom.addSinglesMatchupBtn?.addEventListener("click", () => {
        if (!state.modalState) {
            return
        }
        state.modalState.workingAdvanced.singlesOpeningMatchups.push(["", ""])
        renderAdvancedModalState(state)
    })
    dom.addDoublesPairBtn?.addEventListener("click", () => {
        if (!state.modalState) {
            return
        }
        state.modalState.workingAdvanced.doublesLockedPairs.push(["", ""])
        renderAdvancedModalState(state)
    })
    dom.advancedCancelBtn?.addEventListener("click", () => dom.advancedDialog?.close())
    dom.advancedApplyBtn?.addEventListener("click", () => applyAdvancedDialog(state))
    dom.advancedDialog?.addEventListener("close", () => resetAdvancedModalState(state))
    dom.advancedDialog?.addEventListener("click", (event) => {
        if (event.target === dom.advancedDialog) {
            dom.advancedDialog.close()
        }
    })
    state.advancedUi.bindInteractions()
}

function renderAdvancedDialogController(state, { tournamentDraft, selectedPlayers, onChange }) {
    const players = Array.isArray(selectedPlayers) ? selectedPlayers : []
    state.latestRenderState = { tournamentDraft, selectedPlayers: players, onChange }

    if (state.dom.advancedDialog?.open && state.modalState) {
        state.modalState.selectedPlayers = [...players]
        state.modalState.tournamentFormat = tournamentDraft.format
        state.modalState.tournamentTeamSize = tournamentDraft.teamSize
        state.modalState.allowNotStrictDoubles = tournamentDraft.allowNotStrictDoubles
        state.modalState.courtCount = tournamentDraft.courtCount
        renderAdvancedModalState(state, { preserveIncompleteRows: false })
    } else {
        setAdvancedModalError(state.dom.advancedModalError, "")
    }

    syncActiveSummaryState(state, tournamentDraft, players)
}

function createAdvancedDialogController({ dom, minRequiredSitOutPool }) {
    const state = {
        dom,
        minRequiredSitOutPool,
        currentAdvancedSummary: { totalActive: 0, triggerLabel: "Auto", sections: {} },
        activeAdvancedSummary: { totalActive: 0, triggerLabel: "Auto", sections: {} },
        latestRenderState: null,
        modalState: null,
    }
    state.advancedUi = createAdvancedModalUiController({
        rootElement: dom.advancedRoot,
        advancedModalError: dom.advancedModalError,
        advancedValidationSummary: dom.advancedValidationSummary,
        tournamentAdvancedState: dom.tournamentAdvancedState,
        advancedEmptyState: dom.advancedEmptyState,
        cardElements: dom.advancedCardElements,
        getCommittedSummary: () => state.currentAdvancedSummary,
        getActiveSummary: () => state.activeAdvancedSummary,
    })

    return {
        init: () => bindAdvancedDialogInteractions(state),
        render: (config) => renderAdvancedDialogController(state, config),
    }
}

export { createAdvancedDialogController }
