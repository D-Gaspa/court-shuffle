import { shuffleWithRng } from "../../../../platform/random/index.js"

function createMatch(left, right, matchIndex) {
    return {
        court: matchIndex + 1,
        teams: [left.players, right.players],
        teamIds: [left.id, right.id],
    }
}

function collectForcedMatches({ forcedPairTeamIds, teamById, byeSet, pairedSet }) {
    const matches = []
    for (const pair of forcedPairTeamIds) {
        const [leftId, rightId] = pair
        const left = teamById.get(leftId)
        const right = teamById.get(rightId)
        if (!(left && right)) {
            continue
        }
        if (byeSet.has(left.id) || byeSet.has(right.id) || pairedSet.has(left.id) || pairedSet.has(right.id)) {
            continue
        }
        matches.push(createMatch(left, right, matches.length))
        pairedSet.add(left.id)
        pairedSet.add(right.id)
    }
    return matches
}

function partitionMatchesByDelay(matches, delayedSet) {
    const onCourtMatches = []
    const delayedMatches = []
    for (const match of matches) {
        if ((match.teamIds || []).some((teamId) => delayedSet.has(teamId))) {
            delayedMatches.push(match)
            continue
        }
        onCourtMatches.push(match)
    }
    return { onCourtMatches, delayedMatches }
}

function pairRemainingBracketTeams(remainingTeams, delayedSet) {
    const delayedTeams = []
    const regularTeams = []
    for (const team of remainingTeams) {
        if (delayedSet.has(team.id)) {
            delayedTeams.push(team)
        } else {
            regularTeams.push(team)
        }
    }
    return { delayedTeams, regularTeams }
}

function buildRemainingBracketMatches(remainingTeams, delayedSet) {
    const { delayedTeams, regularTeams } = pairRemainingBracketTeams(remainingTeams, delayedSet)
    const onCourtMatches = []
    const delayedMatches = []
    let matchIndex = 0

    while (delayedTeams.length >= 2) {
        delayedMatches.push(createMatch(delayedTeams.shift(), delayedTeams.shift(), matchIndex))
        matchIndex += 1
    }
    if (delayedTeams.length === 1) {
        const regularOpponent = regularTeams.shift()
        if (!regularOpponent) {
            return null
        }
        delayedMatches.push(createMatch(delayedTeams.shift(), regularOpponent, matchIndex))
        matchIndex += 1
    }
    while (regularTeams.length >= 2) {
        onCourtMatches.push(createMatch(regularTeams.shift(), regularTeams.shift(), matchIndex))
        matchIndex += 1
    }
    return { onCourtMatches, delayedMatches }
}

function exceedsDelayedMatchCapacity(matchCount, delayedMatchCount, courtCount) {
    const queueMatchCount = Math.max(0, matchCount - Math.max(1, courtCount || 1))
    return delayedMatchCount > queueMatchCount
}

function createBracketFirstRoundWithOverrides({
    teams,
    byeTeamIds,
    forcedPairTeamIds,
    delayedTeamIds = [],
    courtCount = 1,
    rng,
}) {
    const byeSet = new Set(byeTeamIds)
    const pairedSet = new Set()
    const teamById = new Map(teams.map((team) => [team.id, team]))
    const delayedSet = new Set(delayedTeamIds)

    for (const teamId of delayedSet) {
        if (byeSet.has(teamId)) {
            return null
        }
    }

    const forcedMatches = collectForcedMatches({ forcedPairTeamIds, teamById, byeSet, pairedSet })
    const { onCourtMatches: forcedOnCourtMatches, delayedMatches: forcedDelayedMatches } = partitionMatchesByDelay(
        forcedMatches,
        delayedSet,
    )
    const remaining = teams.filter((team) => !(byeSet.has(team.id) || pairedSet.has(team.id)))
    const shuffledRemaining = shuffleWithRng(remaining, rng)
    const remainingMatches = buildRemainingBracketMatches(shuffledRemaining, delayedSet)
    if (!remainingMatches) {
        return null
    }

    const matches = [
        ...forcedOnCourtMatches,
        ...remainingMatches.onCourtMatches,
        ...forcedDelayedMatches,
        ...remainingMatches.delayedMatches,
    ].map((match, index) => ({
        ...match,
        court: index + 1,
    }))
    if (
        exceedsDelayedMatchCapacity(
            matches.length,
            forcedDelayedMatches.length + remainingMatches.delayedMatches.length,
            courtCount,
        )
    ) {
        return null
    }

    return {
        matches,
        byes: [...byeSet],
        sitOuts: [],
        scores: null,
        tournamentRoundLabel: "Round 1",
    }
}

export { createBracketFirstRoundWithOverrides }
