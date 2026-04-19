import { getCurrentSessionPhase, getCurrentTournamentRun } from "../../../domains/tournament/series/sync.js"

function getLatestCompletedTournamentIndex(phase) {
    const tournaments = phase?.tournamentSeries?.tournaments
    if (!Array.isArray(tournaments) || tournaments.length === 0) {
        return -1
    }

    let latestIndex = -1
    for (let index = 0; index < tournaments.length; index += 1) {
        const run = tournaments[index]
        if (run?.tournamentComplete === true || run?.skipped === true) {
            latestIndex = index
        }
    }
    return latestIndex
}

function canContinueTournamentSession(session) {
    if (!(session?.mode === "tournament" && Array.isArray(session?.phases) && session.phases.length > 0)) {
        return false
    }

    if (session.currentPhaseIndex !== session.phases.length - 1) {
        return false
    }

    const phase = getCurrentSessionPhase(session)
    const run = getCurrentTournamentRun(session)
    if (!(phase && run)) {
        return false
    }

    const currentTournamentIndex = phase.tournamentSeries?.currentTournamentIndex ?? -1
    return currentTournamentIndex >= 0 && currentTournamentIndex === getLatestCompletedTournamentIndex(phase)
}

export { canContinueTournamentSession, getLatestCompletedTournamentIndex }
