import assert from "node:assert/strict"
import test from "node:test"

import { buildArchivedRatingsModel, buildRatingsModel } from "../../../../js/features/insights/ratings/model.js"
import { createEmptyRatingsState, startNewRatingSeason } from "../../../../js/features/insights/ratings/seasons.js"
import {
    ARCHIVED_SINGLE_RATING,
    DEFAULT_RATING,
    LOSER_RATING,
    STRAIGHT_SET_SCORE,
    WINNER_RATING,
} from "../../../support/constants.mjs"

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

function createPhase({ id, players, teamSize, rounds }) {
    return {
        id,
        createdAt: "2027-03-10T20:00:00.000Z",
        players,
        courtCount: 1,
        allowNotStrictDoubles: false,
        tournamentConfig: {
            format: "round-robin",
            teamSize,
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
            matchType: teamSize === 1 ? "singles" : "doubles",
            format: "round-robin",
            courtCount: 1,
            courtHandling: "queue",
            allowNotStrictDoubles: false,
            seed: "seed",
            maxTournaments: 1,
            currentTournamentIndex: 0,
            tournaments: [createRun({ players, teamSize, rounds })],
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

function createHistorySession() {
    return {
        id: "session-1",
        date: "2027-03-10T20:00:00.000Z",
        players: ["Ana", "Bea", "Cara", "Dina"],
        teamCount: 2,
        mode: "tournament",
        courtCount: 1,
        rounds: [],
        currentPhaseIndex: 1,
        phases: [
            createPhase({
                id: "phase-0",
                players: ["Ana", "Bea"],
                teamSize: 1,
                rounds: [createScoredRound([["Ana"], ["Bea"]])],
            }),
            createPhase({
                id: "phase-1",
                players: ["Ana", "Bea", "Cara", "Dina"],
                teamSize: 2,
                rounds: [
                    createScoredRound([
                        ["Ana", "Bea"],
                        ["Cara", "Dina"],
                    ]),
                ],
            }),
        ],
    }
}

test("ratings replay builds separate singles and doubles ladders from phase-aware history", () => {
    const ratings = startNewRatingSeason({
        ratings: createEmptyRatingsState(),
        label: "Spring 2027",
        startedAt: "2027-03-01T00:00:00.000Z",
    })

    const model = buildRatingsModel({
        history: [createHistorySession()],
        ratings,
    })

    assert.equal(model.season.label, "Spring 2027")
    assert.deepEqual(model.ladders.singles.leaderboard, ["Ana", "Bea"])
    assert.deepEqual(model.ladders.doubles.leaderboard, ["Ana", "Bea", "Cara", "Dina"])
    assert.equal(model.ladders.singles.players.Ana.rating > DEFAULT_RATING, true)
    assert.equal(model.ladders.singles.players.Bea.rating < DEFAULT_RATING, true)
    assert.equal(model.ladders.doubles.players.Ana.rating, WINNER_RATING)
    assert.equal(model.ladders.doubles.players.Bea.rating, WINNER_RATING)
    assert.equal(model.ladders.doubles.players.Cara.rating, LOSER_RATING)
    assert.equal(model.ladders.doubles.players.Dina.rating, LOSER_RATING)
    assert.equal(model.ladders.doubles.players.Ana.trend.length, 2)
    assert.equal(model.ladders.doubles.players.Ana.trend[1].sessionId, "session-1")
    assert.equal(model.ladders.doubles.players.Ana.trend[1].type, "match")
})

test("ratings replay ignores history from before the active season start", () => {
    const ratings = startNewRatingSeason({
        ratings: createEmptyRatingsState(),
        label: "Late 2027",
        startedAt: "2027-04-01T00:00:00.000Z",
    })

    const model = buildRatingsModel({
        history: [createHistorySession()],
        ratings,
    })

    assert.deepEqual(model.ladders.singles.leaderboard, [])
    assert.deepEqual(model.ladders.doubles.leaderboard, [])
})

test("archived ratings model reads season snapshots without requiring replay history", () => {
    const ratings = {
        currentSeasonId: null,
        seasons: [
            {
                id: "spring-2027-2027-03-01",
                label: "Spring 2027",
                startedAt: "2027-03-01T00:00:00.000Z",
                endedAt: "2027-06-01T00:00:00.000Z",
                status: "archived",
                baselineRating: 1500,
                tuning: {
                    establishedK: 24,
                    provisionalK: 40,
                    provisionalMatchThreshold: 10,
                },
                snapshots: {
                    singles: {
                        generatedAt: "2027-06-01T00:00:00.000Z",
                        players: Object.fromEntries([
                            [
                                "Ana",
                                {
                                    rating: 1540,
                                    ratedMatchCount: 12,
                                    wins: 8,
                                    losses: 4,
                                    provisional: false,
                                    seasonHigh: 1552,
                                    seasonLow: 1490,
                                    deltaFromStart: 40,
                                },
                            ],
                        ]),
                        leaderboard: ["Ana"],
                    },
                    doubles: null,
                },
            },
        ],
    }

    const model = buildArchivedRatingsModel(ratings, "spring-2027-2027-03-01")

    assert.equal(model.season.status, "archived")
    assert.deepEqual(model.ladders.singles.leaderboard, ["Ana"])
    assert.equal(model.ladders.singles.players.Ana.rating, ARCHIVED_SINGLE_RATING)
    assert.deepEqual(model.ladders.singles.players.Ana.trend, [])
    assert.deepEqual(model.ladders.doubles.leaderboard, [])
})
