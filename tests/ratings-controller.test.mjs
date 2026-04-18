// biome-ignore-all lint/nursery/useExpect: node:test uses assert-based checks here.
import assert from "node:assert/strict"
import test from "node:test"

import {
    buildSeasonDateHint,
    convertDateInputToIso,
    getEarliestHistoryDate,
    resolveInitialSeasonStartDate,
} from "../js/ratings/controller.js"
import { createEmptyRatingsState, startNewRatingSeason } from "../js/ratings/seasons.js"

const RETROACTIVE_PATTERN = /retroactive/i

function createHistory() {
    return [
        { id: "b", date: "2027-03-10T20:00:00.000Z" },
        { id: "a", date: "2027-02-01T18:00:00.000Z" },
    ]
}

test("first season defaults its start date to the earliest active history session", () => {
    const dateValue = resolveInitialSeasonStartDate({
        history: createHistory(),
        ratings: createEmptyRatingsState(),
    })

    assert.equal(dateValue, "2027-02-01")
})

test("subsequent seasons default their start date to today rather than earliest history", () => {
    const ratings = startNewRatingSeason({
        ratings: createEmptyRatingsState(),
        label: "Spring 2027",
        startedAt: "2027-02-01T00:00:00.000Z",
    })

    const dateValue = resolveInitialSeasonStartDate({
        history: createHistory(),
        ratings,
    })

    assert.equal(typeof dateValue, "string")
    assert.equal(dateValue.length, 10)
    assert.notEqual(dateValue, "2027-02-01")
})

test("season start date input converts into a valid ISO timestamp", () => {
    assert.equal(convertDateInputToIso("2027-02-01"), "2027-02-01T00:00:00.000Z")
    assert.equal(convertDateInputToIso("bad-date"), null)
})

test("season start hint explains retroactive first-season behavior", () => {
    assert.equal(getEarliestHistoryDate(createHistory())?.toISOString().slice(0, 10), "2027-02-01")
    assert.match(
        buildSeasonDateHint({
            history: createHistory(),
            ratings: createEmptyRatingsState(),
        }),
        RETROACTIVE_PATTERN,
    )
})
