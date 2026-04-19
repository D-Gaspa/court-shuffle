import assert from "node:assert/strict"
import test from "node:test"

import { buildRestrictedTeamsFromSessionPhases } from "../js/domains/tournament/setup/advanced/model/restriction-collection.js"

function createMatch(teamA, teamB) {
    return [teamA, teamB]
}

function createScoredRound(matchTeams) {
    return {
        matches: matchTeams.map((teams, index) => ({
            court: index + 1,
            teams,
        })),
        sitOuts: [],
        scores: matchTeams.map((_, index) => ({
            court: index + 1,
            sets: [[6, 4]],
        })),
        byes: [],
        losersByes: [],
    }
}

function createUnscoredRound(matchTeams) {
    return {
        matches: matchTeams.map((teams, index) => ({
            court: index + 1,
            teams,
        })),
        sitOuts: [],
        scores: matchTeams.map(() => null),
        byes: [],
        losersByes: [],
    }
}

function createDoublesRun(rounds) {
    return {
        players: ["Ana", "Bea", "Carla", "Dina"],
        tournamentLevelSitOuts: [],
        rounds,
        currentRound: 0,
        tournamentComplete: false,
        tournamentFormat: "elimination",
        tournamentTeamSize: 2,
        teams: [],
        seeding: "random",
        bracket: null,
        tournamentRound: 0,
        allRoundsGenerated: false,
    }
}

function createPhase(id, runs) {
    return {
        id,
        createdAt: "2026-04-14T00:00:00.000Z",
        players: ["Ana", "Bea", "Carla", "Dina"],
        courtCount: 1,
        allowNotStrictDoubles: false,
        tournamentConfig: {
            format: "elimination",
            teamSize: 2,
            courtCount: 1,
            courtHandling: "queue",
            allowNotStrictDoubles: false,
            advanced: {
                singlesOpeningMatchups: [],
                doublesLockedPairs: [],
                doublesRestrictedTeams: [],
                forcedSitOutPlayer: null,
                singlesByePlayers: [],
                doublesByeTeams: [],
                singlesNextUpPlayers: [],
                doublesNextUpTeams: [],
            },
            seed: null,
        },
        continuation: {
            sourcePhaseIndex: null,
            sourceTournamentIndex: null,
            inheritedPhaseIndexes: [],
            addedPlayers: [],
            removedPlayers: [],
            abandonedFutureTournamentIndexes: [],
            createdAt: "2026-04-14T00:00:00.000Z",
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
        tournamentSeries: {
            matchType: "doubles",
            format: "elimination",
            courtCount: 1,
            courtHandling: "queue",
            allowNotStrictDoubles: false,
            seed: "seed",
            maxTournaments: runs.length,
            currentTournamentIndex: 0,
            tournaments: runs,
        },
    }
}

test("buildRestrictedTeamsFromSessionPhases collects teams across all played phases", () => {
    const session = {
        phases: [
            createPhase("phase-1", [
                createDoublesRun([createScoredRound([createMatch(["Ana", "Bea"], ["Carla", "Dina"])])]),
            ]),
            createPhase("phase-2", [
                createDoublesRun([createScoredRound([createMatch(["Ana", "Carla"], ["Bea", "Dina"])])]),
            ]),
        ],
    }

    const restrictedTeams = buildRestrictedTeamsFromSessionPhases({
        session,
        activePlayers: ["Ana", "Bea", "Carla", "Dina"],
        allowNotStrictDoubles: false,
        lockedPairs: [],
    })

    assert.deepEqual(restrictedTeams, [
        ["Ana", "Bea"],
        ["Carla", "Dina"],
        ["Ana", "Carla"],
        ["Bea", "Dina"],
    ])
})

test("buildRestrictedTeamsFromSessionPhases ignores unscored future runs", () => {
    const session = {
        phases: [
            createPhase("phase-1", [
                createDoublesRun([createScoredRound([createMatch(["Ana", "Bea"], ["Carla", "Dina"])])]),
                createDoublesRun([createUnscoredRound([createMatch(["Ana", "Dina"], ["Bea", "Carla"])])]),
            ]),
        ],
    }

    const restrictedTeams = buildRestrictedTeamsFromSessionPhases({
        session,
        activePlayers: ["Ana", "Bea", "Carla", "Dina"],
        allowNotStrictDoubles: false,
        lockedPairs: [],
    })

    assert.deepEqual(restrictedTeams, [
        ["Ana", "Bea"],
        ["Carla", "Dina"],
    ])
})

test("buildRestrictedTeamsFromSessionPhases filters out incompatible teams for the next roster", () => {
    const session = {
        phases: [
            createPhase("phase-1", [
                createDoublesRun([createScoredRound([createMatch(["Ana", "Bea"], ["Carla", "Dina"])])]),
            ]),
        ],
    }

    const restrictedTeams = buildRestrictedTeamsFromSessionPhases({
        session,
        activePlayers: ["Ana", "Bea", "Carla"],
        allowNotStrictDoubles: false,
        lockedPairs: [],
    })

    assert.deepEqual(restrictedTeams, [["Ana", "Bea"]])
})
