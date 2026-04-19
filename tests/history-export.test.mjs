import assert from "node:assert/strict"
import test from "node:test"

import { buildHistoryEntryForSession } from "../js/features/session/live/history.js"

const TEAM_ONE_ID = 1
const TEAM_TWO_ID = 2
const SINGLE_COURT = 1
const TWO_TEAMS = 2
const SECOND_PHASE_INDEX = 1
const TWO_PHASES = 2
const STRAIGHT_SET_GAMES_WON = 1
const STRAIGHT_SET_GAMES_LOST = 0
const CLOSE_SET_GAMES_WON = 3
const CLOSE_SET_GAMES_LOST = 2
const TIEBREAK_GAMES_WON = 7
const TIEBREAK_GAMES_LOST = 5
const CLOSE_TIEBREAK_SINGLE_SET = [
    [CLOSE_SET_GAMES_WON, CLOSE_SET_GAMES_LOST, { tb: [TIEBREAK_GAMES_WON, TIEBREAK_GAMES_LOST] }],
]
const SINGLE_SET_SCORE = [[STRAIGHT_SET_GAMES_WON, STRAIGHT_SET_GAMES_LOST]]

function createBracket(champion) {
    return {
        pools: { winners: [], losers: [] },
        eliminated: [],
        champion,
        standings: {},
    }
}

function createPhaseRun({ champion, players, sets, sitOuts, teamA, teamB }) {
    return {
        currentRound: 0,
        rounds: [
            {
                tournamentRoundLabel: "Round 1",
                matches: [
                    {
                        court: SINGLE_COURT,
                        teamIds: [TEAM_ONE_ID, TEAM_TWO_ID],
                        teams: [teamA, teamB],
                    },
                ],
                scores: [
                    {
                        court: SINGLE_COURT,
                        sets,
                    },
                ],
                sitOuts,
                byes: [],
                losersByes: [],
            },
        ],
        tournamentComplete: true,
        teams: [
            { id: TEAM_ONE_ID, name: players[0], players: teamA },
            { id: TEAM_TWO_ID, name: players[1], players: teamB },
        ],
        bracket: createBracket(champion),
        tournamentLevelSitOuts: sitOuts,
    }
}

function createPhase({ createdAt, continuation, id, phasePlayers, run, seed }) {
    return {
        id,
        createdAt,
        players: phasePlayers,
        courtCount: SINGLE_COURT,
        allowNotStrictDoubles: false,
        tournamentConfig: {
            format: "consolation",
            teamSize: TWO_TEAMS,
            courtCount: SINGLE_COURT,
            courtHandling: "queue",
            allowNotStrictDoubles: false,
            advanced: {},
            seed,
        },
        tournamentSeries: {
            matchType: "doubles",
            format: "consolation",
            courtCount: SINGLE_COURT,
            allowNotStrictDoubles: false,
            currentTournamentIndex: 0,
            tournaments: [run],
        },
        continuation,
    }
}

function createContinuationRuns() {
    const firstRun = createPhaseRun({
        champion: TEAM_TWO_ID,
        players: ["Ana & Bea", "Cora & Dana"],
        sets: CLOSE_TIEBREAK_SINGLE_SET,
        sitOuts: [],
        teamA: ["Ana", "Bea"],
        teamB: ["Cora", "Dana"],
    })
    const secondRun = createPhaseRun({
        champion: TEAM_ONE_ID,
        players: ["Ana & Eva", "Bea & Cora"],
        sets: SINGLE_SET_SCORE,
        sitOuts: ["Dana"],
        teamA: ["Ana", "Eva"],
        teamB: ["Bea", "Cora"],
    })

    return { firstRun, secondRun }
}

function createContinuationPhases() {
    const { firstRun, secondRun } = createContinuationRuns()

    return [
        createPhase({
            id: "session-2-phase-0",
            createdAt: "2026-04-10T00:00:00.000Z",
            phasePlayers: ["Ana", "Bea", "Cora", "Dana"],
            run: firstRun,
            seed: "phase-0",
            continuation: {
                sourcePhaseIndex: null,
                sourceTournamentIndex: null,
                inheritedPhaseIndexes: [],
                addedPlayers: [],
                removedPlayers: [],
                abandonedFutureTournamentIndexes: [],
                createdAt: "2026-04-10T00:00:00.000Z",
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
        }),
        createPhase({
            id: "session-2-phase-1",
            createdAt: "2026-04-10T01:00:00.000Z",
            phasePlayers: ["Ana", "Bea", "Cora", "Dana", "Eva"],
            run: secondRun,
            seed: "phase-1",
            continuation: {
                sourcePhaseIndex: 0,
                sourceTournamentIndex: 0,
                inheritedPhaseIndexes: [0],
                addedPlayers: ["Eva"],
                removedPlayers: [],
                abandonedFutureTournamentIndexes: [],
                createdAt: "2026-04-10T01:00:00.000Z",
                inheritedConfig: {
                    format: true,
                    teamSize: true,
                    courtCount: true,
                    allowNotStrictDoubles: true,
                },
                editedConfig: {
                    courtCount: false,
                    allowNotStrictDoubles: false,
                },
            },
        }),
    ]
}

function createContinuationFixtureSession() {
    const phases = createContinuationPhases()
    const currentPhase = phases.at(-1)

    return {
        id: "session-2",
        date: "2026-04-10T00:00:00.000Z",
        players: ["Ana", "Bea", "Cora", "Dana", "Eva"],
        teamCount: TWO_TEAMS,
        mode: "tournament",
        courtCount: SINGLE_COURT,
        rounds: [],
        tournamentSeries: currentPhase.tournamentSeries,
        phases,
        currentPhaseIndex: SECOND_PHASE_INDEX,
        tournamentConfig: {
            format: "consolation",
            teamSize: TWO_TEAMS,
            courtCount: SINGLE_COURT,
            courtHandling: "queue",
            allowNotStrictDoubles: false,
            advanced: {},
            seed: "phase-1",
        },
    }
}

test("history saves played continuation phases and aliases the last phase at the top level", () => {
    const historyEntry = buildHistoryEntryForSession(createContinuationFixtureSession())

    assert.equal(historyEntry?.phases?.length, TWO_PHASES)
    assert.equal(historyEntry?.currentPhaseIndex, SECOND_PHASE_INDEX)
    assert.equal(historyEntry?.players.includes("Eva"), true)
    assert.equal(historyEntry?.phases?.[0]?.tournamentSeries?.tournaments?.length, SINGLE_COURT)
    assert.equal(historyEntry?.phases?.[SECOND_PHASE_INDEX]?.continuation?.sourcePhaseIndex, 0)
    assert.deepEqual(historyEntry?.tournamentSeries?.tournaments?.[0]?.rounds?.[0]?.scores?.[0]?.sets, SINGLE_SET_SCORE)
})
