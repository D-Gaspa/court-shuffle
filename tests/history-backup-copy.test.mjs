import assert from "node:assert/strict"
import test from "node:test"

import { buildBackupSummaryMessage, buildClearHistoryMessage, clearHistoryCollections } from "../js/history/backup.js"

const CONTINUATION_PHASE_PATTERN = /Saved sessions can include continuation phases/
const ACTIVE_SESSION_PATTERN = /1 active session in progress/
const ROSTER_COUNT_PATTERN = /4 roster players/
const CLEAR_HISTORY_COUNTS_PATTERN = /Clear 2 saved sessions and 1 archived session\?/
const CLEAR_HISTORY_ACTIVE_SESSION_PATTERN = /current in-progress session will stay in place/i
const CLEAR_HISTORY_UNDO_PATTERN = /cannot be undone unless you export or import a backup/i

// biome-ignore lint/nursery/useExpect: node:test uses assert-based checks here.
test("backup summary copy mentions continuation phases and active session state", () => {
    const summary = buildBackupSummaryMessage({
        roster: ["Ana", "Bea", "Cora", "Dana"],
        history: [{ id: "session-1" }],
        archivedHistory: [{ id: "session-2" }],
        activeSession: { id: "active-1" },
        lastExportedAt: null,
    })

    assert.match(summary, ROSTER_COUNT_PATTERN)
    assert.match(summary, ACTIVE_SESSION_PATTERN)
    assert.match(summary, CONTINUATION_PHASE_PATTERN)
})

// biome-ignore lint/nursery/useExpect: node:test uses assert-based checks here.
test("clear history copy explains scope and preserves active sessions", () => {
    const message = buildClearHistoryMessage({
        history: [{ id: "session-1" }, { id: "session-2" }],
        archivedHistory: [{ id: "session-3" }],
        activeSession: { id: "active-1" },
    })

    assert.match(message, CLEAR_HISTORY_COUNTS_PATTERN)
    assert.match(message, CLEAR_HISTORY_ACTIVE_SESSION_PATTERN)
    assert.match(message, CLEAR_HISTORY_UNDO_PATTERN)
})

// biome-ignore lint/nursery/useExpect: node:test uses assert-based checks here.
test("clear history collections removes saved and archived history only", () => {
    const state = {
        roster: ["Ana"],
        activeSession: { id: "active-1" },
        history: [{ id: "session-1" }],
        archivedHistory: [{ id: "session-2" }],
    }

    clearHistoryCollections(state)

    assert.deepEqual(state.history, [])
    assert.deepEqual(state.archivedHistory, [])
    assert.deepEqual(state.roster, ["Ana"])
    assert.deepEqual(state.activeSession, { id: "active-1" })
})
