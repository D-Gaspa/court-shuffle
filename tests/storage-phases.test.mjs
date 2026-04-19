import assert from "node:assert/strict"
import test from "node:test"

import { parseStateImport } from "../js/platform/storage/index.js"

function createAdvancedSettings() {
    return {
        singlesOpeningMatchups: [],
        doublesLockedPairs: [],
        doublesRestrictedTeams: [],
        forcedSitOutPlayer: null,
        singlesByePlayers: [],
        doublesByeTeams: [],
        singlesNextUpPlayers: [],
        doublesNextUpTeams: [],
    }
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
        teams: [
            { id: 1, name: "Ana", players: ["Ana"] },
            { id: 2, name: "Bea", players: ["Bea"] },
        ],
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
        teams: [
            { id: 1, name: "Ana", players: ["Ana"] },
            { id: 2, name: "Bea", players: ["Bea"] },
        ],
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

function createPhaseValidationState() {
    return {
        roster: ["Ana", "Bea"],
        activeSession: null,
        history: [],
        archivedHistory: [],
        lastExportedAt: null,
    }
}

function createExplicitPhaseSession() {
    return {
        ...createTournamentSeriesFixture(0),
        tournamentConfig: {
            format: "elimination",
            teamSize: 1,
            courtCount: 1,
            courtHandling: "queue",
            allowNotStrictDoubles: false,
            advanced: createAdvancedSettings(),
            seed: "seed",
        },
        currentPhaseIndex: 0,
        phases: [
            {
                id: "phase-1",
                createdAt: "2026-04-09T00:00:00.000Z",
                players: ["Ana", "Bea"],
                courtCount: 1,
                allowNotStrictDoubles: false,
                tournamentConfig: {
                    format: "elimination",
                    teamSize: 1,
                    courtCount: 1,
                    courtHandling: "queue",
                    allowNotStrictDoubles: false,
                    advanced: createAdvancedSettings(),
                    seed: "seed",
                },
                tournamentSeries: createTournamentSeriesFixture(0).tournamentSeries,
                continuation: {
                    sourcePhaseIndex: null,
                    sourceTournamentIndex: null,
                    inheritedPhaseIndexes: [],
                    addedPlayers: [],
                    removedPlayers: [],
                    abandonedFutureTournamentIndexes: [],
                    createdAt: "bad-date",
                    inheritedConfig: {
                        format: false,
                        teamSize: false,
                        courtCount: false,
                        allowNotStrictDoubles: false,
                    },
                    editedConfig: {
                        courtCount: false,
                        allowNotStrictDoubles: false,
                    },
                },
            },
        ],
    }
}

test("parse normalizes legacy tournament active sessions into a single phase", () => {
    const state = createPhaseValidationState()
    state.activeSession = createTournamentSeriesFixture(0)

    const imported = parseStateImport(JSON.stringify(state))

    assert.equal(imported.state.activeSession.currentPhaseIndex, 0)
    assert.equal(imported.state.activeSession.phases.length, 1)
    assert.equal(imported.state.activeSession.phases[0].id, "active-2-phase-0")
    assert.equal(imported.state.activeSession.phases[0].tournamentSeries.currentTournamentIndex, 0)
    assert.equal(imported.state.activeSession.phases[0].continuation.sourcePhaseIndex, null)
})

test("parse rejects invalid continuation metadata in explicit tournament phases", () => {
    const state = createPhaseValidationState()
    state.activeSession = createExplicitPhaseSession()

    assert.throws(() => parseStateImport(JSON.stringify(state)), {
        message:
            "Backup file contains invalid data. state.activeSession.phases[0].continuation.createdAt must be a valid date string.",
    })
})
