import assert from "node:assert/strict"
import test from "node:test"

import { buildHistoryCardMeta, resolveSessionChampionName } from "../js/features/history/list/card-header.js"

const TEAM_ONE_ID = 1
const TEAM_TWO_ID = 2
const SINGLE_COURT = 1
const TWO_PHASES = 2
const CHAMPION_LABEL_PATTERN = /Champion: Cora & Dana/
const PHASED_PLAYER_COUNT_PATTERN = /5 players/
const PHASED_TOURNAMENT_COUNT_PATTERN = /2 tournaments/
const PHASED_PHASE_COUNT_PATTERN = /2 phases/

function createSeriesSession() {
    return {
        mode: "tournament",
        players: ["Ana", "Bea", "Cora", "Dana"],
        rounds: [],
        tournamentSeries: {
            matchType: "doubles",
            format: "consolation",
            tournaments: [
                {
                    rounds: [
                        {
                            matches: [],
                            scores: null,
                            sitOuts: [],
                            byes: [],
                            losersByes: [],
                        },
                    ],
                    teams: [
                        { id: TEAM_ONE_ID, name: "Ana & Bea", players: ["Ana", "Bea"] },
                        { id: TEAM_TWO_ID, name: "Cora & Dana", players: ["Cora", "Dana"] },
                    ],
                    bracket: {
                        champion: TEAM_TWO_ID,
                    },
                },
            ],
        },
    }
}

function createPhasedSeriesSession() {
    return {
        id: "session-1",
        mode: "tournament",
        players: ["Ana", "Bea", "Cora", "Dana"],
        rounds: [],
        phases: [
            {
                id: "session-1-phase-0",
                createdAt: "2026-04-10T00:00:00.000Z",
                players: ["Ana", "Bea", "Cora", "Dana"],
                courtCount: SINGLE_COURT,
                allowNotStrictDoubles: false,
                tournamentSeries: {
                    matchType: "doubles",
                    format: "consolation",
                    tournaments: [
                        {
                            rounds: [
                                {
                                    matches: [],
                                    scores: null,
                                    sitOuts: [],
                                    byes: [],
                                    losersByes: [],
                                },
                            ],
                            teams: [
                                { id: TEAM_ONE_ID, name: "Ana & Bea", players: ["Ana", "Bea"] },
                                { id: TEAM_TWO_ID, name: "Cora & Dana", players: ["Cora", "Dana"] },
                            ],
                            bracket: {
                                champion: TEAM_TWO_ID,
                            },
                        },
                    ],
                },
            },
            {
                id: "session-1-phase-1",
                createdAt: "2026-04-10T01:00:00.000Z",
                players: ["Ana", "Bea", "Cora", "Dana", "Eva"],
                courtCount: SINGLE_COURT,
                allowNotStrictDoubles: false,
                tournamentSeries: {
                    matchType: "doubles",
                    format: "consolation",
                    tournaments: [
                        {
                            rounds: [
                                {
                                    matches: [],
                                    scores: null,
                                    sitOuts: [],
                                    byes: [],
                                    losersByes: [],
                                },
                            ],
                            teams: [
                                { id: TEAM_ONE_ID, name: "Ana & Eva", players: ["Ana", "Eva"] },
                                { id: TEAM_TWO_ID, name: "Bea & Cora", players: ["Bea", "Cora"] },
                            ],
                            bracket: {
                                champion: TEAM_ONE_ID,
                            },
                        },
                    ],
                },
            },
        ],
    }
}

test("series sessions derive the champion from saved tournament runs", () => {
    const session = createSeriesSession()

    assert.equal(resolveSessionChampionName(session), "Cora & Dana")
    assert.match(buildHistoryCardMeta(session), CHAMPION_LABEL_PATTERN)
})

test("phased history sessions derive meta and champion across all played phases", () => {
    const session = createPhasedSeriesSession()

    assert.equal(resolveSessionChampionName(session), "Ana & Eva")
    assert.match(buildHistoryCardMeta(session), PHASED_PLAYER_COUNT_PATTERN)
    assert.match(buildHistoryCardMeta(session), PHASED_TOURNAMENT_COUNT_PATTERN)
    assert.match(buildHistoryCardMeta(session), PHASED_PHASE_COUNT_PATTERN)
    assert.equal(session.phases.length, TWO_PHASES)
})
