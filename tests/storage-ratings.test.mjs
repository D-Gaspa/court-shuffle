// biome-ignore-all lint/nursery/useExpect: node:test uses assert-based checks here.
// biome-ignore-all lint/style/noMagicNumbers: compact persistence fixtures keep the ratings tests readable.
import assert from "node:assert/strict"
import test from "node:test"

import { parseStateImport } from "../js/core/storage.js"

function createStateWithRatings() {
    return {
        roster: ["Ana", "Bea"],
        activeSession: null,
        history: [],
        archivedHistory: [],
        ratings: {
            currentSeasonId: "spring-2027-2027-03-01",
            seasons: [
                {
                    id: "spring-2027-2027-03-01",
                    label: "Spring 2027",
                    startedAt: "2027-03-01T18:00:00.000Z",
                    endedAt: null,
                    status: "active",
                    baselineRating: 1500,
                    tuning: {
                        establishedK: 24,
                        provisionalK: 40,
                        provisionalMatchThreshold: 10,
                    },
                    snapshots: {
                        singles: null,
                        doubles: null,
                    },
                },
            ],
        },
        lastExportedAt: null,
    }
}

test("parse accepts ratings state alongside legacy top-level fields", () => {
    const imported = parseStateImport(JSON.stringify(createStateWithRatings()))

    assert.equal(imported.state.ratings.currentSeasonId, "spring-2027-2027-03-01")
    assert.equal(imported.state.ratings.seasons.length, 1)
    assert.equal(imported.state.ratings.seasons[0].label, "Spring 2027")
})

test("parse rejects currentSeasonId that does not point at an existing active season", () => {
    const state = createStateWithRatings()
    state.ratings.currentSeasonId = "missing-season"

    assert.throws(() => parseStateImport(JSON.stringify(state)), {
        message: "Backup file contains invalid data. state.ratings.currentSeasonId must reference an existing season.",
    })
})

test("parse rejects archived seasons without an end date", () => {
    const state = createStateWithRatings()
    state.ratings.currentSeasonId = null
    state.ratings.seasons[0].status = "archived"
    state.ratings.seasons[0].endedAt = null

    assert.throws(() => parseStateImport(JSON.stringify(state)), {
        message:
            "Backup file contains invalid data. state.ratings.seasons[0].endedAt must be a valid date string for an archived season.",
    })
})
