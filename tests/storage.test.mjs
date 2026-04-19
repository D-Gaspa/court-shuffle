import assert from "node:assert/strict"
import test from "node:test"

import {
    createStateExport,
    loadStateFromStorage,
    parseStateImport,
    saveStateToStorage,
} from "../js/platform/storage/index.js"

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
        ratings: null,
        lastExportedAt: null,
    }
}

function cloneSampleState() {
    return JSON.parse(JSON.stringify(createSampleState()))
}

function createSinglesTeams() {
    return [
        { id: 1, name: "Ana", players: ["Ana"] },
        { id: 2, name: "Bea", players: ["Bea"] },
    ]
}

function createEmptyBracket() {
    return {
        pools: { winners: [], losers: [] },
        eliminated: [],
        champion: null,
        standings: {},
    }
}

function createTournamentRoundFixture() {
    return {
        matches: [{ court: 1, teams: [["Ana"], ["Bea"]], teamIds: [1, 2] }],
        sitOuts: [],
        scores: null,
        byes: [],
        losersByes: [],
        tournamentRoundLabel: "Round 1",
    }
}

function createTournamentRunFixture() {
    return {
        players: ["Ana", "Bea"],
        tournamentLevelSitOuts: [],
        rounds: [createTournamentRoundFixture()],
        currentRound: 0,
        tournamentComplete: false,
        tournamentFormat: "elimination",
        tournamentTeamSize: 1,
        teams: createSinglesTeams(),
        seeding: "random",
        bracket: createEmptyBracket(),
        tournamentRound: 0,
        allRoundsGenerated: false,
    }
}

function createTournamentSeriesFixture(currentTournamentIndex) {
    return {
        id: "active-2",
        date: "2026-04-09T00:00:00.000Z",
        players: ["Ana", "Bea"],
        teamCount: 2,
        mode: "tournament",
        courtCount: 1,
        rounds: [createTournamentRoundFixture()],
        currentRound: 0,
        tournamentFormat: "elimination",
        tournamentTeamSize: 1,
        teams: createSinglesTeams(),
        bracket: createEmptyBracket(),
        tournamentRound: 0,
        allRoundsGenerated: false,
        tournamentComplete: false,
        tournamentSeries: {
            matchType: "singles",
            format: "elimination",
            courtCount: 1,
            courtHandling: "queue",
            allowNotStrictDoubles: false,
            seed: "seed",
            maxTournaments: 1,
            currentTournamentIndex,
            tournaments: [createTournamentRunFixture()],
        },
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

test("imports history with arbitrary completed tournament scores", () => {
    const state = cloneSampleState()
    state.history[0].mode = "tournament"
    state.history[0].tournamentFormat = "elimination"
    state.history[0].tournamentTeamSize = 1
    state.history[0].teams = createSinglesTeams()
    state.history[0].bracket = createEmptyBracket()
    state.history[0].rounds[0].matches[0].teamIds = [1, 2]
    state.history[0].rounds[0].scores[0].sets = [[3, 2, { tb: [7, 5] }]]

    const imported = parseStateImport(JSON.stringify(state))

    assert.deepEqual(imported.state.history[0].rounds[0].scores[0].sets, [[3, 2, { tb: [7, 5] }]])
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
        ratings: null,
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

test("load returns failure metadata for out-of-bounds active round indexes", () => {
    const state = cloneSampleState()
    state.activeSession = {
        id: "active-1",
        date: "2026-04-09T00:00:00.000Z",
        players: ["Ana", "Bea"],
        teamCount: 2,
        mode: "singles",
        courtCount: 1,
        rounds: [
            {
                matches: [{ court: 1, teams: [["Ana"], ["Bea"]] }],
                sitOuts: [],
                scores: null,
                byes: [],
                losersByes: [],
            },
        ],
        currentRound: 4,
    }

    const storage = createMemoryStorage({
        [STORAGE_KEY]: JSON.stringify(state),
    })
    const result = loadStateFromStorage(storage)

    assert.equal(result.status.ok, false)
    assert.equal(result.status.code, "load_failed")
})

test("parse rejects invalid session dates in backups", () => {
    const state = cloneSampleState()
    state.history[0].date = "not-a-date"

    assert.throws(() => parseStateImport(JSON.stringify(state)), {
        message: "Backup file contains invalid data. state.history[0].date must be a valid date string.",
    })
})

test("parse rejects reserved delimiters in player names", () => {
    const state = cloneSampleState()
    state.roster = ["Ana||Bea"]

    assert.throws(() => parseStateImport(JSON.stringify(state)), {
        message: 'Backup file contains invalid data. state.roster[0] must not contain "||" or ",".',
    })
})

test("parse rejects out-of-bounds tournament series indexes", () => {
    const state = cloneSampleState()
    state.activeSession = createTournamentSeriesFixture(3)

    assert.throws(() => parseStateImport(JSON.stringify(state)), {
        message:
            "Backup file contains invalid data. state.activeSession.tournamentSeries.currentTournamentIndex must reference an existing tournament.",
    })
})
