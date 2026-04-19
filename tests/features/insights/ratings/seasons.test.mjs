import assert from "node:assert/strict"
import test from "node:test"

import {
    archiveCurrentRatingSeason,
    createEmptyRatingsState,
    startNewRatingSeason,
} from "../../../../js/features/insights/ratings/seasons.js"

test("starting a new rating season archives the previous active season with snapshots", () => {
    const firstState = startNewRatingSeason({
        ratings: createEmptyRatingsState(),
        label: "Spring 2027",
        startedAt: "2027-03-01T00:00:00.000Z",
    })

    const nextState = startNewRatingSeason({
        ratings: firstState,
        label: "Summer 2027",
        startedAt: "2027-06-01T00:00:00.000Z",
        snapshots: {
            singles: {
                generatedAt: "2027-06-01T00:00:00.000Z",
                players: Object.fromEntries([
                    [
                        "Ana",
                        {
                            rating: 1540,
                            ratedMatchCount: 12,
                            wins: 8,
                            losses: 4,
                            provisional: false,
                            seasonHigh: 1550,
                            seasonLow: 1490,
                            deltaFromStart: 40,
                        },
                    ],
                ]),
                leaderboard: ["Ana"],
            },
            doubles: null,
        },
    })

    assert.equal(nextState.currentSeasonId.includes("summer-2027"), true)
    assert.equal(nextState.seasons.length, 2)
    assert.equal(nextState.seasons[0].status, "archived")
    assert.equal(nextState.seasons[0].endedAt, "2027-06-01T00:00:00.000Z")
    assert.deepEqual(nextState.seasons[0].snapshots.singles.leaderboard, ["Ana"])
    assert.equal(nextState.seasons[1].status, "active")
    assert.equal(nextState.seasons[1].label, "Summer 2027")
})

test("archiving the current rating season clears the active season and preserves snapshots", () => {
    const firstState = startNewRatingSeason({
        ratings: createEmptyRatingsState(),
        label: "Spring 2027",
        startedAt: "2027-03-01T00:00:00.000Z",
    })

    const archivedState = archiveCurrentRatingSeason({
        ratings: firstState,
        endedAt: "2027-06-01T00:00:00.000Z",
        snapshots: {
            singles: {
                generatedAt: "2027-06-01T00:00:00.000Z",
                players: Object.fromEntries([
                    [
                        "Ana",
                        {
                            rating: 1540,
                            ratedMatchCount: 12,
                            wins: 8,
                            losses: 4,
                            provisional: false,
                            seasonHigh: 1550,
                            seasonLow: 1490,
                            deltaFromStart: 40,
                        },
                    ],
                ]),
                leaderboard: ["Ana"],
            },
            doubles: null,
        },
    })

    assert.equal(archivedState.currentSeasonId, null)
    assert.equal(archivedState.seasons.length, 1)
    assert.equal(archivedState.seasons[0].status, "archived")
    assert.equal(archivedState.seasons[0].endedAt, "2027-06-01T00:00:00.000Z")
    assert.deepEqual(archivedState.seasons[0].snapshots.singles.leaderboard, ["Ana"])
})
