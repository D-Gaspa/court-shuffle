import assert from "node:assert/strict"
import test from "node:test"

import { buildTournamentSession } from "../../../js/features/session/setup/start.js"
import { saveStateToStorage } from "../../../js/platform/storage/index.js"

const STORAGE_KEY = "court-shuffle-data"

function createMemoryStorage() {
    const values = new Map()
    return {
        getItem: (key) => values.get(key) ?? null,
        removeItem: (key) => values.delete(key),
        setItem: (key, value) => values.set(key, value),
        snapshot: () => Object.fromEntries(values),
    }
}

test("saves active tournament sessions with no night grouping", () => {
    const activeSession = buildTournamentSession({
        players: ["Ana", "Bea", "Cora", "Dana"],
        courtCount: 1,
        tournamentConfig: {
            format: "elimination",
            teamSize: 1,
            courtHandling: "queue",
            allowNotStrictDoubles: false,
            advanced: {},
            seed: "storage-regression",
        },
    })
    const state = {
        roster: activeSession.players,
        activeSession,
        history: [],
        archivedHistory: [],
        ratings: null,
        lastExportedAt: null,
    }
    const storage = createMemoryStorage()
    const result = saveStateToStorage(state, storage)

    assert.equal(activeSession.night, null)
    assert.equal(result.ok, true)
    assert.equal(JSON.parse(storage.snapshot()[STORAGE_KEY]).activeSession.night, undefined)
})
