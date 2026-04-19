import assert from "node:assert/strict"
import test from "node:test"

import { createHistoryActions } from "../js/features/history/list/actions.js"
import { buildHistoryRemixPrefill, HISTORY_REMIX_ACTIONS } from "../js/features/history/remix/index.js"

const LATEST_PHASE_PATTERN = /latest saved phase/
const SEED_LOCK_PATTERN = /seed lock/
const FRESH_SEED_PATTERN = /fresh seed/

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
        onStatus: noop,
        persist: noop,
        refreshHistory: noop,
        showConfirmDialog: noop,
        state: { history: [], archivedHistory: [] },
        switchView: noop,
    })
}

test("history remix copy references the latest saved phase for continued sessions", () => {
    const prefill = buildHistoryRemixPrefill(createPhasedSession(), HISTORY_REMIX_ACTIONS.sameSeed, [
        "Ana",
        "Bea",
        "Cora",
        "Dana",
    ])

    assert.equal(prefill.currentStep, "setup")
    assert.equal(prefill.notice, "")
    assert.equal(prefill.historySeed.variant, "same-seed")
    assert.equal(prefill.historySeed.lockedFields.roster, true)
    assert.equal(prefill.historySeed.lockedFields.courtCount, true)
    assert.match(prefill.historySeed.detail, LATEST_PHASE_PATTERN)
    assert.match(prefill.historySeed.detail, SEED_LOCK_PATTERN)
})

test("reuse players only prefills the roster and stays on the roster step", () => {
    const prefill = buildHistoryRemixPrefill(createPhasedSession(), HISTORY_REMIX_ACTIONS.reusePlayers, [
        "Ana",
        "Bea",
        "Cora",
        "Dana",
    ])

    assert.equal(prefill.currentStep, "roster")
    assert.equal(prefill.gameMode, null)
    assert.equal(prefill.notice, "")
    assert.equal(prefill.historySeed, null)
})

test("reuse settings stores a fresh-seed seeded-history context", () => {
    const prefill = buildHistoryRemixPrefill(createPhasedSession(), HISTORY_REMIX_ACTIONS.newSeed, [
        "Ana",
        "Bea",
        "Cora",
        "Dana",
    ])

    assert.equal(prefill.currentStep, "setup")
    assert.equal(prefill.notice, "")
    assert.equal(prefill.historySeed.variant, "new-seed")
    assert.match(prefill.historySeed.detail, LATEST_PHASE_PATTERN)
    assert.match(prefill.historySeed.detail, FRESH_SEED_PATTERN)
})

test("history actions relabel phased session reuse actions", () => {
    const actions = createHistoryActionsHarness().resolveActiveHistoryActions(createPhasedSession())

    assert.equal(actions[0].label, "Reuse Latest Phase")
    assert.equal(actions[1].label, "Reuse Settings")
})
