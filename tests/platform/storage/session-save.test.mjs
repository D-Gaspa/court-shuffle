import assert from "node:assert/strict"
import test from "node:test"

import { buildTournamentSession } from "../../../js/features/session/setup/start.js"
import { saveStateToStorage } from "../../../js/platform/storage/index.js"
import { STRAIGHT_SET_SCORE } from "../../support/constants.mjs"

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

function createSessionSummary() {
    return {
        createdAt: "2026-04-29T23:31:00.000Z",
        leaderboardMode: "singles",
        sessionId: "session-summary-regression",
        title: "Session Summary",
        date: "2026-04-29T23:30:00.000Z",
        players: ["Ana", "Bea"],
        matchSummary: { played: 1, decided: 1 },
        miniTournamentWinners: [],
        notableResults: [],
        leaderboard: [],
        tournamentRecap: [
            {
                label: "Session Recap",
                players: ["Ana", "Bea"],
                tournaments: [
                    {
                        label: "Tournament 1",
                        winner: "",
                        rounds: [createSummaryRound()],
                    },
                ],
            },
        ],
    }
}

function createSummaryRound() {
    return {
        label: "Round 1",
        matches: [
            {
                courtLabel: "Court 1",
                pool: "",
                score: "6-4",
                winnerLabel: "Ana",
                teams: [
                    { label: "Team 1", players: ["Ana"], won: true, ratingImpact: null },
                    { label: "Team 2", players: ["Bea"], won: false, ratingImpact: null },
                ],
            },
        ],
    }
}

function createHistorySessionWithSummary() {
    return {
        id: "session-summary-regression",
        date: "2026-04-29T23:30:00.000Z",
        players: ["Ana", "Bea"],
        teamCount: 2,
        mode: "tournament",
        courtCount: 1,
        rounds: [
            {
                matches: [{ court: 1, teams: [["Ana"], ["Bea"]], teamIds: [0, 1] }],
                sitOuts: [],
                scores: [{ court: 1, sets: STRAIGHT_SET_SCORE }],
                byes: [],
                losersByes: [],
                tournamentRoundLabel: "Round 1",
            },
        ],
        tournamentFormat: "elimination",
        tournamentTeamSize: 1,
        sessionSummary: createSessionSummary(),
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

test("saves tournament session summaries without bracket pool labels", () => {
    const state = {
        roster: ["Ana", "Bea"],
        activeSession: null,
        history: [createHistorySessionWithSummary()],
        archivedHistory: [],
        ratings: null,
        lastExportedAt: null,
    }
    const storage = createMemoryStorage()
    const result = saveStateToStorage(state, storage)

    assert.equal(result.ok, true)
    assert.equal(
        JSON.parse(storage.snapshot()[STORAGE_KEY]).history[0].sessionSummary.tournamentRecap[0].tournaments[0]
            .rounds[0].matches[0].pool,
        "",
    )
})
