// biome-ignore-all lint/nursery/useExpect: node:test uses assert-based checks here.
// biome-ignore-all lint/style/noMagicNumbers: compact persistence fixtures keep the test readable.
import assert from "node:assert/strict"
import test from "node:test"

import { parseStateImport } from "../js/core/storage.js"

function createEmptyBracket() {
    return {
        pools: { winners: [], losers: [] },
        eliminated: [],
        champion: null,
        standings: {},
    }
}

function createLegacyRound() {
    return {
        matches: [
            {
                court: 1,
                teams: [["Ana"], ["Bea"]],
                teamIds: [1, 2],
            },
        ],
        sitOuts: [],
        scores: [
            {
                court: 1,
                sets: [[6, 4]],
            },
        ],
        byes: [],
        losersByes: [],
        tournamentRoundLabel: "Round 1",
    }
}

function createLegacyTournamentRun() {
    return {
        players: ["Ana", "Bea"],
        tournamentLevelSitOuts: [],
        rounds: [createLegacyRound()],
        currentRound: 0,
        tournamentComplete: true,
        tournamentFormat: "elimination",
        tournamentTeamSize: 2,
        teams: [
            { id: 1, name: "Ana", players: ["Ana"] },
            { id: 2, name: "Bea", players: ["Bea"] },
        ],
        seeding: "random",
        bracket: createEmptyBracket(),
        tournamentRound: 0,
        allRoundsGenerated: false,
        index: 1,
        skipped: false,
    }
}

function createLegacyHistoryTournamentState() {
    return {
        roster: ["Ana", "Bea"],
        activeSession: null,
        history: [
            {
                id: "session-1",
                date: "2026-04-09T00:00:00.000Z",
                players: ["Ana", "Bea"],
                teamCount: 2,
                mode: "tournament",
                courtCount: 1,
                rounds: [
                    {
                        matches: [
                            {
                                court: 1,
                                teams: [["Ana"], ["Bea"]],
                            },
                        ],
                        scores: [
                            {
                                court: 1,
                                sets: [[6, 4]],
                            },
                        ],
                        sitOuts: [],
                        byes: [],
                        losersByes: [],
                    },
                ],
                tournamentFormat: "elimination",
                tournamentTeamSize: 2,
                tournamentSeries: {
                    matchType: "doubles",
                    format: "elimination",
                    courtCount: 1,
                    courtHandling: "queue",
                    allowNotStrictDoubles: true,
                    seed: "seed",
                    maxTournaments: 3,
                    currentTournamentIndex: 1,
                    tournaments: [createLegacyTournamentRun()],
                },
            },
        ],
        archivedHistory: [],
        lastExportedAt: null,
    }
}

test("parse accepts compacted history tournament series with legacy current tournament indexes", () => {
    const imported = parseStateImport(JSON.stringify(createLegacyHistoryTournamentState()))

    assert.equal(imported.state.history[0].tournamentSeries.currentTournamentIndex, 1)
    assert.equal(imported.state.history[0].tournamentSeries.tournaments.length, 1)
    assert.equal(imported.state.history[0].currentPhaseIndex, 0)
    assert.equal(imported.state.history[0].phases.length, 1)
    assert.equal(imported.state.history[0].phases[0].id, "session-1-phase-0")
})
