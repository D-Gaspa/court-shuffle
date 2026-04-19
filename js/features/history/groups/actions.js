import { canLinkSessionToPreviousNight, findPreviousHistorySession } from "./model.js"

function reportNightUpdate(onStatus, message) {
    onStatus?.({
        ok: true,
        code: "night_updated",
        message,
        error: null,
        source: "history",
    })
}

function linkSessionToPreviousNight(history, sessionId) {
    const target = history.find((entry) => entry.id === sessionId)
    if (!target) {
        return false
    }
    const previousSession = findPreviousHistorySession(history, sessionId)
    if (!(previousSession && canLinkSessionToPreviousNight(history, target))) {
        return false
    }
    target.night = {
        previousSessionId: previousSession.id,
    }
    return true
}

function createExtendNightAction({ onStatus, persist, refreshHistory, showConfirmDialog, state }) {
    return {
        label: "Extend Previous Night",
        className: "btn btn-ghost btn-sm",
        onClick: (group) => {
            const firstSession = group?.sessions?.[0]
            if (!firstSession) {
                return
            }
            const previousSession = findPreviousHistorySession(state.history, firstSession.id)
            if (!previousSession) {
                return
            }
            showConfirmDialog(
                "Extend Previous Night",
                `Link this night to ${new Date(previousSession.date).toLocaleDateString()} as part of the same night chain?`,
                () => {
                    if (linkSessionToPreviousNight(state.history, firstSession.id)) {
                        persist()
                        refreshHistory()
                        reportNightUpdate(onStatus, "Night extended with the previous compatible session.")
                    }
                },
                {
                    okLabel: "Extend Night",
                    okClass: "btn-primary",
                },
            )
        },
    }
}

function createNightGroupActions({ onStatus, persist, refreshHistory, showConfirmDialog, showSessionSummary, state }) {
    function resolveActiveNightGroupActions(group) {
        const actions = [
            {
                label: "Night Summary",
                className: "btn btn-ghost btn-sm",
                onClick: () => showSessionSummary?.(group),
            },
        ]
        const firstSession = group?.sessions?.[0]
        if (firstSession && canLinkSessionToPreviousNight(state.history, firstSession)) {
            actions.push(createExtendNightAction({ onStatus, persist, refreshHistory, showConfirmDialog, state }))
        }
        return actions
    }

    return {
        resolveActiveNightGroupActions,
        resolveArchivedNightGroupActions: (group) => [
            {
                label: "Night Summary",
                className: "btn btn-ghost btn-sm",
                onClick: () => showSessionSummary?.(group),
            },
        ],
    }
}

export { createNightGroupActions, linkSessionToPreviousNight, reportNightUpdate }
