import { advanceTournament } from "../../../tournament/bracket.js"
import { attachTournamentCourtSchedule } from "../../../tournament/courts.js"
import { createInitialBracket } from "../../../tournament/engine.js"
import { allScoresEntered } from "../../../tournament/utils.js"

function hasSavedMatchScore(entry) {
    if (!entry) {
        return false
    }
    if (Array.isArray(entry.sets) && entry.sets.length > 0) {
        return true
    }
    return Array.isArray(entry.score) && entry.score.length === 2
}

function roundHasSavedScores(round) {
    return Array.isArray(round?.scores) && round.scores.some(hasSavedMatchScore)
}

function isMutableBracketFormat(session) {
    const format = session?.tournamentFormat
    return format === "elimination" || format === "consolation"
}

function hasStartedFutureRounds(session, roundIndex) {
    return session.rounds.slice(roundIndex + 1).some(roundHasSavedScores)
}

function canEditTournamentRoundScores(session, roundIndex) {
    if (!isMutableBracketFormat(session)) {
        return true
    }
    if (session?.tournamentComplete) {
        return false
    }
    return !hasStartedFutureRounds(session, roundIndex)
}

function replayBracketState(session, preservedRounds) {
    if (preservedRounds.length === 0) {
        return
    }

    session.rounds = [preservedRounds[0]]
    session.bracket = createInitialBracket()
    session.tournamentComplete = false

    for (let i = 0; i < preservedRounds.length - 1; i += 1) {
        const nextRound = advanceTournament(session)
        if (nextRound === null) {
            session.tournamentComplete = true
            session.tournamentRound = Math.max(0, session.rounds.length - 1)
            return
        }
        session.rounds.push(preservedRounds[i + 1])
    }

    session.tournamentRound = Math.max(0, session.rounds.length - 1)
}

function reconcileTournamentRoundsAfterScoreChange(session, roundIndex) {
    if (!isMutableBracketFormat(session)) {
        return false
    }

    const futureRounds = session.rounds.slice(roundIndex + 1)
    if (futureRounds.length === 0 || futureRounds.some(roundHasSavedScores)) {
        return false
    }

    const preservedRounds = session.rounds.slice(0, roundIndex + 1)
    replayBracketState(session, preservedRounds)

    const currentRound = session.rounds.at(-1)
    if (!(currentRound && allScoresEntered(currentRound))) {
        session.tournamentComplete = false
        session.currentRound = Math.min(session.currentRound || 0, session.rounds.length - 1)
        return true
    }

    const nextRound = advanceTournament(session)
    if (nextRound === null) {
        session.tournamentComplete = true
        session.currentRound = Math.min(session.currentRound || 0, session.rounds.length - 1)
        return true
    }

    attachTournamentCourtSchedule(
        nextRound,
        session.courtCount || 1,
        session.tournamentSeries?.courtHandling || "queue",
    )
    session.rounds.push(nextRound)
    session.tournamentRound = Math.max(0, session.rounds.length - 1)
    session.tournamentComplete = false
    session.currentRound = Math.min(session.currentRound || 0, session.rounds.length - 1)
    return true
}

export { canEditTournamentRoundScores, reconcileTournamentRoundsAfterScoreChange }
