import assert from "node:assert/strict"
import test from "node:test"

import { buildBackupSummaryMessage } from "../js/history/backup.js"

const CONTINUATION_PHASE_PATTERN = /Saved sessions can include continuation phases/
const ACTIVE_SESSION_PATTERN = /1 active session in progress/
const ROSTER_COUNT_PATTERN = /4 roster players/

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
