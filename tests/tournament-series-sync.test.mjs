import assert from "node:assert/strict"
import test from "node:test"
import {
    persistSessionToCurrentPhase,
    persistTournamentSeriesAliases,
    syncCurrentPhaseToSession,
    syncTournamentSeriesAliases,
} from "../js/domains/tournament/series/sync.js"
import { buildTournamentSession } from "../js/features/session/setup/start.js"

const UPDATED_COURT_COUNT = 3

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

function createTournamentConfig() {
    return {
        format: "elimination",
        teamSize: 1,
        courtHandling: "queue",
        allowNotStrictDoubles: false,
        advanced: createAdvancedSettings(),
    }
}

test("new tournament sessions create an initial phase and alias it into the session shell", () => {
    const session = buildTournamentSession({
        players: ["Ana", "Bea"],
        courtCount: 1,
        tournamentConfig: createTournamentConfig(),
    })

    assert.ok(session)
    assert.equal(session.currentPhaseIndex, 0)
    assert.equal(session.phases.length, 1)
    assert.equal(session.phases[0].id, `${session.id}-phase-0`)
    assert.equal(session.tournamentSeries, session.phases[0].tournamentSeries)
    assert.equal(session.tournamentConfig, session.phases[0].tournamentConfig)
})

test("syncCurrentPhaseToSession restores top-level tournament shell fields from the active phase", () => {
    const session = buildTournamentSession({
        players: ["Ana", "Bea"],
        courtCount: 1,
        tournamentConfig: createTournamentConfig(),
    })

    session.phases[0].players = ["Ana", "Bea", "Carla"]
    session.phases[0].courtCount = 2
    session.phases[0].allowNotStrictDoubles = true

    syncCurrentPhaseToSession(session)

    assert.deepEqual(session.players, ["Ana", "Bea", "Carla"])
    assert.equal(session.courtCount, 2)
    assert.equal(session.allowNotStrictDoubles, true)
})

test("persist helpers write top-level session edits back into the active phase", () => {
    const session = buildTournamentSession({
        players: ["Ana", "Bea"],
        courtCount: 1,
        tournamentConfig: createTournamentConfig(),
    })

    syncTournamentSeriesAliases(session)
    session.players = ["Ana", "Bea", "Carla"]
    session.courtCount = UPDATED_COURT_COUNT
    session.tournamentComplete = true

    persistSessionToCurrentPhase(session)
    persistTournamentSeriesAliases(session)

    assert.deepEqual(session.phases[0].players, ["Ana", "Bea", "Carla"])
    assert.equal(session.phases[0].courtCount, UPDATED_COURT_COUNT)
    assert.equal(session.phases[0].tournamentSeries.tournaments[0].tournamentComplete, true)
})
