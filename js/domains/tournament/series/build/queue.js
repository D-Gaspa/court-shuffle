function getQueueMatchCount(round, courtCount) {
    return Math.max(0, (round.matches?.length || 0) - Math.max(1, courtCount || 1))
}

function partitionRoundMatches(round, delayedSet) {
    const delayedMatches = []
    const onCourtMatches = []
    const matchedTeamIds = new Set()

    for (const match of round.matches || []) {
        const isDelayed = match.teamIds?.some((teamId) => delayedSet.has(teamId))
        if (!isDelayed) {
            onCourtMatches.push(match)
            continue
        }
        delayedMatches.push(match)
        for (const teamId of match.teamIds || []) {
            if (delayedSet.has(teamId)) {
                matchedTeamIds.add(teamId)
            }
        }
    }

    return { delayedMatches, onCourtMatches, matchedTeamIds }
}

function getQueueOverrideError({ delayedSet, matchedTeamIds, delayedMatches, queueMatchCount, label }) {
    if (delayedMatches.length > queueMatchCount) {
        return `${label} span more Round 1 queued matches than available (${queueMatchCount}).`
    }
    for (const teamId of delayedSet) {
        if (!matchedTeamIds.has(teamId)) {
            return `${label} must play in Round 1 and cannot overlap with byes or sit-outs.`
        }
    }
    return null
}

function reorderRoundMatchesForQueue({ run, delayedTeamIds, courtCount, label, errors }) {
    if (!Array.isArray(delayedTeamIds) || delayedTeamIds.length === 0) {
        return
    }

    const round = run?.rounds?.[0]
    if (!round) {
        return
    }

    const queueMatchCount = getQueueMatchCount(round, courtCount)
    if (queueMatchCount <= 0) {
        errors.push(`${label} are not available when Round 1 has no queued matches.`)
        return
    }

    const delayedSet = new Set(delayedTeamIds)
    const { delayedMatches, onCourtMatches, matchedTeamIds } = partitionRoundMatches(round, delayedSet)
    const error = getQueueOverrideError({
        delayedSet,
        matchedTeamIds,
        delayedMatches,
        queueMatchCount,
        label,
    })
    if (error) {
        errors.push(error)
        return
    }

    round.matches = [...onCourtMatches, ...delayedMatches].map((match, index) => ({
        ...match,
        court: index + 1,
    }))
}

export { reorderRoundMatchesForQueue }
