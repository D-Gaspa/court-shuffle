import { HISTORY_REMIX_ACTIONS } from "./remix.js"
import { isMultiPhaseHistorySession } from "./session-phases.js"

function createRemixActions(session, { launchHistoryRemix, switchView }) {
    const reuseLabel = isMultiPhaseHistorySession(session) ? "Reuse Latest Phase" : "Reuse Players"
    const actions = [
        {
            label: reuseLabel,
            className: "btn btn-ghost btn-sm",
            onClick: (entry) => launchHistoryRemix(entry, HISTORY_REMIX_ACTIONS.reusePlayers, switchView),
        },
    ]

    if (session.mode === "tournament" && session.remix?.tournamentConfig) {
        actions.push({
            label: "New Seed",
            className: "btn btn-ghost btn-sm",
            onClick: (entry) => launchHistoryRemix(entry, HISTORY_REMIX_ACTIONS.newSeed, switchView),
        })
    }

    if (session.mode === "tournament" && session.remix?.tournamentConfig?.seed) {
        actions.push({
            label: "Same Seed",
            className: "btn btn-ghost btn-sm",
            onClick: (entry) => launchHistoryRemix(entry, HISTORY_REMIX_ACTIONS.sameSeed, switchView),
        })
    }

    return actions
}

function createHistoryActions({ launchHistoryRemix, persist, refreshHistory, showConfirmDialog, state, switchView }) {
    function resolveActiveHistoryActions(session) {
        const archiveMessage = isMultiPhaseHistorySession(session)
            ? "Move this saved session and all of its continuation phases into the archive?"
            : "Move this session into the archive?"
        return [
            ...createRemixActions(session, { launchHistoryRemix, switchView }),
            {
                label: "Archive Session",
                className: "btn btn-ghost btn-sm btn-danger",
                onClick: (entry) => {
                    showConfirmDialog("Archive Session", archiveMessage, () => {
                        state.history = state.history.filter((historyEntry) => historyEntry.id !== entry.id)
                        state.archivedHistory.unshift(entry)
                        persist()
                        refreshHistory()
                    })
                },
            },
        ]
    }

    function resolveArchivedHistoryActions(session) {
        return [
            ...createRemixActions(session, { launchHistoryRemix, switchView }),
            {
                label: "Restore",
                className: "btn btn-ghost btn-sm",
                onClick: (entry) => {
                    state.archivedHistory = state.archivedHistory.filter((historyEntry) => historyEntry.id !== entry.id)
                    state.history.push(entry)
                    persist()
                    refreshHistory()
                },
            },
            {
                label: "Delete Permanently",
                className: "btn btn-ghost btn-sm btn-danger",
                onClick: (entry) => {
                    showConfirmDialog("Delete Permanently", "Remove this archived session for good?", () => {
                        state.archivedHistory = state.archivedHistory.filter(
                            (historyEntry) => historyEntry.id !== entry.id,
                        )
                        persist()
                        refreshHistory()
                    })
                },
            },
        ]
    }

    return { resolveActiveHistoryActions, resolveArchivedHistoryActions }
}

export { createHistoryActions }
