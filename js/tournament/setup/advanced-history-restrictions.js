import { hasSavedScoreEntry } from "../../score-editor/sets.js"
import { collectLockedPairKeySet, normalizeTeamKey } from "./advanced-model-helpers.js"

function toTimestamp(value) {
    const parsed = Date.parse(value || "")
    return Number.isFinite(parsed) ? parsed : 0
}

function hasScoredMatches(run) {
    if (!Array.isArray(run?.rounds) || run.rounds.length === 0) {
        return false
    }
    return run.rounds.some((round) => Array.isArray(round?.scores) && round.scores.some(hasSavedScoreEntry))
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

function toImportableTeam(team, allowNotStrictDoubles, activePlayers) {
    if (!Array.isArray(team)) {
        return null
    }

    const uniquePlayers = [...new Set(team.filter((player) => typeof player === "string" && player.length > 0))]
    const validTeamSize = uniquePlayers.length === 2 || (allowNotStrictDoubles && uniquePlayers.length === 1)
    if (!validTeamSize) {
        return null
    }
    if (!uniquePlayers.every((player) => activePlayers.has(player))) {
        return null
    }

    return uniquePlayers.length === 1 ? [uniquePlayers[0], ""] : [uniquePlayers[0], uniquePlayers[1]]
}

function addImportedTeam({ team, teamsByKey, lockedKeys, allowNotStrictDoubles, activePlayers }) {
    const normalizedTeam = toImportableTeam(team, allowNotStrictDoubles, activePlayers)
    if (!normalizedTeam) {
        return
    }

    const key = normalizeTeamKey(normalizedTeam.filter(Boolean))
    if (lockedKeys.has(key) || teamsByKey.has(key)) {
        return
    }
    teamsByKey.set(key, normalizedTeam)
}

function collectTeamsFromMatch({ match, teamsByKey, lockedKeys, allowNotStrictDoubles, activePlayers }) {
    for (const team of match?.teams || []) {
        addImportedTeam({
            team,
            teamsByKey,
            lockedKeys,
            allowNotStrictDoubles,
            activePlayers,
        })
    }
}

function collectTeamsFromRun({ run, teamsByKey, lockedKeys, allowNotStrictDoubles, activePlayers }) {
    for (const round of run?.rounds || []) {
        for (let i = 0; i < (round?.matches || []).length; i += 1) {
            if (!hasSavedScoreEntry(round?.scores?.[i])) {
                continue
            }
            collectTeamsFromMatch({
                match: round.matches[i],
                teamsByKey,
                lockedKeys,
                allowNotStrictDoubles,
                activePlayers,
            })
        }
    }
}

function extractRestrictedTeamsFromRuns({ runs, activePlayers, allowNotStrictDoubles, lockedPairs }) {
    const teamsByKey = new Map()
    const lockedKeys = collectLockedPairKeySet(lockedPairs, allowNotStrictDoubles)

    for (const run of runs || []) {
        collectTeamsFromRun({
            run,
            teamsByKey,
            lockedKeys,
            allowNotStrictDoubles,
            activePlayers,
        })
    }

    return [...teamsByKey.values()]
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
