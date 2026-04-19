import { buildHistoryRemixPrefill } from "../history/remix/index.js"

function completeHistoryRemix({ prefill, saveState, setupController, switchView }) {
    setupController.applyExternalSetupPrefill(prefill)
    saveState()
    switchView("session")
}

function launchSessionHistoryRemix({
    action,
    askConfirm,
    canSaveSessionToHistory,
    endSession,
    roster,
    saveState,
    session,
    setupController,
    state,
    switchView,
}) {
    const prefill = buildHistoryRemixPrefill(session, action, roster)
    const replace = (shouldSave) => {
        if (state.activeSession) {
            endSession(state, saveState, shouldSave)
        }
        completeHistoryRemix({ prefill, saveState, setupController, switchView })
    }

    if (!state.activeSession) {
        completeHistoryRemix({ prefill, saveState, setupController, switchView })
        return
    }

    if (canSaveSessionToHistory(state.activeSession)) {
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

export { launchSessionHistoryRemix }
