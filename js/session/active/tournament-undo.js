import { buildTournamentSeries } from "../../tournament/series/build.js"
import { syncTournamentSeriesAliases } from "../../tournament/series/sync.js"
import { getLatestCompletedTournamentIndex } from "../continuation/eligibility.js"

function findLatestCompletedPhaseIndex(session) {
    for (let index = (session?.phases?.length || 0) - 1; index >= 0; index -= 1) {
        if (getLatestCompletedTournamentIndex(session.phases[index]) >= 0) {
            return index
        }
    }
    return -1
}

function canUndoLatestTournament(session) {
    return session?.mode === "tournament" && findLatestCompletedPhaseIndex(session) >= 0
}

function rebuildTournamentSeriesForPhase(phase) {
    return buildTournamentSeries({
        players: phase.players,
        format: phase.tournamentConfig.format,
        teamSize: phase.tournamentConfig.teamSize,
        courtCount: phase.courtCount,
        courtHandling: phase.tournamentConfig.courtHandling,
        allowNotStrictDoubles: phase.allowNotStrictDoubles,
        seed: phase.tournamentConfig.seed,
        advanced: phase.tournamentConfig.advanced,
    })
}

function undoLatestTournament(session) {
    const phaseIndex = findLatestCompletedPhaseIndex(session)
    if (phaseIndex < 0) {
        return false
    }

    const phase = session.phases[phaseIndex]
    const tournamentIndex = getLatestCompletedTournamentIndex(phase)
    const rebuiltSeries = rebuildTournamentSeriesForPhase(phase)
    if (!rebuiltSeries) {
        return false
    }

    const preservedTournaments = phase.tournamentSeries.tournaments.slice(0, tournamentIndex)
    phase.tournamentSeries = {
        ...rebuiltSeries,
        tournaments: [...preservedTournaments, ...rebuiltSeries.tournaments.slice(tournamentIndex)],
        currentTournamentIndex: tournamentIndex,
    }
    session.phases = session.phases.slice(0, phaseIndex + 1)
    session.currentPhaseIndex = phaseIndex
    syncTournamentSeriesAliases(session)
    return true
}

export { canUndoLatestTournament, undoLatestTournament }
