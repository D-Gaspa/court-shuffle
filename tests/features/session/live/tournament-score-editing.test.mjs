import assert from "node:assert/strict"
import test from "node:test"

import { renderActiveSession } from "../../../../js/features/session/live/active.js"
import {
    canEditTournamentRoundScores,
    reconcileTournamentRoundsAfterScoreChange,
} from "../../../../js/features/session/live/tournament/score-editing.js"
import { DRAW_SET_SCORE, SPLIT_SET_SCORE, STRAIGHT_SET_SCORE } from "../../../support/constants.mjs"

const TEAM_ANA = 1
const TEAM_BEA = 2
const TEAM_CORA = 3
const TEAM_DANA = 4

function createTeam(id, name) {
    return { id, name, players: [name] }
}

function createScoredMatch(court, teamA, teamB, sets) {
    return {
        match: {
            court,
            teams: [teamA.players, teamB.players],
            teamIds: [teamA.id, teamB.id],
        },
        score: {
            court,
            sets,
        },
    }
}

function createCompletedEliminationSession() {
    const ana = createTeam(TEAM_ANA, "Ana")
    const bea = createTeam(TEAM_BEA, "Bea")
    const cora = createTeam(TEAM_CORA, "Cora")
    const dana = createTeam(TEAM_DANA, "Dana")
    const semifinalOne = createScoredMatch(1, ana, bea, STRAIGHT_SET_SCORE)
    const semifinalTwo = createScoredMatch(2, cora, dana, STRAIGHT_SET_SCORE)
    const finalMatch = createScoredMatch(1, ana, cora, STRAIGHT_SET_SCORE)

    return {
        id: "session-1",
        date: "2026-04-09T00:00:00.000Z",
        players: ["Ana", "Bea", "Cora", "Dana"],
        teamCount: 2,
        mode: "tournament",
        courtCount: 1,
        rounds: [
            {
                matches: [semifinalOne.match, semifinalTwo.match],
                scores: [semifinalOne.score, semifinalTwo.score],
                sitOuts: [],
                byes: [],
                losersByes: [],
                tournamentRoundLabel: "Round 1",
            },
            {
                matches: [finalMatch.match],
                scores: [finalMatch.score],
                sitOuts: [],
                byes: [],
                losersByes: [],
                tournamentRoundLabel: "Final",
            },
        ],
        currentRound: 1,
        tournamentFormat: "elimination",
        tournamentTeamSize: 1,
        teams: [ana, bea, cora, dana],
        seeding: "random",
        bracket: {
            pools: { winners: [], losers: [] },
            eliminated: [TEAM_BEA, TEAM_DANA],
            champion: TEAM_ANA,
            standings: {},
        },
        tournamentRound: 1,
        allRoundsGenerated: false,
        tournamentComplete: true,
    }
}

function createUiStub() {
    return {
        roundInfo: { textContent: "" },
        roundPrefix: { hidden: false },
        roundNumber: { textContent: "" },
        roundTotal: { textContent: "" },
        bracketContainer: { textContent: "" },
        sitOutList: { textContent: "" },
        sitOutContainer: { hidden: false },
        prevRoundBtn: { disabled: false },
        nextRoundBtn: { disabled: false },
        nextRoundLabel: { textContent: "" },
        noMoreRounds: { hidden: false },
        tournamentSeriesNav: { hidden: false },
    }
}

test("completed bracket finals remain editable when no later scored rounds exist", () => {
    const session = createCompletedEliminationSession()

    assert.equal(canEditTournamentRoundScores(session, 1), true)
    assert.equal(canEditTournamentRoundScores(session, 0), false)
})

test("completed bracket corrections recompute the champion", () => {
    const session = createCompletedEliminationSession()
    session.rounds[1].scores[0] = {
        court: 1,
        sets: SPLIT_SET_SCORE,
    }

    const changed = reconcileTournamentRoundsAfterScoreChange(session, 1)

    assert.equal(changed, true)
    assert.equal(session.tournamentComplete, true)
    assert.equal(session.bracket.champion, TEAM_CORA)
})

test("completed bracket corrections can reopen the tournament", () => {
    const session = createCompletedEliminationSession()
    session.rounds[1].scores[0] = {
        court: 1,
        sets: DRAW_SET_SCORE,
    }

    const changed = reconcileTournamentRoundsAfterScoreChange(session, 1)

    assert.equal(changed, true)
    assert.equal(session.tournamentComplete, false)
    assert.equal(session.bracket.champion, null)
    assert.equal(session.currentRound, 1)
})

test("active-session rendering guards malformed round indexes without crashing", () => {
    const state = {
        activeSession: {
            id: "broken-session",
            date: "2026-04-09T00:00:00.000Z",
            players: ["Ana", "Bea"],
            teamCount: 2,
            mode: "singles",
            courtCount: 1,
            rounds: [],
            currentRound: 99,
        },
    }
    const ui = createUiStub()

    assert.doesNotThrow(() => renderActiveSession(state, () => undefined, ui))
    assert.equal(ui.bracketContainer.textContent, "Session data is unavailable.")
    assert.equal(ui.nextRoundBtn.disabled, true)
})
