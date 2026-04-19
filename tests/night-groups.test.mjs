import assert from "node:assert/strict"
import test from "node:test"
import { buildHistoryNightGroups } from "../js/features/history/groups/model.js"
import { createHistoryActions } from "../js/features/history/list/actions.js"

function createSession(id, date, previousSessionId = null) {
    return {
        id,
        date,
        mode: "tournament",
        tournamentTeamSize: 2,
        players: ["Ana", "Bea", "Cora", "Dana"],
        rounds: [],
        tournamentSeries: {
            matchType: "doubles",
            format: "consolation",
            tournaments: [{ rounds: [{ matches: [], scores: [] }] }],
        },
        night: previousSessionId ? { previousSessionId } : null,
    }
}

function noop() {
    return null
}

test("night groups preserve chronological data order while grouping chained sessions", () => {
    const sessions = [
        createSession("session-1", "2026-04-10T00:00:00.000Z"),
        createSession("session-2", "2026-04-10T02:00:00.000Z", "session-1"),
        createSession("session-3", "2026-04-10T04:00:00.000Z", "session-2"),
    ]

    const groups = buildHistoryNightGroups(sessions)

    assert.equal(groups.length, 1)
    assert.deepEqual(
        groups[0].sessions.map((session) => session.id),
        ["session-1", "session-2", "session-3"],
    )
})

test("linked-night sessions expose detach instead of join while group exposes extend", () => {
    const history = [
        createSession("session-0", "2026-04-09T22:00:00.000Z"),
        createSession("session-1", "2026-04-10T00:00:00.000Z"),
        createSession("session-2", "2026-04-10T02:00:00.000Z", "session-1"),
    ]
    const dialogs = []
    const statuses = []
    const actions = createHistoryActions({
        launchHistoryRemix: noop,
        onStatus: (status) => statuses.push(status),
        persist: noop,
        refreshHistory: noop,
        showConfirmDialog(title, message, onOk) {
            dialogs.push({ title, message })
            onOk()
        },
        showSessionSummary: noop,
        state: { history, archivedHistory: [] },
        switchView: noop,
    })

    const sessionActions = actions.resolveActiveHistoryActions(history[1])
    assert.equal(
        sessionActions.some((action) => action.label === "Join Previous Night"),
        false,
    )
    assert.equal(
        sessionActions.some((action) => action.label === "Detach From Night"),
        true,
    )

    const group = buildHistoryNightGroups(history).find((entry) => entry.sessions.length === 2)
    const groupActions = actions.resolveActiveNightGroupActions(group)
    assert.equal(
        groupActions.some((action) => action.label === "Extend Previous Night"),
        true,
    )

    groupActions.find((action) => action.label === "Extend Previous Night").onClick(group)
    assert.equal(dialogs.at(-1)?.title, "Extend Previous Night")
    assert.equal(statuses.at(-1)?.code, "night_updated")
    assert.equal(history[1].night?.previousSessionId, "session-0")
})
