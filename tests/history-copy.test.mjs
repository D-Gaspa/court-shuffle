import assert from "node:assert/strict"
import test from "node:test"

import { createHistoryActions } from "../js/history/actions.js"
import { buildHistoryRemixPrefill, HISTORY_REMIX_ACTIONS } from "../js/history/remix.js"

const LATEST_PHASE_PATTERN = /latest saved phase/
const SEED_LOCK_PATTERN = /seed lock/

function createPhasedSession() {
    return {
        id: "session-1",
        mode: "tournament",
        players: ["Ana", "Bea", "Cora", "Dana", "Eva"],
        remix: {
            sourceMode: "tournament",
            players: ["Ana", "Bea", "Cora", "Dana", "Eva"],
            tournamentConfig: {
                format: "consolation",
                teamSize: 2,
                courtCount: 1,
                courtHandling: "queue",
                allowNotStrictDoubles: false,
                advanced: {},
                seed: "locked-seed",
            },
        },
        phases: [
            {
                id: "session-1-phase-0",
                players: ["Ana", "Bea", "Cora", "Dana"],
                tournamentSeries: {
                    tournaments: [{ rounds: [{}] }],
                },
            },
            {
                id: "session-1-phase-1",
                players: ["Ana", "Bea", "Cora", "Dana", "Eva"],
                tournamentSeries: {
                    tournaments: [{ rounds: [{}] }],
                },
            },
        ],
    }
}

function noop() {
    return null
}

function createHistoryActionsHarness() {
    return createHistoryActions({
        launchHistoryRemix: noop,
        persist: noop,
        refreshHistory: noop,
        showConfirmDialog: noop,
        state: { history: [], archivedHistory: [] },
        switchView: noop,
    })
}

// biome-ignore lint/nursery/useExpect: node:test uses assert-based checks here.
test("history remix copy references the latest saved phase for continued sessions", () => {
    const prefill = buildHistoryRemixPrefill(createPhasedSession(), HISTORY_REMIX_ACTIONS.sameSeed, [
        "Ana",
        "Bea",
        "Cora",
        "Dana",
    ])

    assert.match(prefill.notice, LATEST_PHASE_PATTERN)
    assert.match(prefill.notice, SEED_LOCK_PATTERN)
})

// biome-ignore lint/nursery/useExpect: node:test uses assert-based checks here.
test("history actions relabel phased session reuse actions", () => {
    const actions = createHistoryActionsHarness().resolveActiveHistoryActions(createPhasedSession())

    assert.equal(actions[0].label, "Reuse Latest Phase")
})
