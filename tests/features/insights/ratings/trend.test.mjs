import assert from "node:assert/strict"
import test from "node:test"

import { buildDisplayPoints } from "../../../../js/features/insights/stats/ui/ratings-trend-points.js"

const EXPECTED_GROUPED_POINT_COUNT = 3
const EXPECTED_SESSION_ONE_RATING = 1525

function createTrend() {
    return [
        { matchNumber: 0, rating: 1500, type: "baseline" },
        {
            matchNumber: 1,
            rating: 1512,
            nightGroupId: "night:session-1",
            sessionDate: "2027-03-10T20:00:00.000Z",
            sessionId: "session-1",
            type: "match",
        },
        {
            matchNumber: 2,
            rating: 1525,
            nightGroupId: "night:session-1",
            sessionDate: "2027-03-10T20:00:00.000Z",
            sessionId: "session-1",
            type: "match",
        },
        {
            matchNumber: 3,
            rating: 1518,
            nightGroupId: "night:session-2",
            sessionDate: "2027-03-17T20:00:00.000Z",
            sessionId: "session-2",
            type: "match",
        },
    ]
}

test("session trend grouping collapses match points into one point per saved night", () => {
    const points = buildDisplayPoints(createTrend(), "session")

    assert.equal(points.length, EXPECTED_GROUPED_POINT_COUNT)
    assert.equal(points[1].sessionId, "session-1")
    assert.equal(points[1].rating, EXPECTED_SESSION_ONE_RATING)
    assert.equal(points[1].sessionMatchCount, 2)
    assert.equal(points[2].tooltipTitle, "Night 2")
})
