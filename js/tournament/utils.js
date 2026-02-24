/**
 * Shared tournament utilities — score evaluation and team lookups.
 */

function isTiebreakEligibleSetScore(s0, s1) {
    if (s0 === null || s1 === null) {
        return false
    }
    return Math.abs(s0 - s1) === 1
}

function isTiebreakRequiredSetScore(s0, s1) {
    return isTiebreakEligibleSetScore(s0, s1)
}

function isInvalidTiebreakForSet(setScore) {
    const [s0, s1] = setScore
    const tb = setScore[2]?.tb
    const tiebreakEligible = isTiebreakEligibleSetScore(s0, s1)
    const tiebreakRequired = isTiebreakRequiredSetScore(s0, s1)

    if (!tb) {
        return tiebreakRequired
    }
    if (!tiebreakEligible) {
        return true
    }

    const [tb0, tb1] = tb

    if (tb0 === null || tb1 === null || tb0 === tb1) {
        return true
    }
    if (s0 > s1) {
        return tb0 <= tb1
    }
    if (s1 > s0) {
        return tb1 <= tb0
    }
    return false
}

function getRoundScoreBlockReason(round) {
    if (!round?.scores) {
        return "Enter all scores"
    }
    for (let i = 0; i < round.matches.length; i += 1) {
        if (!round.scores[i]) {
            return "Enter all scores"
        }
    }
    for (let i = 0; i < round.matches.length; i += 1) {
        if (determineMatchWinner(round.scores[i]) === null) {
            return "Resolve drawn match"
        }
    }
    return null
}

/**
 * Determine which side (0 or 1) won a match based on score sets.
 * Returns 0, 1, or null if tied/undetermined.
 */
function determineMatchWinner(scoreEntry) {
    if (!scoreEntry?.sets || scoreEntry.sets.length === 0) {
        return null
    }
    let wins0 = 0
    let wins1 = 0
    let games0 = 0
    let games1 = 0
    for (const setScore of scoreEntry.sets) {
        if (isInvalidTiebreakForSet(setScore)) {
            return null
        }
        const [s0, s1] = setScore
        games0 += s0
        games1 += s1
        if (s0 > s1) {
            wins0 += 1
        } else if (s1 > s0) {
            wins1 += 1
        } else {
            wins0 += 1
            wins1 += 1
        }
    }
    if (wins0 > wins1) {
        return 0
    }
    if (wins1 > wins0) {
        return 1
    }
    if (games0 > games1) {
        return 0
    }
    if (games1 > games0) {
        return 1
    }
    return null
}

/**
 * Check if all matches in a round have non-null scores with a determinable winner.
 */
function allScoresEntered(round) {
    return getRoundScoreBlockReason(round) === null
}

function teamById(teams, id) {
    return teams.find((t) => t.id === id)
}

function teamByPlayers(teams, players) {
    const key = [...players].sort().join("||")
    return teams.find((t) => [...t.players].sort().join("||") === key)
}

export { determineMatchWinner, allScoresEntered, getRoundScoreBlockReason, teamById, teamByPlayers }
