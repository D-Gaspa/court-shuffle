import { createNightGroupActions, linkSessionToPreviousNight, reportNightUpdate } from "../groups/actions.js"
import {
    canLinkSessionToPreviousNight,
    findPreviousHistorySession,
    getNightPreviousSessionId,
} from "../groups/model.js"
import { HISTORY_REMIX_ACTIONS } from "../remix/index.js"
import { isMultiPhaseHistorySession } from "../summary/session-phases.js"

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
            label: "Reuse Settings",
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

function unlinkNightSession(history, sessionId) {
    const target = history.find((entry) => entry.id === sessionId)
    if (!target) {
        return
    }
    const previousSessionId = getNightPreviousSessionId(target)
    target.night = null
    for (const entry of history) {
        if (getNightPreviousSessionId(entry) === sessionId) {
            entry.night = previousSessionId ? { previousSessionId } : null
        }
    }
}

function isSessionInLinkedNight(history, session) {
    return Boolean(
        session?.id &&
            (getNightPreviousSessionId(session) ||
                history.some((entry) => getNightPreviousSessionId(entry) === session.id)),
    )
}

function createSummaryAction(showSessionSummary) {
    return {
        label: "Session Summary",
        className: "btn btn-ghost btn-sm",
        onClick: (entry) => showSessionSummary?.(entry),
    }
}

function createJoinNightAction({ onStatus, persist, refreshHistory, showConfirmDialog, state }) {
    return {
        label: "Join Previous Night",
        className: "btn btn-ghost btn-sm",
        onClick: (entry) => {
            const previousSession = findPreviousHistorySession(state.history, entry.id)
            if (!previousSession) {
                return
            }
            showConfirmDialog(
                "Join Previous Night",
                `Link this session to ${new Date(previousSession.date).toLocaleDateString()} as the same night?`,
                () => {
                    if (linkSessionToPreviousNight(state.history, entry.id)) {
                        persist()
                        refreshHistory()
                        reportNightUpdate(onStatus, "Session linked to the previous night.")
                    }
                },
                { okLabel: "Link Night", okClass: "btn-primary" },
            )
        },
    }
}

function createDetachNightAction({ history, onStatus, persist, refreshHistory, showConfirmDialog }) {
    return {
        label: "Detach From Night",
        className: "btn btn-ghost btn-sm",
        onClick: (entry) => {
            const detach = () => {
                unlinkNightSession(history, entry.id)
                persist()
                refreshHistory()
                reportNightUpdate(onStatus, "Session detached from its linked night.")
            }
            if (!showConfirmDialog) {
                detach()
                return
            }
            showConfirmDialog("Detach From Night", "Detach this session from its linked night?", detach)
        },
    }
}

function createArchiveAction({ archiveMessage, persist, refreshHistory, showConfirmDialog, state }) {
    return {
        label: "Archive Session",
        className: "btn btn-ghost btn-sm btn-danger",
        onClick: (entry) =>
            showConfirmDialog("Archive Session", archiveMessage, () => {
                state.history = state.history.filter((historyEntry) => historyEntry.id !== entry.id)
                state.archivedHistory.unshift(entry)
                persist()
                refreshHistory()
            }),
    }
}

function createArchivedUtilityActions({ persist, refreshHistory, showConfirmDialog, state }) {
    return [
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
            onClick: (entry) =>
                showConfirmDialog("Delete Permanently", "Remove this archived session for good?", () => {
                    state.archivedHistory = state.archivedHistory.filter((historyEntry) => historyEntry.id !== entry.id)
                    persist()
                    refreshHistory()
                }),
        },
    ]
}

function createSessionHistoryActions({
    launchHistoryRemix,
    onStatus,
    persist,
    refreshHistory,
    showConfirmDialog,
    showSessionSummary,
    state,
    switchView,
}) {
    const baseSessionActions = (session) => [
        ...createRemixActions(session, { launchHistoryRemix, switchView }),
        createSummaryAction(showSessionSummary),
    ]

    const resolveActiveHistoryActions = (session) => {
        if (session?.provisional) {
            return []
        }
        const actions = baseSessionActions(session)
        const isLinkedMember = isSessionInLinkedNight(state.history, session)
        if (!isLinkedMember && canLinkSessionToPreviousNight(state.history, session)) {
            actions.push(createJoinNightAction({ onStatus, persist, refreshHistory, showConfirmDialog, state }))
        }
        if (isLinkedMember) {
            actions.push(
                createDetachNightAction({
                    history: state.history,
                    onStatus,
                    persist,
                    refreshHistory,
                    showConfirmDialog,
                }),
            )
        }
        actions.push(
            createArchiveAction({
                archiveMessage: isMultiPhaseHistorySession(session)
                    ? "Move this saved session and all of its continuation phases into the archive?"
                    : "Move this session into the archive?",
                persist,
                refreshHistory,
                showConfirmDialog,
                state,
            }),
        )
        return actions
    }

    const resolveArchivedHistoryActions = (session) => {
        const actions = baseSessionActions(session)
        if (isSessionInLinkedNight(state.archivedHistory, session)) {
            actions.push(
                createDetachNightAction({
                    history: state.archivedHistory,
                    onStatus,
                    persist,
                    refreshHistory,
                    showConfirmDialog: null,
                }),
            )
        }
        actions.push(...createArchivedUtilityActions({ persist, refreshHistory, showConfirmDialog, state }))
        return actions
    }

    return { resolveActiveHistoryActions, resolveArchivedHistoryActions }
}

function createHistoryActions(context) {
    return {
        ...createSessionHistoryActions(context),
        ...createNightGroupActions(context),
    }
}

export { createHistoryActions }
