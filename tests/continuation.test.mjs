import assert from "node:assert/strict"
import test from "node:test"
import { syncTournamentSeriesAliases } from "../js/domains/tournament/series/sync.js"
import { appendContinuationPhase, buildContinuationPhase } from "../js/features/session/continuation/build.js"
import { canContinueTournamentSession } from "../js/features/session/continuation/eligibility.js"
import { buildContinuationPrefill } from "../js/features/session/continuation/prefill.js"
import { buildTournamentSession } from "../js/features/session/setup/start.js"

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

function createDoublesTournamentConfig() {
    return {
        format: "elimination",
        teamSize: 2,
        courtHandling: "queue",
        allowNotStrictDoubles: false,
        advanced: createAdvancedSettings(),
    }
}

function createContinuationReadySession() {
    const session = buildTournamentSession({
        players: ["Ana", "Bea", "Carla", "Dina"],
        courtCount: 1,
        tournamentConfig: createDoublesTournamentConfig(),
    })

    syncTournamentSeriesAliases(session)
    session.rounds[0].scores = [{ court: 1, sets: [[6, 4]] }]
    session.tournamentComplete = true
    session.tournamentSeries.tournaments[0].tournamentComplete = true
    return session
}

function getExpectedRestrictedTeams(session) {
    return session.rounds[0].matches[0].teams.map((team) => [team[0], team[1]])
}

test("canContinueTournamentSession only allows continuation from the latest completed mini tournament", () => {
    const session = createContinuationReadySession()
    assert.equal(canContinueTournamentSession(session), true)

    session.currentPhaseIndex = 1
    assert.equal(canContinueTournamentSession(session), false)

    session.currentPhaseIndex = 0
    session.tournamentComplete = false
    session.tournamentSeries.tournaments[0].tournamentComplete = false
    assert.equal(canContinueTournamentSession(session), false)
})

test("buildContinuationPrefill reuses tournament setup fields and seeds doubles restrictions from played phases", () => {
    const session = createContinuationReadySession()
    const expectedRestrictedTeams = getExpectedRestrictedTeams(session)

    const prefill = buildContinuationPrefill(session, ["Ana", "Bea", "Carla", "Dina"])

    assert.ok(prefill)
    assert.equal(prefill.currentStep, "roster")
    assert.equal(prefill.gameMode, "tournament")
    assert.deepEqual(prefill.selectedPlayers, ["Ana", "Bea", "Carla", "Dina"])
    assert.equal(prefill.tournament.format, "elimination")
    assert.equal(prefill.tournament.teamSize, 2)
    assert.deepEqual(prefill.tournament.advanced.doublesRestrictedTeams, expectedRestrictedTeams)
    assert.equal(prefill.continuation.sourcePhaseIndex, 0)
    assert.equal(prefill.continuation.sourceTournamentIndex, 0)
    assert.equal(prefill.continuation.lockedFields.format, true)
    assert.equal(prefill.continuation.lockedFields.teamSize, true)
})

test("buildContinuationPhase appends a new phase and syncs the session shell to it", () => {
    const session = createContinuationReadySession()
    const expectedRestrictedTeams = getExpectedRestrictedTeams(session)

    const nextPhase = buildContinuationPhase({
        session,
        players: ["Ana", "Bea", "Carla", "Dina"],
        courtCount: 2,
        allowNotStrictDoubles: false,
    })
    assert.ok(nextPhase)

    appendContinuationPhase(session, nextPhase)

    assert.equal(session.phases.length, 2)
    assert.equal(session.currentPhaseIndex, 1)
    assert.equal(session.courtCount, 2)
    assert.equal(session.tournamentConfig.format, "elimination")
    assert.deepEqual(session.phases[1].continuation.inheritedPhaseIndexes, [0])
    assert.equal(Array.isArray(session.phases[1].continuation.abandonedFutureTournamentIndexes), true)
    assert.deepEqual(session.phases[1].tournamentConfig.advanced.doublesRestrictedTeams, expectedRestrictedTeams)
})
