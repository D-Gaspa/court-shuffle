import assert from "node:assert/strict"
import test from "node:test"
import { syncTournamentSeriesAliases } from "../js/domains/tournament/series/sync.js"
import { createEmptyRatingsState, startNewRatingSeason } from "../js/features/insights/ratings/seasons.js"
import { appendContinuationPhase } from "../js/features/session/continuation/build.js"
import {
    buildHistoryEntryForSession,
    canSaveSessionToHistory,
    endSession,
    syncProvisionalHistory,
} from "../js/features/session/live/history.js"
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

function createPlayedTournamentSession() {
    const session = buildTournamentSession({
        players: ["Ana", "Bea", "Cora", "Dana"],
        courtCount: 1,
        tournamentConfig: createDoublesTournamentConfig(),
    })
    syncTournamentSeriesAliases(session)
    session.rounds[0].scores = [{ court: 1, sets: [[6, 4]] }]
    session.tournamentComplete = true
    session.tournamentSeries.tournaments[0].tournamentComplete = true
    return session
}

function createStateWithSeason(activeSession) {
    return {
        roster: ["Ana", "Bea", "Cora", "Dana"],
        activeSession,
        history: [],
        archivedHistory: [],
        ratings: startNewRatingSeason({
            ratings: createEmptyRatingsState(),
            label: "Spring 2026",
            startedAt: "2026-01-01T00:00:00.000Z",
        }),
        lastExportedAt: null,
    }
}

test("syncProvisionalHistory keeps one evolving live history entry and finalizes it in place", () => {
    const session = createPlayedTournamentSession()
    const state = createStateWithSeason(session)
    let saveCount = 0

    const provisionalEntry = syncProvisionalHistory(state)
    assert.equal(provisionalEntry?.provisional, true)
    assert.equal(state.history.length, 1)
    assert.equal(state.history[0].id, session.id)

    session.rounds[0].scores[0] = { court: 1, sets: [[6, 3]] }
    syncProvisionalHistory(state)
    assert.equal(state.history.length, 1)
    assert.deepEqual(state.history[0].tournamentSeries.tournaments[0].rounds[0].scores[0].sets, [[6, 3]])

    const finalized = endSession(
        state,
        () => {
            saveCount += 1
        },
        true,
    )

    assert.equal(saveCount, 1)
    assert.equal(state.activeSession, null)
    assert.equal(state.history.length, 1)
    assert.equal(state.history[0].id, session.id)
    assert.equal(state.history[0].provisional, false)
    assert.equal(finalized?.sessionSummary?.leaderboard.length > 0, true)
    assert.equal(Array.isArray(finalized?.sessionSummary?.miniTournamentWinners), true)
})

test("continued sessions remain saveable when the latest phase has no played matches", () => {
    const session = createPlayedTournamentSession()
    const continuationPhase = {
        id: `${session.id}-phase-1`,
        createdAt: "2026-04-18T12:00:00.000Z",
        players: [...session.players],
        courtCount: session.courtCount,
        allowNotStrictDoubles: false,
        tournamentConfig: {
            ...session.tournamentConfig,
            seed: "phase-1-seed",
        },
        tournamentSeries: buildTournamentSession({
            players: [...session.players],
            courtCount: session.courtCount,
            tournamentConfig: createDoublesTournamentConfig(),
        }).tournamentSeries,
        continuation: {
            sourcePhaseIndex: 0,
            sourceTournamentIndex: 0,
            inheritedPhaseIndexes: [0],
            addedPlayers: [],
            removedPlayers: [],
            abandonedFutureTournamentIndexes: [],
            createdAt: "2026-04-18T12:00:00.000Z",
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
    }

    appendContinuationPhase(session, continuationPhase)

    assert.equal(canSaveSessionToHistory(session), true)
    const historyEntry = buildHistoryEntryForSession(session)
    assert.equal(historyEntry?.phases?.length, 1)
    assert.equal(historyEntry?.phases?.[0]?.id, `${session.id}-phase-0`)
})
