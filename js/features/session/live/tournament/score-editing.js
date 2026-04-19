import { advanceTournament } from "../../../../domains/tournament/engine/bracket.js"
import { createInitialBracket } from "../../../../domains/tournament/engine/bracket-factory.js"
import { attachTournamentCourtSchedule } from "../../../../domains/tournament/engine/courts.js"
import { allScoresEntered } from "../../../../domains/tournament/engine/utils.js"
import { hasSavedScoreEntry } from "../../../../ui/score-editor/sets.js"

function roundHasSavedScores(round) {
    return Array.isArray(round?.scores) && round.scores.some(hasSavedScoreEntry)
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
    return !hasStartedFutureRounds(session, roundIndex)
}

function shouldRebuildBracketAfterScoreChange(session, roundIndex) {
    if (!isMutableBracketFormat(session)) {
        return false
    }

    const futureRounds = session.rounds.slice(roundIndex + 1)
    if (futureRounds.some(roundHasSavedScores)) {
        return false
    }

    return futureRounds.length > 0 || session.tournamentComplete === true
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

function syncReplayedBracketFrontier(session) {
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

function reconcileTournamentRoundsAfterScoreChange(session, roundIndex) {
    if (!shouldRebuildBracketAfterScoreChange(session, roundIndex)) {
        return false
    }

    const preservedRounds = session.rounds.slice(0, roundIndex + 1)
    replayBracketState(session, preservedRounds)
    return syncReplayedBracketFrontier(session)
}

export { canEditTournamentRoundScores, reconcileTournamentRoundsAfterScoreChange }
