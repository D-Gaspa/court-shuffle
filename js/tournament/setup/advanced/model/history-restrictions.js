import { extractRestrictedTeamsFromRuns, hasScoredMatches } from "./restriction-collection.js"

function toTimestamp(value) {
    const parsed = Date.parse(value || "")
    return Number.isFinite(parsed) ? parsed : 0
}

function getHistoryRunCandidates(historySessions) {
    const candidates = []

    for (const session of historySessions || []) {
        if (Array.isArray(session?.tournamentSeries?.tournaments)) {
            for (let i = 0; i < session.tournamentSeries.tournaments.length; i += 1) {
                const run = session.tournamentSeries.tournaments[i]
                if (run?.tournamentTeamSize !== 2 || !hasScoredMatches(run)) {
                    continue
                }
                candidates.push({
                    date: session.date,
                    runIndex: i,
                    run,
                })
            }
            continue
        }

        if (session?.tournamentTeamSize !== 2 || !hasScoredMatches(session)) {
            continue
        }
        candidates.push({
            date: session.date,
            runIndex: 0,
            run: session,
        })
    }

    return candidates
}

function getHistorySessionCandidates(historySessions) {
    const candidates = []

    for (let i = 0; i < (historySessions || []).length; i += 1) {
        const session = historySessions[i]
        let runs = []
        if (Array.isArray(session?.tournamentSeries?.tournaments)) {
            runs = session.tournamentSeries.tournaments.filter(
                (run) => run?.tournamentTeamSize === 2 && hasScoredMatches(run),
            )
        } else if (session?.tournamentTeamSize === 2 && hasScoredMatches(session)) {
            runs = [session]
        }

        if (runs.length === 0) {
            continue
        }
        candidates.push({
            date: session.date,
            sessionIndex: i,
            runs,
        })
    }

    return candidates
}

function compareCandidates(a, b) {
    const dateDiff = toTimestamp(b.date) - toTimestamp(a.date)
    if (dateDiff !== 0) {
        return dateDiff
    }
    return b.runIndex - a.runIndex
}

function findLatestSavedDoublesTournament(historySessions) {
    const candidates = getHistoryRunCandidates(historySessions)
    candidates.sort(compareCandidates)
    return candidates[0]?.run || null
}

function findLatestSavedDoublesSession(historySessions) {
    const candidates = getHistorySessionCandidates(historySessions)
    candidates.sort((a, b) => {
        const dateDiff = toTimestamp(b.date) - toTimestamp(a.date)
        if (dateDiff !== 0) {
            return dateDiff
        }
        return b.sessionIndex - a.sessionIndex
    })
    return candidates[0]?.runs || null
}

function buildRestrictedTeamsFromLastTournament({
    history,
    archivedHistory,
    activePlayers,
    allowNotStrictDoubles,
    lockedPairs,
}) {
    const latestRun = findLatestSavedDoublesTournament([...(history || []), ...(archivedHistory || [])])
    if (!latestRun) {
        return null
    }

    return extractRestrictedTeamsFromRuns({
        runs: [latestRun],
        activePlayers: new Set(activePlayers || []),
        allowNotStrictDoubles,
        lockedPairs,
    })
}

function buildRestrictedTeamsFromLastSession({
    history,
    archivedHistory,
    activePlayers,
    allowNotStrictDoubles,
    lockedPairs,
}) {
    const latestRuns = findLatestSavedDoublesSession([...(history || []), ...(archivedHistory || [])])
    if (!latestRuns) {
        return null
    }

    return extractRestrictedTeamsFromRuns({
        runs: latestRuns,
        activePlayers: new Set(activePlayers || []),
        allowNotStrictDoubles,
        lockedPairs,
    })
}

export { buildRestrictedTeamsFromLastSession, buildRestrictedTeamsFromLastTournament }
