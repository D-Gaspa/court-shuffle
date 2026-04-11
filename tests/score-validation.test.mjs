// biome-ignore-all lint/nursery/useExpect: node:test uses assert-based checks here.
// biome-ignore-all lint/style/noMagicNumbers: inline tennis-score fixtures are intentional in tests.
import assert from "node:assert/strict"
import test from "node:test"

import { hasSavedScoreEntry } from "../js/score-editor/sets.js"
import { buildHistoryEntryForSession } from "../js/session/active/history.js"
import { buildStatsModel } from "../js/stats/model/index.js"
import { computeStandings } from "../js/tournament/standings.js"
import { determineMatchWinner } from "../js/tournament/utils.js"

test("completed arbitrary tournament scores resolve a winner", () => {
    assert.equal(
        determineMatchWinner({
            sets: [
                [3, 2, { tb: [7, 5] }],
                [1, 0],
            ],
        }),
        0,
    )

    assert.equal(
        determineMatchWinner({
            sets: [
                [5, 6, { tb: [4, 7] }],
                [2, 4],
            ],
        }),
        1,
    )
})

test("completed arbitrary scores remain saved", () => {
    assert.equal(hasSavedScoreEntry({ sets: [[1, 0]] }), true)
    assert.equal(hasSavedScoreEntry({ sets: [[3, 2, { tb: [7, 5] }]] }), true)
})

test("standings count arbitrary tournament scores", () => {
    const standings = computeStandings(
        [
            { id: 1, name: "Ana", players: ["Ana"] },
            { id: 2, name: "Bea", players: ["Bea"] },
        ],
        [
            {
                matches: [
                    {
                        court: 1,
                        teamIds: [1, 2],
                        teams: [["Ana"], ["Bea"]],
                    },
                ],
                scores: [
                    {
                        court: 1,
                        sets: [[3, 2, { tb: [7, 5] }]],
                    },
                ],
            },
        ],
    )

    assert.deepEqual(
        standings.map(({ teamName, wins, losses, setsWon, setsLost, gamesWon, gamesLost }) => ({
            teamName,
            wins,
            losses,
            setsWon,
            setsLost,
            gamesWon,
            gamesLost,
        })),
        [
            { teamName: "Ana", wins: 1, losses: 0, setsWon: 1, setsLost: 0, gamesWon: 3, gamesLost: 2 },
            { teamName: "Bea", wins: 0, losses: 1, setsWon: 0, setsLost: 1, gamesWon: 2, gamesLost: 3 },
        ],
    )
})

test("stats count arbitrary scored matches", () => {
    const model = buildStatsModel(
        [
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
                        scores: [
                            {
                                court: 1,
                                sets: [[1, 0]],
                            },
                        ],
                        sitOuts: [],
                        byes: [],
                        losersByes: [],
                    },
                ],
            },
        ],
        {
            queryMeta: {
                totalSessionCount: 1,
                totalPlayerCount: 2,
            },
        },
    )

    assert.equal(model.hasPlayedMatches, true)
    assert.equal(model.global.playedMatchCount, 1)
    assert.equal(model.global.decidedMatchCount, 1)
})

test("history keeps non-standard tournament scores", () => {
    const historyEntry = buildHistoryEntryForSession({
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
                        teamIds: [1, 2],
                    },
                ],
                scores: [
                    {
                        court: 1,
                        sets: [[3, 2, { tb: [7, 5] }]],
                    },
                ],
                sitOuts: [],
                byes: [],
                losersByes: [],
                tournamentRoundLabel: "Round 1",
            },
        ],
        tournamentFormat: "elimination",
        tournamentTeamSize: 1,
        teams: [
            { id: 1, name: "Ana", players: ["Ana"] },
            { id: 2, name: "Bea", players: ["Bea"] },
        ],
        bracket: {
            pools: { winners: [], losers: [] },
            eliminated: [],
            champion: 1,
            standings: {},
        },
    })

    assert.deepEqual(historyEntry?.rounds[0]?.scores?.[0]?.sets, [[3, 2, { tb: [7, 5] }]])
})
