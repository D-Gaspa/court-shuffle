import { attachTournamentCourtSchedule } from "./courts.js"

function getCurrentTournamentRun(session) {
    const series = session?.tournamentSeries
    if (!series) {
        return null
    }
    return series.tournaments?.[series.currentTournamentIndex] || null
}

function syncTournamentSeriesAliases(session) {
    const series = session?.tournamentSeries
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
    session.courtCount = series.courtCount || 1
    session.allowNotStrictDoubles = series.allowNotStrictDoubles
    session.tournamentLevelSitOuts = run.tournamentLevelSitOuts || []
    if (Array.isArray(run.rounds)) {
        for (const round of run.rounds) {
            attachTournamentCourtSchedule(round, series.courtCount, series.courtHandling)
        }
    }
    return run
}

function persistTournamentSeriesAliases(session) {
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

function moveToNextTournamentInSeries(session) {
    const series = session?.tournamentSeries
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
    const series = session?.tournamentSeries
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
    return Boolean(session?.mode === "tournament" && session?.tournamentSeries)
}

export {
    getCurrentTournamentRun,
    isSeriesTournamentSession,
    moveToNextTournamentInSeries,
    moveToPrevTournamentInSeries,
    persistTournamentSeriesAliases,
    syncTournamentSeriesAliases,
}
