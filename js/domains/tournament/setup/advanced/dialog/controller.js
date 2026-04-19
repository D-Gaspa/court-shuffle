import { getAdvancedEntrants } from "../context.js"
import {
    buildRestrictedTeamsFromLastSession,
    buildRestrictedTeamsFromLastTournament,
} from "../model/history-restrictions.js"
import { cloneAdvancedSettings, summarizeAdvancedSettings } from "../model/index.js"
import {
    buildAdvancedValidationError,
    buildSummaryContext,
    hasVisibleAdvancedOptions,
    reconcileAndRenderAdvancedModalState,
    setAdvancedModalError,
    setAdvancedModalMessage,
} from "./helpers.js"
import { createAdvancedModalUiController } from "./modal-ui.js"

function syncActiveSummaryState(state, tournamentDraft, players, lockAdvanced) {
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
        state.dom.advancedBtn.disabled = lockAdvanced || !hasVisibleOptions
        if (lockAdvanced) {
            state.dom.advancedBtn.title = "Advanced overrides are locked during continuation"
        } else if (hasVisibleOptions) {
            state.dom.advancedBtn.title = "Advanced Settings"
        } else {
            state.dom.advancedBtn.title = "No advanced overrides available"
        }
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
    reconcileAndRenderAdvancedModalState(state, options)
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

function getImportableRestrictedTeams(state, mode) {
    const modal = state.modalState
    if (!modal || modal.tournamentTeamSize !== 2) {
        return null
    }

    const historyState = state.getHistorySource?.() || { history: [], archivedHistory: [] }
    const activePlayers = getAdvancedEntrants({
        selectedPlayers: modal.selectedPlayers,
        tournamentTeamSize: modal.tournamentTeamSize,
        allowNotStrictDoubles: modal.allowNotStrictDoubles,
        minRequiredSitOutPool: state.minRequiredSitOutPool,
        forcedSitOutPlayer: modal.workingAdvanced.forcedSitOutPlayer,
    })
    const builder = mode === "session" ? buildRestrictedTeamsFromLastSession : buildRestrictedTeamsFromLastTournament
    return builder({
        history: historyState.history,
        archivedHistory: historyState.archivedHistory,
        activePlayers,
        allowNotStrictDoubles: modal.allowNotStrictDoubles,
        lockedPairs: modal.workingAdvanced.doublesLockedPairs,
    })
}

function fillDoublesRestrictionsFromHistory(state, mode) {
    const modal = state.modalState
    if (!modal) {
        return
    }
    const restrictedTeams = getImportableRestrictedTeams(state, mode)
    if (restrictedTeams === null) {
        setAdvancedModalMessage(
            state,
            mode === "session"
                ? "No saved doubles session with scored matches is available to import."
                : "No saved doubles tournament with scored matches is available to import.",
        )
        return
    }

    if (restrictedTeams.length === 0) {
        setAdvancedModalMessage(
            state,
            mode === "session"
                ? "No compatible scored teams from the last saved doubles session match this setup."
                : "No compatible scored teams from the last saved doubles tournament match this setup.",
        )
        return
    }

    modal.workingAdvanced.doublesRestrictedTeams = restrictedTeams
    renderAdvancedModalState(state)
}

function clearDoublesRestrictions(state) {
    if (!state.modalState) {
        return
    }
    state.modalState.workingAdvanced.doublesRestrictedTeams = []
    renderAdvancedModalState(state)
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
    dom.addDoublesRestrictionBtn?.addEventListener("click", () => {
        if (!state.modalState) {
            return
        }
        state.modalState.workingAdvanced.doublesRestrictedTeams.push(["", ""])
        renderAdvancedModalState(state)
    })
    dom.fillDoublesRestrictionBtn?.addEventListener("click", () =>
        fillDoublesRestrictionsFromHistory(state, "tournament"),
    )
    dom.fillDoublesRestrictionSessionBtn?.addEventListener("click", () =>
        fillDoublesRestrictionsFromHistory(state, "session"),
    )
    dom.clearDoublesRestrictionBtn?.addEventListener("click", () => clearDoublesRestrictions(state))
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

function renderAdvancedDialogController(state, { tournamentDraft, selectedPlayers, onChange, lockAdvanced = false }) {
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

    syncActiveSummaryState(state, tournamentDraft, players, lockAdvanced)
}

function createAdvancedDialogController({ dom, minRequiredSitOutPool }) {
    const state = {
        dom,
        minRequiredSitOutPool,
        getHistorySource: () => ({ history: [], archivedHistory: [] }),
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
        setHistorySource: (getHistorySource) => {
            state.getHistorySource =
                typeof getHistorySource === "function" ? getHistorySource : () => ({ history: [], archivedHistory: [] })
        },
    }
}

export { createAdvancedDialogController }
