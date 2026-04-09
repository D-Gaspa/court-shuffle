// biome-ignore-all lint/nursery/useExpect: node:test uses assert-based checks here.
// biome-ignore-all lint/style/noMagicNumbers: inline tennis-score fixtures are intentional in tests.
import assert from "node:assert/strict"
import test from "node:test"
import { hasSavedScoreEntry } from "../js/score-editor/sets.js"
import { buildStatsModel } from "../js/stats/model/index.js"
import { computeStandings } from "../js/tournament/standings.js"
import { determineMatchWinner } from "../js/tournament/utils.js"

test("valid tennis sets resolve a winner", () => {
    assert.equal(
        determineMatchWinner({
            sets: [
                [6, 4],
                [7, 6, { tb: [7, 3] }],
            ],
        }),
        0,
    )

    assert.equal(
        determineMatchWinner({
            sets: [
                [6, 7, { tb: [3, 7] }],
                [6, 4],
                [3, 6],
            ],
        }),
        1,
    )
})

test("invalid set scores remain unresolved and unsaved", () => {
    const invalidEntries = [
        {
            sets: [
                [6, 6],
                [6, 4],
            ],
        },
        { sets: [[1, 0]] },
        { sets: [[7, 6, { tb: [7, 7] }]] },
        { sets: [[7, 6, { tb: [5, 7] }]] },
    ]

    for (const entry of invalidEntries) {
        assert.equal(determineMatchWinner(entry), null)
        assert.equal(hasSavedScoreEntry(entry), false)
    }
})

test("standings ignore invalid results", () => {
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
                        sets: [[1, 0]],
                    },
                ],
            },
        ],
    )

    assert.deepEqual(
        standings.map(({ teamName, wins, losses }) => ({ teamName, wins, losses })),
        [
            { teamName: "Ana", wins: 0, losses: 0 },
            { teamName: "Bea", wins: 0, losses: 0 },
        ],
    )
})

test("stats ignore invalid scored matches", () => {
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

    assert.equal(model.hasPlayedMatches, false)
    assert.equal(model.global.playedMatchCount, 0)
})
