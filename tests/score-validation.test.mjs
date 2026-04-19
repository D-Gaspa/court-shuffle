import assert from "node:assert/strict"
import test from "node:test"
import { computeStandings } from "../js/domains/tournament/engine/standings.js"
import { determineMatchWinner } from "../js/domains/tournament/engine/utils.js"
import { buildStatsModel } from "../js/features/insights/stats/model/index.js"
import { buildHistoryEntryForSession } from "../js/features/session/live/history.js"
import { hasSavedScoreEntry } from "../js/ui/score-editor/sets.js"

const TEAM_ONE_ID = 1
const TEAM_TWO_ID = 2
const SINGLE_COURT = 1
const TWO_TEAMS = 2
const FIRST_WINNER_INDEX = 0
const SECOND_WINNER_INDEX = 1
const STRAIGHT_SET_GAMES_WON = 1
const STRAIGHT_SET_GAMES_LOST = 0
const CLOSE_SET_GAMES_WON = 3
const CLOSE_SET_GAMES_LOST = 2
const LOSING_SET_GAMES_WON = 5
const LOSING_SET_GAMES_LOST = 6
const COMEBACK_SET_GAMES_WON = 2
const COMEBACK_SET_GAMES_LOST = 4
const TIEBREAK_GAMES_WON = 7
const TIEBREAK_GAMES_LOST = 5
const TIEBREAK_LOSS_GAMES_WON = 4
const TIEBREAK_LOSS_GAMES_LOST = 7
const SINGLE_SET_SCORE = [[STRAIGHT_SET_GAMES_WON, STRAIGHT_SET_GAMES_LOST]]
const CLOSE_TIEBREAK_SCORE = [
    [CLOSE_SET_GAMES_WON, CLOSE_SET_GAMES_LOST, { tb: [TIEBREAK_GAMES_WON, TIEBREAK_GAMES_LOST] }],
    [STRAIGHT_SET_GAMES_WON, STRAIGHT_SET_GAMES_LOST],
]
const COMEBACK_LOSS_SCORE = [
    [LOSING_SET_GAMES_WON, LOSING_SET_GAMES_LOST, { tb: [TIEBREAK_LOSS_GAMES_WON, TIEBREAK_LOSS_GAMES_LOST] }],
    [COMEBACK_SET_GAMES_WON, COMEBACK_SET_GAMES_LOST],
]
const CLOSE_TIEBREAK_SINGLE_SET = [CLOSE_TIEBREAK_SCORE[0]]
const TOTAL_SESSION_COUNT = 1
const TOTAL_PLAYER_COUNT = 2

test("completed arbitrary tournament scores resolve a winner", () => {
    assert.equal(
        determineMatchWinner({
            sets: CLOSE_TIEBREAK_SCORE,
        }),
        FIRST_WINNER_INDEX,
    )

    assert.equal(
        determineMatchWinner({
            sets: COMEBACK_LOSS_SCORE,
        }),
        SECOND_WINNER_INDEX,
    )
})

test("completed arbitrary scores remain saved", () => {
    assert.equal(hasSavedScoreEntry({ sets: SINGLE_SET_SCORE }), true)
    assert.equal(hasSavedScoreEntry({ sets: CLOSE_TIEBREAK_SINGLE_SET }), true)
})

test("standings count arbitrary tournament scores", () => {
    const standings = computeStandings(
        [
            { id: TEAM_ONE_ID, name: "Ana", players: ["Ana"] },
            { id: TEAM_TWO_ID, name: "Bea", players: ["Bea"] },
        ],
        [
            {
                matches: [
                    {
                        court: SINGLE_COURT,
                        teamIds: [TEAM_ONE_ID, TEAM_TWO_ID],
                        teams: [["Ana"], ["Bea"]],
                    },
                ],
                scores: [
                    {
                        court: SINGLE_COURT,
                        sets: CLOSE_TIEBREAK_SINGLE_SET,
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
            {
                teamName: "Ana",
                wins: TOTAL_SESSION_COUNT,
                losses: FIRST_WINNER_INDEX,
                setsWon: TOTAL_SESSION_COUNT,
                setsLost: FIRST_WINNER_INDEX,
                gamesWon: CLOSE_SET_GAMES_WON,
                gamesLost: CLOSE_SET_GAMES_LOST,
            },
            {
                teamName: "Bea",
                wins: FIRST_WINNER_INDEX,
                losses: TOTAL_SESSION_COUNT,
                setsWon: FIRST_WINNER_INDEX,
                setsLost: TOTAL_SESSION_COUNT,
                gamesWon: CLOSE_SET_GAMES_LOST,
                gamesLost: CLOSE_SET_GAMES_WON,
            },
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
                teamCount: TWO_TEAMS,
                mode: "singles",
                courtCount: SINGLE_COURT,
                rounds: [
                    {
                        matches: [
                            {
                                court: SINGLE_COURT,
                                teams: [["Ana"], ["Bea"]],
                            },
                        ],
                        scores: [
                            {
                                court: SINGLE_COURT,
                                sets: SINGLE_SET_SCORE,
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
                totalSessionCount: TOTAL_SESSION_COUNT,
                totalPlayerCount: TOTAL_PLAYER_COUNT,
            },
        },
    )

    assert.equal(model.hasPlayedMatches, true)
    assert.equal(model.global.playedMatchCount, TOTAL_SESSION_COUNT)
    assert.equal(model.global.decidedMatchCount, TOTAL_SESSION_COUNT)
})

test("history keeps non-standard tournament scores", () => {
    const historyEntry = buildHistoryEntryForSession({
        id: "session-1",
        date: "2026-04-09T00:00:00.000Z",
        players: ["Ana", "Bea"],
        teamCount: TWO_TEAMS,
        mode: "tournament",
        courtCount: SINGLE_COURT,
        rounds: [
            {
                matches: [
                    {
                        court: SINGLE_COURT,
                        teams: [["Ana"], ["Bea"]],
                        teamIds: [TEAM_ONE_ID, TEAM_TWO_ID],
                    },
                ],
                scores: [
                    {
                        court: SINGLE_COURT,
                        sets: CLOSE_TIEBREAK_SINGLE_SET,
                    },
                ],
                sitOuts: [],
                byes: [],
                losersByes: [],
                tournamentRoundLabel: "Round 1",
            },
        ],
        tournamentFormat: "elimination",
        tournamentTeamSize: SINGLE_COURT,
        teams: [
            { id: TEAM_ONE_ID, name: "Ana", players: ["Ana"] },
            { id: TEAM_TWO_ID, name: "Bea", players: ["Bea"] },
        ],
        bracket: {
            pools: { winners: [], losers: [] },
            eliminated: [],
            champion: TEAM_ONE_ID,
            standings: {},
        },
    })

    assert.deepEqual(
        historyEntry?.rounds[FIRST_WINNER_INDEX]?.scores?.[FIRST_WINNER_INDEX]?.sets,
        CLOSE_TIEBREAK_SINGLE_SET,
    )
})
