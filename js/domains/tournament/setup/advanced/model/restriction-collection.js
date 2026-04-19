import { hasSavedScoreEntry } from "../../../../../ui/score-editor/sets.js"
import { collectLockedPairKeySet, normalizeTeamKey } from "./helpers.js"

function hasScoredMatches(run) {
    if (!Array.isArray(run?.rounds) || run.rounds.length === 0) {
        return false
    }
    return run.rounds.some((round) => Array.isArray(round?.scores) && round.scores.some(hasSavedScoreEntry))
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

function getPhaseDoublesRuns(phase) {
    if (!Array.isArray(phase?.tournamentSeries?.tournaments)) {
        return []
    }
    return phase.tournamentSeries.tournaments.filter((run) => run?.tournamentTeamSize === 2 && hasScoredMatches(run))
}

function getSessionPhaseDoublesRuns(session) {
    const runs = []
    for (const phase of session?.phases || []) {
        runs.push(...getPhaseDoublesRuns(phase))
    }
    return runs
}

function buildRestrictedTeamsFromSessionPhases({ session, activePlayers, allowNotStrictDoubles, lockedPairs }) {
    const runs = getSessionPhaseDoublesRuns(session)
    if (runs.length === 0) {
        return null
    }

    return extractRestrictedTeamsFromRuns({
        runs,
        activePlayers: new Set(activePlayers || []),
        allowNotStrictDoubles,
        lockedPairs,
    })
}

export {
    buildRestrictedTeamsFromSessionPhases,
    extractRestrictedTeamsFromRuns,
    getPhaseDoublesRuns,
    getSessionPhaseDoublesRuns,
    hasScoredMatches,
}
