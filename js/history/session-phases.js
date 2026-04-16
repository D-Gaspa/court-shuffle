function getScoredTournamentRunsFromSeries(series) {
    if (!Array.isArray(series?.tournaments)) {
        return []
    }
    return series.tournaments.filter((run) => Array.isArray(run.rounds) && run.rounds.length > 0)
}

function buildLegacyHistoryPhase(session) {
    return {
        id: `${session.id || "history-session"}-phase-0`,
        createdAt: session.date,
        players: Array.isArray(session.players) ? session.players : [],
        courtCount: session.courtCount || 1,
        allowNotStrictDoubles: Boolean(session.allowNotStrictDoubles),
        tournamentConfig: session.tournamentConfig || null,
        tournamentSeries: session.tournamentSeries,
        continuation: null,
    }
}

function getHistoryTournamentPhases(session) {
    if (!Array.isArray(session?.phases) || session.phases.length === 0) {
        const legacyRuns = getScoredTournamentRunsFromSeries(session?.tournamentSeries)
        return legacyRuns.length > 0 ? [buildLegacyHistoryPhase(session)] : []
    }

    return session.phases.filter((phase) => getScoredTournamentRunsFromSeries(phase?.tournamentSeries).length > 0)
}

function getHistoryTournamentRuns(session) {
    const phases = getHistoryTournamentPhases(session)
    return phases.flatMap((phase) => getScoredTournamentRunsFromSeries(phase.tournamentSeries))
}

function getHistoryPhaseCount(session) {
    return getHistoryTournamentPhases(session).length
}

function isMultiPhaseHistorySession(session) {
    return getHistoryPhaseCount(session) > 1
}

function getHistorySessionPlayers(session) {
    const phases = getHistoryTournamentPhases(session)
    if (phases.length === 0) {
        return Array.isArray(session?.players) ? session.players : []
    }

    const players = new Set()
    for (const phase of phases) {
        for (const player of phase.players || []) {
            players.add(player)
        }
    }
    return [...players]
}

export {
    getHistoryPhaseCount,
    getHistorySessionPlayers,
    getHistoryTournamentPhases,
    getHistoryTournamentRuns,
    getScoredTournamentRunsFromSeries,
    isMultiPhaseHistorySession,
}
