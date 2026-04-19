// biome-ignore-all lint/nursery/useExpect: node:test uses assert-based checks here.
// biome-ignore-all lint/style/noMagicNumbers: compact fixtures keep the session-summary test readable.
import assert from "node:assert/strict"
import test from "node:test"

import { resolveSessionSummary } from "../js/history/session-summary.js"
import { createEmptyRatingsState, startNewRatingSeason } from "../js/ratings/seasons.js"

function createScoredRound(teams, sets = [[6, 4]]) {
    return {
        matches: [{ court: 1, teams }],
        sitOuts: [],
        scores: [{ court: 1, sets }],
        byes: [],
        losersByes: [],
        tournamentRoundLabel: "Round 1",
    }
}

function createRun({ players, rounds }) {
    return {
        players,
        tournamentLevelSitOuts: [],
        rounds,
        currentRound: 0,
        tournamentComplete: true,
        tournamentFormat: "round-robin",
        tournamentTeamSize: 2,
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

function createContinuation() {
    return {
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
    }
}

function createDoublesTournamentConfig() {
    return {
        format: "round-robin",
        teamSize: 2,
        courtCount: 1,
        courtHandling: "queue",
        allowNotStrictDoubles: true,
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
    }
}

function createHistoryPhase() {
    const players = ["Ana", "Bea", "Cara"]
    return {
        id: "phase-0",
        createdAt: "2027-03-10T20:00:00.000Z",
        players,
        courtCount: 1,
        allowNotStrictDoubles: true,
        tournamentConfig: createDoublesTournamentConfig(),
        tournamentSeries: {
            matchType: "doubles",
            format: "round-robin",
            courtCount: 1,
            courtHandling: "queue",
            allowNotStrictDoubles: true,
            seed: "seed",
            maxTournaments: 1,
            currentTournamentIndex: 0,
            tournaments: [
                createRun({
                    players,
                    rounds: [createScoredRound([["Ana"], ["Bea", "Cara"]])],
                }),
            ],
        },
        continuation: createContinuation(),
    }
}

function createHistorySession() {
    return {
        id: "session-flex",
        date: "2027-03-10T20:00:00.000Z",
        players: ["Ana", "Bea", "Cara"],
        teamCount: 2,
        mode: "tournament",
        courtCount: 1,
        rounds: [],
        currentPhaseIndex: 0,
        phases: [createHistoryPhase()],
    }
}

test("session summary rating impacts support 2v1 doubles without crashing", () => {
    const historyEntry = createHistorySession()
    const ratings = startNewRatingSeason({
        ratings: createEmptyRatingsState(),
        label: "Spring 2027",
        startedAt: "2027-03-01T00:00:00.000Z",
    })

    const summary = resolveSessionSummary({
        entry: historyEntry,
        history: [historyEntry],
        ratings,
    })

    assert.equal(summary?.leaderboardMode, "doubles")
    assert.equal(summary?.leaderboard?.[0]?.name, "Ana")
    assert.equal(
        summary?.tournamentRecap?.[0]?.tournaments?.[0]?.rounds?.[0]?.matches?.[0]?.teams?.[0]?.ratingImpact?.text,
        "+20 Elo",
    )
    assert.equal(
        summary?.tournamentRecap?.[0]?.tournaments?.[0]?.rounds?.[0]?.matches?.[0]?.teams?.[1]?.ratingImpact?.text,
        "-20 Elo each",
    )
})
