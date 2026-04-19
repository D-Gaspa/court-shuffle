import assert from "node:assert/strict"
import test from "node:test"

import { buildRatingsModel } from "../../../../js/features/insights/ratings/model.js"
import { createEmptyRatingsState, startNewRatingSeason } from "../../../../js/features/insights/ratings/seasons.js"
import { LOSER_RATING, STRAIGHT_SET_SCORE, WINNER_RATING } from "../../../support/constants.mjs"

function createScoredRound(teams, sets = STRAIGHT_SET_SCORE) {
    return {
        matches: [{ court: 1, teams }],
        sitOuts: [],
        scores: [{ court: 1, sets }],
        byes: [],
        losersByes: [],
        tournamentRoundLabel: "Round 1",
    }
}

function createRun({ players, teamSize, rounds }) {
    return {
        players,
        tournamentLevelSitOuts: [],
        rounds,
        currentRound: 0,
        tournamentComplete: true,
        tournamentFormat: "round-robin",
        tournamentTeamSize: teamSize,
        teams: [],
        seeding: "random",
        bracket: {
            pools: { winners: [], losers: [] },
            eliminated: [],
            champion: null,
            standings: {},
        },
        tournamentRound: 0,
        allRoundsGenerated: false,
    }
}

function createPhase({ id, players, rounds }) {
    return {
        id,
        createdAt: "2027-03-10T20:00:00.000Z",
        players,
        courtCount: 1,
        allowNotStrictDoubles: false,
        tournamentConfig: {
            format: "round-robin",
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
            seed: "seed",
        },
        tournamentSeries: {
            matchType: "doubles",
            format: "round-robin",
            courtCount: 1,
            courtHandling: "queue",
            allowNotStrictDoubles: false,
            seed: "seed",
            maxTournaments: 1,
            currentTournamentIndex: 0,
            tournaments: [createRun({ players, teamSize: 2, rounds })],
        },
        continuation: {
            sourcePhaseIndex: null,
            sourceTournamentIndex: null,
            inheritedPhaseIndexes: [],
            addedPlayers: [],
            removedPlayers: [],
            abandonedFutureTournamentIndexes: [],
            createdAt: "2027-03-10T20:00:00.000Z",
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
    }
}

function createDoublesHistorySession({ id, players, rounds }) {
    return {
        id,
        date: "2027-03-10T20:00:00.000Z",
        players,
        teamCount: 2,
        mode: "tournament",
        courtCount: 1,
        rounds: [],
        currentPhaseIndex: 0,
        phases: [createPhase({ id: `${id}-phase-0`, players, rounds })],
    }
}

function createActiveRatings() {
    return startNewRatingSeason({
        ratings: createEmptyRatingsState(),
        label: "Spring 2027",
        startedAt: "2027-03-01T00:00:00.000Z",
    })
}

function createExtendedDoublesHistoryRoundsFixture() {
    return [
        createScoredRound([
            ["Ana", "Bea"],
            ["Cara", "Dina"],
        ]),
        createScoredRound([
            ["Cara", "Ana"],
            ["Bea", "Dina"],
        ]),
        createScoredRound([
            ["Ana", "Bea"],
            ["Cara", "Dina"],
        ]),
        createScoredRound([
            ["Ana", "Bea"],
            ["Cara", "Dina"],
        ]),
        createScoredRound([
            ["Ana", "Bea"],
            ["Cara", "Dina"],
        ]),
        createScoredRound([
            ["Ana", "Bea"],
            ["Cara", "Dina"],
        ]),
        createScoredRound([
            ["Ana", "Bea"],
            ["Cara", "Dina"],
        ]),
        createScoredRound([
            ["Ana", "Bea"],
            ["Cara", "Dina"],
        ]),
        createScoredRound([
            ["Ana", "Bea"],
            ["Cara", "Dina"],
        ]),
        createScoredRound([
            ["Cara", "Ana"],
            ["Bea", "Dina"],
        ]),
        createScoredRound([
            ["Ana", "Bea"],
            ["Cara", "Dina"],
        ]),
    ]
}

test("doubles replay uses individualized deltas with each player's own K-factor", () => {
    const model = buildRatingsModel({
        history: [
            createDoublesHistorySession({
                id: "session-2",
                players: ["Ana", "Bea", "Cara", "Dina"],
                rounds: createExtendedDoublesHistoryRoundsFixture(),
            }),
        ],
        ratings: createActiveRatings(),
    })

    assert.equal(model.ladders.doubles.players.Ana.provisional, false)
    assert.equal(model.ladders.doubles.players.Bea.provisional, false)
    assert.equal(model.ladders.doubles.players.Cara.provisional, false)
    assert.equal(model.ladders.doubles.players.Dina.provisional, false)
    assert.notEqual(model.ladders.doubles.players.Ana.rating, model.ladders.doubles.players.Bea.rating)
    assert.notEqual(model.ladders.doubles.players.Cara.rating, model.ladders.doubles.players.Dina.rating)
})

test("doubles replay rates 2v1 matches using the solo-side multiplier", () => {
    const model = buildRatingsModel({
        history: [
            createDoublesHistorySession({
                id: "session-3",
                players: ["Ana", "Bea", "Cara"],
                rounds: [createScoredRound([["Ana"], ["Bea", "Cara"]])],
            }),
        ],
        ratings: createActiveRatings(),
    })

    assert.deepEqual(model.ladders.doubles.leaderboard, ["Ana", "Bea", "Cara"])
    assert.equal(model.ladders.doubles.players.Ana.rating, WINNER_RATING)
    assert.equal(model.ladders.doubles.players.Bea.rating, LOSER_RATING)
    assert.equal(model.ladders.doubles.players.Cara.rating, LOSER_RATING)
})
