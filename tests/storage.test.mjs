// biome-ignore-all lint/nursery/useExpect: node:test uses assert-based checks here.
// biome-ignore-all lint/style/noMagicNumbers: inline tennis-score fixtures are intentional in tests.
import assert from "node:assert/strict"
import test from "node:test"

import { createStateExport, loadStateFromStorage, parseStateImport, saveStateToStorage } from "../js/core/storage.js"

const STORAGE_KEY = "court-shuffle-data"
const SAMPLE_SET = [6, 4]

function createSampleState() {
    return {
        roster: ["Ana", "Bea"],
        activeSession: null,
        history: [
            {
                id: "session-1",
                date: "2026-04-09T00:00:00.000Z",
                players: ["Ana", "Bea"],
                teamCount: 2,
                mode: "singles",
                courtCount: 1,
                rounds: [
                    {
                        matches: [
                            {
                                court: 1,
                                teams: [["Ana"], ["Bea"]],
                            },
                        ],
                        sitOuts: [],
                        scores: [
                            {
                                court: 1,
                                sets: [SAMPLE_SET],
                            },
                        ],
                        byes: [],
                        losersByes: [],
                        tournamentRoundLabel: "Round 1",
                    },
                ],
            },
        ],
        archivedHistory: [],
        lastExportedAt: null,
    }
}

function createMemoryStorage(initial = {}) {
    const values = new Map(Object.entries(initial))
    return {
        getItem(key) {
            return values.has(key) ? values.get(key) : null
        },
        setItem(key, value) {
            values.set(key, value)
        },
        removeItem(key) {
            values.delete(key)
        },
        snapshot() {
            return Object.fromEntries(values)
        },
    }
}

test("imports a current exported backup", () => {
    const state = createSampleState()
    const backup = createStateExport(state)
    const imported = parseStateImport(JSON.stringify(backup))

    assert.deepEqual(imported.state, state)
    assert.equal(typeof imported.exportedAt, "string")
})

test("imports a valid legacy plain-state backup", () => {
    const state = createSampleState()
    const imported = parseStateImport(JSON.stringify(state))

    assert.deepEqual(imported.state, state)
    assert.equal(imported.exportedAt, null)
})

test("rejects malformed backups with a stable validation error", () => {
    assert.throws(
        () =>
            parseStateImport(
                JSON.stringify({
                    roster: ["Ana"],
                    history: [null],
                    archivedHistory: [],
                }),
            ),
        {
            message: "Backup file contains invalid data. state.history[0] must be an object.",
        },
    )
})

test("load returns failure metadata for invalid stored data", () => {
    const storage = createMemoryStorage({
        [STORAGE_KEY]: "{not-json",
    })

    const result = loadStateFromStorage(storage)

    assert.equal(result.status.ok, false)
    assert.equal(result.status.code, "load_failed")
    assert.deepEqual(result.state, {
        roster: [],
        activeSession: null,
        history: [],
        archivedHistory: [],
        lastExportedAt: null,
    })
})

test("save failure returns metadata and preserves existing storage", () => {
    const previousState = createSampleState()
    const previousRaw = JSON.stringify(previousState)
    const failingStorage = {
        getItem(key) {
            return key === STORAGE_KEY ? previousRaw : null
        },
        setItem() {
            throw new Error("quota exceeded")
        },
        removeItem() {
            // Required by the storage interface under test.
        },
    }

    const result = saveStateToStorage(createSampleState(), failingStorage)

    assert.equal(result.ok, false)
    assert.equal(result.code, "save_failed")
    assert.equal(failingStorage.getItem(STORAGE_KEY), previousRaw)
})
