import { attachTournamentCourtSchedule } from "../engine/courts.js"

function createOriginalPhaseContinuation(createdAt) {
    return {
        sourcePhaseIndex: null,
        sourceTournamentIndex: null,
        inheritedPhaseIndexes: [],
        addedPlayers: [],
        removedPlayers: [],
        abandonedFutureTournamentIndexes: [],
        createdAt,
        inheritedConfig: {
            format: false,
            teamSize: false,
            courtCount: false,
            allowNotStrictDoubles: false,
        },
        editedConfig: {
            courtCount: false,
            allowNotStrictDoubles: false,
        },
    }
}

function createTournamentSessionPhase({
    allowNotStrictDoubles,
    continuation,
    courtCount,
    createdAt,
    id,
    players,
    tournamentConfig,
    tournamentSeries,
}) {
    return {
        id,
        createdAt,
        players: [...players],
        courtCount,
        allowNotStrictDoubles,
        tournamentConfig,
        tournamentSeries,
        continuation: continuation || createOriginalPhaseContinuation(createdAt),
    }
}

function buildLegacyPhaseFromSession(session) {
    return createTournamentSessionPhase({
        id: `${session.id}-phase-0`,
        createdAt: session.date,
        players: session.players || [],
        courtCount: session.courtCount || 1,
        allowNotStrictDoubles: Boolean(session.allowNotStrictDoubles),
        tournamentConfig: session.tournamentConfig,
        tournamentSeries: session.tournamentSeries,
    })
}

function ensureTournamentSessionPhases(session) {
    if (!(session?.mode === "tournament")) {
        return null
    }

    if (!Array.isArray(session.phases) || session.phases.length === 0) {
        if (!session.tournamentSeries) {
            return null
        }
        session.phases = [buildLegacyPhaseFromSession(session)]
        session.currentPhaseIndex = 0
    }

    if (!Number.isInteger(session.currentPhaseIndex) || session.currentPhaseIndex < 0) {
        session.currentPhaseIndex = 0
    }
    if (session.currentPhaseIndex >= session.phases.length) {
        session.currentPhaseIndex = session.phases.length - 1
    }

    return session.phases[session.currentPhaseIndex] || null
}

function getCurrentSessionPhase(session) {
    return ensureTournamentSessionPhases(session)
}

function getCurrentTournamentSeries(session) {
    const phase = getCurrentSessionPhase(session)
    return phase?.tournamentSeries || session?.tournamentSeries || null
}

function getCurrentTournamentRun(session) {
    const series = getCurrentTournamentSeries(session)
    if (!series) {
        return null
    }
    return series.tournaments?.[series.currentTournamentIndex] || null
}

function syncCurrentPhaseToSession(session) {
    const phase = getCurrentSessionPhase(session)
    if (!phase) {
        return null
    }

    session.players = phase.players
    session.courtCount = phase.courtCount
    session.allowNotStrictDoubles = phase.allowNotStrictDoubles
    session.tournamentConfig = phase.tournamentConfig
    session.tournamentSeries = phase.tournamentSeries
    return phase
}

function syncTournamentRunAliases(session) {
    const series = getCurrentTournamentSeries(session)
    if (!series) {
        return null
    }
    const run = getCurrentTournamentRun(session)
    if (!run) {
        return null
    }
    session.rounds = run.rounds
    session.currentRound = typeof run.currentRound === "number" ? run.currentRound : 0
    run.currentRound = session.currentRound
    session.tournamentFormat = run.tournamentFormat
    session.tournamentTeamSize = run.tournamentTeamSize
    session.teams = run.teams
    session.seeding = run.seeding
    session.bracket = run.bracket
    session.tournamentRound = run.tournamentRound
    session.allRoundsGenerated = run.allRoundsGenerated
    session.tournamentComplete = run.tournamentComplete === true
    session.courtCount = series.courtCount || session.courtCount || 1
    session.allowNotStrictDoubles = series.allowNotStrictDoubles
    session.tournamentLevelSitOuts = run.tournamentLevelSitOuts || []
    if (Array.isArray(run.rounds)) {
        for (const round of run.rounds) {
            attachTournamentCourtSchedule(round, series.courtCount)
        }
    }
    return run
}

function persistSessionToCurrentPhase(session) {
    const phase = getCurrentSessionPhase(session)
    if (!phase) {
        return null
    }

    phase.players = session.players
    phase.courtCount = session.courtCount
    phase.allowNotStrictDoubles = session.allowNotStrictDoubles
    phase.tournamentConfig = session.tournamentConfig
    phase.tournamentSeries = session.tournamentSeries
    return phase
}

function persistTournamentRunAliases(session) {
    const run = getCurrentTournamentRun(session)
    if (!run) {
        return null
    }
    run.rounds = session.rounds
    run.currentRound = session.currentRound
    run.tournamentFormat = session.tournamentFormat
    run.tournamentTeamSize = session.tournamentTeamSize
    run.teams = session.teams
    run.seeding = session.seeding
    run.bracket = session.bracket
    run.tournamentRound = session.tournamentRound
    run.allRoundsGenerated = session.allRoundsGenerated
    run.tournamentComplete = session.tournamentComplete
    return run
}

function syncTournamentSeriesAliases(session) {
    syncCurrentPhaseToSession(session)
    return syncTournamentRunAliases(session)
}

function persistTournamentSeriesAliases(session) {
    const run = persistTournamentRunAliases(session)
    persistSessionToCurrentPhase(session)
    return run
}

function moveToNextTournamentInSeries(session) {
    const series = getCurrentTournamentSeries(session)
    if (!series) {
        return false
    }
    persistTournamentSeriesAliases(session)
    if (series.currentTournamentIndex >= series.tournaments.length - 1) {
        return false
    }
    series.currentTournamentIndex += 1
    syncTournamentSeriesAliases(session)
    return true
}

function moveToPrevTournamentInSeries(session) {
    const series = getCurrentTournamentSeries(session)
    if (!series) {
        return false
    }
    persistTournamentSeriesAliases(session)
    if (series.currentTournamentIndex <= 0) {
        return false
    }
    series.currentTournamentIndex -= 1
    syncTournamentSeriesAliases(session)
    return true
}

function isSeriesTournamentSession(session) {
    return Boolean(session?.mode === "tournament" && getCurrentTournamentSeries(session))
}

function hasMultipleTournamentsInSeries(session) {
    if (!isSeriesTournamentSession(session)) {
        return false
    }
    const series = getCurrentTournamentSeries(session)
    const count =
        Array.isArray(series.tournaments) && series.tournaments.length > 0
            ? series.tournaments.length
            : series.maxTournaments || 0
    return count > 1
}

export {
    createOriginalPhaseContinuation,
    createTournamentSessionPhase,
    ensureTournamentSessionPhases,
    getCurrentSessionPhase,
    getCurrentTournamentRun,
    getCurrentTournamentSeries,
    hasMultipleTournamentsInSeries,
    isSeriesTournamentSession,
    moveToNextTournamentInSeries,
    moveToPrevTournamentInSeries,
    persistSessionToCurrentPhase,
    persistTournamentSeriesAliases,
    syncCurrentPhaseToSession,
    syncTournamentSeriesAliases,
}
