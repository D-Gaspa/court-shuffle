import assert from "node:assert/strict"
import test from "node:test"

import { resolveSessionSummary } from "../../../../js/features/history/summary/index.js"
import { createEmptyRatingsState, startNewRatingSeason } from "../../../../js/features/insights/ratings/seasons.js"
import { STRAIGHT_SET_SCORE } from "../../../support/constants.mjs"

function createSinglesSession() {
    return {
        id: "session-singles",
        date: "2027-03-10T20:00:00.000Z",
        mode: "tournament",
        tournamentTeamSize: 1,
        teamCount: 2,
        courtCount: 1,
        players: ["Ana", "Bea"],
        rounds: [],
        phases: [
            {
                id: "phase-0",
                createdAt: "2027-03-10T20:00:00.000Z",
                players: ["Ana", "Bea"],
                tournamentSeries: {
                    tournaments: [
                        {
                            tournamentTeamSize: 1,
                            teams: [],
                            bracket: { champion: null },
                            rounds: [
                                {
                                    tournamentRoundLabel: "Final",
                                    matches: [
                                        {
                                            court: 1,
                                            teams: [["Ana"], ["Bea"]],
                                        },
                                    ],
                                    scores: [{ court: 1, sets: STRAIGHT_SET_SCORE }],
                                    sitOuts: [],
                                    byes: [],
                                    losersByes: [],
                                },
                            ],
                        },
                    ],
                },
            },
        ],
    }
}

test("session summary rating impacts render singles elo deltas", () => {
    const historyEntry = createSinglesSession()
    const ratings = startNewRatingSeason({
        ratings: createEmptyRatingsState(),
        label: "Spring 2027",
        startedAt: "2027-03-01T00:00:00.000Z",
    })

    const summary = resolveSessionSummary({
        entry: historyEntry,
        history: [historyEntry],
        ratings,
    })

    const teams = summary?.tournamentRecap?.[0]?.tournaments?.[0]?.rounds?.[0]?.matches?.[0]?.teams
    assert.equal(summary?.leaderboardMode, "singles")
    assert.equal(teams?.[0]?.ratingImpact?.text, "+20 Elo")
    assert.equal(teams?.[1]?.ratingImpact?.text, "-20 Elo")
})
