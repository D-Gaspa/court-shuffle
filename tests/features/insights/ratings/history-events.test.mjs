import assert from "node:assert/strict"
import test from "node:test"

import { collectRatingEvents } from "../../../../js/features/insights/ratings/history-events.js"
import { createEmptyRatingsState, startNewRatingSeason } from "../../../../js/features/insights/ratings/seasons.js"
import { STRAIGHT_SET_SCORE } from "../../../support/constants.mjs"

function createSession(id, date, previousSessionId = null) {
    return {
        id,
        date,
        mode: "tournament",
        tournamentTeamSize: 2,
        night: previousSessionId ? { previousSessionId } : null,
        phases: [
            {
                id: `${id}-phase-0`,
                createdAt: date,
                players: ["Ana", "Bea", "Cara", "Dina"],
                tournamentSeries: {
                    tournaments: [
                        {
                            tournamentTeamSize: 2,
                            rounds: [
                                {
                                    matches: [
                                        {
                                            teams: [
                                                ["Ana", "Bea"],
                                                ["Cara", "Dina"],
                                            ],
                                        },
                                    ],
                                    scores: [{ court: 1, sets: STRAIGHT_SET_SCORE }],
                                },
                            ],
                        },
                    ],
                },
            },
        ],
    }
}

test("rating events carry the linked history night-group id", () => {
    const history = [
        createSession("session-1", "2027-03-10T20:00:00.000Z"),
        createSession("session-2", "2027-03-10T22:00:00.000Z", "session-1"),
    ]
    const ratings = startNewRatingSeason({
        ratings: createEmptyRatingsState(),
        label: "Spring 2027",
        startedAt: "2027-03-01T00:00:00.000Z",
    })

    const events = collectRatingEvents(history, ratings.seasons[0])

    assert.equal(events.length, 2)
    assert.equal(events[0].nightGroupId, "night:session-1")
    assert.equal(events[1].nightGroupId, "night:session-1")
})
