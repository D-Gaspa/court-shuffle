import { collectLockedPairKeySet, normalizeTeamKey } from "./advanced-model-helpers.js"

function toTimestamp(value) {
    const parsed = Date.parse(value || "")
    return Number.isFinite(parsed) ? parsed : 0
}

function hasRounds(run) {
    return Array.isArray(run?.rounds) && run.rounds.length > 0
}

function getHistoryRunCandidates(historySessions) {
    const candidates = []

    for (const session of historySessions || []) {
        if (Array.isArray(session?.tournamentSeries?.tournaments)) {
            for (let i = 0; i < session.tournamentSeries.tournaments.length; i += 1) {
                const run = session.tournamentSeries.tournaments[i]
                if (run?.tournamentTeamSize !== 2 || !hasRounds(run)) {
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

        if (session?.tournamentTeamSize !== 2 || !hasRounds(session)) {
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

function extractRestrictedTeamsFromRun({ run, activePlayers, allowNotStrictDoubles, lockedPairs }) {
    const teamsByKey = new Map()
    const lockedKeys = collectLockedPairKeySet(lockedPairs, allowNotStrictDoubles)

    for (const round of run?.rounds || []) {
        for (const match of round?.matches || []) {
            collectTeamsFromMatch({
                match,
                teamsByKey,
                lockedKeys,
                allowNotStrictDoubles,
                activePlayers,
            })
        }
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

    return extractRestrictedTeamsFromRun({
        run: latestRun,
        activePlayers: new Set(activePlayers || []),
        allowNotStrictDoubles,
        lockedPairs,
    })
}

export { buildRestrictedTeamsFromLastTournament }
