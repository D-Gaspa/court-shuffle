import assert from "node:assert/strict"
import test from "node:test"

import { buildContinuationSummaryModel } from "../js/features/session/setup/logic/continuation-summary.js"

const SAME_ROSTER_PATTERN = /Change the roster before continuing/
const ADDED_PLAYER_PATTERN = /Added: Eva/
const REMOVED_PLAYER_PATTERN = /Removed: Dana/
const COURT_LOCK_PATTERN = /stays locked at 1/
const FLEX_ENABLE_PATTERN = /2v1 doubles will be enabled/
const ABANDON_PATTERN = /2 unplayed mini tournaments/
const SUMMARY_ITEM_COUNT = 5

function createDraftOverrides(overrides = {}) {
    return {
        continuation: {
            sourcePhaseIndex: 0,
            sourceTournamentIndex: 1,
            basePlayers: ["Ana", "Bea", "Cora", "Dana"],
            baseCourtCount: 1,
            baseAllowNotStrictDoubles: false,
            abandonedTournamentCount: 2,
            ...overrides.continuation,
        },
        tournament: {
            courtCount: 2,
            allowNotStrictDoubles: true,
            ...overrides.tournament,
        },
    }
}

test("continuation summary model describes roster and setup changes", () => {
    const model = buildContinuationSummaryModel({
        draft: createDraftOverrides(),
        selectedPlayers: ["Ana", "Bea", "Cora", "Eva"],
    })

    assert.equal(model?.items.length, SUMMARY_ITEM_COUNT)
    assert.match(model?.items[1], ADDED_PLAYER_PATTERN)
    assert.match(model?.items[1], REMOVED_PLAYER_PATTERN)
    assert.match(model?.items[2], COURT_LOCK_PATTERN)
    assert.match(model?.items[3], FLEX_ENABLE_PATTERN)
    assert.match(model?.items[4], ABANDON_PATTERN)
})

test("continuation summary model handles unchanged roster and settings", () => {
    const model = buildContinuationSummaryModel({
        draft: createDraftOverrides({
            continuation: {
                abandonedTournamentCount: 0,
            },
            tournament: {
                courtCount: 1,
                allowNotStrictDoubles: false,
            },
        }),
        selectedPlayers: ["Ana", "Bea", "Cora", "Dana"],
    })

    assert.match(model?.items[1], SAME_ROSTER_PATTERN)
    assert.equal(model?.items[2], "Court count stays locked at 1.")
    assert.equal(model?.items[3], "2v1 doubles remains disabled.")
    assert.equal(model?.items[4], "No future mini tournaments are waiting in the current phase.")
})
